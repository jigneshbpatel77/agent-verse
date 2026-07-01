import re
from datetime import date, datetime
from decimal import Decimal
from html import unescape
from html.parser import HTMLParser
from typing import Any

from app.domains.business_analytics.gmail_client import GmailMessage

REPORT_DATE_PATTERN = re.compile(r"till\s*:?\s*-?\s*(\d{4}-\d{2}-\d{2})", re.IGNORECASE)
DATE_PATTERN = re.compile(r"\d{4}-\d{2}-\d{2}")
_DAILY_BOOKING_COL_RE = re.compile(r"booking", re.IGNORECASE)
_MTD_YTD_COL_RE = re.compile(r"\b(mtd|ytd)\b", re.IGNORECASE)
_TOTAL_ROW_RE = re.compile(r"^total$", re.IGNORECASE)


class PolicybazaarEmailParseError(ValueError):
    pass


def is_policybazaar_bike_report(message: GmailMessage, sender: str, subject_keyword: str) -> bool:
    return sender.lower() in message.sender.lower() and subject_keyword.lower() in message.subject.lower()


def is_policybazaar_car_report(message: GmailMessage, sender: str, subject_keyword: str) -> bool:
    return sender.lower() in message.sender.lower() and subject_keyword.lower() in message.subject.lower()


def is_policybazaar_cv_report(message: GmailMessage, sender: str, subject_keyword: str) -> bool:
    return sender.lower() in message.sender.lower() and subject_keyword.lower() in message.subject.lower()


def parse_source_report_date(subject: str) -> date | None:
    match = REPORT_DATE_PATTERN.search(subject)
    if not match:
        return None
    return datetime.strptime(match.group(1), "%Y-%m-%d").date()


def parse_policybazaar_bike_rows(message: GmailMessage, minimum_report_date: date | None = None) -> list[dict[str, Any]]:
    rows = _parse_html_tables(message.body_html, sale_column="b")
    if not rows:
        rows = _parse_text_table(message.body_text, sale_column="b")

    parsed_rows: list[dict[str, Any]] = []
    for row in rows:
        report_date = _parse_date(row.get("date", ""))
        if report_date is None:
            continue
        if minimum_report_date is not None and report_date < minimum_report_date:
            continue

        bike_sale_count = _parse_int(row.get("b"))
        if bike_sale_count is None:
            continue

        parsed_rows.append(
            {
                "report_date": report_date,
                "raw_r": _parse_int(row.get("r")) or 0,
                "raw_l": _parse_int(row.get("l")) or 0,
                "bike_sale_count": bike_sale_count,
                "non_saod": _parse_int(row.get("non_saod")) or 0,
                "saod": _parse_int(row.get("saod")) or 0,
                "crm": _parse_int(row.get("crm")) or 0,
                "non_crm": _parse_int(row.get("non_crm")) or 0,
                "r2b": _parse_decimal(row.get("r2b")) or Decimal("0.0"),
                "source": "policybazaar_email",
            }
        )

    if not parsed_rows:
        raise PolicybazaarEmailParseError("No Policybazaar bike rows were found in the email body")

    return parsed_rows


def parse_policybazaar_car_rows(message: GmailMessage, minimum_report_date: date | None = None) -> list[dict[str, Any]]:
    """
    Parses the Vehicleinfo_Motor MTD Booking Tracker email.
    Table format: Product | 24'Jun Leads | 24'Jun Bookings | 24'Jun Premium | MTD Bookings | ...
    The report date comes from the subject ("till -YYYY-MM-DD").
    """
    report_date = parse_source_report_date(message.subject)
    if report_date is None:
        raise PolicybazaarEmailParseError("Could not parse report date from Motor email subject")
    if minimum_report_date is not None and report_date < minimum_report_date:
        raise PolicybazaarEmailParseError(f"Motor email date {report_date} is before minimum {minimum_report_date}")

    sale_count = _parse_mtd_tracker_daily_bookings(message.body_html, message.body_text)
    if sale_count is None:
        raise PolicybazaarEmailParseError("No booking count found in Motor MTD tracker email")

    return [{"report_date": report_date, "car_sale_count": sale_count, "source": "policybazaar_email"}]


def parse_policybazaar_cv_rows(message: GmailMessage, minimum_report_date: date | None = None) -> list[dict[str, Any]]:
    """
    Parses the Vehicleinfo_Cv MTD Booking Tracker email.
    Table format: Product | 24'Jun Leads | 24'Jun Bookings | 24'Jun Premium | MTD Bookings | ...
    The report date comes from the subject ("till -YYYY-MM-DD").
    """
    report_date = parse_source_report_date(message.subject)
    if report_date is None:
        raise PolicybazaarEmailParseError("Could not parse report date from CV email subject")
    if minimum_report_date is not None and report_date < minimum_report_date:
        raise PolicybazaarEmailParseError(f"CV email date {report_date} is before minimum {minimum_report_date}")

    sale_count = _parse_mtd_tracker_daily_bookings(message.body_html, message.body_text)
    if sale_count is None:
        raise PolicybazaarEmailParseError("No booking count found in CV MTD tracker email")

    return [{"report_date": report_date, "cv_sale_count": sale_count, "source": "policybazaar_email"}]


def _parse_mtd_tracker_daily_bookings(html: str, text: str) -> int | None:
    """
    Extracts today's booking count from the MTD Booking Tracker email format:
      Product | 24'Jun Leads | 24'Jun Bookings | 24'Jun Premium | MTD Bookings | ...
    Looks for the column with 'Bookings' in the header that is NOT prefixed by MTD/YTD.
    """
    if html:
        try:
            from bs4 import BeautifulSoup

            soup = BeautifulSoup(html, "html.parser")
            for table in soup.find_all("table"):
                all_rows = [
                    [_clean_cell(cell.get_text(" ", strip=True)) for cell in tr.find_all(["th", "td"])]
                    for tr in table.find_all("tr")
                ]
                all_rows = [r for r in all_rows if r]
                if len(all_rows) < 2:
                    continue
                col_idx = _find_daily_booking_col(all_rows[0])
                if col_idx is None:
                    continue
                for data_row in all_rows[1:]:
                    if not data_row or _TOTAL_ROW_RE.match(data_row[0].strip()):
                        continue
                    if col_idx < len(data_row):
                        val = _parse_int(data_row[col_idx])
                        if val is not None:
                            return val
        except Exception:
            pass

    if text:
        # Fallback: find column positions from header line, read value from first data row
        lines = [_clean_cell(line) for line in text.splitlines() if _clean_cell(line)]
        for i, line in enumerate(lines):
            parts = re.split(r"\s{2,}|\t+", line)
            col_idx = _find_daily_booking_col(parts)
            if col_idx is None:
                continue
            for data_line in lines[i + 1 :]:
                if _TOTAL_ROW_RE.match(data_line.strip()):
                    continue
                data_parts = re.split(r"\s{2,}|\t+", data_line)
                if col_idx < len(data_parts):
                    val = _parse_int(data_parts[col_idx])
                    if val is not None:
                        return val
                break

    return None


def _find_daily_booking_col(headers: list[str]) -> int | None:
    """Returns index of the daily-bookings column (contains 'booking', not MTD/YTD)."""
    for i, h in enumerate(headers):
        if _DAILY_BOOKING_COL_RE.search(h) and not _MTD_YTD_COL_RE.search(h):
            return i
    return None


def _parse_html_tables(html: str, sale_column: str = "b") -> list[dict[str, str]]:
    if not html:
        return []

    try:
        from bs4 import BeautifulSoup

        soup = BeautifulSoup(html, "html.parser")
        parsed_rows: list[dict[str, str]] = []
        for table in soup.find_all("table"):
            matrix = [
                [_clean_cell(cell.get_text(" ", strip=True)) for cell in row.find_all(["th", "td"])]
                for row in table.find_all("tr")
            ]
            parsed_rows.extend(_rows_from_matrix(matrix, sale_column))
        if parsed_rows:
            return parsed_rows
    except Exception:
        pass

    parser = _SimpleTableParser()
    parser.feed(html)
    return _rows_from_matrix(parser.rows, sale_column)


def _parse_text_table(text: str, sale_column: str = "b") -> list[dict[str, str]]:
    if not text:
        return []

    lines = [_clean_cell(line) for line in text.splitlines() if _clean_cell(line)]
    start_index = next((index for index, line in enumerate(lines) if "date" in line.lower() and "r2b" in line.lower()), -1)
    if start_index < 0:
        return []

    matrix: list[list[str]] = [re.split(r"\s{2,}|\t+", lines[start_index])]
    for line in lines[start_index + 1 :]:
        if not DATE_PATTERN.search(line):
            continue
        matrix.append(re.split(r"\s{2,}|\t+", line))

    return _rows_from_matrix(matrix, sale_column)


def _rows_from_matrix(matrix: list[list[str]], sale_column: str = "b") -> list[dict[str, str]]:
    if len(matrix) < 2:
        return []

    header_index = next((index for index, row in enumerate(matrix) if _header_map(row)), -1)
    if header_index < 0:
        return []

    headers = _header_map(matrix[header_index])
    if "date" not in headers or sale_column not in headers:
        return []

    parsed_rows: list[dict[str, str]] = []
    for row in matrix[header_index + 1 :]:
        if len(row) < 2:
            continue
        parsed_row = {
            header_key: row[column_index].strip()
            for header_key, column_index in headers.items()
            if column_index < len(row)
        }
        if parsed_row.get("date"):
            parsed_rows.append(parsed_row)

    return parsed_rows


def _header_map(row: list[str]) -> dict[str, int]:
    normalized = {_normalize_header(value): index for index, value in enumerate(row)}
    aliases = {
        "date": ["date"],
        "r": ["r"],
        "l": ["l"],
        "b": ["b"],
        "m": ["m", "motor", "car", "motorcar"],
        "cv": ["cv", "commercialvehicle", "commercial"],
        "non_saod": ["nonsaod", "non_saod", "non saod"],
        "saod": ["saod"],
        "crm": ["crm"],
        "non_crm": ["noncrm", "non_crm", "non crm"],
        "r2b": ["r2b"],
    }

    mapped: dict[str, int] = {}
    for key, names in aliases.items():
        for name in names:
            if name in normalized:
                mapped[key] = normalized[name]
                break
    return mapped


def _normalize_header(value: str) -> str:
    return _clean_cell(value).lower().replace("_", "").replace("-", "").replace(" ", "")


def _clean_cell(value: str) -> str:
    return unescape(value).replace("\xa0", " ").strip()


def _parse_date(value: str) -> date | None:
    match = DATE_PATTERN.search(value)
    if not match:
        return None
    return datetime.strptime(match.group(0), "%Y-%m-%d").date()


def _parse_int(value: str | None) -> int | None:
    if value is None:
        return None
    cleaned = re.sub(r"[^\d-]", "", value)
    if cleaned in {"", "-"}:
        return None
    return int(cleaned)


def _parse_decimal(value: str | None) -> Decimal | None:
    if value is None:
        return None
    cleaned = re.sub(r"[^\d.-]", "", value)
    if cleaned in {"", "-", "."}:
        return None
    return Decimal(cleaned)


class _SimpleTableParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.rows: list[list[str]] = []
        self._current_row: list[str] | None = None
        self._current_cell: list[str] | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "tr":
            self._current_row = []
        elif tag in {"td", "th"}:
            self._current_cell = []

    def handle_data(self, data: str) -> None:
        if self._current_cell is not None:
            self._current_cell.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag in {"td", "th"} and self._current_row is not None and self._current_cell is not None:
            self._current_row.append(_clean_cell(" ".join(self._current_cell)))
            self._current_cell = None
        elif tag == "tr" and self._current_row is not None:
            self.rows.append(self._current_row)
            self._current_row = None

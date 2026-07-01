from datetime import date, timedelta


def find_missing_date_ranges(covered_dates: set[date], start: date, end: date) -> list[tuple[date, date]]:
    """Collapses the days in [start, end] not present in covered_dates into contiguous ranges."""
    ranges: list[tuple[date, date]] = []
    range_start: date | None = None
    current = start

    while current <= end:
        if current in covered_dates:
            if range_start is not None:
                ranges.append((range_start, current - timedelta(days=1)))
                range_start = None
        elif range_start is None:
            range_start = current
        current += timedelta(days=1)

    if range_start is not None:
        ranges.append((range_start, end))

    return ranges

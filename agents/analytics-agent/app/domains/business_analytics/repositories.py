from datetime import date, timedelta
from decimal import Decimal
from typing import Any

from app.domains.business_analytics.schemas import InsuranceRevenueMetric, RevenueDailyMetrics, ServiceRevenueMetric
from app.integrations.duckdb_client import connect as db_connect


PAYMENT_TABLE_DEFINITIONS = [
    """
    CREATE TABLE IF NOT EXISTS challan_payment (
        id VARCHAR PRIMARY KEY,
        challan_number VARCHAR,
        vehicle_number VARCHAR,
        convenience_fee DECIMAL(18, 2),
        vendor_payout DECIMAL(18, 2),
        pg_fee DECIMAL(18, 2),
        refund_amount DECIMAL(18, 2),
        payment_date DATE,
        status VARCHAR,
        source_status VARCHAR,
        paid_status VARCHAR
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS policybazaar_bike_daily (
        report_date DATE PRIMARY KEY,
        raw_r BIGINT DEFAULT 0,
        raw_l BIGINT DEFAULT 0,
        bike_sale_count BIGINT DEFAULT 0,
        non_saod BIGINT DEFAULT 0,
        saod BIGINT DEFAULT 0,
        crm BIGINT DEFAULT 0,
        non_crm BIGINT DEFAULT 0,
        r2b DECIMAL(10, 4) DEFAULT 0,
        rate_per_sale DECIMAL(18, 2) DEFAULT 200.00,
        revenue DECIMAL(18, 2) DEFAULT 0.00,
        source VARCHAR DEFAULT 'policybazaar_email',
        source_report_date DATE,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS policybazaar_car_daily (
        report_date DATE PRIMARY KEY,
        raw_r BIGINT DEFAULT 0,
        raw_l BIGINT DEFAULT 0,
        car_sale_count BIGINT DEFAULT 0,
        non_saod BIGINT DEFAULT 0,
        saod BIGINT DEFAULT 0,
        crm BIGINT DEFAULT 0,
        non_crm BIGINT DEFAULT 0,
        r2b DECIMAL(10, 4) DEFAULT 0,
        rate_per_sale DECIMAL(18, 2) DEFAULT 600.00,
        revenue DECIMAL(18, 2) DEFAULT 0.00,
        source VARCHAR DEFAULT 'policybazaar_email',
        source_report_date DATE,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS policybazaar_cv_daily (
        report_date DATE PRIMARY KEY,
        raw_r BIGINT DEFAULT 0,
        raw_l BIGINT DEFAULT 0,
        cv_sale_count BIGINT DEFAULT 0,
        non_saod BIGINT DEFAULT 0,
        saod BIGINT DEFAULT 0,
        crm BIGINT DEFAULT 0,
        non_crm BIGINT DEFAULT 0,
        r2b DECIMAL(10, 4) DEFAULT 0,
        rate_per_sale DECIMAL(18, 2) DEFAULT 1200.00,
        revenue DECIMAL(18, 2) DEFAULT 0.00,
        source VARCHAR DEFAULT 'policybazaar_email',
        source_report_date DATE,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS gmail_ingestion_state (
        mailbox_email VARCHAR PRIMARY KEY,
        last_history_id VARCHAR,
        watch_expiration_ms BIGINT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS processed_policybazaar_emails (
        message_id VARCHAR PRIMARY KEY,
        thread_id VARCHAR,
        sender VARCHAR,
        subject VARCHAR,
        message_date TIMESTAMP,
        source_report_date DATE,
        processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS service_history_payments (
        id VARCHAR PRIMARY KEY,
        transaction_id VARCHAR,
        vehicle_number VARCHAR,
        convenience_fee DECIMAL(18, 2),
        vendor_payout DECIMAL(18, 2),
        pg_fee DECIMAL(18, 2),
        refund_amount DECIMAL(18, 2),
        payment_date DATE,
        status VARCHAR
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS buy_fastag_payment (
        id VARCHAR PRIMARY KEY,
        order_id VARCHAR,
        vehicle_number VARCHAR,
        convenience_fee DECIMAL(18, 2),
        vendor_payout DECIMAL(18, 2),
        pg_fee DECIMAL(18, 2),
        refund_amount DECIMAL(18, 2),
        payment_date DATE,
        status VARCHAR
    );
    """,
]

SERVICE_REVENUE_DEFINITIONS = [
    {
        "key": "challan",
        "title": "Challan payments",
        "description": "Convenience fee per payment",
        "table_name": "challan_payment",
        "amount_condition": "paid_status = '1'",
        "record_count_condition": "paid_status = '1'",
    },
    {
        "key": "service-history",
        "title": "Service history",
        "description": "Agent fee + gateway fee - refunds",
        "table_name": "service_history_payments",
        "amount_condition": "status IN ('SUCCESS', 'REFUNDED')",
        "record_count_condition": "status IN ('SUCCESS', 'REFUNDED', 'ATTEMPT')",
    },
    {
        "key": "fastag",
        "title": "FASTag orders",
        "description": "Captured - refunded, failed count tracked",
        "table_name": "buy_fastag_payment",
        "amount_condition": "status IN ('SUCCESS', 'REFUNDED')",
        "record_count_condition": "status IN ('SUCCESS', 'REFUNDED', 'ATTEMPT', 'FAILED')",
    },
]


class BusinessAnalyticsRepository:
    def __init__(self) -> None:
        with db_connect() as conn:
            self.initialize_tables(conn)

    @staticmethod
    def initialize_tables(conn: Any) -> None:
        for statement in PAYMENT_TABLE_DEFINITIONS:
            conn.execute(statement)
        conn.execute("ALTER TABLE challan_payment ADD COLUMN IF NOT EXISTS source_status VARCHAR;")
        conn.execute("ALTER TABLE challan_payment ADD COLUMN IF NOT EXISTS paid_status VARCHAR;")

    def get_gmail_ingestion_state(self, mailbox_email: str) -> dict[str, Any] | None:
        with db_connect() as conn:
            row = conn.execute(
                """
                SELECT mailbox_email, last_history_id, watch_expiration_ms, updated_at
                FROM gmail_ingestion_state
                WHERE mailbox_email = ?;
                """,
                [mailbox_email],
            ).fetchone()

        if not row:
            return None

        return {
            "mailbox_email": row[0],
            "last_history_id": row[1],
            "watch_expiration_ms": row[2],
            "updated_at": row[3],
        }

    def upsert_gmail_ingestion_state(
        self,
        mailbox_email: str,
        last_history_id: str | None,
        watch_expiration_ms: int | None = None,
    ) -> None:
        with db_connect() as conn:
            conn.execute("DELETE FROM gmail_ingestion_state WHERE mailbox_email = ?;", [mailbox_email])
            conn.execute(
                """
                INSERT INTO gmail_ingestion_state (
                    mailbox_email,
                    last_history_id,
                    watch_expiration_ms,
                    updated_at
                )
                VALUES (?, ?, ?, CURRENT_TIMESTAMP);
                """,
                [mailbox_email, last_history_id, watch_expiration_ms],
            )

    def has_processed_policybazaar_email(self, message_id: str) -> bool:
        with db_connect() as conn:
            row = conn.execute(
                "SELECT 1 FROM processed_policybazaar_emails WHERE message_id = ? LIMIT 1;",
                [message_id],
            ).fetchone()
        return row is not None

    def mark_policybazaar_email_processed(
        self,
        message_id: str,
        thread_id: str | None,
        sender: str,
        subject: str,
        message_date: Any,
        source_report_date: date | None,
    ) -> None:
        with db_connect() as conn:
            conn.execute("DELETE FROM processed_policybazaar_emails WHERE message_id = ?;", [message_id])
            conn.execute(
                """
                INSERT INTO processed_policybazaar_emails (
                    message_id,
                    thread_id,
                    sender,
                    subject,
                    message_date,
                    source_report_date,
                    processed_at
                )
                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP);
                """,
                [message_id, thread_id, sender, subject, message_date, source_report_date],
            )

    @staticmethod
    def unified_payments_view() -> str:
        return """
        (
            SELECT convenience_fee, vendor_payout, pg_fee, refund_amount, payment_date
            FROM challan_payment
            WHERE paid_status = '1'
            UNION ALL
            SELECT convenience_fee, vendor_payout, pg_fee, refund_amount, payment_date
            FROM service_history_payments
            WHERE status IN ('SUCCESS', 'REFUNDED')
            UNION ALL
            SELECT convenience_fee, vendor_payout, pg_fee, refund_amount, payment_date
            FROM buy_fastag_payment
            WHERE status IN ('SUCCESS', 'REFUNDED')
        )
        """

    def fetch_daily_revenue_metrics(self, start_date: date, end_date: date) -> list[RevenueDailyMetrics]:
        query = f"""
        SELECT
            payment_date,
            COALESCE(SUM(convenience_fee), 0)::DECIMAL(18, 2) AS convenience_fees,
            COALESCE(SUM(vendor_payout), 0)::DECIMAL(18, 2) AS vendor_payouts,
            COALESCE(SUM(pg_fee), 0)::DECIMAL(18, 2) AS gateway_fees,
            COALESCE(SUM(refund_amount), 0)::DECIMAL(18, 2) AS user_refunds,
            (
                COALESCE(SUM(convenience_fee), 0)
                - COALESCE(SUM(vendor_payout), 0)
                - COALESCE(SUM(pg_fee), 0)
                - COALESCE(SUM(refund_amount), 0)
            )::DECIMAL(18, 2) AS net_revenue
        FROM {self.unified_payments_view()} AS unified_table
        WHERE payment_date BETWEEN ? AND ?
        GROUP BY 1
        ORDER BY 1 ASC;
        """

        with db_connect() as conn:
            rows = conn.execute(query, [start_date, end_date]).fetchall()

        return [
            RevenueDailyMetrics(
                transaction_date=row[0],
                convenience_fees=row[1] or Decimal("0.0"),
                vendor_payouts=row[2] or Decimal("0.0"),
                gateway_fees=row[3] or Decimal("0.0"),
                user_refunds=row[4] or Decimal("0.0"),
                net_revenue=row[5] or Decimal("0.0"),
            )
            for row in rows
        ]

    def fetch_service_revenue_metrics(self, start_date: date, end_date: date) -> list[ServiceRevenueMetric]:
        metrics: list[ServiceRevenueMetric] = []

        with db_connect() as conn:
            for definition in SERVICE_REVENUE_DEFINITIONS:
                table_name = definition["table_name"]
                amount_condition = definition["amount_condition"]
                record_count_condition = definition["record_count_condition"]
                row = conn.execute(
                    f"""
                    SELECT
                        COALESCE(
                            SUM(
                                CASE
                                    WHEN {amount_condition} THEN convenience_fee
                                    ELSE 0
                                END
                            ),
                            0
                        )::DECIMAL(18, 2) AS amount,
                        COALESCE(
                            SUM(
                                CASE
                                    WHEN {record_count_condition} THEN 1
                                    ELSE 0
                                END
                            ),
                            0
                        )::BIGINT AS record_count
                    FROM {table_name}
                    WHERE payment_date BETWEEN ? AND ?;
                    """,
                    [start_date, end_date],
                ).fetchone()

                metrics.append(
                    ServiceRevenueMetric(
                        key=definition["key"],
                        title=definition["title"],
                        description=definition["description"],
                        amount=row[0] or Decimal("0.0"),
                        record_count=int(row[1] or 0),
                    )
                )

        return metrics

    def fetch_insurance_revenue_metrics(self, start_date: date, end_date: date) -> list[InsuranceRevenueMetric]:
        insurance_definitions = [
            {
                "key": "bike",
                "title": "Bike",
                "table": "policybazaar_bike_daily",
                "sale_column": "bike_sale_count",
                "default_rate": Decimal("200.00"),
            },
            {
                "key": "car",
                "title": "Car",
                "table": "policybazaar_car_daily",
                "sale_column": "car_sale_count",
                "default_rate": Decimal("600.00"),
            },
            {
                "key": "cv",
                "title": "CV",
                "table": "policybazaar_cv_daily",
                "sale_column": "cv_sale_count",
                "default_rate": Decimal("1200.00"),
            },
        ]

        metrics: list[InsuranceRevenueMetric] = []
        with db_connect() as conn:
            for definition in insurance_definitions:
                row = conn.execute(
                    f"""
                    SELECT
                        COALESCE(MAX(rate_per_sale), ?)::DECIMAL(18, 2) AS rate_per_sale,
                        COALESCE(SUM({definition["sale_column"]}), 0)::BIGINT AS sale_count,
                        COALESCE(SUM(revenue), 0)::DECIMAL(18, 2) AS revenue
                    FROM {definition["table"]}
                    WHERE report_date BETWEEN ? AND ?;
                    """,
                    [definition["default_rate"], start_date, end_date],
                ).fetchone()

                metrics.append(
                    InsuranceRevenueMetric(
                        key=definition["key"],
                        title=definition["title"],
                        rate_per_sale=row[0] or definition["default_rate"],
                        sale_count=int(row[1] or 0),
                        revenue=row[2] or Decimal("0.0"),
                    )
                )

        return metrics

    def fetch_comparative_revenue(self) -> dict[str, Any]:
        today = date.today()
        yesterday = today - timedelta(days=1)
        query = f"""
        SELECT
            COALESCE(
                SUM(CASE WHEN payment_date = ? THEN convenience_fee - vendor_payout - pg_fee - refund_amount ELSE 0 END),
                0
            )::DECIMAL(18, 2) AS net_today,
            COALESCE(
                SUM(CASE WHEN payment_date = ? THEN convenience_fee - vendor_payout - pg_fee - refund_amount ELSE 0 END),
                0
            )::DECIMAL(18, 2) AS net_yesterday
        FROM {self.unified_payments_view()} AS unified_table;
        """

        with db_connect() as conn:
            row = conn.execute(query, [today, yesterday]).fetchone()

        net_today = row[0] or Decimal("0.0")
        net_yesterday = row[1] or Decimal("0.0")
        percentage_change = Decimal("0.0")

        if net_yesterday != 0:
            percentage_change = ((net_today - net_yesterday) / abs(net_yesterday)) * Decimal("100.0")

        return {
            "today": today,
            "yesterday": yesterday,
            "net_revenue_today": net_today,
            "net_revenue_yesterday": net_yesterday,
            "percentage_change": round(percentage_change, 2),
        }

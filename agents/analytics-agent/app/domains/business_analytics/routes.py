from datetime import date, timedelta

from fastapi import APIRouter, HTTPException, Query

from app.domains.business_analytics.ingestion import (
    POLICYBAZAAR_CAR_SAMPLE_ROWS,
    POLICYBAZAAR_CV_SAMPLE_ROWS,
    run_full_ingestion,
    upsert_policybazaar_bike_daily_rows,
    upsert_policybazaar_car_daily_rows,
    upsert_policybazaar_cv_daily_rows,
)
from app.domains.business_analytics.policybazaar_email_ingestion import (
    backfill_recent_policybazaar_emails,
    ensure_gmail_watch,
    process_gmail_pubsub_notification,
)
from app.domains.business_analytics.repositories import BusinessAnalyticsRepository
from app.domains.business_analytics.schemas import (
    BusinessRevenueReport,
    PolicybazaarBikeDailyUpsertRequest,
    PolicybazaarCarDailyUpsertRequest,
    PolicybazaarCVDailyUpsertRequest,
    RevenueComparison,
    SyncResponse,
)
from app.domains.business_analytics.services import BusinessAnalyticsService
from app.config.settings import get_settings
from app.integrations.duckdb_client import connect as db_connect

router = APIRouter()


def _seed_insurance_sample_if_empty() -> None:
    cutoff_date = date.today() - timedelta(days=14)
    with db_connect() as conn:
        car_count = conn.execute("SELECT COUNT(*) FROM policybazaar_car_daily").fetchone()[0]
        if car_count == 0:
            rows = [r for r in POLICYBAZAAR_CAR_SAMPLE_ROWS if r["report_date"] >= cutoff_date]
            if rows:
                upsert_policybazaar_car_daily_rows(conn, rows, date.today())

        cv_count = conn.execute("SELECT COUNT(*) FROM policybazaar_cv_daily").fetchone()[0]
        if cv_count == 0:
            rows = [r for r in POLICYBAZAAR_CV_SAMPLE_ROWS if r["report_date"] >= cutoff_date]
            if rows:
                upsert_policybazaar_cv_daily_rows(conn, rows, date.today())


@router.get("/report", response_model=BusinessRevenueReport)
def get_business_revenue_report(
    start_date: date | None = Query(default=None, description="Report analysis start date"),
    end_date: date | None = Query(default=None, description="Report analysis end date"),
) -> BusinessRevenueReport:
    resolved_end_date = end_date or date.today()
    resolved_start_date = start_date or (resolved_end_date - timedelta(days=6))

    if resolved_start_date > resolved_end_date:
        raise HTTPException(status_code=400, detail="start_date must be before or equal to end_date")

    try:
        repository = BusinessAnalyticsRepository()
        _seed_insurance_sample_if_empty()
        service = BusinessAnalyticsService(repository)
        return service.generate_revenue_report(resolved_start_date, resolved_end_date)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Database aggregation failed: {exc}") from exc


@router.get("/compare", response_model=RevenueComparison)
def compare_yesterday_vs_today() -> RevenueComparison:
    try:
        repository = BusinessAnalyticsRepository()
        return RevenueComparison(**repository.fetch_comparative_revenue())
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Comparative calculation failed: {exc}") from exc


@router.post("/sync", response_model=SyncResponse)
def trigger_data_lake_sync() -> SyncResponse:
    steps: list[dict[str, str]] = []

    try:
        loaded = run_full_ingestion(steps)
        return SyncResponse(status="success", synced_records=loaded, steps=steps)
    except Exception as exc:
        if not any(step["status"] == "error" for step in steps):
            steps.append({"message": f"Sync pipeline failed: {exc}", "status": "error"})
        return SyncResponse(status="failure", synced_records=0, steps=steps)


@router.post("/policybazaar-bike/daily", response_model=SyncResponse)
def upsert_policybazaar_bike_daily_report(request: PolicybazaarBikeDailyUpsertRequest) -> SyncResponse:
    steps: list[dict[str, str]] = []
    try:
        rows = [
            {
                "report_date": row.report_date,
                "raw_r": row.raw_r,
                "raw_l": row.raw_l,
                "bike_sale_count": row.bike_sale_count,
                "non_saod": row.non_saod,
                "saod": row.saod,
                "crm": row.crm,
                "non_crm": row.non_crm,
                "r2b": row.r2b,
                "rate_per_sale": row.rate_per_sale,
            }
            for row in request.rows
        ]
        with db_connect() as conn:
            loaded = upsert_policybazaar_bike_daily_rows(conn, rows, request.source_report_date)
        steps.append({"message": f"Upserted {loaded} Policybazaar bike daily rows.", "status": "success"})
        return SyncResponse(status="success", synced_records=loaded, steps=steps)
    except Exception as exc:
        steps.append({"message": f"Policybazaar bike daily upsert failed: {exc}", "status": "error"})
        return SyncResponse(status="failure", synced_records=0, steps=steps)


@router.post("/policybazaar-car/daily", response_model=SyncResponse)
def upsert_policybazaar_car_daily_report(request: PolicybazaarCarDailyUpsertRequest) -> SyncResponse:
    steps: list[dict[str, str]] = []
    try:
        rows = [
            {
                "report_date": row.report_date,
                "raw_r": row.raw_r,
                "raw_l": row.raw_l,
                "car_sale_count": row.car_sale_count,
                "non_saod": row.non_saod,
                "saod": row.saod,
                "crm": row.crm,
                "non_crm": row.non_crm,
                "r2b": row.r2b,
                "rate_per_sale": row.rate_per_sale,
            }
            for row in request.rows
        ]
        with db_connect() as conn:
            loaded = upsert_policybazaar_car_daily_rows(conn, rows, request.source_report_date)
        steps.append({"message": f"Upserted {loaded} Policybazaar car daily rows.", "status": "success"})
        return SyncResponse(status="success", synced_records=loaded, steps=steps)
    except Exception as exc:
        steps.append({"message": f"Policybazaar car daily upsert failed: {exc}", "status": "error"})
        return SyncResponse(status="failure", synced_records=0, steps=steps)


@router.post("/policybazaar-cv/daily", response_model=SyncResponse)
def upsert_policybazaar_cv_daily_report(request: PolicybazaarCVDailyUpsertRequest) -> SyncResponse:
    steps: list[dict[str, str]] = []
    try:
        rows = [
            {
                "report_date": row.report_date,
                "raw_r": row.raw_r,
                "raw_l": row.raw_l,
                "cv_sale_count": row.cv_sale_count,
                "non_saod": row.non_saod,
                "saod": row.saod,
                "crm": row.crm,
                "non_crm": row.non_crm,
                "r2b": row.r2b,
                "rate_per_sale": row.rate_per_sale,
            }
            for row in request.rows
        ]
        with db_connect() as conn:
            loaded = upsert_policybazaar_cv_daily_rows(conn, rows, request.source_report_date)
        steps.append({"message": f"Upserted {loaded} Policybazaar CV daily rows.", "status": "success"})
        return SyncResponse(status="success", synced_records=loaded, steps=steps)
    except Exception as exc:
        steps.append({"message": f"Policybazaar CV daily upsert failed: {exc}", "status": "error"})
        return SyncResponse(status="failure", synced_records=0, steps=steps)


@router.post("/email/gmail/watch", response_model=SyncResponse)
def start_or_renew_gmail_watch() -> SyncResponse:
    steps: list[dict[str, str]] = []
    try:
        response = ensure_gmail_watch()
        expiration = response.get("expiration", "unknown")
        history_id = response.get("historyId", "unknown")
        steps.append(
            {
                "message": f"Gmail watch active. historyId={history_id}, expiration={expiration}.",
                "status": "success",
            }
        )
        return SyncResponse(status="success", synced_records=0, steps=steps)
    except Exception as exc:
        steps.append({"message": f"Gmail watch setup failed: {exc}", "status": "error"})
        return SyncResponse(status="failure", synced_records=0, steps=steps)


@router.post("/email/gmail/push", response_model=SyncResponse)
def receive_gmail_push_notification(
    payload: dict[str, object],
    token: str | None = Query(default=None),
) -> SyncResponse:
    steps: list[dict[str, str]] = []
    verification_token = get_settings().gmail_pubsub_verification_token
    if verification_token and token != verification_token:
        raise HTTPException(status_code=401, detail="Invalid Gmail Pub/Sub verification token")

    try:
        result = process_gmail_pubsub_notification(payload)
        steps.append(
            {
                "message": (
                    "Processed Gmail notification for "
                    f"{result['mailbox_email']} at historyId={result['history_id']}. "
                    f"Emails processed={result['processed_messages']}, rows upserted={result['upserted_rows']}."
                ),
                "status": "success",
            }
        )
        return SyncResponse(status="success", synced_records=int(result["upserted_rows"]), steps=steps)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Gmail push processing failed: {exc}") from exc


@router.post("/email/policybazaar/backfill", response_model=SyncResponse)
def backfill_policybazaar_email_reports(
    days: int | None = Query(default=None, ge=1, le=90),
) -> SyncResponse:
    steps: list[dict[str, str]] = []
    try:
        result = backfill_recent_policybazaar_emails(days=days)
        steps.append(
            {
                "message": (
                    f"Backfill completed. Emails processed={result['processed_messages']}, "
                    f"skipped={result['skipped_messages']}, rows upserted={result['upserted_rows']}."
                ),
                "status": "success",
            }
        )
        return SyncResponse(status="success", synced_records=int(result["upserted_rows"]), steps=steps)
    except Exception as exc:
        steps.append({"message": f"Policybazaar email backfill failed: {exc}", "status": "error"})
        return SyncResponse(status="failure", synced_records=0, steps=steps)


@router.get("/debug-duckdb")
def debug_duckdb_contents() -> dict[str, object]:
    try:
        results: dict[str, object] = {}
        with db_connect() as conn:
            for table_name in [
                "challan_payment",
                "service_history_payments",
                "buy_fastag_payment",
                "policybazaar_bike_daily",
                "policybazaar_car_daily",
                "policybazaar_cv_daily",
            ]:
                try:
                    rows = conn.execute(f"SELECT * FROM {table_name}").fetchall()
                    columns = [description[0] for description in conn.description]
                    results[table_name] = {
                        "count": len(rows),
                        "columns": columns,
                        "rows": [dict(zip(columns, [str(value) for value in row])) for row in rows],
                    }
                except Exception as table_exc:
                    results[table_name] = {"error": str(table_exc)}
        return results
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to query DuckDB: {exc}") from exc

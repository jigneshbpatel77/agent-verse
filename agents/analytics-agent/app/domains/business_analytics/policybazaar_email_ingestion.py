import base64
import json
from datetime import date, timedelta
from typing import Any

from app.config.settings import Settings, get_settings
from app.domains.business_analytics.gmail_client import GmailClient, GmailMessage
from app.domains.business_analytics.ingestion import (
    upsert_policybazaar_bike_daily_rows,
    upsert_policybazaar_car_daily_rows,
    upsert_policybazaar_cv_daily_rows,
)
from app.domains.business_analytics.policybazaar_email_parser import (
    is_policybazaar_bike_report,
    is_policybazaar_car_report,
    is_policybazaar_cv_report,
    parse_policybazaar_bike_rows,
    parse_policybazaar_car_rows,
    parse_policybazaar_cv_rows,
    parse_source_report_date,
)
from app.domains.business_analytics.repositories import BusinessAnalyticsRepository
from app.integrations.duckdb_client import connect as db_connect


def ensure_gmail_watch(settings: Settings | None = None) -> dict[str, Any]:
    settings = settings or get_settings()
    client = GmailClient(settings)
    response = client.watch_mailbox()

    mailbox_email = settings.gmail_delegated_user or response.get("emailAddress") or "me"
    repository = BusinessAnalyticsRepository()
    repository.upsert_gmail_ingestion_state(
        mailbox_email=mailbox_email,
        last_history_id=str(response.get("historyId")) if response.get("historyId") else None,
        watch_expiration_ms=int(response["expiration"]) if response.get("expiration") else None,
    )

    return response


def process_gmail_pubsub_notification(pubsub_body: dict[str, Any], settings: Settings | None = None) -> dict[str, Any]:
    settings = settings or get_settings()
    notification = decode_pubsub_notification(pubsub_body)
    mailbox_email = notification.get("emailAddress") or settings.gmail_delegated_user
    history_id = str(notification.get("historyId") or "")

    if not mailbox_email or not history_id:
        raise ValueError("Gmail Pub/Sub notification must include emailAddress and historyId")

    repository = BusinessAnalyticsRepository()
    state = repository.get_gmail_ingestion_state(mailbox_email)
    last_history_id = state["last_history_id"] if state else None

    client = GmailClient(settings)
    if last_history_id:
        message_ids = client.list_message_ids_from_history(str(last_history_id))
    else:
        message_ids = search_recent_policybazaar_message_ids(client, settings.policybazaar_refresh_window_days, settings)

    result = process_policybazaar_message_ids(message_ids, client, repository, settings)
    repository.upsert_gmail_ingestion_state(
        mailbox_email=mailbox_email,
        last_history_id=history_id,
        watch_expiration_ms=state["watch_expiration_ms"] if state else None,
    )
    result["history_id"] = history_id
    result["mailbox_email"] = mailbox_email
    return result


def backfill_recent_policybazaar_emails(days: int | None = None, settings: Settings | None = None) -> dict[str, Any]:
    settings = settings or get_settings()
    resolved_days = days or settings.policybazaar_refresh_window_days
    client = GmailClient(settings)
    repository = BusinessAnalyticsRepository()
    message_ids = search_recent_policybazaar_message_ids(client, resolved_days, settings)
    return process_policybazaar_message_ids(message_ids, client, repository, settings)


def process_policybazaar_message_ids(
    message_ids: list[str],
    client: GmailClient,
    repository: BusinessAnalyticsRepository,
    settings: Settings,
) -> dict[str, Any]:
    processed_messages = 0
    skipped_messages = 0
    upserted_rows = 0
    minimum_report_date = date.today() - timedelta(days=settings.policybazaar_refresh_window_days - 1)

    for message_id in message_ids:
        if repository.has_processed_policybazaar_email(message_id):
            skipped_messages += 1
            continue

        message = client.get_message(message_id)
        source_report_date = parse_source_report_date(message.subject)

        if is_policybazaar_bike_report(
            message,
            settings.gmail_policybazaar_sender,
            settings.gmail_policybazaar_subject_keyword,
        ):
            rows = parse_policybazaar_bike_rows(message, minimum_report_date=minimum_report_date)
            with db_connect() as conn:
                upserted_rows += upsert_policybazaar_bike_daily_rows(conn, rows, source_report_date=source_report_date)

        elif is_policybazaar_car_report(
            message,
            settings.gmail_policybazaar_sender,
            settings.gmail_policybazaar_car_subject_keyword,
        ):
            rows = parse_policybazaar_car_rows(message, minimum_report_date=minimum_report_date)
            with db_connect() as conn:
                upserted_rows += upsert_policybazaar_car_daily_rows(conn, rows, source_report_date=source_report_date)

        elif is_policybazaar_cv_report(
            message,
            settings.gmail_policybazaar_sender,
            settings.gmail_policybazaar_cv_subject_keyword,
        ):
            rows = parse_policybazaar_cv_rows(message, minimum_report_date=minimum_report_date)
            with db_connect() as conn:
                upserted_rows += upsert_policybazaar_cv_daily_rows(conn, rows, source_report_date=source_report_date)

        else:
            skipped_messages += 1
            continue

        repository.mark_policybazaar_email_processed(
            message_id=message.message_id,
            thread_id=message.thread_id,
            sender=message.sender,
            subject=message.subject,
            message_date=message.message_date,
            source_report_date=source_report_date,
        )
        processed_messages += 1

    return {
        "processed_messages": processed_messages,
        "skipped_messages": skipped_messages,
        "upserted_rows": upserted_rows,
    }


def search_recent_policybazaar_message_ids(client: GmailClient, days: int, settings: Settings) -> list[str]:
    subject_clauses = " OR ".join(
        f'subject:("{kw}")'
        for kw in [
            settings.gmail_policybazaar_subject_keyword,
            settings.gmail_policybazaar_car_subject_keyword,
            settings.gmail_policybazaar_cv_subject_keyword,
        ]
        if kw
    )
    query = f"from:({settings.gmail_policybazaar_sender}) ({subject_clauses}) newer_than:{days}d"
    return client.search_message_ids(query)


def decode_pubsub_notification(pubsub_body: dict[str, Any]) -> dict[str, Any]:
    message = pubsub_body.get("message") or {}
    data = message.get("data")
    if not data:
        raise ValueError("Pub/Sub payload missing message.data")

    padding = "=" * (-len(data) % 4)
    decoded = base64.urlsafe_b64decode(f"{data}{padding}").decode("utf-8")
    return json.loads(decoded)

# Business Analytics

Revenue analytics domain for the Analytics Agent. It exposes DuckDB-backed reporting, MySQL/RDS ingestion, and lightweight insight generation under `/api/v1/business-analytics`.

## Endpoints

- `GET /api/v1/business-analytics/compare`
- `GET /api/v1/business-analytics/report?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`
- `POST /api/v1/business-analytics/sync`
- `POST /api/v1/business-analytics/policybazaar-bike/daily`
- `POST /api/v1/business-analytics/email/gmail/watch`
- `POST /api/v1/business-analytics/email/gmail/push`
- `POST /api/v1/business-analytics/email/policybazaar/backfill?days=15`

## Policybazaar Bike Affiliate Revenue

Policybazaar bike revenue is stored date-wise in DuckDB table `policybazaar_bike_daily`.
The source report is the daily Policybazaar email, and only the Bike count is used for this dashboard.

- `report_date` is the business date from the email row.
- `bike_sale_count` is the confirmed Bike count.
- `rate_per_sale` defaults to `₹200`.
- `revenue` is `bike_sale_count * rate_per_sale`.

The last 15 days must be refreshed every day because Policybazaar counts can change retroactively when leads from prior dates are purchased later.

### Gmail ingestion flow

1. Gmail sends mailbox-change notifications to Google Pub/Sub.
2. Pub/Sub calls `POST /api/v1/business-analytics/email/gmail/push`.
3. The webhook decodes Gmail `emailAddress` and `historyId`.
4. Analytics Agent calls Gmail History API for new message IDs since the stored `historyId`.
5. Matching emails are filtered by:
   - sender: `GMAIL_POLICYBAZAAR_SENDER`
   - subject keyword: `GMAIL_POLICYBAZAAR_SUBJECT_KEYWORD`
6. The email table is parsed and the `Date` + `B` columns are extracted.
7. Rows from the last `POLICYBAZAAR_REFRESH_WINDOW_DAYS` are upserted into `policybazaar_bike_daily`.
8. Processed Gmail message IDs are stored in `processed_policybazaar_emails` to make Pub/Sub retries idempotent.

### Operational endpoints

- `POST /api/v1/business-analytics/email/gmail/watch` starts or renews Gmail watch.
- `POST /api/v1/business-analytics/email/gmail/push` receives Google Pub/Sub push notifications. If `GMAIL_PUBSUB_VERIFICATION_TOKEN` is set, configure the Pub/Sub push URL with `?token=<value>`.
- `POST /api/v1/business-analytics/email/policybazaar/backfill?days=15` scans recent matching emails and upserts rows.
- `POST /api/v1/business-analytics/policybazaar-bike/daily` accepts already parsed rows for manual or external-agent ingestion.

When `ENABLE_POLICYBAZAAR_EMAIL_INGESTION=true`, screenshot/sample fallback rows no longer overwrite Policybazaar Bike rows during sync. Gmail push owns near-real-time updates, and the analytics sync loop renews watch + backfills once per day as a safety net.

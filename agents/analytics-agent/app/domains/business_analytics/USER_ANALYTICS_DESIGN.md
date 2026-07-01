# User Registration — Business Analytics Design

End-to-end Business Analytics design for the `RTO_SUMIT.user_registration` dataset
(RC read-replica). Models the warehouse, KPIs, segmentation, cohort/retention/funnel
analysis, source & platform attribution, and churn prediction using the patterns large
consumer-tech companies (Google, Amazon, Netflix, Meta, Microsoft) apply to user data.

> Scope note: this is the **Business Analytics domain** design. Steps 1–2 (fetch + analyze
> real rows) run through `ingest_user_registration()` once the RC RDS source (or a provided
> sheet/SQL dump) is reachable. Only the **last 3 days** are persisted for now (testing).

---

## 1. Source schema (`RTO_SUMIT.user_registration`, 18 columns)

| Column | Type | Analytical role |
|---|---|---|
| `id` | BIGINT | Surrogate user key |
| `user_token` | CHAR(36) | Stable anonymous id (join key) |
| `name`, `email`, `mobile_number` | VARCHAR | **PII — not persisted raw** (hashed/derived) |
| `device_id`, `fcm_token` | VARCHAR | **PII/identifiers** — kept only as `has_*` flags |
| `last_login` | DATETIME | Engagement recency |
| `last_mobile_sync` | DATETIME | App activity recency |
| `last_sync_status` | VARCHAR(10) | Sync health |
| `status` | INTEGER | Account lifecycle state |
| `created_at` | TIMESTAMP | **Cohort anchor** (signup date) |
| `updated_at`, `deleted_at` | TIMESTAMP | Mutation / soft-delete (churn signal) |
| `source` | VARCHAR | **Acquisition channel** (attribution) |
| `platform` | VARCHAR | Android / iOS / web |
| `version_code` | VARCHAR | App version (adoption) |
| `is_mobile_verification_pending` | TINYINT | Activation funnel gate |

### Privacy / governance (industry standard)
Raw direct identifiers never enter the warehouse. The warehouse table
`user_registration_events` stores: `email_hash` (md5 of normalized email), `email_domain`,
`mobile_hash`, `has_mobile`/`has_device`/`has_fcm_token` booleans, plus all non-PII
dimensions and timestamps. This preserves every analytical capability below while keeping
the warehouse PII-minimized (GDPR/DPDP-aligned, the Google/Meta "hashed identity" pattern).

---

## 2. Warehouse model (DuckDB, same pattern as other datasets)

```
user_registration_events            -- atomic, PII-masked, last-3-days window (testing)
  user_id, user_token_hash, email_hash, email_domain, mobile_hash,
  has_mobile, has_device, has_fcm_token,
  source, platform, version_code, status, is_mobile_verification_pending,
  last_sync_status, registered_at, last_login, last_mobile_sync,
  updated_at, deleted_at, registered_date, ingested_at
```

Derived marts (built on top — star-schema style, the Amazon/Microsoft approach):
- `dim_user` (one row/user, latest state) · `dim_source` · `dim_platform` · `dim_version`
- `fct_signups_daily` (signups, activations by day × source × platform)
- `fct_user_activity_daily` (DAU/active proxy via `last_login` / `last_mobile_sync`)
- `agg_cohort_retention` (signup-week cohort × weeks-since-signup retention)

---

## 3. KPIs (the metric tree)

**Acquisition** — New signups (day/week/month), signups by source/platform/version,
source mix %, week-over-week growth.
**Activation** — % mobile-verified (1 − verification_pending), % logged in ≥1×,
median time-to-first-login, % with device/FCM token (push-reachable).
**Engagement** — DAU/WAU/MAU & stickiness (DAU/MAU), login recency distribution,
`last_mobile_sync` freshness, sync success rate (`last_sync_status`).
**Retention** — D1/D7/D30 retention, cohort retention curves, rolling retention.
**Churn / health** — % never logged in, dormant (no login > N days), soft-delete rate
(`deleted_at`), predicted churn risk score.
**Quality** — data completeness per field, duplicate email/mobile rate, push-reachability %.

North-star candidate: **WAU of verified users** (acquisition × activation × retention in one).

---

## 4. Segmentation

- **Acquisition segment** — `source` (organic / referral / campaign / unknown).
- **Platform/version segment** — Android vs iOS vs web; latest vs stale `version_code`.
- **Lifecycle/RFM-style** — New · Activated · Engaged · Dormant · Churned, derived from
  `created_at`, `last_login`, `last_mobile_sync`, `deleted_at`.
- **Activation segment** — verified vs pending; push-reachable vs not.
- **Value proxy** — joinable to `challan_payment` / `service_history_payments` /
  `buy_fastag_payment` on vehicle/user to layer monetization onto behavior (the Amazon
  "behavior → LTV" linkage).

---

## 5. Cohort & retention analysis

- **Acquisition cohorts** by signup week/month (`registered_date`), tracked across
  weeks-since-signup → classic triangular retention heatmap.
- **Segment-split cohorts** — retention curve per `source` and per `platform` to see which
  channels/platforms produce sticky users (Netflix-style cohort-quality comparison).
- **Activation cohorts** — verified-at-signup vs not, to quantify activation's retention lift.
- Metrics: D1/D7/D30 retention, rolling retention, cohort half-life.

---

## 6. Funnel analysis (activation funnel)

```
Registered → Mobile verified → First login → Active (recent sync) → Retained (D7+)
```
Per-step conversion and drop-off, sliced by `source` / `platform` / `version_code`.
Surfaces, e.g., "campaign X drives signups but stalls at verification" — the Google/Meta
acquisition-quality lens, not just volume.

---

## 7. Source attribution & platform/version analysis

- **Source attribution** — signups, activation rate, D7 retention, and downstream revenue
  per `source`; rank channels by *retained/paying* users, not raw signups (last-touch from
  `source`; multi-touch when more touchpoints exist).
- **Platform analysis** — acquisition/activation/retention per `platform`; push-reachability
  (FCM) gaps by platform.
- **Version analysis** — adoption curve of `version_code`, retention/sync-success by version
  to catch a bad release (the Microsoft telemetry "version health" pattern).

---

## 8. Churn prediction

- **Heuristic v1 (ship first):** churn-risk = f(days since `last_login`, days since
  `last_mobile_sync`, `last_sync_status` failures, verification pending, never-logged-in).
  Bucketed Low/Medium/High — usable on day one.
- **ML v2:** gradient-boosted classifier (features: recency/frequency of login & sync,
  source, platform, version, activation state, tenure) → per-user churn probability,
  retrained on cohort outcomes. The standard consumer-app churn approach.
- **Activation:** High-risk + push-reachable → re-engagement notification; High-risk +
  pending verification → verification nudge. Feeds the decision layer below.

---

## 9. Implementation flow (data → decision)

1. **Ingest** — `ingest_user_registration()` attaches the RC RDS via DuckDB MySQL extension,
   projects PII-masked rows into `user_registration_events`, keeps last 3 days (testing),
   idempotent upsert on `user_id`. (Same shape as `ingestion.sync_table`.)
2. **Transform** — build `dim_*` / `fct_*` / `agg_cohort_retention` marts in DuckDB.
3. **Analytics/Insights** — repository aggregation methods (mirroring
   `GoogleAdsRepository`) expose KPIs, segments, cohorts, funnel, attribution; service layer
   computes derived rates and ranks insights.
4. **API** — `/api/v1/business-analytics/users/...` (overview, cohorts, funnel, sources,
   platforms, churn) following the existing routes pattern.
5. **Reporting** — `business-analytics-dashboard.tsx` tab: KPI cards, signups time-series,
   source/platform/version breakdowns, cohort heatmap, funnel chart, churn-risk table.
6. **Decision strategies** — channel budget reallocation toward high-retention sources,
   targeted activation/re-engagement campaigns, release-health rollback signals,
   verification-flow optimization — each tied to a KPI it should move.

---

## 10. Best-practice guardrails

PII minimization & hashing · idempotent windowed ingestion · metric definitions centralized
in the service layer (single source of truth) · cohort/retention computed in-warehouse ·
attribution ranked by retained/paying users · churn model retrained on realized outcomes ·
every dashboard metric traceable to a decision it informs.

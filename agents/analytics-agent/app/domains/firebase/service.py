from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.parse import quote

import requests

from app.config.settings import Settings
from app.domains.firebase.schemas import (
    FirebaseAnalyticsBreakdown,
    FirebaseAnalyticsDailyRow,
    FirebaseAnalyticsDimensionRow,
    FirebaseAnalyticsMetric,
    FirebaseAnalyticsSummary,
    FirebaseConfigStatus,
    FirebaseEventCatalogItem,
    FirebaseEventCatalogResponse,
    FirebaseCrashlyticsRelease,
    FirebaseCrashlyticsReportsResponse,
    FirebaseOverviewResponse,
)


FIREBASE_SCOPES = (
    "https://www.googleapis.com/auth/cloud-platform",
    "https://www.googleapis.com/auth/analytics.readonly",
    "https://www.googleapis.com/auth/firebase.readonly",
)

ANALYTICS_METRICS = (
    "activeUsers",
    "newUsers",
    "sessions",
    "screenPageViews",
    "eventCount",
    "userEngagementDuration",
)

ANALYTICS_BREAKDOWNS = (
    {
        "name": "Top events",
        "dimension": "eventName",
        "metrics": ("eventCount", "activeUsers"),
        "order_metric": "eventCount",
    },
    {
        "name": "Top screens",
        "dimension": "unifiedScreenName",
        "metrics": ("screenPageViews", "activeUsers", "userEngagementDuration"),
        "order_metric": "screenPageViews",
    },
    {
        "name": "App versions",
        "dimension": "appVersion",
        "metrics": ("activeUsers", "sessions", "eventCount"),
        "order_metric": "activeUsers",
    },
    {
        "name": "Operating systems",
        "dimension": "operatingSystemVersion",
        "metrics": ("activeUsers", "sessions", "eventCount"),
        "order_metric": "activeUsers",
    },
    {
        "name": "Countries",
        "dimension": "country",
        "metrics": ("activeUsers", "newUsers", "sessions"),
        "order_metric": "activeUsers",
    },
    {
        "name": "Cities",
        "dimension": "city",
        "metrics": ("activeUsers", "newUsers", "sessions"),
        "order_metric": "activeUsers",
    },
    {
        "name": "Traffic sources",
        "dimension": "sessionSourceMedium",
        "metrics": ("activeUsers", "newUsers", "sessions"),
        "order_metric": "sessions",
    },
    {
        "name": "Device models",
        "dimension": "mobileDeviceModel",
        "metrics": ("activeUsers", "sessions", "eventCount"),
        "order_metric": "activeUsers",
    },
)


class FirebaseConfigError(ValueError):
    pass


class FirebaseApiError(RuntimeError):
    pass


class FirebaseService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def config_status(self) -> FirebaseConfigStatus:
        missing: list[str] = []
        if not self.settings.firebase_project_id:
            missing.append("FIREBASE_PROJECT_ID")
        if not self.settings.firebase_ga4_property_id:
            missing.append("FIREBASE_GA4_PROPERTY_ID")
        if not self.settings.firebase_android_app_id:
            missing.append("FIREBASE_ANDROID_APP_ID")
        if not self.settings.google_application_credentials:
            missing.append("GOOGLE_APPLICATION_CREDENTIALS")
        elif not Path(self.settings.google_application_credentials).expanduser().exists():
            missing.append("GOOGLE_APPLICATION_CREDENTIALS file not found")

        return FirebaseConfigStatus(
            project_id=self.settings.firebase_project_id,
            ga4_property_id=self.settings.firebase_ga4_property_id,
            android_app_id=self.settings.firebase_android_app_id,
            service_account_configured=not any(item.startswith("GOOGLE_APPLICATION_CREDENTIALS") for item in missing),
            missing=missing,
        )

    def analytics_summary(self, days: int = 7) -> FirebaseAnalyticsSummary:
        self._require("FIREBASE_PROJECT_ID", self.settings.firebase_project_id)
        property_id = self._require("FIREBASE_GA4_PROPERTY_ID", self.settings.firebase_ga4_property_id)
        project_id = self._require("FIREBASE_PROJECT_ID", self.settings.firebase_project_id)
        token = self._access_token()
        days = max(1, min(days, 90))

        payload = {
            "dateRanges": [{"startDate": f"{days}daysAgo", "endDate": "today"}],
            "dimensions": [{"name": "date"}],
            "metrics": [{"name": metric} for metric in ANALYTICS_METRICS],
            "orderBys": [{"dimension": {"dimensionName": "date"}}],
        }
        data = self._request(
            "POST",
            f"https://analyticsdata.googleapis.com/v1beta/properties/{property_id}:runReport",
            token,
            json=payload,
        )

        metric_names = [header.get("name", "") for header in data.get("metricHeaders", [])]
        totals = {metric_name: 0.0 for metric_name in metric_names}
        daily: list[FirebaseAnalyticsDailyRow] = []

        for row in data.get("rows", []):
            raw_date = row.get("dimensionValues", [{}])[0].get("value", "")
            metrics: dict[str, float] = {}
            for metric_name, metric_value in zip(metric_names, row.get("metricValues", []), strict=False):
                value = _to_float(metric_value.get("value"))
                metrics[metric_name] = value
                totals[metric_name] = totals.get(metric_name, 0.0) + value
            daily.append(FirebaseAnalyticsDailyRow(date=_format_ga_date(raw_date), metrics=metrics))

        return FirebaseAnalyticsSummary(
            project_id=project_id,
            property_id=property_id,
            days=days,
            generated_at=datetime.now(UTC),
            totals=[
                FirebaseAnalyticsMetric(name=metric_name, value=value)
                for metric_name, value in totals.items()
            ],
            daily=daily,
            breakdowns=self._analytics_breakdowns(property_id, token, days),
        )

    def list_events(
        self,
        days: int = 30,
        limit: int = 500,
        start_date: str | None = None,
        end_date: str | None = None,
    ) -> FirebaseEventCatalogResponse:
        property_id = self._require("FIREBASE_GA4_PROPERTY_ID", self.settings.firebase_ga4_property_id)
        token = self._access_token()
        days = max(1, min(days, 90))

        # Explicit YYYY-MM-DD range (from the dashboard filter) takes priority;
        # otherwise fall back to a relative "Ndays ago" window.
        if start_date and end_date:
            date_range = {"startDate": start_date, "endDate": end_date}
        else:
            date_range = {"startDate": f"{days}daysAgo", "endDate": "today"}

        payload = {
            "dateRanges": [date_range],
            "dimensions": [{"name": "eventName"}],
            "metrics": [{"name": "eventCount"}, {"name": "totalUsers"}],
            "orderBys": [{"metric": {"metricName": "eventCount"}, "desc": True}],
            "limit": max(1, min(limit, 5000)),
        }
        data = self._request(
            "POST",
            f"https://analyticsdata.googleapis.com/v1beta/properties/{property_id}:runReport",
            token,
            json=payload,
        )

        metric_names = [header.get("name", "") for header in data.get("metricHeaders", [])]
        events: list[FirebaseEventCatalogItem] = []
        for row in data.get("rows", []):
            event_name = row.get("dimensionValues", [{}])[0].get("value", "")
            if not event_name:
                continue
            metrics = {
                metric_name: _to_float(metric_value.get("value"))
                for metric_name, metric_value in zip(metric_names, row.get("metricValues", []), strict=False)
            }
            events.append(
                FirebaseEventCatalogItem(
                    event_name=event_name,
                    label=_humanize_event(event_name),
                    event_count=int(metrics.get("eventCount", 0.0)),
                    total_users=int(metrics.get("totalUsers", 0.0)),
                )
            )

        return FirebaseEventCatalogResponse(
            property_id=property_id,
            days=days,
            generated_at=datetime.now(UTC),
            events=events,
        )

    def crashlytics_reports(self, page_size: int = 20) -> FirebaseCrashlyticsReportsResponse:
        project_id = self._require("FIREBASE_PROJECT_ID", self.settings.firebase_project_id)
        app_id = self._require("FIREBASE_ANDROID_APP_ID", self.settings.firebase_android_app_id)
        token = self._access_token()
        escaped_app_id = quote(app_id, safe="")

        # Use Firebase Management API to list Android app releases (app distribution).
        # Crashlytics crash data is only available via BigQuery export — not through REST.
        try:
            data = self._request(
                "GET",
                f"https://firebaseappdistribution.googleapis.com/v1/projects/{project_id}/apps/{escaped_app_id}/releases",
                token,
                params={"pageSize": min(page_size, 100)},
            )
            releases = [
                FirebaseCrashlyticsRelease(
                    name=release.get("name", ""),
                    display_version=release.get("displayVersion"),
                    build_version=release.get("buildVersion"),
                    create_time=release.get("createTime"),
                    crashlytics_report=release,
                )
                for release in data.get("releases", [])
            ]
        except FirebaseApiError:
            releases = []

        return FirebaseCrashlyticsReportsResponse(
            project_id=project_id,
            app_id=app_id,
            generated_at=datetime.now(UTC),
            releases=releases,
        )

    def _analytics_breakdowns(
        self,
        property_id: str,
        token: str,
        days: int,
    ) -> list[FirebaseAnalyticsBreakdown]:
        breakdowns: list[FirebaseAnalyticsBreakdown] = []
        for config in ANALYTICS_BREAKDOWNS:
            try:
                breakdowns.append(
                    self._analytics_breakdown(
                        property_id=property_id,
                        token=token,
                        days=days,
                        name=str(config["name"]),
                        dimension=str(config["dimension"]),
                        metrics=tuple(config["metrics"]),
                        order_metric=str(config["order_metric"]),
                    )
                )
            except FirebaseApiError:
                breakdowns.append(
                    FirebaseAnalyticsBreakdown(
                        name=str(config["name"]),
                        dimension=str(config["dimension"]),
                        rows=[],
                    )
                )
        return breakdowns

    def _analytics_breakdown(
        self,
        *,
        property_id: str,
        token: str,
        days: int,
        name: str,
        dimension: str,
        metrics: tuple[str, ...],
        order_metric: str,
    ) -> FirebaseAnalyticsBreakdown:
        payload = {
            "dateRanges": [{"startDate": f"{days}daysAgo", "endDate": "today"}],
            "dimensions": [{"name": dimension}],
            "metrics": [{"name": metric} for metric in metrics],
            "orderBys": [{"metric": {"metricName": order_metric}, "desc": True}],
            "limit": 10,
        }
        data = self._request(
            "POST",
            f"https://analyticsdata.googleapis.com/v1beta/properties/{property_id}:runReport",
            token,
            json=payload,
        )
        metric_names = [header.get("name", "") for header in data.get("metricHeaders", [])]
        rows = []
        for row in data.get("rows", []):
            dimension_value = row.get("dimensionValues", [{}])[0].get("value", "(not set)")
            metric_values = {
                metric_name: _to_float(metric_value.get("value"))
                for metric_name, metric_value in zip(metric_names, row.get("metricValues", []), strict=False)
            }
            rows.append(FirebaseAnalyticsDimensionRow(dimension=dimension_value, metrics=metric_values))
        return FirebaseAnalyticsBreakdown(name=name, dimension=dimension, rows=rows)

    def overview(self, days: int = 7) -> FirebaseOverviewResponse:
        config = self.config_status()
        errors: list[str] = []
        analytics: FirebaseAnalyticsSummary | None = None
        crashlytics: FirebaseCrashlyticsReportsResponse | None = None

        try:
            analytics = self.analytics_summary(days)
        except Exception as exc:
            errors.append(f"Analytics: {exc}")

        try:
            crashlytics = self.crashlytics_reports()
        except Exception as exc:
            errors.append(f"Crashlytics: {exc}")

        return FirebaseOverviewResponse(
            config=config,
            analytics=analytics,
            crashlytics=crashlytics,
            errors=errors,
        )

    def _access_token(self) -> str:
        credentials_path = self._require(
            "GOOGLE_APPLICATION_CREDENTIALS",
            self.settings.google_application_credentials,
        )
        try:
            from google.auth.transport.requests import Request
            from google.oauth2 import service_account
        except ImportError as exc:
            raise FirebaseConfigError(
                "Firebase connector dependencies are not installed. Run `python3 -m pip install -e agents/analytics-agent` from the repository root."
            ) from exc

        expanded_path = Path(credentials_path).expanduser()
        if not expanded_path.exists():
            raise FirebaseConfigError(f"GOOGLE_APPLICATION_CREDENTIALS file not found: {expanded_path}")

        credentials = service_account.Credentials.from_service_account_file(
            str(expanded_path),
            scopes=FIREBASE_SCOPES,
        )
        credentials.refresh(Request())
        if not credentials.token:
            raise FirebaseConfigError("Could not create Google access token from service account")
        return credentials.token

    def _request(self, method: str, url: str, token: str, **kwargs: Any) -> dict[str, Any]:
        response = requests.request(
            method,
            url,
            headers={"Authorization": f"Bearer {token}"},
            timeout=self.settings.firebase_request_timeout_seconds,
            **kwargs,
        )
        if response.status_code >= 400:
            raise FirebaseApiError(f"{response.status_code} {response.text}")
        return response.json()

    @staticmethod
    def _require(name: str, value: str | None) -> str:
        if not value:
            raise FirebaseConfigError(f"{name} is not configured")
        return value


def _to_float(value: str | None) -> float:
    if value is None:
        return 0.0
    try:
        return float(value)
    except ValueError:
        return 0.0


def _humanize_event(event_name: str) -> str:
    cleaned = event_name.replace("_", " ").strip()
    return " ".join(word.capitalize() if word.islower() else word for word in cleaned.split())


def _format_ga_date(value: str) -> str:
    if len(value) != 8:
        return value
    return f"{value[0:4]}-{value[4:6]}-{value[6:8]}"

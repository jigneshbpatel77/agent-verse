from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation
from threading import Lock
from typing import Any

import requests

from app.config.settings import Settings

CAMPAIGN_DAILY_PATH = "/api/v1/analytics/google-ads/campaign-daily"
LOGIN_PATH = "/api/auth/login"
PAGE_LIMIT = 50


class GoogleAdsConfigError(ValueError):
    pass


class GoogleAdsApiError(RuntimeError):
    pass


class _TokenCache:
    """Process-wide bearer token cache so we don't re-login on every request."""

    def __init__(self) -> None:
        self._lock = Lock()
        self._token: str | None = None
        self._expires_at: datetime | None = None

    def get(self) -> str | None:
        with self._lock:
            if self._token and self._expires_at and datetime.now() < self._expires_at:
                return self._token
            return None

    def set(self, token: str, ttl_seconds: int) -> None:
        with self._lock:
            self._token = token
            self._expires_at = datetime.now() + timedelta(seconds=ttl_seconds)

    def clear(self) -> None:
        with self._lock:
            self._token = None
            self._expires_at = None


_token_cache = _TokenCache()


class GoogleAdsApiClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def fetch_campaign_daily(
        self,
        from_date: date,
        to_date: date,
        platform: str | None = None,
    ) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        page = 1

        while True:
            params: dict[str, Any] = {
                "from_date": from_date.strftime("%d/%m/%Y"),
                "to_date": to_date.strftime("%d/%m/%Y"),
                "page": page,
                "limit": PAGE_LIMIT,
            }
            if platform:
                params["platform"] = platform

            page_rows = self._request_campaign_daily_page(params)
            rows.extend(page_rows)

            if len(page_rows) < PAGE_LIMIT:
                break
            page += 1

        return rows

    def _request_campaign_daily_page(self, params: dict[str, Any], retried: bool = False) -> list[dict[str, Any]]:
        token = self._access_token()
        response = requests.get(
            f"{self.settings.vehicleinfo_dashboard_base_url}{CAMPAIGN_DAILY_PATH}",
            params=params,
            headers={
                "Content-Type": "application/json",
                "X-API-Key": self._require("VEHICLEINFO_DASHBOARD_API_KEY", self.settings.vehicleinfo_dashboard_api_key),
                "Authorization": f"Bearer {token}",
            },
            timeout=self.settings.google_ads_request_timeout_seconds,
        )

        if response.status_code == 401 and not retried:
            _token_cache.clear()
            return self._request_campaign_daily_page(params, retried=True)

        if response.status_code >= 400:
            raise GoogleAdsApiError(f"{response.status_code} {response.text}")

        return _extract_rows(response.json())

    def _access_token(self) -> str:
        cached = _token_cache.get()
        if cached:
            return cached

        email = self._require("VEHICLEINFO_DASHBOARD_EMAIL", self.settings.vehicleinfo_dashboard_email)
        password = self._require("VEHICLEINFO_DASHBOARD_PASSWORD", self.settings.vehicleinfo_dashboard_password)

        response = requests.post(
            f"{self.settings.vehicleinfo_dashboard_base_url}{LOGIN_PATH}",
            json={"email": email, "password": password},
            headers={"Content-Type": "application/json"},
            timeout=self.settings.google_ads_request_timeout_seconds,
        )
        if response.status_code >= 400:
            raise GoogleAdsApiError(f"Login failed: {response.status_code} {response.text}")

        token = _extract_token(response.json())
        if not token:
            raise GoogleAdsApiError("Login response did not contain a bearer token")

        _token_cache.set(token, self.settings.google_ads_auth_token_ttl_seconds)
        return token

    @staticmethod
    def _require(name: str, value: str | None) -> str:
        if not value:
            raise GoogleAdsConfigError(f"{name} is not configured")
        return value


def _extract_token(payload: dict[str, Any]) -> str | None:
    data = payload.get("data") if isinstance(payload.get("data"), dict) else payload
    for key in ("token", "access_token", "bearer_token", "accessToken"):
        token = data.get(key)
        if isinstance(token, str) and token:
            return token
    return None


def _extract_rows(payload: dict[str, Any]) -> list[dict[str, Any]]:
    data = payload.get("data", payload)
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        for key in ("items", "results", "rows", "records"):
            items = data.get(key)
            if isinstance(items, list):
                return items
    return []


def to_decimal(value: Any) -> Decimal:
    if value is None:
        return Decimal("0.0")
    try:
        return Decimal(str(value))
    except InvalidOperation:
        return Decimal("0.0")

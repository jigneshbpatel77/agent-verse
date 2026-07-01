from dataclasses import dataclass
from datetime import date, timedelta

from app.domains.business_analytics.repositories import BusinessAnalyticsRepository
from app.domains.business_analytics.services import BusinessAnalyticsService


@dataclass
class BusinessAnalyticsState:
    start_date: date | None = None
    end_date: date | None = None
    report: dict | None = None


def generate_business_report_node(state: BusinessAnalyticsState) -> BusinessAnalyticsState:
    end_date = state.end_date or date.today()
    start_date = state.start_date or (end_date - timedelta(days=6))
    service = BusinessAnalyticsService(BusinessAnalyticsRepository())
    state.report = service.generate_revenue_report(start_date, end_date).model_dump(mode="json")
    return state

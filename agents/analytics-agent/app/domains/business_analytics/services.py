from datetime import date, timedelta
from decimal import Decimal

from app.domains.business_analytics.repositories import BusinessAnalyticsRepository
from app.domains.business_analytics.schemas import BudgetVsActual, BusinessRevenueReport, DataSources
from app.domains.google_ads.repository import GoogleAdsRepository


class BusinessAnalyticsService:
    def __init__(self, repository: BusinessAnalyticsRepository, ad_repository: GoogleAdsRepository | None = None):
        self.repository = repository
        self.ad_repository = ad_repository or GoogleAdsRepository()

    def generate_revenue_report(self, start_date: date, end_date: date) -> BusinessRevenueReport:
        daily_metrics = self.repository.fetch_daily_revenue_metrics(start_date, end_date)
        service_revenue = self.repository.fetch_service_revenue_metrics(start_date, end_date)
        insurance_revenue = self.repository.fetch_insurance_revenue_metrics(start_date, end_date)
        total_convenience_fees = Decimal("0.0")
        total_vendor_payouts = Decimal("0.0")
        total_gateway_fees = Decimal("0.0")
        total_user_refunds = Decimal("0.0")
        total_net_revenue = Decimal("0.0")

        for metric in daily_metrics:
            total_convenience_fees += metric.convenience_fees
            total_vendor_payouts += metric.vendor_payouts
            total_gateway_fees += metric.gateway_fees
            total_user_refunds += metric.user_refunds
            total_net_revenue += metric.net_revenue

        suggestions: list[str] = []
        anomalies_detected = False

        if total_net_revenue < 0:
            anomalies_detected = True
            suggestions.append("Net cashflow is negative. Review refund levels, vendor payouts, and gateway fees.")

        if total_gateway_fees > (total_convenience_fees * Decimal("0.05")):
            suggestions.append("Gateway fees exceed 5% of inflow. Review provider pricing or routing rules.")

        if total_user_refunds > (total_convenience_fees * Decimal("0.10")):
            anomalies_detected = True
            suggestions.append("Refunds exceed 10% of inflow. Audit payment failure and reversal patterns.")

        if not suggestions:
            suggestions.append("Cashflow and processing metrics are within expected operating thresholds.")

        period_days = (end_date - start_date).days + 1
        previous_end_date = start_date - timedelta(days=1)
        previous_start_date = previous_end_date - timedelta(days=period_days - 1)
        previous_daily_metrics = self.repository.fetch_daily_revenue_metrics(previous_start_date, previous_end_date)
        previous_net_revenue = sum((metric.net_revenue for metric in previous_daily_metrics), Decimal("0.0"))
        previous_total_vendor_payouts = sum((metric.vendor_payouts for metric in previous_daily_metrics), Decimal("0.0"))
        previous_total_gateway_fees = sum((metric.gateway_fees for metric in previous_daily_metrics), Decimal("0.0"))
        previous_total_user_refunds = sum((metric.user_refunds for metric in previous_daily_metrics), Decimal("0.0"))
        previous_service_revenue = self.repository.fetch_service_revenue_metrics(previous_start_date, previous_end_date)
        previous_insurance_revenue = self.repository.fetch_insurance_revenue_metrics(previous_start_date, previous_end_date)
        previous_total_service_revenue = sum((metric.amount for metric in previous_service_revenue), Decimal("0.0"))
        previous_total_insurance_revenue = sum((metric.revenue for metric in previous_insurance_revenue), Decimal("0.0"))

        campaign_rows = self.ad_repository.fetch_campaign_daily(start_date, end_date)
        previous_campaign_rows = self.ad_repository.fetch_campaign_daily(previous_start_date, previous_end_date)
        ad_spend_total = sum((row.spend for row in campaign_rows), Decimal("0.0"))
        ad_installs_total = sum(row.installs for row in campaign_rows)
        ad_clicks_total = sum(row.clicks for row in campaign_rows)
        previous_ad_spend_total = sum((row.spend for row in previous_campaign_rows), Decimal("0.0"))

        budget_vs_actual = None
        rows_with_target = [row for row in campaign_rows if row.target_cpa > 0]
        if rows_with_target:
            budget_vs_actual = BudgetVsActual(
                target_cpa=sum((row.target_cpa for row in rows_with_target), Decimal("0.0")) / len(rows_with_target),
                actual_cpa=sum((row.cpa for row in rows_with_target), Decimal("0.0")) / len(rows_with_target),
            )

        return BusinessRevenueReport(
            start_date=start_date,
            end_date=end_date,
            daily_metrics=daily_metrics,
            service_revenue=service_revenue,
            insurance_revenue=insurance_revenue,
            total_convenience_fees=total_convenience_fees,
            total_vendor_payouts=total_vendor_payouts,
            total_gateway_fees=total_gateway_fees,
            total_user_refunds=total_user_refunds,
            total_net_revenue=total_net_revenue,
            anomalies_detected=anomalies_detected,
            suggestions=suggestions,
            ad_spend_total=ad_spend_total,
            ad_installs_total=ad_installs_total,
            ad_clicks_total=ad_clicks_total,
            previous_total_net_revenue=previous_net_revenue,
            previous_total_vendor_payouts=previous_total_vendor_payouts,
            previous_total_gateway_fees=previous_total_gateway_fees,
            previous_total_user_refunds=previous_total_user_refunds,
            previous_total_service_revenue=previous_total_service_revenue,
            previous_total_insurance_revenue=previous_total_insurance_revenue,
            previous_ad_spend_total=previous_ad_spend_total,
            budget_vs_actual=budget_vs_actual,
            data_sources=DataSources(ad_spend="live" if campaign_rows else "unavailable"),
        )

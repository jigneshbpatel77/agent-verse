'use client';

import { ApiClient } from '@/api/client';
import { CACCalculator } from '@/components/business-analytics/CACCalculator';
import { CampaignAnalytics } from '@/components/business-analytics/CampaignAnalytics';
import { DashboardTabs } from '@/components/business-analytics/DashboardTabs';
import { DateRangeFilter } from '@/components/business-analytics/DateRangeFilter';
import { InsuranceRevenueCard } from '@/components/business-analytics/InsuranceRevenueCard';
import { ServiceFunnelAnalytics } from '@/components/business-analytics/ServiceFunnelAnalytics';
import { ServiceRevenueCards } from '@/components/business-analytics/ServiceRevenueCards';
import { SummaryCards } from '@/components/business-analytics/SummaryCards';
import { UserAnalytics } from '@/components/business-analytics/UserAnalytics';
import { UserMetrics } from '@/components/business-analytics/UserMetrics';
import {
  businessAnalyticsMock,
  getBusinessAnalyticsForRange,
  type BusinessAnalyticsMock,
  type InsuranceRevenueKey,
  type ServiceRevenueKey,
  type SpendBreakdownMock,
} from '@/data/businessAnalyticsMock';
import { useEffect, useMemo, useState } from 'react';

type NumericApiValue = number | string | null | undefined;

interface ServiceRevenueApiMetric {
  key: string;
  title: string;
  description: string;
  amount: NumericApiValue;
  record_count: number;
}

interface InsuranceRevenueApiMetric {
  key: string;
  title: string;
  rate_per_sale: NumericApiValue;
  sale_count: number;
  revenue: NumericApiValue;
}

interface BudgetVsActualApi {
  target_cpa: NumericApiValue;
  actual_cpa: NumericApiValue;
}

interface DataSourcesApi {
  ad_spend: 'live' | 'unavailable';
}

interface BusinessRevenueReportApi {
  start_date: string;
  end_date: string;
  service_revenue?: ServiceRevenueApiMetric[];
  insurance_revenue?: InsuranceRevenueApiMetric[];
  total_convenience_fees: NumericApiValue;
  total_vendor_payouts: NumericApiValue;
  total_gateway_fees: NumericApiValue;
  total_user_refunds: NumericApiValue;
  total_net_revenue: NumericApiValue;
  ad_spend_total: NumericApiValue;
  ad_installs_total: NumericApiValue;
  ad_clicks_total: NumericApiValue;
  previous_total_net_revenue: NumericApiValue;
  previous_total_vendor_payouts: NumericApiValue;
  previous_total_gateway_fees: NumericApiValue;
  previous_total_user_refunds: NumericApiValue;
  previous_total_service_revenue: NumericApiValue;
  previous_total_insurance_revenue: NumericApiValue;
  previous_ad_spend_total: NumericApiValue;
  budget_vs_actual?: BudgetVsActualApi | null;
  data_sources?: DataSourcesApi;
}

export default function BusinessAnalyticsDashboard() {
  const [dateRange, setDateRange] = useState(businessAnalyticsMock.dateRange);
  const [liveReport, setLiveReport] = useState<BusinessRevenueReportApi | null>(null);
  const [isLoadingLiveReport, setIsLoadingLiveReport] = useState(true);
  const [liveReportError, setLiveReportError] = useState<string | null>(null);
  const fallbackAnalytics = useMemo(() => getBusinessAnalyticsForRange(dateRange), [dateRange]);
  const liveAnalytics = useMemo(
    () => (liveReport ? mergeLiveReportIntoAnalytics(fallbackAnalytics, liveReport) : null),
    [fallbackAnalytics, liveReport],
  );
  const analytics = liveAnalytics ?? fallbackAnalytics;

  useEffect(() => {
    const controller = new AbortController();
    const client = new ApiClient({ baseUrl: window.location.origin });
    const params = new URLSearchParams({
      start_date: dateRange.startDate,
      end_date: dateRange.endDate,
    });

    setIsLoadingLiveReport(true);
    setLiveReportError(null);
    setLiveReport(null);

    client
      .get<BusinessRevenueReportApi>(`/api/analytics-agent/api/v1/business-analytics/report?${params.toString()}`, {
        cache: 'no-store',
        signal: controller.signal,
      })
      .then((report) => {
        if (controller.signal.aborted) {
          return;
        }
        setLiveReport(report);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setLiveReport(null);
        setLiveReportError(`Live RDS/DuckDB report unavailable; showing fallback data. ${getErrorMessage(error)}`);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingLiveReport(false);
        }
      });

    return () => controller.abort();
  }, [dateRange]);

  const dataSourceLabel = liveAnalytics
    ? 'Live DuckDB for service revenue and Policybazaar insurance revenue (Bike/Car/CV); mock placeholders for non-integrated sections'
    : 'Static fallback mock data';

  return (
    <div className="space-y-6">
      <div className="sticky top-[72px] z-20 -mx-1 px-1 pb-1 pt-1">
        <DateRangeFilter
          range={analytics.dateRange}
          onApply={setDateRange}
          dataSourceLabel={dataSourceLabel}
          isLoading={isLoadingLiveReport}
          errorMessage={liveReportError}
        />
      </div>

      <SummaryCards summary={analytics.summary} isLive={Boolean(liveAnalytics)} />

      <DashboardTabs
        tabs={[
          {
            key: 'spend',
            label: 'Spend',
            content: <CampaignAnalytics startDate={dateRange.startDate} endDate={dateRange.endDate} />,
          },
          {
            key: 'revenue',
            label: 'Revenue',
            content: (
              <>
                <ServiceRevenueCards
                  services={analytics.serviceRevenue}
                  totalAdSpend={analytics.summary.adSpendTotal}
                />
                <InsuranceRevenueCard
                  insuranceRevenue={analytics.insuranceRevenue}
                  note={analytics.insuranceReportNote}
                />
              </>
            ),
          },
          {
            key: 'funnel',
            label: 'Funnel',
            content: (
              <>
                <ServiceFunnelAnalytics startDate={dateRange.startDate} endDate={dateRange.endDate} />
                <CACCalculator
                  key={`${dateRange.startDate}-${dateRange.endDate}`}
                  calculator={analytics.cacCalculator}
                />
              </>
            ),
          },
          {
            key: 'engagement',
            label: 'Engagement',
            content: <UserMetrics userMetrics={analytics.userMetrics} />,
          },
          {
            key: 'users',
            label: 'Users',
            content: <UserAnalytics />,
          },
        ]}
      />
    </div>
  );
}

const serviceKeys = new Set<ServiceRevenueKey>(['challan', 'service-history', 'fastag']);
const insuranceKeys = new Set<InsuranceRevenueKey>(['bike', 'car', 'cv']);

function mergeLiveReportIntoAnalytics(
  fallbackAnalytics: BusinessAnalyticsMock,
  report: BusinessRevenueReportApi,
): BusinessAnalyticsMock | null {
  const fallbackByKey = new Map(fallbackAnalytics.serviceRevenue.map((service) => [service.key, service]));
  const serviceRevenue =
    report.service_revenue
      ?.flatMap((service) => {
        if (!isServiceRevenueKey(service.key)) {
          return [];
        }
        const key = service.key;
        const fallback = fallbackByKey.get(key);
        return [{
          key,
          title: service.title || fallback?.title || key,
          description: service.description || fallback?.description || '',
          amount: toNumber(service.amount),
          recordCount: service.record_count ?? 0,
        }];
      }) ?? [];

  if (serviceRevenue.length === 0) {
    return null;
  }

  const totalRevenue = serviceRevenue.reduce((sum, service) => sum + service.amount, 0);
  const INSURANCE_TITLES: Record<InsuranceRevenueKey, string> = { bike: 'Bike', car: 'Car', cv: 'CV' };
  const apiInsuranceRevenue =
    report.insurance_revenue?.flatMap((item) => {
      if (!isInsuranceRevenueKey(item.key)) return [];
      const key = item.key;
      return [{
        key,
        title: item.title || INSURANCE_TITLES[key],
        ratePerSale: toNumber(item.rate_per_sale),
        saleCount: item.sale_count ?? 0,
        revenue: toNumber(item.revenue),
      }];
    }) ?? [];
  const insuranceRevenue = apiInsuranceRevenue.length > 0 ? apiInsuranceRevenue : fallbackAnalytics.insuranceRevenue;
  const totalInsuranceRevenue = insuranceRevenue.reduce((sum, item) => sum + item.revenue, 0);
  const adSpendTotal = toNumber(report.ad_spend_total);
  const previousAdSpendTotal = toNumber(report.previous_ad_spend_total);
  const totalSpend =
    toNumber(report.total_vendor_payouts) +
    toNumber(report.total_gateway_fees) +
    toNumber(report.total_user_refunds) +
    adSpendTotal;
  const previousTotalRevenue =
    toNumber(report.previous_total_service_revenue) + toNumber(report.previous_total_insurance_revenue);
  const previousTotalSpend =
    toNumber(report.previous_total_vendor_payouts) +
    toNumber(report.previous_total_gateway_fees) +
    toNumber(report.previous_total_user_refunds) +
    previousAdSpendTotal;
  const adInstallsTotal = toNumber(report.ad_installs_total);
  const adSpendSource: 'live' | 'estimated' = report.data_sources?.ad_spend === 'live' ? 'live' : 'estimated';
  const budgetVsActual = report.budget_vs_actual
    ? {
        targetCpa: toNumber(report.budget_vs_actual.target_cpa),
        actualCpa: toNumber(report.budget_vs_actual.actual_cpa),
      }
    : undefined;

  return {
    ...fallbackAnalytics,
    dateRange: {
      startDate: report.start_date || fallbackAnalytics.dateRange.startDate,
      endDate: report.end_date || fallbackAnalytics.dateRange.endDate,
    },
    summary: {
      totalRevenue: totalRevenue + totalInsuranceRevenue,
      totalSpend,
      previousTotalRevenue,
      previousTotalSpend,
      adSpendTotal,
      adInstallsTotal,
      adSpendSource,
      budgetVsActual,
    },
    serviceRevenue,
    insuranceRevenue,
    spendBreakdown:
      totalSpend > 0
        ? scaleSpendBreakdown(fallbackAnalytics.spendBreakdown, totalSpend)
        : fallbackAnalytics.spendBreakdown,
    cacCalculator: {
      ...fallbackAnalytics.cacCalculator,
      revenueForEfficiency: totalRevenue + totalInsuranceRevenue,
    },
  };
}

function isServiceRevenueKey(key: string): key is ServiceRevenueKey {
  return serviceKeys.has(key as ServiceRevenueKey);
}

function isInsuranceRevenueKey(key: string): key is InsuranceRevenueKey {
  return insuranceKeys.has(key as InsuranceRevenueKey);
}

function toNumber(value: NumericApiValue): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function scaleSpendBreakdown(spendBreakdown: SpendBreakdownMock, totalSpend: number): SpendBreakdownMock {
  const currentTotal = [...spendBreakdown.adSpend, ...spendBreakdown.toolsAndOther].reduce(
    (sum, item) => sum + item.amount,
    0,
  );
  const scale = currentTotal > 0 ? totalSpend / currentTotal : 0;

  return {
    adSpend: spendBreakdown.adSpend.map((item) => ({ ...item, amount: Math.round(item.amount * scale) })),
    toolsAndOther: spendBreakdown.toolsAndOther.map((item) => ({ ...item, amount: Math.round(item.amount * scale) })),
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

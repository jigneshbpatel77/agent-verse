import { calcChallanRevenue, calcOrderCollection, calcOrderRevenue } from '@/utils/challanCalculations';

export interface DateRangeMock {
  startDate: string;
  endDate: string;
}

export interface SummaryMetricMock {
  totalRevenue: number;
  totalSpend: number;
  previousTotalRevenue: number;
  previousTotalSpend: number;
  adSpendTotal: number;
  adInstallsTotal: number;
  adSpendSource: 'live' | 'estimated';
  budgetVsActual?: { targetCpa: number; actualCpa: number };
}

export type ServiceRevenueKey = 'challan' | 'service-history' | 'fastag';

export interface ServiceRevenueMock {
  key: ServiceRevenueKey;
  title: string;
  description: string;
  amount: number;
  recordCount: number;
}

export interface DailyServiceRevenueMock {
  date: string;
  spend: number;
  services: Record<ServiceRevenueKey, { amount: number; recordCount: number }>;
}

export type InsuranceRevenueKey = 'bike' | 'car' | 'cv';

export interface InsuranceRevenueMock {
  key: InsuranceRevenueKey;
  title: string;
  ratePerSale: number;
  saleCount: number;
  revenue: number;
}

interface DailyInsuranceRevenueMock {
  date: string;
  key: InsuranceRevenueKey;
  saleCount: number;
  ratePerSale: number;
}

export interface SpendItemMock {
  label: string;
  amount: number;
}

export interface SpendBreakdownMock {
  adSpend: SpendItemMock[];
  toolsAndOther: SpendItemMock[];
}

export interface CACCalculatorMock {
  totalAdSpend: number;
  whatsappCrmSpend: number;
  challanAdSpend: number;
  insuranceAdSpend: number;
  newSignupsThisMonth: number;
  challanConversions: number;
  insuranceClicks: number;
  revenueForEfficiency: number;
}

export interface UserMetricMock {
  key: 'dau' | 'mau' | 'new-signups';
  label: string;
  value: number;
  trendDirection: 'up' | 'flat';
  trendPercent: number;
}

export type Challan = {
  challan_no: string;
  challan_amount: number;
  convenience_fee: number;
  gst: number;
  challan_revenue: number;
};

export type Order = {
  order_id: string;
  reg_number: string;
  challans: Challan[];
  total_amount: number;
  order_revenue: number;
  challan_count: number;
};

export type RegNumberSummary = {
  reg_number: string;
  total_orders: number;
  total_challans: number;
  total_collection: number;
  total_revenue: number;
};

export interface BusinessAnalyticsMock {
  dateRange: DateRangeMock;
  summary: SummaryMetricMock;
  serviceRevenue: ServiceRevenueMock[];
  dailyServiceRevenue: DailyServiceRevenueMock[];
  challanOrders: Order[];
  insuranceRevenue: InsuranceRevenueMock[];
  insuranceReportNote: string;
  spendBreakdown: SpendBreakdownMock;
  cacCalculator: CACCalculatorMock;
  userMetrics: UserMetricMock[];
}

function createChallan(challan_no: string, challan_amount: number, convenience_fee: 20 | 25): Challan {
  const challan: Challan = {
    challan_no,
    challan_amount,
    convenience_fee,
    gst: Number((convenience_fee * 0.18).toFixed(2)),
    challan_revenue: 0,
  };

  return {
    ...challan,
    challan_revenue: calcChallanRevenue(challan),
  };
}

function createOrder(order_id: string, reg_number: string, challans: Challan[]): Order {
  const order: Order = {
    order_id,
    reg_number,
    challans,
    total_amount: 0,
    order_revenue: 0,
    challan_count: challans.length,
  };

  return {
    ...order,
    total_amount: calcOrderCollection(order),
    order_revenue: calcOrderRevenue(order),
  };
}

const challanOrders: Order[] = [
  createOrder('ORD-CH-1001', 'MH12AB1234', [
    createChallan('MHCH-001', 500, 20),
  ]),
  createOrder('ORD-CH-1002', 'DL8CAF5032', [
    createChallan('DLCH-101', 800, 20),
    createChallan('DLCH-102', 1200, 25),
  ]),
  createOrder('ORD-CH-1003', 'DL8CAF5032', [
    createChallan('DLCH-201', 450, 20),
  ]),
  createOrder('ORD-CH-1004', 'DL8CAF5032', [
    createChallan('DLCH-301', 1000, 25),
    createChallan('DLCH-302', 600, 20),
    createChallan('DLCH-303', 300, 20),
  ]),
  createOrder('ORD-CH-1005', 'KA03ND4421', [
    createChallan('KACH-401', 1300, 25),
    createChallan('KACH-402', 4000, 25),
    createChallan('KACH-403', 2000, 25),
    createChallan('KACH-404', 1000, 20),
  ]),
  createOrder('ORD-CH-1006', 'GJ01AB7744', [
    createChallan('GJCH-501', 700, 20),
    createChallan('GJCH-502', 900, 25),
  ]),
  createOrder('ORD-CH-1007', 'GJ01AB7744', [
    createChallan('GJCH-601', 250, 20),
  ]),
  createOrder('ORD-CH-1008', 'UP78GN7572', [
    createChallan('UPCH-701', 100, 20),
    createChallan('UPCH-702', 100, 20),
    createChallan('UPCH-703', 1000, 25),
  ]),
];

const serviceDefinitions: Array<Pick<ServiceRevenueMock, 'key' | 'title' | 'description'>> = [
  {
    key: 'challan',
    title: 'Challan payments',
    description: 'Convenience fee per payment',
  },
  {
    key: 'service-history',
    title: 'Service history',
    description: 'Agent fee + gateway fee - refunds',
  },
  {
    key: 'fastag',
    title: 'FASTag orders',
    description: 'Captured - refunded, failed count tracked',
  },
];

const dailyServiceRevenue: DailyServiceRevenueMock[] = [
  {
    date: '2026-06-18',
    spend: 96000,
    services: {
      challan: { amount: 154000, recordCount: 1040 },
      'service-history': { amount: 96200, recordCount: 641 },
      fastag: { amount: 69400, recordCount: 398 },
    },
  },
  {
    date: '2026-06-19',
    spend: 102500,
    services: {
      challan: { amount: 168500, recordCount: 1140 },
      'service-history': { amount: 103800, recordCount: 692 },
      fastag: { amount: 72600, recordCount: 417 },
    },
  },
  {
    date: '2026-06-20',
    spend: 106800,
    services: {
      challan: { amount: 176000, recordCount: 1190 },
      'service-history': { amount: 112500, recordCount: 750 },
      fastag: { amount: 75300, recordCount: 432 },
    },
  },
  {
    date: '2026-06-21',
    spend: 109400,
    services: {
      challan: { amount: 181500, recordCount: 1228 },
      'service-history': { amount: 116400, recordCount: 776 },
      fastag: { amount: 78400, recordCount: 450 },
    },
  },
  {
    date: '2026-06-22',
    spend: 111700,
    services: {
      challan: { amount: 188000, recordCount: 1270 },
      'service-history': { amount: 119800, recordCount: 799 },
      fastag: { amount: 80500, recordCount: 462 },
    },
  },
  {
    date: '2026-06-23',
    spend: 115000,
    services: {
      challan: { amount: 190000, recordCount: 8340 },
      'service-history': { amount: 122900, recordCount: 819 },
      fastag: { amount: 83200, recordCount: 478 },
    },
  },
  {
    date: '2026-06-24',
    spend: 117000,
    services: {
      challan: { amount: 190000, recordCount: 1278 },
      'service-history': { amount: 120900, recordCount: 807 },
      fastag: { amount: 84200, recordCount: 483 },
    },
  },
];

const dailyInsuranceRevenue: DailyInsuranceRevenueMock[] = [
  { date: '2026-06-10', key: 'bike', saleCount: 942, ratePerSale: 200 },
  { date: '2026-06-11', key: 'bike', saleCount: 870, ratePerSale: 200 },
  { date: '2026-06-12', key: 'bike', saleCount: 254, ratePerSale: 200 },
  { date: '2026-06-13', key: 'bike', saleCount: 943, ratePerSale: 200 },
  { date: '2026-06-14', key: 'bike', saleCount: 882, ratePerSale: 200 },
  { date: '2026-06-15', key: 'bike', saleCount: 816, ratePerSale: 200 },
  { date: '2026-06-16', key: 'bike', saleCount: 834, ratePerSale: 200 },
  { date: '2026-06-17', key: 'bike', saleCount: 791, ratePerSale: 200 },
  { date: '2026-06-18', key: 'bike', saleCount: 804, ratePerSale: 200 },
  { date: '2026-06-19', key: 'bike', saleCount: 837, ratePerSale: 200 },
  { date: '2026-06-20', key: 'bike', saleCount: 768, ratePerSale: 200 },
  { date: '2026-06-21', key: 'bike', saleCount: 699, ratePerSale: 200 },
  { date: '2026-06-22', key: 'bike', saleCount: 722, ratePerSale: 200 },
  { date: '2026-06-23', key: 'bike', saleCount: 641, ratePerSale: 200 },
  { date: '2026-06-24', key: 'bike', saleCount: 503, ratePerSale: 200 },
  { date: '2026-06-10', key: 'car', saleCount: 148, ratePerSale: 600 },
  { date: '2026-06-11', key: 'car', saleCount: 162, ratePerSale: 600 },
  { date: '2026-06-12', key: 'car', saleCount: 58, ratePerSale: 600 },
  { date: '2026-06-13', key: 'car', saleCount: 155, ratePerSale: 600 },
  { date: '2026-06-14', key: 'car', saleCount: 143, ratePerSale: 600 },
  { date: '2026-06-15', key: 'car', saleCount: 137, ratePerSale: 600 },
  { date: '2026-06-16', key: 'car', saleCount: 141, ratePerSale: 600 },
  { date: '2026-06-17', key: 'car', saleCount: 134, ratePerSale: 600 },
  { date: '2026-06-18', key: 'car', saleCount: 139, ratePerSale: 600 },
  { date: '2026-06-19', key: 'car', saleCount: 146, ratePerSale: 600 },
  { date: '2026-06-20', key: 'car', saleCount: 131, ratePerSale: 600 },
  { date: '2026-06-21', key: 'car', saleCount: 122, ratePerSale: 600 },
  { date: '2026-06-22', key: 'car', saleCount: 127, ratePerSale: 600 },
  { date: '2026-06-23', key: 'car', saleCount: 118, ratePerSale: 600 },
  { date: '2026-06-24', key: 'car', saleCount: 102, ratePerSale: 600 },
  { date: '2026-06-10', key: 'cv', saleCount: 34, ratePerSale: 1200 },
  { date: '2026-06-11', key: 'cv', saleCount: 38, ratePerSale: 1200 },
  { date: '2026-06-12', key: 'cv', saleCount: 12, ratePerSale: 1200 },
  { date: '2026-06-13', key: 'cv', saleCount: 36, ratePerSale: 1200 },
  { date: '2026-06-14', key: 'cv', saleCount: 33, ratePerSale: 1200 },
  { date: '2026-06-15', key: 'cv', saleCount: 31, ratePerSale: 1200 },
  { date: '2026-06-16', key: 'cv', saleCount: 32, ratePerSale: 1200 },
  { date: '2026-06-17', key: 'cv', saleCount: 30, ratePerSale: 1200 },
  { date: '2026-06-18', key: 'cv', saleCount: 31, ratePerSale: 1200 },
  { date: '2026-06-19', key: 'cv', saleCount: 33, ratePerSale: 1200 },
  { date: '2026-06-20', key: 'cv', saleCount: 29, ratePerSale: 1200 },
  { date: '2026-06-21', key: 'cv', saleCount: 27, ratePerSale: 1200 },
  { date: '2026-06-22', key: 'cv', saleCount: 28, ratePerSale: 1200 },
  { date: '2026-06-23', key: 'cv', saleCount: 26, ratePerSale: 1200 },
  { date: '2026-06-24', key: 'cv', saleCount: 22, ratePerSale: 1200 },
];

const defaultDateRange: DateRangeMock = {
  startDate: '2026-06-18',
  endDate: '2026-06-24',
};

const defaultSpendBreakdown: SpendBreakdownMock = {
  adSpend: [
    { label: 'WhatsApp CRM', amount: 168000 },
    { label: 'Challan ads', amount: 244000 },
    { label: 'Insurance ads', amount: 186000 },
  ],
  toolsAndOther: [
    { label: 'Agent tools', amount: 82000 },
    { label: 'Infrastructure', amount: 60400 },
    { label: 'Other expenses', amount: 18000 },
  ],
};

const defaultCACCalculator: CACCalculatorMock = {
  totalAdSpend: 598000,
  whatsappCrmSpend: 168000,
  challanAdSpend: 244000,
  insuranceAdSpend: 186000,
  newSignupsThisMonth: 18420,
  challanConversions: 12480,
  insuranceClicks: 7460,
  revenueForEfficiency: 2584100,
};

const businessAnalyticsBaseMock = {
  dateRange: defaultDateRange,
  summary: {
    totalRevenue: 0,
    totalSpend: 0,
    previousTotalRevenue: 0,
    previousTotalSpend: 0,
    adSpendTotal: defaultCACCalculator.totalAdSpend,
    adInstallsTotal: defaultCACCalculator.newSignupsThisMonth,
    adSpendSource: 'estimated',
  },
  serviceRevenue: [] as ServiceRevenueMock[],
  dailyServiceRevenue,
  challanOrders,
  insuranceRevenue: [] as InsuranceRevenueMock[],
  insuranceReportNote: 'Bike, Car & CV Policybazaar email report. Last 15 days are refreshed daily because counts can change retroactively.',
  spendBreakdown: defaultSpendBreakdown,
  cacCalculator: defaultCACCalculator,
  userMetrics: [
    {
      key: 'dau',
      label: 'DAU',
      value: 48260,
      trendDirection: 'up',
      trendPercent: 12.4,
    },
    {
      key: 'mau',
      label: 'MAU',
      value: 438900,
      trendDirection: 'up',
      trendPercent: 8.1,
    },
    {
      key: 'new-signups',
      label: 'New Signups this month',
      value: 18420,
      trendDirection: 'flat',
      trendPercent: 2.3,
    },
  ],
} satisfies BusinessAnalyticsMock;

function rowsForRange(range: DateRangeMock) {
  return dailyServiceRevenue.filter((row) => row.date >= range.startDate && row.date <= range.endDate);
}

function insuranceRowsForRange(range: DateRangeMock) {
  return dailyInsuranceRevenue.filter((row) => row.date >= range.startDate && row.date <= range.endDate);
}

function sumServiceRevenue(rows: DailyServiceRevenueMock[]): ServiceRevenueMock[] {
  return serviceDefinitions.map((definition) => ({
    ...definition,
    amount: rows.reduce((sum, row) => sum + row.services[definition.key].amount, 0),
    recordCount: rows.reduce((sum, row) => sum + row.services[definition.key].recordCount, 0),
  }));
}

const INSURANCE_DEFINITIONS: Array<{ key: InsuranceRevenueKey; title: string; defaultRate: number }> = [
  { key: 'bike', title: 'Bike', defaultRate: 200 },
  { key: 'car', title: 'Car', defaultRate: 600 },
  { key: 'cv', title: 'CV', defaultRate: 1200 },
];

function sumInsuranceRevenue(rows: DailyInsuranceRevenueMock[]): InsuranceRevenueMock[] {
  return INSURANCE_DEFINITIONS.map(({ key, title, defaultRate }) => {
    const categoryRows = rows.filter((row) => row.key === key);
    const ratePerSale = categoryRows.at(-1)?.ratePerSale ?? defaultRate;
    const saleCount = categoryRows.reduce((sum, row) => sum + row.saleCount, 0);
    return { key, title, ratePerSale, saleCount, revenue: saleCount * ratePerSale };
  });
}

function sumSpend(rows: DailyServiceRevenueMock[]) {
  return rows.reduce((sum, row) => sum + row.spend, 0);
}

function scaleSpendBreakdown(spendBreakdown: SpendBreakdownMock, totalSpend: number): SpendBreakdownMock {
  const currentTotal = [...spendBreakdown.adSpend, ...spendBreakdown.toolsAndOther].reduce((sum, item) => sum + item.amount, 0);
  const scale = currentTotal > 0 ? totalSpend / currentTotal : 0;

  return {
    adSpend: spendBreakdown.adSpend.map((item) => ({ ...item, amount: Math.round(item.amount * scale) })),
    toolsAndOther: spendBreakdown.toolsAndOther.map((item) => ({ ...item, amount: Math.round(item.amount * scale) })),
  };
}

function scaleCACCalculator(calculator: CACCalculatorMock, totalRevenue: number, totalSpend: number): CACCalculatorMock {
  const spendScale = totalSpend / 758400;

  return {
    ...calculator,
    totalAdSpend: Math.round(calculator.totalAdSpend * spendScale),
    whatsappCrmSpend: Math.round(calculator.whatsappCrmSpend * spendScale),
    challanAdSpend: Math.round(calculator.challanAdSpend * spendScale),
    insuranceAdSpend: Math.round(calculator.insuranceAdSpend * spendScale),
    revenueForEfficiency: totalRevenue,
  };
}

export function getBusinessAnalyticsForRange(range: DateRangeMock): BusinessAnalyticsMock {
  const rows = rowsForRange(range);
  const serviceRevenue = sumServiceRevenue(rows);
  const insuranceRevenue = sumInsuranceRevenue(insuranceRowsForRange(range));
  const totalRevenue =
    serviceRevenue.reduce((sum, service) => sum + service.amount, 0) +
    insuranceRevenue.reduce((sum, item) => sum + item.revenue, 0);
  const totalSpend = sumSpend(rows);

  return {
    ...businessAnalyticsBaseMock,
    dateRange: range,
    summary: {
      totalRevenue,
      totalSpend,
      previousTotalRevenue: Math.round(totalRevenue * 0.91),
      previousTotalSpend: Math.round(totalSpend * 0.96),
      adSpendTotal: defaultCACCalculator.totalAdSpend,
      adInstallsTotal: defaultCACCalculator.newSignupsThisMonth,
      adSpendSource: 'estimated',
    },
    serviceRevenue,
    insuranceRevenue,
    spendBreakdown: scaleSpendBreakdown(defaultSpendBreakdown, totalSpend),
    cacCalculator: scaleCACCalculator(defaultCACCalculator, totalRevenue, totalSpend),
  };
}

export const businessAnalyticsMock: BusinessAnalyticsMock = getBusinessAnalyticsForRange(defaultDateRange);

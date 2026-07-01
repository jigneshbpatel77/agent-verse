import type { Challan, Order, RegNumberSummary } from '@/data/businessAnalyticsMock';

export function calcChallanRevenue(c: Challan) {
  return c.convenience_fee + c.gst;
}

export function calcOrderRevenue(order: Order) {
  return order.challans.reduce((sum, c) => sum + calcChallanRevenue(c), 0);
}

export function calcOrderCollection(order: Order) {
  return order.challans.reduce(
    (sum, c) => sum + c.challan_amount + c.convenience_fee + c.gst,
    0,
  );
}

export function calcTotalStats(orders: Order[]) {
  const totalOrders = orders.length;
  const totalChallans = orders.reduce((s, o) => s + o.challans.length, 0);
  const totalCollection = orders.reduce((s, o) => s + calcOrderCollection(o), 0);
  const totalRevenue = orders.reduce((s, o) => s + calcOrderRevenue(o), 0);

  return {
    totalOrders,
    totalChallans,
    totalCollection,
    totalRevenue,
    totalChallanAmount: totalCollection - totalRevenue,
    avgRevenuePerOrder: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    avgChallansPerOrder: totalOrders > 0 ? totalChallans / totalOrders : 0,
  };
}

export function groupByRegNumber(orders: Order[]): RegNumberSummary[] {
  const grouped = new Map<string, RegNumberSummary>();

  for (const order of orders) {
    const current = grouped.get(order.reg_number) ?? {
      reg_number: order.reg_number,
      total_orders: 0,
      total_challans: 0,
      total_collection: 0,
      total_revenue: 0,
    };

    grouped.set(order.reg_number, {
      reg_number: order.reg_number,
      total_orders: current.total_orders + 1,
      total_challans: current.total_challans + order.challans.length,
      total_collection: current.total_collection + calcOrderCollection(order),
      total_revenue: current.total_revenue + calcOrderRevenue(order),
    });
  }

  return Array.from(grouped.values()).sort((a, b) => b.total_revenue - a.total_revenue);
}

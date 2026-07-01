// Mock Firebase / GA4 event catalog used by the funnel builder while the
// frontend design is being finalised. Once the backend `/firebase/funnels/events`
// endpoint is live, this list is replaced by the live event catalog (same shape).

export interface FunnelEventCatalogItem {
  /** GA4 event name (the dimension value). */
  eventName: string;
  /** Friendly label shown in the builder list. */
  label: string;
  /** Recent event count (last 30 days) — used for sorting + preview. */
  eventCount: number;
  /** Recent distinct users — used to seed funnel step previews. */
  totalUsers: number;
}

// Approximate counts taken from the GA4 "challan" event report screenshot.
export const FUNNEL_EVENT_CATALOG: FunnelEventCatalogItem[] = [
  { eventName: 'Challan_Search', label: 'Challan Search', eventCount: 2_192_156, totalUsers: 1_242_272 },
  { eventName: 'challan_vrn_entered', label: 'Challan VRN Entered', eventCount: 3_184_633, totalUsers: 1_597_768 },
  { eventName: 'Challan_Search_Success', label: 'Challan Search Success', eventCount: 9_193_798, totalUsers: 3_886_199 },
  { eventName: 'challan_list_view', label: 'Challan List View', eventCount: 1_790_954, totalUsers: 689_646 },
  { eventName: 'challan_view_web', label: 'Challan View Web', eventCount: 4_274_399, totalUsers: 2_876_771 },
  { eventName: 'challan_view_on_web', label: 'Challan View On Web', eventCount: 8_259_306, totalUsers: 1_131_814 },
  { eventName: 'challan_details_view', label: 'Challan Details View', eventCount: 1_112_749, totalUsers: 797_992 },
  { eventName: 'Challan_View_More_Info', label: 'Challan View More Info', eventCount: 1_260_543, totalUsers: 658_945 },
  { eventName: 'challan_session_start', label: 'Challan Session Start', eventCount: 1_428_246, totalUsers: 822_361 },
  { eventName: 'challan_cart', label: 'Challan Cart', eventCount: 636_541, totalUsers: 363_752 },
  { eventName: 'vi_lead_pay_challan', label: 'Lead Pay Challan', eventCount: 659_326, totalUsers: 393_513 },
  { eventName: 'fastag_reg_entered', label: 'FASTag Reg Entered', eventCount: 540_210, totalUsers: 318_400 },
  { eventName: 'fastag_balance_view', label: 'FASTag Balance View', eventCount: 421_880, totalUsers: 268_900 },
  { eventName: 'fastag_recharge_success', label: 'FASTag Recharge Success', eventCount: 148_000, totalUsers: 112_300 },
  { eventName: 'service_history_search', label: 'Service History Search', eventCount: 880_000, totalUsers: 612_000 },
  { eventName: 'service_records_found', label: 'Service Records Found', eventCount: 680_000, totalUsers: 498_000 },
  { eventName: 'payment_gateway_redirect', label: 'Payment Gateway Redirect', eventCount: 512_000, totalUsers: 401_200 },
  { eventName: 'payment_success', label: 'Payment Success', eventCount: 375_960, totalUsers: 312_400 },
];

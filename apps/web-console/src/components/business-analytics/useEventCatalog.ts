'use client';

import { useEffect, useState } from 'react';
import { ApiClient } from '@/api/client';
import { FUNNEL_EVENT_CATALOG, type FunnelEventCatalogItem } from '@/data/funnelEventsMock';

interface FunnelEventsApiResponse {
  events?: Array<{
    event_name: string;
    label: string;
    event_count: number;
    total_users: number;
  }>;
}

/**
 * Fetches the live GA4 event catalog scoped to the given date range.
 * Refetches whenever the range changes; falls back to the bundled mock offline.
 */
export function useEventCatalog(startDate?: string, endDate?: string) {
  const [catalog, setCatalog] = useState<FunnelEventCatalogItem[]>(FUNNEL_EVENT_CATALOG);
  const [loading, setLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const params = new URLSearchParams({ days: '30', limit: '5000' });
    if (startDate && endDate) {
      params.set('start_date', startDate);
      params.set('end_date', endDate);
    }

    const client = new ApiClient({ baseUrl: window.location.origin });
    client
      .get<FunnelEventsApiResponse>(`/api/analytics-agent/api/v1/firebase/funnels/events?${params.toString()}`)
      .then((data) => {
        if (cancelled) return;
        const events = (data.events ?? []).map((event) => ({
          eventName: event.event_name,
          label: event.label,
          eventCount: event.event_count,
          totalUsers: event.total_users,
        }));
        if (events.length > 0) {
          setCatalog(events);
          setIsLive(true);
        }
      })
      .catch(() => {
        if (!cancelled) setIsLive(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [startDate, endDate]);

  return { catalog, loading, isLive };
}

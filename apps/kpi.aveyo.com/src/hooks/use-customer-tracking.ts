'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { authApiRequest } from '@/lib/auth/session';
import type { CustomerTrackingData, MilestoneCustomerCount } from '@/lib/customer-tracking-service';

export type { CustomerTrackingData, MilestoneCustomerCount };

interface UseCustomerTrackingOptions {
  /** Auto-refresh interval in seconds for the live count. Defaults to 30. */
  refreshIntervalSeconds?: number;
  /** Date range to query. Both must be set to trigger a range query. */
  dateFrom?: string;
  dateTo?: string;
}

interface CustomerTrackingState {
  data: CustomerTrackingData | null;
  loading: boolean;
  error: string | null;
  /** Seconds remaining until the next live-count refresh. */
  nextRefreshIn: number;
  refetch: () => void;
}

export function useCustomerTracking({
  refreshIntervalSeconds = 30,
  dateFrom,
  dateTo,
}: UseCustomerTrackingOptions = {}): CustomerTrackingState {
  const [data, setData] = useState<CustomerTrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextRefreshIn, setNextRefreshIn] = useState(refreshIntervalSeconds);

  const dateFromRef = useRef(dateFrom);
  const dateToRef = useRef(dateTo);
  dateFromRef.current = dateFrom;
  dateToRef.current = dateTo;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const from = dateFromRef.current;
      const to = dateToRef.current;
      const params = from && to ? `?dateFrom=${from}&dateTo=${to}` : '';
      const result = await authApiRequest<CustomerTrackingData & { timestamp?: string }>(
        `/api/customer-tracking${params}`
      );
      setData(result);
      setNextRefreshIn(refreshIntervalSeconds);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load customer tracking data.');
    } finally {
      setLoading(false);
    }
  }, [refreshIntervalSeconds]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Re-fetch when date range changes
  useEffect(() => {
    if (dateFrom !== undefined || dateTo !== undefined) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo]);

  // Auto-refresh countdown + periodic refetch
  useEffect(() => {
    const countdownTick = setInterval(() => {
      setNextRefreshIn((prev) => {
        if (prev <= 1) {
          fetchData();
          return refreshIntervalSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownTick);
  }, [fetchData, refreshIntervalSeconds]);

  return { data, loading, error, nextRefreshIn, refetch: fetchData };
}

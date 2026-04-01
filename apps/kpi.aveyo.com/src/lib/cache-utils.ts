/**
 * Cache Utilities
 * 
 * Centralized cache management for KPI data
 */

import { TimePeriod, KPIValue } from '@/types/kpi';

// Cache configuration
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds
const cache = new Map<string, { data: KPIValue; timestamp: number }>();

export function getCacheKey(kpiId: string, period: TimePeriod): string {
  return `${kpiId}:${period}`;
}

export function getCachedValue(kpiId: string, period: TimePeriod): KPIValue | null {
  const key = getCacheKey(kpiId, period);
  const cached = cache.get(key);
  
  if (!cached) return null;
  
  const age = Date.now() - cached.timestamp;
  if (age > CACHE_DURATION) {
    cache.delete(key);
    return null;
  }
  
  return cached.data;
}

export function setCachedValue(kpiId: string, period: TimePeriod, data: KPIValue): void {
  const key = getCacheKey(kpiId, period);
  cache.set(key, { data, timestamp: Date.now() });
}

/**
 * Clear all KPI cache (call when goals are updated)
 */
export function clearKPICache(): void {
  cache.clear();
  console.log('KPI cache cleared');
}

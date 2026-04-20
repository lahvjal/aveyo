import { AsyncLocalStorage } from "node:async_hooks";
import { performance } from "node:perf_hooks";
import { NextResponse } from "next/server";

type PerfExternalKind = "supabase" | "openai";
type PerfScalar = string | number | boolean | null;

export const PERF_REQUEST_HEADER = "x-ava-perf-enabled";

interface PerfMutableSnapshot {
  dbQueryCount: number;
  dbTotalMs: number;
  openAiRequestCount: number;
  openAiTotalMs: number;
  maxConcurrentOpenAi: number;
  counters: Record<string, number>;
  meta: Record<string, PerfScalar>;
  errorName?: string;
  errorMessage?: string;
}

interface PerfContext {
  name: string;
  startedAtMs: number;
  startedAtIso: string;
  snapshot: PerfMutableSnapshot;
}

export interface PerfSnapshot {
  name: string;
  startedAt: string;
  totalMs: number;
  dbQueryCount: number;
  dbTotalMs: number;
  openAiRequestCount: number;
  openAiTotalMs: number;
  maxConcurrentOpenAi: number;
  counters: Record<string, number>;
  meta: Record<string, PerfScalar>;
  errorName?: string;
  errorMessage?: string;
}

interface PerfRunResult<T> {
  value?: T;
  error?: unknown;
  snapshot?: PerfSnapshot;
}

const perfStore = new AsyncLocalStorage<PerfContext>();
const MAX_PERF_SNAPSHOTS = Number.parseInt(process.env.AVA_PERF_MAX_SNAPSHOTS ?? "2000", 10);
const recentPerfSnapshots: PerfSnapshot[] = [];

let globalOpenAiInFlight = 0;

function createMutableSnapshot(meta?: Record<string, PerfScalar>): PerfMutableSnapshot {
  return {
    dbQueryCount: 0,
    dbTotalMs: 0,
    openAiRequestCount: 0,
    openAiTotalMs: 0,
    maxConcurrentOpenAi: 0,
    counters: {},
    meta: meta ? { ...meta } : {}
  };
}

function roundMs(value: number) {
  return Number(value.toFixed(2));
}

function storeSnapshot(snapshot: PerfSnapshot) {
  recentPerfSnapshots.push(snapshot);
  if (recentPerfSnapshots.length > MAX_PERF_SNAPSHOTS) {
    recentPerfSnapshots.splice(0, recentPerfSnapshots.length - MAX_PERF_SNAPSHOTS);
  }
}

function maybeLogSnapshot(snapshot: PerfSnapshot) {
  if (process.env.AVA_PERF_LOG_TO_CONSOLE !== "1") {
    return;
  }
  console.info("AVA_PERF", JSON.stringify(snapshot));
}

function finalizeContext(context: PerfContext): PerfSnapshot {
  const snapshot: PerfSnapshot = {
    name: context.name,
    startedAt: context.startedAtIso,
    totalMs: roundMs(performance.now() - context.startedAtMs),
    dbQueryCount: context.snapshot.dbQueryCount,
    dbTotalMs: roundMs(context.snapshot.dbTotalMs),
    openAiRequestCount: context.snapshot.openAiRequestCount,
    openAiTotalMs: roundMs(context.snapshot.openAiTotalMs),
    maxConcurrentOpenAi: context.snapshot.maxConcurrentOpenAi,
    counters: { ...context.snapshot.counters },
    meta: { ...context.snapshot.meta },
    errorName: context.snapshot.errorName,
    errorMessage: context.snapshot.errorMessage
  };
  storeSnapshot(snapshot);
  maybeLogSnapshot(snapshot);
  return snapshot;
}

function toErrorDetails(error: unknown) {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message
    };
  }
  if (typeof error === "string") {
    return {
      errorName: "Error",
      errorMessage: error
    };
  }
  return {
    errorName: "UnknownError",
    errorMessage: "Unknown error"
  };
}

export function isPerfMetricsEnabled(forceEnable = false) {
  return forceEnable || process.env.AVA_PERF_METRICS === "1" || process.env.AVA_LOAD_TEST_MODE === "1";
}

export async function runWithPerfContext<T>(
  name: string,
  operation: () => Promise<T>,
  meta?: Record<string, PerfScalar>,
  options?: {
    enabled?: boolean;
  }
): Promise<PerfRunResult<T>> {
  if (!isPerfMetricsEnabled(options?.enabled)) {
    try {
      return { value: await operation() };
    } catch (error) {
      return { error };
    }
  }

  if (perfStore.getStore()) {
    try {
      return { value: await operation() };
    } catch (error) {
      return { error };
    }
  }

  const context: PerfContext = {
    name,
    startedAtMs: performance.now(),
    startedAtIso: new Date().toISOString(),
    snapshot: createMutableSnapshot(meta)
  };

  return perfStore.run(context, async () => {
    try {
      const value = await operation();
      return {
        value,
        snapshot: finalizeContext(context)
      };
    } catch (error) {
      Object.assign(context.snapshot, toErrorDetails(error));
      return {
        error,
        snapshot: finalizeContext(context)
      };
    }
  });
}

export function incrementPerfCounter(name: string, value = 1) {
  const context = perfStore.getStore();
  if (!context) {
    return;
  }
  context.snapshot.counters[name] = (context.snapshot.counters[name] ?? 0) + value;
}

export function setPerfMeta(name: string, value: PerfScalar) {
  const context = perfStore.getStore();
  if (!context) {
    return;
  }
  context.snapshot.meta[name] = value;
}

export function createInstrumentedFetch(kind: PerfExternalKind): typeof fetch {
  return async (input, init) => {
    const startedAtMs = performance.now();
    let concurrentOpenAi = 0;

    if (kind === "openai") {
      globalOpenAiInFlight += 1;
      concurrentOpenAi = globalOpenAiInFlight;
    }

    try {
      return await fetch(input, init);
    } finally {
      const elapsedMs = performance.now() - startedAtMs;
      const context = perfStore.getStore();
      if (context) {
        if (kind === "supabase") {
          context.snapshot.dbQueryCount += 1;
          context.snapshot.dbTotalMs += elapsedMs;
        } else {
          context.snapshot.openAiRequestCount += 1;
          context.snapshot.openAiTotalMs += elapsedMs;
          context.snapshot.maxConcurrentOpenAi = Math.max(
            context.snapshot.maxConcurrentOpenAi,
            concurrentOpenAi
          );
        }
      }

      if (kind === "openai") {
        globalOpenAiInFlight = Math.max(0, globalOpenAiInFlight - 1);
      }
    }
  };
}

export function attachPerfHeaders(response: NextResponse, snapshot?: PerfSnapshot) {
  if (!snapshot) {
    return response;
  }

  response.headers.set("x-ava-perf-name", snapshot.name);
  response.headers.set("x-ava-perf-total-ms", String(snapshot.totalMs));
  response.headers.set("x-ava-perf-db-query-count", String(snapshot.dbQueryCount));
  response.headers.set("x-ava-perf-db-total-ms", String(snapshot.dbTotalMs));
  response.headers.set("x-ava-perf-openai-count", String(snapshot.openAiRequestCount));
  response.headers.set("x-ava-perf-openai-total-ms", String(snapshot.openAiTotalMs));
  response.headers.set("x-ava-perf-openai-max-in-flight", String(snapshot.maxConcurrentOpenAi));
  if (snapshot.errorName) {
    response.headers.set("x-ava-perf-error-name", snapshot.errorName);
  }
  return response;
}

export function listPerfSnapshots(options?: {
  name?: string;
  since?: string;
  limit?: number;
}) {
  let snapshots = recentPerfSnapshots.slice();

  if (options?.name) {
    snapshots = snapshots.filter((snapshot) => snapshot.name === options.name);
  }

  if (options?.since) {
    const sinceMs = new Date(options.since).getTime();
    if (!Number.isNaN(sinceMs)) {
      snapshots = snapshots.filter((snapshot) => new Date(snapshot.startedAt).getTime() >= sinceMs);
    }
  }

  if (options?.limit && options.limit > 0 && snapshots.length > options.limit) {
    snapshots = snapshots.slice(-options.limit);
  }

  return snapshots;
}

export function clearPerfSnapshots() {
  recentPerfSnapshots.splice(0, recentPerfSnapshots.length);
}

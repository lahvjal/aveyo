import { NextResponse } from "next/server";
import { attachPerfHeaders, PERF_REQUEST_HEADER, runWithPerfContext } from "@/lib/perf/metrics";

export function requestPerfEnabled(request: Request) {
  return request.headers.get(PERF_REQUEST_HEADER) === "1";
}

export async function runPerfRoute<T>(
  request: Request,
  name: string,
  operation: () => Promise<T>,
  meta?: Record<string, string | number | boolean | null>
) {
  const result = await runWithPerfContext(name, operation, meta, {
    enabled: requestPerfEnabled(request)
  });
  if (result.error) {
    return {
      error: result.error,
      snapshot: result.snapshot
    };
  }

  return {
    response: attachPerfHeaders(NextResponse.json(result.value), result.snapshot),
    snapshot: result.snapshot
  };
}

export function perfErrorJson(
  body: Record<string, unknown>,
  init: { status: number },
  snapshot?: Parameters<typeof attachPerfHeaders>[1]
) {
  return attachPerfHeaders(NextResponse.json(body, init), snapshot);
}

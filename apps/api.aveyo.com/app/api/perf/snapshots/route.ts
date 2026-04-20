import { NextResponse } from "next/server";
import { requireAuthenticatedRequest } from "@/lib/auth/require-auth";
import {
  clearPerfSnapshots,
  isPerfMetricsEnabled,
  listPerfSnapshots,
  PERF_REQUEST_HEADER
} from "@/lib/perf/metrics";

function requirePerfMode(request: Request) {
  const requestEnabled = request.headers.get(PERF_REQUEST_HEADER) === "1";
  if (!isPerfMetricsEnabled(requestEnabled)) {
    return NextResponse.json({ error: "Performance metrics are disabled." }, { status: 404 });
  }
  return null;
}

export async function GET(request: Request) {
  const perfModeResponse = requirePerfMode(request);
  if (perfModeResponse) {
    return perfModeResponse;
  }

  try {
    const auth = await requireAuthenticatedRequest(request);
    if (auth.role === "customer") {
      return NextResponse.json({ error: "Support-agent role required." }, { status: 403 });
    }

    const url = new URL(request.url);
    const rawLimit = url.searchParams.get("limit");
    const parsedLimit = rawLimit ? Number.parseInt(rawLimit, 10) : undefined;

    return NextResponse.json({
      snapshots: listPerfSnapshots({
        name: url.searchParams.get("name") ?? undefined,
        since: url.searchParams.get("since") ?? undefined,
        limit: parsedLimit && parsedLimit > 0 ? parsedLimit : undefined
      })
    });
  } catch {
    return NextResponse.json({ error: "Unable to load performance snapshots." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const perfModeResponse = requirePerfMode(request);
  if (perfModeResponse) {
    return perfModeResponse;
  }

  try {
    const auth = await requireAuthenticatedRequest(request);
    if (auth.role === "customer") {
      return NextResponse.json({ error: "Support-agent role required." }, { status: 403 });
    }

    clearPerfSnapshots();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to clear performance snapshots." }, { status: 500 });
  }
}

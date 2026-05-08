import { NextResponse } from "next/server";
import { requireAuthenticatedRequest } from "@/lib/auth/require-auth";
import { ServiceError } from "@/lib/service-error";
import { getCustomerTrackingData } from "@/lib/customer-tracking/service";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/customer-tracking
 *
 * Restricted to admins, executives, and super admins.
 *
 * Query params:
 *   dateFrom  – YYYY-MM-DD (must be paired with dateTo)
 *   dateTo    – YYYY-MM-DD (must be paired with dateFrom)
 *
 * Response:
 *   liveCount          – customers active in the last 30 minutes
 *   liveWindowMinutes  – always 30
 *   dateRangeCount     – customers last active in [dateFrom, dateTo] (null if params absent)
 *   totalCustomers     – distinct customer email count in project-data
 *   milestoneBreakdown – per-stage distinct customer counts
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedRequest(request);

    const { isAdmin, isExecutive, isSuperAdmin } = auth.access ?? {};
    if (!isAdmin && !isExecutive && !isSuperAdmin) {
      return NextResponse.json({ error: "Access restricted." }, { status: 403 });
    }

    const url = new URL(request.url);
    const dateFrom = url.searchParams.get("dateFrom");
    const dateTo = url.searchParams.get("dateTo");

    if (dateFrom && !DATE_RE.test(dateFrom)) {
      return NextResponse.json(
        { error: "Invalid dateFrom – expected YYYY-MM-DD." },
        { status: 400 }
      );
    }
    if (dateTo && !DATE_RE.test(dateTo)) {
      return NextResponse.json(
        { error: "Invalid dateTo – expected YYYY-MM-DD." },
        { status: 400 }
      );
    }
    if ((dateFrom && !dateTo) || (!dateFrom && dateTo)) {
      return NextResponse.json(
        { error: "Both dateFrom and dateTo are required for date range queries." },
        { status: 400 }
      );
    }

    const data = await getCustomerTrackingData({ dateFrom, dateTo });

    return NextResponse.json({ ...data, timestamp: new Date().toISOString() });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[customer-tracking] Unexpected error:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer tracking data." },
      { status: 500 }
    );
  }
}

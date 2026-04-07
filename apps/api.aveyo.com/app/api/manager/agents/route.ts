import { NextResponse } from "next/server";
import { requireAuthenticatedRequest } from "@/lib/auth/require-auth";
import { resolveManagerDateRangeFromRequest } from "@/lib/manager/date-range";
import { getManagerAgentsResult } from "@/lib/manager/service";
import { ServiceError } from "@/lib/service-error";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedRequest(request);
    const range = resolveManagerDateRangeFromRequest(request);
    return NextResponse.json(await getManagerAgentsResult(range, auth.user.id, auth.role));
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unable to load manager agents." }, { status: 500 });
  }
}

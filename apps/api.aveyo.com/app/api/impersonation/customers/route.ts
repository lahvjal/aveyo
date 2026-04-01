import { NextResponse } from "next/server";
import { requireAuthenticatedRequest } from "@/lib/auth/require-auth";
import {
  getImpersonationCustomersResult,
  type ListImpersonationCustomersQuery
} from "@/lib/impersonation/service";
import { ServiceError } from "@/lib/service-error";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedRequest(request);
    const requestUrl = new URL(request.url);
    const query: ListImpersonationCustomersQuery = {
      query: requestUrl.searchParams.get("query") ?? undefined,
      limit: requestUrl.searchParams.get("limit") ?? undefined
    };
    return NextResponse.json(await getImpersonationCustomersResult(auth.user.id, query));
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: "Unable to load impersonation customers." },
      { status: 500 }
    );
  }
}

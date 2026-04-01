import { NextResponse } from "next/server";
import { requireAuthenticatedRequest } from "@/lib/auth/require-auth";
import { getQueueResult } from "@/lib/handoff/service";
import { ServiceError } from "@/lib/service-error";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedRequest(request);
    const requestUrl = new URL(request.url);
    const resolvedScopeParam = requestUrl.searchParams.get("resolvedScope");
    const resolvedScope = resolvedScopeParam === "agent" ? "agent" : "all";
    return NextResponse.json(
      await getQueueResult(auth.user.id, {
        resolvedScope
      })
    );
  } catch (error) {
    if (error instanceof ServiceError) {
      console.error("Queue fetch failed", { status: error.status, message: error.message });
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Unexpected queue fetch failure", error);
    return NextResponse.json({ error: "Unable to load queue." }, { status: 500 });
  }
}

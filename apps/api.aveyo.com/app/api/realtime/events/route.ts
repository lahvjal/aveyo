import { NextResponse } from "next/server";
import { requireAuthenticatedRequest } from "@/lib/auth/require-auth";
import { getRealtimeEventsResult } from "@/lib/realtime/service";
import { ServiceError } from "@/lib/service-error";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedRequest(request);
    const url = new URL(request.url);
    const afterEventId = url.searchParams.get("afterEventId") ?? undefined;
    return NextResponse.json(await getRealtimeEventsResult(auth.user.id, afterEventId));
  } catch (error) {
    if (error instanceof ServiceError) {
      console.error("Realtime events fetch failed", { status: error.status, message: error.message });
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Unexpected realtime events failure", error);
    return NextResponse.json({ error: "Unable to load realtime events." }, { status: 500 });
  }
}

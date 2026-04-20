import { requireAuthenticatedRequest } from "@/lib/auth/require-auth";
import { perfErrorJson, runPerfRoute } from "@/lib/perf/route";
import { getRealtimeEventsResult } from "@/lib/realtime/service";
import { ServiceError } from "@/lib/service-error";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedRequest(request);
    const url = new URL(request.url);
    const afterEventId = url.searchParams.get("afterEventId") ?? undefined;
    const timedResult = await runPerfRoute(
      request,
      "api.realtime.events",
      () => getRealtimeEventsResult(auth.user.id, afterEventId),
      {
        afterEventId: Boolean(afterEventId)
      }
    );
    if (timedResult.error) {
      throw Object.assign(timedResult.error, {
        perfSnapshot: timedResult.snapshot
      });
    }
    return timedResult.response;
  } catch (error) {
    const perfSnapshot =
      error && typeof error === "object" && "perfSnapshot" in error
        ? (error as { perfSnapshot?: Parameters<typeof perfErrorJson>[2] }).perfSnapshot
        : undefined;
    if (error instanceof ServiceError) {
      console.error("Realtime events fetch failed", { status: error.status, message: error.message });
      return perfErrorJson({ error: error.message }, { status: error.status }, perfSnapshot);
    }
    console.error("Unexpected realtime events failure", error);
    return perfErrorJson({ error: "Unable to load realtime events." }, { status: 500 }, perfSnapshot);
  }
}

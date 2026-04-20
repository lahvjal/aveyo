import { requireAuthenticatedRequest } from "@/lib/auth/require-auth";
import { getQueueResult } from "@/lib/handoff/service";
import { perfErrorJson, runPerfRoute } from "@/lib/perf/route";
import { ServiceError } from "@/lib/service-error";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedRequest(request);
    const requestUrl = new URL(request.url);
    const resolvedScopeParam = requestUrl.searchParams.get("resolvedScope");
    const resolvedScope = resolvedScopeParam === "agent" ? "agent" : "all";
    const timedResult = await runPerfRoute(
      request,
      "api.handoff.queue",
      () =>
        getQueueResult(auth.user.id, {
          resolvedScope
        }),
      {
        resolvedScope
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
      console.error("Queue fetch failed", { status: error.status, message: error.message });
      return perfErrorJson({ error: error.message }, { status: error.status }, perfSnapshot);
    }
    console.error("Unexpected queue fetch failure", error);
    return perfErrorJson({ error: "Unable to load queue." }, { status: 500 }, perfSnapshot);
  }
}

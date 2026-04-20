import { requireAuthenticatedRequest } from "@/lib/auth/require-auth";
import { resolveManagerDateRangeFromRequest } from "@/lib/manager/date-range";
import { getManagerHandoffsResult } from "@/lib/manager/service";
import { perfErrorJson, runPerfRoute } from "@/lib/perf/route";
import { ServiceError } from "@/lib/service-error";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedRequest(request);
    const range = resolveManagerDateRangeFromRequest(request);
    const timedResult = await runPerfRoute(
      request,
      "api.manager.handoffs",
      () => getManagerHandoffsResult(range, auth.user.id, auth.role),
      {
        preset: range.preset
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
      return perfErrorJson({ error: error.message }, { status: error.status }, perfSnapshot);
    }
    return perfErrorJson(
      { error: "Unable to load manager handoff activity." },
      { status: 500 },
      perfSnapshot
    );
  }
}

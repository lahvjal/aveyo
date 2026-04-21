import { requireAuthenticatedRequest } from "@/lib/auth/require-auth";
import { getTransferCandidatesResult } from "@/lib/handoff/service";
import { perfErrorJson, runPerfRoute } from "@/lib/perf/route";
import { ServiceError } from "@/lib/service-error";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedRequest(request);
    const timedResult = await runPerfRoute(
      request,
      "api.handoff.transfer.targets",
      () => getTransferCandidatesResult(auth.user.id, auth.role)
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
      { error: "Unable to load transfer targets." },
      { status: 500 },
      perfSnapshot
    );
  }
}

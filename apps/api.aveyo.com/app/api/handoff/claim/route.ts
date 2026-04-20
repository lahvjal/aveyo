import { requireAuthenticatedRequest } from "@/lib/auth/require-auth";
import { createHandoffClaimResult, type ClaimBody } from "@/lib/handoff/service";
import { perfErrorJson, runPerfRoute } from "@/lib/perf/route";
import { ServiceError } from "@/lib/service-error";

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedRequest(request);
    const body = (await request.json()) as ClaimBody;
    const timedResult = await runPerfRoute(
      request,
      "api.handoff.claim",
      () => createHandoffClaimResult(body, auth.user.id),
      {
        requestId: body.requestId ?? null
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
      console.error("Handoff claim failed", { status: error.status, message: error.message });
      return perfErrorJson({ error: error.message }, { status: error.status }, perfSnapshot);
    }
    console.error("Unexpected handoff claim failure", error);
    return perfErrorJson(
      { error: "Unable to claim handoff." },
      { status: 500 },
      perfSnapshot
    );
  }
}

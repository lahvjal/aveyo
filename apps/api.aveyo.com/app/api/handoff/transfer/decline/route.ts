import { requireAuthenticatedRequest } from "@/lib/auth/require-auth";
import { createTransferDeclineResult, type TransferDecisionBody } from "@/lib/handoff/service";
import { perfErrorJson, runPerfRoute } from "@/lib/perf/route";
import { ServiceError } from "@/lib/service-error";

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedRequest(request);
    const body = (await request.json()) as TransferDecisionBody;
    const timedResult = await runPerfRoute(
      request,
      "api.handoff.transfer.decline",
      () => createTransferDeclineResult(body, auth.user.id),
      {
        transferRequestId: body.transferRequestId ?? null
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
      { error: "Unable to decline transfer." },
      { status: 500 },
      perfSnapshot
    );
  }
}

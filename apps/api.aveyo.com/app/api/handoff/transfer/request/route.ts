import { requireAuthenticatedRequest } from "@/lib/auth/require-auth";
import { createTransferRequestResult, type TransferRequestBody } from "@/lib/handoff/service";
import { perfErrorJson, runPerfRoute } from "@/lib/perf/route";
import { ServiceError } from "@/lib/service-error";

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedRequest(request);
    const body = (await request.json()) as TransferRequestBody;
    const timedResult = await runPerfRoute(
      request,
      "api.handoff.transfer.request",
      () => createTransferRequestResult(body, auth.user.id),
      {
        requestId: body.requestId ?? null,
        targetAgentId: body.targetAgentId ?? null
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
      { error: "Unable to request transfer." },
      { status: 500 },
      perfSnapshot
    );
  }
}

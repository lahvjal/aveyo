import { requireAuthenticatedRequest } from "@/lib/auth/require-auth";
import {
  createHandoffRequestResult,
  type HandoffRequestBody
} from "@/lib/handoff/service";
import { PENDING_THRESHOLD_SECONDS } from "@/lib/handoff/pending-alert";
import { perfErrorJson, runPerfRoute } from "@/lib/perf/route";
import { ServiceError } from "@/lib/service-error";

/** Room for post-response GChat alert delay in `after()`. */
export const maxDuration = Math.max(15, PENDING_THRESHOLD_SECONDS + 10);

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedRequest(request);
    const body = (await request.json()) as HandoffRequestBody;
    const timedResult = await runPerfRoute(
      request,
      "api.handoff.request",
      () => createHandoffRequestResult(body, auth.user.id),
      {
        conversationId: body.conversationId ?? null
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
      console.error("Handoff request failed", { status: error.status, message: error.message });
      return perfErrorJson({ error: error.message }, { status: error.status }, perfSnapshot);
    }
    console.error("Unexpected handoff request failure", error);
    return perfErrorJson(
      { error: "Unable to request handoff." },
      { status: 500 },
      perfSnapshot
    );
  }
}

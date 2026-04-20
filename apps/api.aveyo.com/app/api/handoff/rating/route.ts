import { requireAuthenticatedRequest } from "@/lib/auth/require-auth";
import { createHandoffRatingResult, type RatingBody } from "@/lib/handoff/service";
import { perfErrorJson, runPerfRoute } from "@/lib/perf/route";
import { ServiceError } from "@/lib/service-error";

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedRequest(request);
    const body = (await request.json()) as RatingBody;
    const timedResult = await runPerfRoute(
      request,
      "api.handoff.rating",
      () => createHandoffRatingResult(body, auth.user.id),
      {
        conversationId: body.conversationId ?? null,
        rating: body.rating ?? null
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
      console.error("Handoff rating submit failed", { status: error.status, message: error.message });
      return perfErrorJson({ error: error.message }, { status: error.status }, perfSnapshot);
    }
    console.error("Unexpected handoff rating submit failure", error);
    return perfErrorJson(
      { error: "Unable to submit handoff rating." },
      { status: 500 },
      perfSnapshot
    );
  }
}

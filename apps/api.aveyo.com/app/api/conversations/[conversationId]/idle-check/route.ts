import { runConversationIdleCheckResult } from "@/lib/conversations/service";
import { requireAuthenticatedRequest } from "@/lib/auth/require-auth";
import { perfErrorJson, runPerfRoute } from "@/lib/perf/route";
import { ServiceError } from "@/lib/service-error";

export async function POST(
  request: Request,
  context: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await context.params;
  try {
    const auth = await requireAuthenticatedRequest(request);
    const timedResult = await runPerfRoute(
      request,
      "api.conversation.idleCheck",
      () => runConversationIdleCheckResult(conversationId, auth.user.id),
      {
        conversationId
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
      { error: "Unable to run conversation idle check." },
      { status: 500 },
      perfSnapshot
    );
  }
}

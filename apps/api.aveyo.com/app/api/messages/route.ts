import { requireAuthenticatedRequest } from "@/lib/auth/require-auth";
import { createMessageResult, type MessageBody } from "@/lib/conversations/service";
import { perfErrorJson, runPerfRoute } from "@/lib/perf/route";
import { ServiceError } from "@/lib/service-error";

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedRequest(request);
    const body = (await request.json()) as MessageBody;
    const timedResult = await runPerfRoute(
      request,
      "api.messages.create",
      () => createMessageResult(body, auth.user.id),
      {
        kind: body.kind ?? null
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
      console.error("Message append failed", { status: error.status, message: error.message });
      return perfErrorJson({ error: error.message }, { status: error.status }, perfSnapshot);
    }
    console.error("Unexpected message append failure", error);
    return perfErrorJson(
      { error: "Unable to append message." },
      { status: 500 },
      perfSnapshot
    );
  }
}

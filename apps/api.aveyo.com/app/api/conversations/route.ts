import {
  createConversationResult,
  getConversationsResult,
  type CreateConversationBody
} from "@/lib/conversations/service";
import { requireAuthenticatedRequest } from "@/lib/auth/require-auth";
import { perfErrorJson, runPerfRoute } from "@/lib/perf/route";
import { ServiceError } from "@/lib/service-error";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedRequest(request);
    const { searchParams } = new URL(request.url);
    const excludeImpersonation =
      searchParams.get("excludeImpersonation") === "1" ||
      searchParams.get("excludeImpersonation") === "true";
    const ownOnly =
      searchParams.get("ownOnly") === "1" ||
      searchParams.get("ownOnly") === "true";
    const timedResult = await runPerfRoute(
      request,
      "api.conversations.list",
      () => getConversationsResult(auth.user.id, { excludeImpersonation, ownOnly }),
      {
        excludeImpersonation,
        ownOnly
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
    return perfErrorJson({ error: "Unable to load conversations." }, { status: 500 }, perfSnapshot);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedRequest(request);
    const body = (await request.json().catch(() => ({}))) as CreateConversationBody;
    const timedResult = await runPerfRoute(
      request,
      "api.conversations.create",
      () => createConversationResult(auth.user.id, body),
      {
        hasProjectRef: Boolean(body.projectRef),
        hasSubject: Boolean(body.subject)
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
    return perfErrorJson({ error: "Unable to create conversation." }, { status: 500 }, perfSnapshot);
  }
}

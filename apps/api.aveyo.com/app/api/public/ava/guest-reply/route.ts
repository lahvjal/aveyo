import { type ConversationThread, type TimelineMessage } from "@ava/chat-domain";
import { buildAuthLoginUrl } from "@ava/config/runtime/auth-urls";
import { resolveAppUrl, resolveEnvironment } from "@ava/config/runtime/app-urls";
import { generateGuestAvaReplyText } from "@/lib/ava/service";
import { perfErrorJson, runPerfRoute } from "@/lib/perf/route";
import { ServiceError } from "@/lib/service-error";

const MAX_GUEST_HISTORY_MESSAGES = 12;
const GUEST_CONVERSATION_ID = "guest-conversation";

interface GuestReplyBody {
  messages?: Array<{
    kind?: TimelineMessage["kind"];
    text?: string;
  }>;
}

function toGuestMessageKind(kind: TimelineMessage["kind"] | undefined) {
  if (kind === "customer" || kind === "ava") {
    return kind;
  }
  return null;
}

function buildGuestThread(messages: GuestReplyBody["messages"]): ConversationThread {
  if (!Array.isArray(messages)) {
    throw new ServiceError(400, "Guest chat history must be an array of messages.");
  }

  const createdAt = new Date().toISOString();
  const sanitizedMessages: TimelineMessage[] = [];
  for (const [index, message] of messages.entries()) {
    const kind = toGuestMessageKind(message?.kind);
    if (!kind) {
      continue;
    }

    const text = typeof message?.text === "string" ? message.text.trim() : "";
    if (!text) {
      continue;
    }

    sanitizedMessages.push({
      id: `guest-${index + 1}`,
      conversationId: GUEST_CONVERSATION_ID,
      kind,
      text,
      createdAt,
      deliveryState: "sent"
    });
  }

  const recentMessages = sanitizedMessages.slice(-MAX_GUEST_HISTORY_MESSAGES);

  const hasCustomerMessage = recentMessages.some((message) => message.kind === "customer");
  if (!hasCustomerMessage) {
    throw new ServiceError(400, "Guest chat needs at least one customer message.");
  }

  return {
    id: GUEST_CONVERSATION_ID,
    authenticated: false,
    messages: recentMessages,
    handoff: {
      state: "none"
    },
    updatedAt: recentMessages[recentMessages.length - 1]?.createdAt ?? createdAt
  };
}

function resolveGuestRequestEnvironment(request: Request) {
  const candidates = [request.headers.get("origin"), request.headers.get("referer"), request.url];
  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    try {
      const hostname = new URL(candidate).hostname;
      if (hostname) {
        return resolveEnvironment(hostname);
      }
    } catch {
      // Ignore malformed origins and keep looking.
    }
  }

  return "prod";
}

function buildGuestProjectLoginUrl(request: Request) {
  const environment = resolveGuestRequestEnvironment(request);
  const authAppUrl = resolveAppUrl("auth", environment) || "https://auth.aveyo.com";
  const customerAppUrl = resolveAppUrl("customer", environment) || "https://customer.aveyo.com";
  const returnTo = new URL("/dashboard", customerAppUrl).toString();
  return buildAuthLoginUrl(returnTo, { authAppUrl });
}

async function getGuestReplyResult(thread: ConversationThread, guestProjectLoginUrl: string) {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, 8000);

  try {
    const replyText = await generateGuestAvaReplyText(thread, abortController.signal, {
      guestProjectLoginUrl
    });
    if (!replyText) {
      throw new ServiceError(503, "Guest chat is unavailable right now.");
    }

    return { replyText };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as GuestReplyBody;
    const guestThread = buildGuestThread(body.messages);
    const guestProjectLoginUrl = buildGuestProjectLoginUrl(request);
    const timedResult = await runPerfRoute(
      request,
      "api.public.ava.guestReply",
      () => getGuestReplyResult(guestThread, guestProjectLoginUrl),
      {
        messageCount: guestThread.messages.length
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
      { error: "Unable to generate a guest reply." },
      { status: 500 },
      perfSnapshot
    );
  }
}

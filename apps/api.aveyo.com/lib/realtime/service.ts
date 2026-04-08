import {
  listRealtimeEvents,
  publishTypingEvent,
  runCustomerSessionIdleAutomation,
  StoreError
} from "@/lib/store/mock-store";
import { ServiceError } from "@/lib/service-error";

export interface TypingBody {
  conversationId?: string;
  actor?: "customer" | "representative";
  isTyping?: boolean;
}

export async function getRealtimeEventsResult(actorUserId: string, afterEventId?: string) {
  try {
    try {
      await runCustomerSessionIdleAutomation(actorUserId);
    } catch (automationError) {
      console.error("Session idle automation check failed", automationError);
    }

    const page = await listRealtimeEvents(actorUserId, afterEventId);
    let cursor = afterEventId;
    if (page.events.length > 0) {
      cursor = page.events[page.events.length - 1]?.id;
    } else if (afterEventId && !page.cursorFound) {
      cursor = page.latestEventId ?? afterEventId;
    } else if (!afterEventId) {
      cursor = page.latestEventId;
    }

    return {
      events: page.events,
      cursor,
      cursorStale: Boolean(afterEventId && !page.cursorFound)
    };
  } catch (error) {
    if (error instanceof StoreError) {
      throw new ServiceError(error.status, error.message);
    }
    throw new ServiceError(500, "Unable to load realtime events.");
  }
}

export async function createTypingResult(body: TypingBody, actorUserId: string) {
  if (!body.conversationId || !body.actor || typeof body.isTyping !== "boolean") {
    throw new ServiceError(400, "conversationId, actor, and isTyping are required.");
  }

  try {
    await publishTypingEvent(
      {
        conversationId: body.conversationId,
        actor: body.actor,
        isTyping: body.isTyping
      },
      actorUserId
    );
  } catch (error) {
    if (error instanceof StoreError) {
      throw new ServiceError(error.status, error.message);
    }
    throw new ServiceError(500, "Unable to publish typing event.");
  }

  return { ok: true };
}

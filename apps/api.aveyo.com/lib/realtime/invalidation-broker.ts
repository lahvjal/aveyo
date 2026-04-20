import {
  RealtimeChannel,
  type RealtimePostgresInsertPayload,
  type SupabaseClient
} from "@supabase/supabase-js";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

export type RealtimeInvalidationKind =
  | "message_created"
  | "handoff_requested"
  | "handoff_claimed"
  | "handoff_resolved";

export interface RealtimeInvalidation {
  kind: RealtimeInvalidationKind;
  conversationId: string;
  recordId: string;
  createdAt: string;
}

export interface RealtimeTypingEvent {
  kind: "typing";
  conversationId: string;
  recordId: string;
  createdAt: string;
  actor: "customer" | "representative" | "ava";
  actorUserId: string | null;
  isTyping: boolean;
}

export type RealtimeBrokerEvent = RealtimeInvalidation | RealtimeTypingEvent;

type RealtimeListener = (event: RealtimeBrokerEvent) => void;

interface MessageInsertRow {
  id: string;
  conversation_id: string;
  created_at: string;
}

interface HandoffEventInsertRow {
  id: string;
  conversation_id: string;
  event_type: "requested" | "claimed" | "activated" | "resolved" | "cancelled" | "queue_update";
  created_at: string;
  payload?: {
    kind?: string;
  } | null;
}

interface TypingEventInsertRow {
  id: string;
  conversation_id: string;
  actor_kind: "customer" | "representative" | "ava";
  actor_auth_user_id: string | null;
  is_typing: boolean;
  created_at: string;
}

interface BrokerState {
  client: SupabaseClient | null;
  channel: RealtimeChannel | null;
  channelReadyPromise: Promise<void> | null;
  listeners: Set<RealtimeListener>;
}

const BROKER_STATE_KEY = Symbol.for("aveyo.ava.realtime.invalidation-broker");

function getBrokerState(): BrokerState {
  const globalStore = globalThis as typeof globalThis & {
    [BROKER_STATE_KEY]?: BrokerState;
  };

  if (!globalStore[BROKER_STATE_KEY]) {
    globalStore[BROKER_STATE_KEY] = {
      client: null,
      channel: null,
      channelReadyPromise: null,
      listeners: new Set()
    };
  }

  return globalStore[BROKER_STATE_KEY];
}

function emitInvalidation(event: RealtimeBrokerEvent) {
  const state = getBrokerState();
  for (const listener of state.listeners) {
    try {
      listener(event);
    } catch (error) {
      console.error("Realtime invalidation listener failed", error);
    }
  }
}

function mapTypingInsert(
  payload: RealtimePostgresInsertPayload<Record<string, unknown>>
): RealtimeTypingEvent | null {
  const row = payload.new as unknown as TypingEventInsertRow | null;
  if (
    !row?.id ||
    !row.conversation_id ||
    !row.created_at ||
    typeof row.is_typing !== "boolean" ||
    !row.actor_kind
  ) {
    return null;
  }

  return {
    kind: "typing",
    conversationId: row.conversation_id,
    recordId: row.id,
    createdAt: row.created_at,
    actor: row.actor_kind,
    actorUserId: row.actor_auth_user_id ?? null,
    isTyping: row.is_typing
  };
}

function mapMessageInsert(
  payload: RealtimePostgresInsertPayload<Record<string, unknown>>
): RealtimeInvalidation | null {
  const row = payload.new as unknown as MessageInsertRow | null;
  if (!row?.id || !row.conversation_id || !row.created_at) {
    return null;
  }

  return {
    kind: "message_created",
    conversationId: row.conversation_id,
    recordId: row.id,
    createdAt: row.created_at
  };
}

function mapHandoffInsert(
  payload: RealtimePostgresInsertPayload<Record<string, unknown>>
): RealtimeInvalidation | null {
  const row = payload.new as unknown as HandoffEventInsertRow | null;
  if (!row?.id || !row.conversation_id || !row.created_at) {
    return null;
  }

  if (row.event_type === "queue_update" && row.payload?.kind === "typing") {
    return null;
  }

  if (row.event_type === "requested") {
    return {
      kind: "handoff_requested",
      conversationId: row.conversation_id,
      recordId: row.id,
      createdAt: row.created_at
    };
  }

  if (row.event_type === "resolved" || row.event_type === "cancelled") {
    return {
      kind: "handoff_resolved",
      conversationId: row.conversation_id,
      recordId: row.id,
      createdAt: row.created_at
    };
  }

  return {
    kind: "handoff_claimed",
    conversationId: row.conversation_id,
    recordId: row.id,
    createdAt: row.created_at
  };
}

async function ensureRealtimeChannel() {
  const state = getBrokerState();
  if (state.channelReadyPromise) {
    return state.channelReadyPromise;
  }

  state.channelReadyPromise = (async () => {
    const client = getSupabaseServiceRoleClient();
    const channel = client
      .channel("ava-realtime-invalidations")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "ava",
          table: "messages"
        },
        (payload) => {
          const invalidation = mapMessageInsert(payload);
          if (invalidation) {
            emitInvalidation(invalidation);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "ava",
          table: "handoff_events"
        },
        (payload) => {
          const invalidation = mapHandoffInsert(payload);
          if (invalidation) {
            emitInvalidation(invalidation);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "ava",
          table: "typing_events"
        },
        (payload) => {
          const typingEvent = mapTypingInsert(payload);
          if (typingEvent) {
            emitInvalidation(typingEvent);
          }
        }
      );

    state.client = client;
    state.channel = channel;

    await new Promise<void>((resolve) => {
      channel.subscribe((status) => {
        if (process.env.NODE_ENV !== "production") {
          console.info("Ava realtime invalidation channel status", status);
        }
        if (status === "SUBSCRIBED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          resolve();
        }
      });
    });
  })();

  return state.channelReadyPromise;
}

export async function subscribeToRealtimeInvalidations(listener: RealtimeListener) {
  const state = getBrokerState();
  state.listeners.add(listener);
  await ensureRealtimeChannel();

  return () => {
    state.listeners.delete(listener);
  };
}

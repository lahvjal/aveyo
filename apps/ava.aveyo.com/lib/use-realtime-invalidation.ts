"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  subscribeToRealtimeInvalidationStream,
  type RealtimeInvalidationPayload,
  type RealtimeTypingPayload
} from "@ava/widget";
import { getApiBaseUrl } from "@/lib/config";

interface UseRealtimeInvalidationOptions {
  enabled: boolean;
  conversationId?: string | null;
  debounceMs?: number;
  heartbeatMs?: number;
  onInvalidate: (payload: RealtimeInvalidationPayload) => void;
  onTyping?: (payload: RealtimeTypingPayload) => void;
  onHeartbeat?: () => void;
  onError?: () => void;
}

export function useRealtimeInvalidation({
  enabled,
  conversationId,
  debounceMs = 0,
  heartbeatMs = 45_000,
  onInvalidate,
  onTyping,
  onHeartbeat,
  onError
}: UseRealtimeInvalidationOptions) {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const onInvalidateRef = useRef(onInvalidate);
  const onTypingRef = useRef(onTyping);
  const onHeartbeatRef = useRef(onHeartbeat);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onInvalidateRef.current = onInvalidate;
  }, [onInvalidate]);

  useEffect(() => {
    onTypingRef.current = onTyping;
  }, [onTyping]);

  useEffect(() => {
    onHeartbeatRef.current = onHeartbeat;
  }, [onHeartbeat]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let debounceId: number | null = null;
    let heartbeatId: number | null = null;
    let latestPayload: RealtimeInvalidationPayload | null = null;

    const emitInvalidate = (payload: RealtimeInvalidationPayload) => {
      if (debounceMs <= 0) {
        onInvalidateRef.current(payload);
        return;
      }

      latestPayload = payload;
      if (debounceId !== null) {
        return;
      }

      debounceId = window.setTimeout(() => {
        debounceId = null;
        const nextPayload = latestPayload;
        latestPayload = null;
        if (nextPayload) {
          onInvalidateRef.current(nextPayload);
        }
      }, debounceMs);
    };

    const unsubscribe = subscribeToRealtimeInvalidationStream({
      baseUrl: apiBaseUrl,
      conversationId: conversationId ?? undefined,
      onInvalidate: emitInvalidate,
      onTyping: (payload) => {
        onTypingRef.current?.(payload);
      },
      onError: () => {
        onErrorRef.current?.();
      }
    });

    if (heartbeatMs > 0 && onHeartbeatRef.current) {
      heartbeatId = window.setInterval(() => {
        onHeartbeatRef.current?.();
      }, heartbeatMs);
    }

    return () => {
      unsubscribe();
      if (debounceId !== null) {
        window.clearTimeout(debounceId);
      }
      if (heartbeatId !== null) {
        window.clearInterval(heartbeatId);
      }
    };
  }, [apiBaseUrl, conversationId, debounceMs, enabled, heartbeatMs]);
}

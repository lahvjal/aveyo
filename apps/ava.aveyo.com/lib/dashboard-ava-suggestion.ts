import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type ConversationThread, type TimelineMessage } from "@ava/chat-domain";
import { getRepresentativeReplySuggestionApi } from "./dashboard-api";

const QUESTION_PREFIXES = [
  "what",
  "when",
  "where",
  "why",
  "how",
  "can",
  "could",
  "would",
  "will",
  "is",
  "are",
  "do",
  "does",
  "did",
  "should",
  "any update",
  "status update"
];

function normalizeIntentText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\w\s']/g, " ")
    .replace(/\s+/g, " ");
}

function isCustomerQuestion(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  if (trimmed.includes("?")) {
    return true;
  }

  const normalized = normalizeIntentText(trimmed);
  if (!normalized) {
    return false;
  }

  return QUESTION_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix} `)
  );
}

type CustomerTimelineMessage = Extract<TimelineMessage, { kind: "customer" }>;

function getLatestCustomerQuestionMessage(
  conversation: ConversationThread
): CustomerTimelineMessage | null {
  const latestMessage = conversation.messages[conversation.messages.length - 1];
  if (!latestMessage || latestMessage.kind !== "customer") {
    return null;
  }
  if (!isCustomerQuestion(latestMessage.text)) {
    return null;
  }

  return latestMessage;
}

interface UseAvaReplySuggestionParams {
  conversation: ConversationThread;
  conversationId: string | null;
  enabled: boolean;
}

export interface AvaReplySuggestionState {
  suggestionText: string | null;
  sourceCustomerMessageId: string | null;
  isLoading: boolean;
  error: string | null;
  hasPendingCustomerQuestion: boolean;
  refreshSuggestion: () => void;
}

export function useAvaReplySuggestion(
  params: UseAvaReplySuggestionParams
): AvaReplySuggestionState {
  const latestQuestionMessage = useMemo(
    () => getLatestCustomerQuestionMessage(params.conversation),
    [params.conversation]
  );
  const [suggestionText, setSuggestionText] = useState<string | null>(null);
  const [sourceCustomerMessageId, setSourceCustomerMessageId] = useState<string | null>(null);
  const [sourceConversationId, setSourceConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const requestCounterRef = useRef(0);
  const handledRefreshTokenRef = useRef(0);

  useEffect(() => {
    if (!params.enabled || !params.conversationId || !latestQuestionMessage) {
      setSuggestionText(null);
      setSourceCustomerMessageId(null);
      setSourceConversationId(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const latestQuestionId = latestQuestionMessage.id;
    const refreshRequested = refreshToken !== handledRefreshTokenRef.current;
    const alreadyHaveSuggestionForCurrentQuestion =
      sourceConversationId === params.conversationId && sourceCustomerMessageId === latestQuestionId;
    if (!refreshRequested && alreadyHaveSuggestionForCurrentQuestion) {
      return;
    }

    if (refreshRequested) {
      handledRefreshTokenRef.current = refreshToken;
    }

    const requestId = ++requestCounterRef.current;
    setIsLoading(true);
    setError(null);

    void getRepresentativeReplySuggestionApi(params.conversationId)
      .then((result) => {
        if (requestId !== requestCounterRef.current) {
          return;
        }

        setSuggestionText(result.suggestion ?? null);
        setSourceCustomerMessageId(result.sourceCustomerMessageId ?? latestQuestionId);
        setSourceConversationId(params.conversationId);
        setError(null);
      })
      .catch((requestError) => {
        if (requestId !== requestCounterRef.current) {
          return;
        }

        setSuggestionText(null);
        setSourceCustomerMessageId(latestQuestionId);
        setSourceConversationId(params.conversationId);
        setError(
          requestError instanceof Error && requestError.message
            ? requestError.message
            : "Unable to generate Ava suggestion right now."
        );
      })
      .finally(() => {
        if (requestId === requestCounterRef.current) {
          setIsLoading(false);
        }
      });
  }, [
    latestQuestionMessage,
    params.conversationId,
    params.enabled,
    refreshToken,
    sourceConversationId,
    sourceCustomerMessageId
  ]);

  const refreshSuggestion = useCallback(() => {
    if (!params.enabled || !params.conversationId || !latestQuestionMessage) {
      return;
    }
    setRefreshToken((current) => current + 1);
  }, [latestQuestionMessage, params.conversationId, params.enabled]);

  return {
    suggestionText,
    sourceCustomerMessageId,
    isLoading,
    error,
    hasPendingCustomerQuestion: Boolean(latestQuestionMessage),
    refreshSuggestion
  };
}

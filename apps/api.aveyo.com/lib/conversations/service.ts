import { type TimelineMessage } from "@ava/chat-domain";
import {
  generateAvaReplyText,
  generateRepresentativeReplySuggestionText
} from "@/lib/ava/service";
import {
  appendAvaMessage,
  appendMessage,
  createConversation,
  getAvaConversationContext,
  getConversationCustomerDetails,
  getConversation,
  listConversations,
  publishTypingEvent,
  StoreError
} from "@/lib/store/mock-store";
import { ServiceError } from "@/lib/service-error";

export interface MessageBody {
  conversationId?: string;
  kind?: TimelineMessage["kind"];
  text?: string;
  representativeId?: string;
  clientMessageId?: string;
}

export interface CreateConversationBody {
  subject?: string;
  projectRef?: string;
  greetingText?: string;
}

function allowsAvaReply(
  handoffState: "none" | "pending" | "claimed" | "active" | "resolved"
) {
  return handoffState === "none" || handoffState === "resolved";
}

function normalizeIntentText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\w\s']/g, " ")
    .replace(/\s+/g, " ");
}

function isCustomerFrustrated(text: string) {
  const normalized = normalizeIntentText(text);
  if (!normalized) {
    return false;
  }

  const frustrationPhrases = [
    "not helpful",
    "this isnt helpful",
    "this is not helpful",
    "youre not helping",
    "you are not helping",
    "doesnt help",
    "does not help",
    "this is useless",
    "this sucks",
    "im frustrated",
    "i am frustrated",
    "im upset",
    "i am upset",
    "this is frustrating",
    "this is ridiculous",
    "this is taking too long",
    "ive been waiting",
    "i have been waiting",
    "still waiting"
  ];
  if (frustrationPhrases.some((phrase) => normalized.includes(phrase))) {
    return true;
  }

  return /\b(frustrated|annoyed|angry|upset|ridiculous|terrible|awful)\b/.test(normalized);
}

function isHumanAgentRequest(text: string) {
  const normalized = normalizeIntentText(text);
  if (!normalized) {
    return false;
  }

  const directPhrases = [
    "talk to a person",
    "talk to a human",
    "talk to a rep",
    "talk to an agent",
    "talk to customer care",
    "speak to a person",
    "speak to a human",
    "speak to a rep",
    "speak to an agent",
    "connect me to customer care",
    "connect me with customer care",
    "connect me to a rep",
    "connect me to an agent",
    "human please",
    "agent please",
    "representative please",
    "real person"
  ];
  if (directPhrases.some((phrase) => normalized.includes(phrase))) {
    return true;
  }

  return (
    /\b(talk|speak|chat|connect|contact|transfer|escalate)\b.*\b(rep|representative|agent|human|person|customer care)\b/.test(
      normalized
    ) ||
    /\b(rep|representative|agent|human|person|customer care)\b.*\b(now|please)\b/.test(normalized)
  );
}

function isProjectSpecificQuestion(text: string) {
  const normalized = normalizeIntentText(text);
  if (!normalized) {
    return false;
  }

  const projectKeywords = [
    "project",
    "site survey",
    "survey",
    "timeline",
    "install",
    "inspection",
    "pto",
    "status",
    "appointment",
    "schedule",
    "funding",
    "permit",
    "sow"
  ];
  return projectKeywords.some((keyword) => normalized.includes(keyword));
}

function isCustomerQuestion(text: string) {
  const trimmed = text.trim();
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

  const questionStarters = [
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
  return questionStarters.some(
    (starter) => normalized === starter || normalized.startsWith(`${starter} `)
  );
}

function hasRepeatedProjectSpecificQuestions(thread: { messages: Array<{ kind: string; text: string }> }) {
  const recentCustomerMessages = thread.messages.filter((message) => message.kind === "customer").slice(-3);
  if (recentCustomerMessages.length < 2) {
    return false;
  }

  const projectSpecificCount = recentCustomerMessages.filter((message) =>
    isProjectSpecificQuestion(message.text)
  ).length;
  return projectSpecificCount >= 2;
}

function replyIndicatesCriticalDataGap(replyText: string) {
  const normalized = normalizeIntentText(replyText);
  if (!normalized) {
    return false;
  }

  const dataGapPhrases = [
    "i do not have",
    "i dont have",
    "i cannot access",
    "i cant access",
    "im unable to",
    "i am unable to",
    "i dont see",
    "i do not see",
    "not available"
  ];
  return dataGapPhrases.some((phrase) => normalized.includes(phrase));
}

function containsEscalationOffer(text: string) {
  const normalized = normalizeIntentText(text);
  if (!normalized) {
    return false;
  }

  return (
    /\b(connect|contact|speak|talk|chat|transfer|escalate)\b.*\b(rep|representative|agent|human|person|customer care)\b/.test(
      normalized
    ) ||
    /\bwould you like\b.*\b(connect|speak|talk|chat)\b/.test(normalized) ||
    /\bi can connect you\b/.test(normalized)
  );
}

function stripEscalationOfferFromReply(replyText: string) {
  const paragraphs = replyText
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) {
    return replyText;
  }

  const filteredParagraphs = paragraphs.filter((paragraph) => !containsEscalationOffer(paragraph));
  if (filteredParagraphs.length > 0 && filteredParagraphs.length < paragraphs.length) {
    return filteredParagraphs.join("\n\n").trim();
  }

  return replyText;
}

function sanitizeAvaReplyEscalation(params: {
  replyText: string;
  latestCustomerMessage: string;
  thread: { messages: Array<{ kind: string; text: string }> };
}) {
  if (!containsEscalationOffer(params.replyText)) {
    return params.replyText;
  }

  const allowEscalation =
    isHumanAgentRequest(params.latestCustomerMessage) ||
    isCustomerFrustrated(params.latestCustomerMessage) ||
    (hasRepeatedProjectSpecificQuestions(params.thread) && replyIndicatesCriticalDataGap(params.replyText));

  if (allowEscalation) {
    return params.replyText;
  }

  return stripEscalationOfferFromReply(params.replyText);
}

async function tryGenerateAvaReply(params: {
  conversationId: string;
  actorUserId: string;
}) {
  const publishAvaTyping = async (isTyping: boolean) => {
    try {
      await publishTypingEvent(
        {
          conversationId: params.conversationId,
          actor: "ava",
          isTyping
        },
        params.actorUserId
      );
    } catch {
      // Keep customer messaging reliable even if typing events fail.
    }
  };

  const thread = await getConversation(params.conversationId, params.actorUserId);
  if (!thread || !allowsAvaReply(thread.handoff.state)) {
    await publishAvaTyping(false);
    return;
  }

  await publishAvaTyping(true);

  const latestMessage = thread.messages[thread.messages.length - 1];
  if (latestMessage?.kind === "customer" && isHumanAgentRequest(latestMessage.text)) {
    try {
      await appendAvaMessage(
        params.conversationId,
        "I understand you want to speak with a customer care agent. Would you like to be connected to a customer care agent now?"
      );
    } finally {
      await publishAvaTyping(false);
    }
    return;
  }

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, 8000);

  try {
    let context: Awaited<ReturnType<typeof getAvaConversationContext>> | undefined;
    try {
      context = await getAvaConversationContext(params.conversationId, params.actorUserId);
    } catch {
      context = undefined;
    }

    const replyText = await generateAvaReplyText(thread, context, abortController.signal);
    if (!replyText) {
      return;
    }

    const latestCustomerMessage =
      latestMessage?.kind === "customer"
        ? latestMessage.text
        : [...thread.messages]
            .reverse()
            .find((message) => message.kind === "customer")
            ?.text ?? "";
    const sanitizedReplyText = sanitizeAvaReplyEscalation({
      replyText,
      latestCustomerMessage,
      thread
    });
    if (!sanitizedReplyText.trim()) {
      return;
    }

    await appendAvaMessage(params.conversationId, sanitizedReplyText);
  } finally {
    clearTimeout(timeoutId);
    await publishAvaTyping(false);
  }
}

export async function getConversationsResult(
  actorUserId: string,
  options?: {
    excludeImpersonation?: boolean;
    ownOnly?: boolean;
  }
) {
  try {
    return {
      conversations: await listConversations(actorUserId, {
        excludeImpersonation: options?.excludeImpersonation,
        ownOnly: options?.ownOnly
      })
    };
  } catch (error) {
    if (error instanceof StoreError) {
      throw new ServiceError(error.status, error.message);
    }
    throw new ServiceError(500, "Unable to load conversations.");
  }
}

export async function createConversationResult(
  actorUserId: string,
  body: CreateConversationBody
) {
  try {
    const conversation = await createConversation(actorUserId, {
      subject: body.subject,
      projectRef: body.projectRef,
      greetingText: body.greetingText
    });
    return { conversation };
  } catch (error) {
    if (error instanceof StoreError) {
      throw new ServiceError(error.status, error.message);
    }
    throw new ServiceError(500, "Unable to create conversation.");
  }
}

export async function getConversationResult(conversationId: string, actorUserId: string) {
  const conversation = await getConversation(conversationId, actorUserId);
  if (!conversation) {
    throw new ServiceError(404, "Conversation not found.");
  }

  return { conversation };
}

export async function getConversationCustomerDetailsResult(
  conversationId: string,
  actorUserId: string
) {
  try {
    const details = await getConversationCustomerDetails(conversationId, actorUserId);
    return { details };
  } catch (error) {
    if (error instanceof StoreError) {
      throw new ServiceError(error.status, error.message);
    }
    throw new ServiceError(500, "Unable to load conversation customer details.");
  }
}

export async function getRepresentativeReplySuggestionResult(
  conversationId: string,
  actorUserId: string
) {
  let thread: Awaited<ReturnType<typeof getConversation>>;
  try {
    thread = await getConversation(conversationId, actorUserId);
  } catch (error) {
    if (error instanceof StoreError) {
      throw new ServiceError(error.status, error.message);
    }
    throw new ServiceError(500, "Unable to load conversation.");
  }

  if (!thread) {
    throw new ServiceError(404, "Conversation not found.");
  }

  const latestMessage = thread.messages[thread.messages.length - 1];
  if (!latestMessage || latestMessage.kind !== "customer" || !isCustomerQuestion(latestMessage.text)) {
    return {
      suggestion: null,
      sourceCustomerMessageId: null
    };
  }

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, 8000);

  try {
    let context: Awaited<ReturnType<typeof getAvaConversationContext>> | undefined;
    try {
      context = await getAvaConversationContext(conversationId, actorUserId);
    } catch {
      context = undefined;
    }

    const suggestion = await generateRepresentativeReplySuggestionText(
      thread,
      context,
      abortController.signal
    );
    const sanitizedSuggestion = suggestion ? stripEscalationOfferFromReply(suggestion).trim() : "";

    return {
      suggestion: sanitizedSuggestion || null,
      sourceCustomerMessageId: latestMessage.id
    };
  } catch (error) {
    if (error instanceof ServiceError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new ServiceError(504, "Ava suggestion timed out.");
    }
    throw new ServiceError(
      500,
      error instanceof Error ? error.message : "Unable to generate Ava suggestion."
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function createMessageResult(body: MessageBody, actorUserId: string) {
  if (!body.conversationId || !body.kind || !body.text?.trim()) {
    throw new ServiceError(400, "conversationId, kind, and text are required.");
  }
  if (body.kind === "system") {
    throw new ServiceError(400, "Use handoff endpoints for system status updates.");
  }

  const payload =
    body.kind === "representative"
      ? {
          kind: body.kind,
          representativeId: body.representativeId ?? "rep-unknown",
          text: body.text,
          clientMessageId: body.clientMessageId
        }
      : {
          kind: body.kind,
          text: body.text,
          clientMessageId: body.clientMessageId
        };

  try {
    const message = await appendMessage(body.conversationId, payload, actorUserId);

    if (body.kind === "customer") {
      // Do not block customer send latency on AI generation.
      void tryGenerateAvaReply({
        conversationId: body.conversationId,
        actorUserId
      }).catch(() => {
        // Keep customer messaging reliable even if AI generation fails.
      });
    }

    return { message };
  } catch (error) {
    if (error instanceof StoreError) {
      throw new ServiceError(error.status, error.message);
    }
    throw new ServiceError(500, error instanceof Error ? error.message : "Unable to append message.");
  }
}

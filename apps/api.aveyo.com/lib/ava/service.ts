import OpenAI from "openai";
import { type ConversationThread } from "@ava/chat-domain";
import { getOpenAiApiKey } from "@/lib/ai/config";
import { createInstrumentedFetch } from "@/lib/perf/metrics";

export interface AvaReplyContext {
  conversationId: string;
  handoffState: "none" | "pending" | "claimed" | "active" | "resolved";
  customer: {
    customerId: string | null;
    fullName: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    fin: string | null;
  };
  project: {
    projectRef: string | null;
    projectStatus: string | null;
    siteAddress: string | null;
    metadata: Record<string, unknown>;
  };
}

let cachedOpenAiClient: OpenAI | null | undefined;

function getOpenAiClient() {
  if (cachedOpenAiClient !== undefined) {
    return cachedOpenAiClient;
  }

  const apiKey = getOpenAiApiKey();
  cachedOpenAiClient = apiKey
    ? new OpenAI({
        apiKey,
        fetch: createInstrumentedFetch("openai")
      })
    : null;
  return cachedOpenAiClient;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function getPhaseOneProjectSnapshot(metadata: Record<string, unknown>) {
  const snapshot = asRecord(metadata.mysql_context_snapshot_phase1);
  if (!snapshot) {
    return undefined;
  }

  return snapshot;
}

function getPhaseTwoProjectSelection(metadata: Record<string, unknown>) {
  const selection = asRecord(metadata.project_selection_phase2);
  if (!selection) {
    return undefined;
  }

  return selection;
}

function buildContextSystemMessage(context: AvaReplyContext | undefined) {
  if (!context) {
    return undefined;
  }

  const projectSnapshot = getPhaseOneProjectSnapshot(context.project.metadata);
  const projectSelection = getPhaseTwoProjectSelection(context.project.metadata);

  const promptContext = {
    handoffState: context.handoffState,
    customer: {
      id: context.customer.customerId,
      name: context.customer.fullName,
      email: context.customer.email,
      phone: context.customer.phone,
      address: context.customer.address,
      financeId: context.customer.fin
    },
    project: {
      reference: context.project.projectRef,
      status: context.project.projectStatus,
      siteAddress: context.project.siteAddress,
      dataSnapshot: projectSnapshot,
      selection: projectSelection
    }
  };

  return {
    role: "system" as const,
    content:
      "Known customer/project context for this chat (may be incomplete):\n" +
      `${JSON.stringify(promptContext, null, 2)}\n` +
      "If project.dataSnapshot exists, treat it as the latest CRM snapshot for this customer/project. " +
      "If project.selection.requiresSelection is true, ask the customer to confirm the project " +
      "using one of the listed project references before giving project-specific details. " +
      "Use this context when relevant. If a non-critical value is missing or null, continue with the best available answer. " +
      "Only offer to connect the customer with customer care if the customer asks for a human " +
      "or if a critical missing value prevents answering their request."
  };
}

function buildPromptMessages(
  thread: ConversationThread,
  context?: AvaReplyContext
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const history = thread.messages
    .filter((message) => message.kind === "customer" || message.kind === "ava")
    .slice(-12)
    .map<OpenAI.Chat.Completions.ChatCompletionMessageParam>((message) => ({
      role: message.kind === "customer" ? "user" : "assistant",
      content: message.text
    }));

  const baseMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content:
        "You are Ava, Aveyo's support assistant. Be concise, practical, and warm. " +
        "Use plain language. Format answers for a plain-text chat bubble (no markdown renderer). " +
        "Do not use markdown syntax like **bold**, headers, or backticks. " +
        "When presenting project information, use short section titles and dash bullets with 'Label: value' lines in the same inline message. " +
        "If account-specific data is unavailable, say so clearly " +
        "and suggest handing off to a customer care agent only when truly needed. " +
        "Prioritize solving the question with the data you do have before offering escalation. " +
        "Do not add generic lines that suggest contacting customer care at the end of otherwise complete answers. " +
        "Only offer customer care when the customer asks for a human, or when critical missing data prevents you from answering the request. " +
        "Prioritize answering as many customer questions as possible before escalating. " +
        "If a human handoff is needed, first ask whether they want to speak with a customer care agent " +
        "using natural language. " +
        "Do not ask the customer to reply with specific words or a specific phrase. " +
        "When asking for consent, do not mention internal control names like 'Talk to a rep form'. " +
        "Only mention the request form after the customer confirms they want to speak with customer care. " +
        "Never claim you directly connected the customer to an agent. Never say you submitted " +
        "or will submit a request on the customer's behalf. Explain that Ava can open/show a short " +
        "request form, and the customer must complete and submit it themselves."
    }
  ];

  const contextMessage = buildContextSystemMessage(context);
  if (contextMessage) {
    baseMessages.push(contextMessage);
  }

  return [...baseMessages, ...history];
}

function buildRepresentativeDraftPromptMessages(
  thread: ConversationThread,
  context?: AvaReplyContext
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const history = thread.messages
    .filter(
      (message) =>
        message.kind === "customer" || message.kind === "ava" || message.kind === "representative"
    )
    .slice(-14)
    .map<OpenAI.Chat.Completions.ChatCompletionMessageParam>((message) => ({
      role: message.kind === "customer" ? "user" : "assistant",
      content: message.text
    }));

  const baseMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content:
        "You are Ava's internal copilot for Aveyo support representatives. " +
        "Draft a customer-ready message the representative can send as-is or edit. " +
        "Use plain language in plain text (no markdown syntax like **bold**, headers, or backticks). " +
        "Use available customer/project context to provide a concrete, data-filled answer when possible. " +
        "If data is missing, be transparent and provide the best next step without mentioning customer care handoff flows. " +
        "Write in first person as the representative, not as Ava. " +
        "Return only the draft message body."
    }
  ];

  const contextMessage = buildContextSystemMessage(context);
  if (contextMessage) {
    baseMessages.push(contextMessage);
  }

  return [...baseMessages, ...history];
}

function stripMarkdownDecorators(value: string) {
  return value
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "");
}

function normalizeReplyLine(line: string) {
  const trimmedRight = line.replace(/\s+$/g, "");
  if (!trimmedRight.trim()) {
    return "";
  }

  const normalizedDash = trimmedRight.replace(/^[\u2013\u2014]\s+/, "- ");
  const bulletMatch = normalizedDash.match(/^(\s*)([-*\u2022])\s+(.*)$/);
  if (!bulletMatch) {
    return normalizedDash;
  }

  const [, leadingWhitespace, , content] = bulletMatch;
  return `${leadingWhitespace}- ${content.trim()}`;
}

function formatInlinePlainTextReply(content: string) {
  const withoutMarkdown = stripMarkdownDecorators(content).replace(/\r\n?/g, "\n");
  const normalizedLines = withoutMarkdown.split("\n").map((line) => normalizeReplyLine(line));
  return normalizedLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function normalizeAssistantContent(
  content: OpenAI.Chat.Completions.ChatCompletion["choices"][number]["message"]["content"]
) {
  if (typeof content !== "string") {
    return undefined;
  }

  const normalized = formatInlinePlainTextReply(content);
  return normalized || undefined;
}

export async function generateAvaReplyText(
  thread: ConversationThread,
  context?: AvaReplyContext,
  signal?: AbortSignal
) {
  const openAiClient = getOpenAiClient();
  if (!openAiClient) {
    return undefined;
  }

  const completion = await openAiClient.chat.completions.create(
    {
      model: "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 220,
      messages: buildPromptMessages(thread, context)
    },
    { signal }
  );

  return normalizeAssistantContent(completion.choices[0]?.message?.content);
}

export async function generateRepresentativeReplySuggestionText(
  thread: ConversationThread,
  context?: AvaReplyContext,
  signal?: AbortSignal
) {
  const openAiClient = getOpenAiClient();
  if (!openAiClient) {
    return undefined;
  }

  const completion = await openAiClient.chat.completions.create(
    {
      model: "gpt-4o-mini",
      temperature: 0.35,
      max_tokens: 240,
      messages: buildRepresentativeDraftPromptMessages(thread, context)
    },
    { signal }
  );

  return normalizeAssistantContent(completion.choices[0]?.message?.content);
}

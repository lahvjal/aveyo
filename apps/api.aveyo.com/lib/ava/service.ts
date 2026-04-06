import OpenAI from "openai";
import { type ConversationThread } from "@ava/chat-domain";
import { getOpenAiApiKey } from "@/lib/ai/config";

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
  cachedOpenAiClient = apiKey ? new OpenAI({ apiKey }) : null;
  return cachedOpenAiClient;
}

function buildContextSystemMessage(context: AvaReplyContext | undefined) {
  if (!context) {
    return undefined;
  }

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
      siteAddress: context.project.siteAddress
    }
  };

  return {
    role: "system" as const,
    content:
      "Known customer/project context for this chat (may be incomplete):\n" +
      `${JSON.stringify(promptContext, null, 2)}\n` +
      "Use this context when relevant. If a required value is missing or null, say you do not have it " +
      "and offer to connect the customer with customer care."
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
        "Use plain language. If account-specific data is unavailable, say so clearly " +
        "and suggest handing off to a customer care agent only when truly needed. " +
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

function normalizeAssistantContent(
  content: OpenAI.Chat.Completions.ChatCompletion["choices"][number]["message"]["content"]
) {
  if (typeof content !== "string") {
    return undefined;
  }

  const normalized = content.trim();
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

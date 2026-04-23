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

const guestPublicSiteContext = {
  brand: {
    headline: "Spend less on power. Spend more on life.",
    differentiators: [
      "Custom solar design, permitting, installation, and project support",
      "Thoughtful system design around the home, usage, and long-term fit",
      "A guided process that explains what happens next instead of leaving homeowners guessing",
      "Long-term support and transparency instead of a quick sale"
    ],
    trustSignals: [
      "Public site highlights over 5k homeowners served",
      "Public site highlights a 4.7 Google rating",
      "Public site highlights an A+ BBB rating"
    ]
  },
  plans: [
    {
      plan: "Aveyo Subscription Plan",
      bestFor: "Homeowners who want a simpler monthly path with low upfront friction",
      highlights: [
        "Public plan page says it can reduce or eliminate most of the utility bill",
        "Public plan page highlights 25 years of warranties and insurance",
        "Public plan page says the system transfers with the sale of the home"
      ]
    },
    {
      plan: "Solar Panels Ownership",
      bestFor: "Homeowners who want the highest lifetime ROI and full ownership",
      highlights: [
        "Public plan page says it can reduce or eliminate most of the utility bill",
        "Public plan page highlights battery and roof warranty coverage",
        "Public plan page highlights financing options and home-value upside"
      ]
    }
  ],
  process: [
    {
      stage: "Pre-Approvals",
      milestones: ["Site survey", "Financing notice to proceed", "Engineering"]
    },
    {
      stage: "Approvals",
      milestones: ["City and utility submissions and approvals"]
    },
    {
      stage: "Construction",
      milestones: ["Install scheduling", "Installation", "City or utility inspections"]
    },
    {
      stage: "Activation",
      milestones: ["Permission to operate", "System active and producing"]
    }
  ],
  states: {
    Illinois:
      "Public site highlights rising electricity rates, Illinois Shines and SREC value, and utility rebates that vary by territory and system size.",
    Pennsylvania:
      "Public site highlights rising utility bills, federal incentives, and state or utility value that depends on the home, system size, and utility territory.",
    Utah:
      "Public site highlights strong solar potential, local expertise, and that Aveyo is headquartered in American Fork.",
    California:
      "Public site highlights high electricity rates, NEM 3.0, and the value of pairing solar with battery storage."
  }
} as const;

function buildGuestPublicSiteContextMessage() {
  return {
    role: "system" as const,
    content:
      "Approved public-site context for signed-out visitors:\n" +
      `${JSON.stringify(guestPublicSiteContext, null, 2)}\n` +
      "Use only the parts that are relevant to the visitor's question. Do not dump every fact at once. " +
      "Keep qualification, utility, and location caveats when the public-site context says details vary."
  };
}

const guestStarterIntroPhrases = [
  "new to solar",
  "first time hearing about it",
  "first time hearing about solar",
  "first time hearing",
  "first time learning",
  "just learning",
  "learning about solar"
];

const guestStarterBroadPhrases = [
  "new to this",
  "where do i start",
  "tell me about solar",
  "what should i know",
  "just curious"
];

function normalizeGuestText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function getLatestGuestCustomerText(thread: ConversationThread) {
  for (let index = thread.messages.length - 1; index >= 0; index -= 1) {
    const message = thread.messages[index];
    if (message?.kind === "customer") {
      return message.text;
    }
  }
  return "";
}

export function getGuestStarterReplyOverride(thread: ConversationThread) {
  const latestCustomerText = normalizeGuestText(getLatestGuestCustomerText(thread));
  if (!latestCustomerText) {
    return undefined;
  }

  if (guestStarterIntroPhrases.some((phrase) => latestCustomerText.includes(phrase))) {
    return "Totally fair. Is this your first time hearing about solar, or have you looked into it a bit already?";
  }

  if (
    guestStarterBroadPhrases.some((phrase) => latestCustomerText.includes(phrase)) ||
    latestCustomerText === "solar" ||
    latestCustomerText === "how does solar work"
  ) {
    return "Happy to help. What do you want to start with: how it works, savings, batteries, or timing?";
  }

  return undefined;
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

export function buildGuestPromptMessages(
  thread: ConversationThread
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const history = thread.messages
    .filter((message) => message.kind === "customer" || message.kind === "ava")
    .slice(-12)
    .map<OpenAI.Chat.Completions.ChatCompletionMessageParam>((message) => ({
      role: message.kind === "customer" ? "user" : "assistant",
      content: message.text
    }));

  return [
    {
      role: "system",
      content:
        "You are Ava, Aveyo's friendly solar guide for visitors who are not signed in. " +
        "Be conversational, concise, practical, warm, and relatable. " +
        "Sound like a calm expert talking to a homeowner, not a script. " +
        "Answer the visitor's question directly before suggesting any next step. " +
        "Ask at most one short follow-up question when it would materially improve the answer. " +
        "Use plain language and format answers for a plain-text chat bubble with no markdown syntax like **bold**, headers, or backticks. " +
        "Help with general solar education, batteries, incentives, savings, roof suitability, installation steps, timelines, maintenance, warranties, financing, plan tradeoffs, and the typical homeowner decision process. " +
        "Gently favor Aveyo when relevant by grounding answers in thoughtful system design, transparency, guided installation, and long-term support, but do not invent company policies, guarantees, pricing, financing approvals, or facts you do not know. " +
        "Do not claim access to project, account, contract, pricing, permit, schedule, or status data for signed-out visitors. " +
        "If the visitor asks for project-specific, account-specific, or quote-specific details, explain that those details require signing in, then keep helping with general guidance or next-step expectations. " +
        "If the visitor is broad or vague, or says they are new to solar, prefer a short clarifying question instead of a general explanation. " +
        "A brief line like 'Totally fair. What have you heard so far?' is better than a mini-primer. " +
        "Handle common homeowner concerns naturally, especially savings, cost, roof fit, batteries, timelines, transferability, and trust. " +
        "When visitors are unsure, reduce pressure: teach, clarify tradeoffs, and suggest one soft next step only if it fits the moment. " +
        "If a question depends on utility, state, rebate, or jurisdiction-specific rules and you do not know the exact answer, explain that it varies locally and answer at a high level using only approved public-site context. " +
        "Do not repeatedly tell visitors to sign in unless the question is specifically about their own project or account. " +
        "Prefer clear, useful answers over generic sales copy. " +
        "Default to brief replies, usually 1-2 short sentences. " +
        "Only go longer when the visitor explicitly asks for more detail, a comparison, or a walkthrough. " +
        "Avoid headings and avoid bullet lists unless the visitor asks for a list, comparison, or more detail. " +
        "Do not give a multi-point primer to a vague first message. " +
        "When appropriate, include 2-4 short bullet lines using '- ' in plain text."
    },
    buildGuestPublicSiteContextMessage(),
    ...history
  ];
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

export async function generateGuestAvaReplyText(
  thread: ConversationThread,
  signal?: AbortSignal
) {
  const starterReplyOverride = getGuestStarterReplyOverride(thread);
  if (starterReplyOverride) {
    return starterReplyOverride;
  }

  const openAiClient = getOpenAiClient();
  if (!openAiClient) {
    return undefined;
  }

  const completion = await openAiClient.chat.completions.create(
    {
      model: "gpt-4o-mini",
      temperature: 0.35,
      max_tokens: 110,
      messages: buildGuestPromptMessages(thread)
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

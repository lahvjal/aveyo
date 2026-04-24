import OpenAI from "openai";
import { type ConversationThread } from "@ava/chat-domain";
import { getOpenAiApiKey } from "@/lib/ai/config";
import { buildEmployeeAvaContext, type EmployeeAvaContext } from "@/lib/ava/employee-context";
import type { AppRole, SessionAccessContext } from "@/lib/auth/types";
import { buildAvaSystemPrompt } from "@/lib/ava/personality";
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

function hasMeaningfulCustomerOrProjectContext(context: AvaReplyContext) {
  const hasCustomerData = Object.values(context.customer).some((value) => value !== null);
  const hasProjectData =
    context.project.projectRef !== null ||
    context.project.projectStatus !== null ||
    context.project.siteAddress !== null ||
    Object.keys(context.project.metadata ?? {}).length > 0;

  return context.handoffState !== "none" || hasCustomerData || hasProjectData;
}

function buildContextSystemMessage(context: AvaReplyContext | undefined) {
  if (!context || !hasMeaningfulCustomerOrProjectContext(context)) {
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

function buildEmployeeContextSystemMessage(employeeContext: EmployeeAvaContext | undefined) {
  if (!employeeContext) {
    return undefined;
  }

  const promptContext: Record<string, unknown> = {
    actor: {
      role: employeeContext.actor.role,
      departmentName: employeeContext.actor.departmentName
    },
    accessPolicy: {
      canAccessDirectory: employeeContext.actor.policy.canAccessDirectory,
      canAccessNews: employeeContext.actor.policy.canAccessNews,
      kpiScope: employeeContext.actor.policy.kpiScope,
      kpiScopeLabel: employeeContext.actor.policy.kpiScopeLabel
    },
    latestQuestion: employeeContext.latestQuestion,
    detectedIntents: employeeContext.detectedIntents
  };

  if (employeeContext.directory) {
    promptContext.directory = employeeContext.directory;
  }
  if (employeeContext.news) {
    promptContext.news = employeeContext.news;
  }
  if (employeeContext.kpis) {
    promptContext.kpis = employeeContext.kpis;
  }

  return {
    role: "system" as const,
    content:
      "Approved employee knowledge context for this chat:\n" +
      `${JSON.stringify(promptContext, null, 2)}\n` +
      "Use only this approved internal context when answering employee questions. " +
      "If a provider says data is restricted, unavailable, ambiguous, or no match was found, say that briefly instead of guessing. " +
      "Never reveal private phone numbers, direct email addresses, personal schedules, or KPI data outside the approved scope."
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

function buildGuestProjectLoginContextMessage(guestProjectLoginUrl: string | undefined) {
  if (!guestProjectLoginUrl) {
    return undefined;
  }

  return {
    role: "system" as const,
    content:
      "Approved sign-in URL for signed-out visitors who ask about their own project, quote, permit, schedule, or account details:\n" +
      `${guestProjectLoginUrl}\n` +
      "Use this URL only when the visitor is asking about their own project or account. " +
      "When relevant, include the URL once as plain text, ask them to sign in before sharing project-specific details, " +
      "and then keep helping with general expectations or next steps."
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

const guestProjectSpecificKeywords = [
  "project status",
  "status update",
  "project details",
  "project info",
  "project information",
  "project stuff",
  "my project",
  "my installation",
  "my permit",
  "my timeline",
  "my account",
  "my quote",
  "my proposal",
  "my payment",
  "my invoice",
  "my contract",
  "project ref",
  "project reference",
  "fin number",
  "site address",
  "customer portal"
];

function normalizeGuestText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function hasAnyGuestKeyword(text: string, keywords: readonly string[]) {
  return keywords.some((keyword) => text.includes(keyword));
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

function isGuestProjectSpecificQuestion(normalizedText: string) {
  const personalProjectPattern =
    /\b(my|our|me|i|mine)\b.*\b(project|installation|permit|inspection|timeline|status|quote|proposal|design|application|account|payment|invoice|contract|fin)\b/;

  return (
    hasAnyGuestKeyword(normalizedText, guestProjectSpecificKeywords) ||
    personalProjectPattern.test(normalizedText)
  );
}

function buildGuestProjectLoginReply(guestProjectLoginUrl: string | undefined) {
  const loginLine = guestProjectLoginUrl
    ? `Log in here: ${guestProjectLoginUrl}`
    : "Sign in to your account and I can help with that.";

  return [
    "I can help with your specific project, quote, or account details once you're signed in.",
    loginLine,
    "I can still explain the usual next step or what typically affects timing if that helps."
  ].join("\n");
}

export function getGuestProjectReplyOverride(
  thread: ConversationThread,
  guestProjectLoginUrl?: string
) {
  const latestCustomerText = normalizeGuestText(getLatestGuestCustomerText(thread));
  if (!latestCustomerText || !isGuestProjectSpecificQuestion(latestCustomerText)) {
    return undefined;
  }

  return buildGuestProjectLoginReply(guestProjectLoginUrl);
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

export function buildPromptMessages(
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
      content: buildAvaSystemPrompt("customer")
    }
  ];

  const contextMessage = buildContextSystemMessage(context);
  if (contextMessage) {
    baseMessages.push(contextMessage);
  }

  return [...baseMessages, ...history];
}

export function buildEmployeePromptMessages(
  thread: ConversationThread,
  employeeContext: EmployeeAvaContext,
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
      content: buildAvaSystemPrompt("employee")
    }
  ];

  const employeeContextMessage = buildEmployeeContextSystemMessage(employeeContext);
  if (employeeContextMessage) {
    baseMessages.push(employeeContextMessage);
  }

  const customerContextMessage = buildContextSystemMessage(context);
  if (customerContextMessage) {
    baseMessages.push(customerContextMessage);
  }

  return [...baseMessages, ...history];
}

export async function buildAuthenticatedPromptMessages(
  thread: ConversationThread,
  options: {
    context?: AvaReplyContext;
    actorUserId?: string;
    actorRole?: AppRole;
    actorAccess?: SessionAccessContext;
    allowEmployeeAudience?: boolean;
  } = {}
): Promise<OpenAI.Chat.Completions.ChatCompletionMessageParam[]> {
  if (options.allowEmployeeAudience !== false && options.actorUserId) {
    const employeeContext = await buildEmployeeAvaContext({
      actorUserId: options.actorUserId,
      actorRole: options.actorRole,
      actorAccess: options.actorAccess,
      thread
    });

    if (employeeContext) {
      return buildEmployeePromptMessages(thread, employeeContext, options.context);
    }
  }

  return buildPromptMessages(thread, options.context);
}

export function buildGuestPromptMessages(
  thread: ConversationThread,
  options: {
    guestProjectLoginUrl?: string;
  } = {}
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const history = thread.messages
    .filter((message) => message.kind === "customer" || message.kind === "ava")
    .slice(-12)
    .map<OpenAI.Chat.Completions.ChatCompletionMessageParam>((message) => ({
      role: message.kind === "customer" ? "user" : "assistant",
      content: message.text
    }));
  const guestProjectLoginContextMessage = buildGuestProjectLoginContextMessage(
    options.guestProjectLoginUrl
  );

  return [
    {
      role: "system",
      content: buildAvaSystemPrompt("guest")
    },
    buildGuestPublicSiteContextMessage(),
    ...(guestProjectLoginContextMessage ? [guestProjectLoginContextMessage] : []),
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
  signal?: AbortSignal,
  options?: {
    actorUserId?: string;
    actorRole?: AppRole;
    actorAccess?: SessionAccessContext;
    allowEmployeeAudience?: boolean;
  }
) {
  const openAiClient = getOpenAiClient();
  if (!openAiClient) {
    return undefined;
  }

  const messages = await buildAuthenticatedPromptMessages(thread, {
    context,
    actorUserId: options?.actorUserId,
    actorRole: options?.actorRole,
    actorAccess: options?.actorAccess,
    allowEmployeeAudience: options?.allowEmployeeAudience
  });

  const completion = await openAiClient.chat.completions.create(
    {
      model: "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 220,
      messages
    },
    { signal }
  );

  return normalizeAssistantContent(completion.choices[0]?.message?.content);
}

export async function generateGuestAvaReplyText(
  thread: ConversationThread,
  signal?: AbortSignal,
  options: {
    guestProjectLoginUrl?: string;
  } = {}
) {
  const projectReplyOverride = getGuestProjectReplyOverride(thread, options.guestProjectLoginUrl);
  if (projectReplyOverride) {
    return projectReplyOverride;
  }

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
      messages: buildGuestPromptMessages(thread, options)
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

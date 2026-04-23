"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type ConversationThread, type TimelineMessage } from "@ava/chat-domain";
import { getLocalAppUrl } from "@ava/config/runtime/app-urls";
import {
  createWidgetApiClient,
  type GuestReplyMessageInput,
  type ImpersonationCustomer,
  type WidgetApiClient
} from "../../api/widget-api";
import { useWidgetRealtimeInvalidation } from "../../api/use-widget-realtime-invalidation";
import { useWidgetAuthSession } from "../../auth/use-widget-auth-session";
import { resolveDefaultApiBaseUrl } from "../../session";
import type { HostSessionSnapshot } from "../../types";
import {
  appendMessage,
  createLoggedOutConversation,
  createOptimisticCustomerGreetingConversation,
  createStarterConversation,
  createSystemStatusMessage,
  createTestModeConversation,
  normalizeMessageDraft
} from "../../widget-state";
import { LauncherButton } from "./launcher-button";
import { WidgetComposer } from "./widget-composer";
import { WidgetTestMode } from "./widget-test-mode";
import { WidgetTimeline } from "./widget-timeline";

interface ActiveImpersonation {
  projectRef: string;
  label: string;
}

interface HostWidgetCommandMessage {
  source?: string;
  type?: string;
  open?: boolean;
}

interface AvaWidgetShellProps {
  embedMode?: boolean;
  defaultOpen?: boolean;
  showEmbedNote?: boolean;
  apiBaseUrl?: string;
  sessionSnapshot?: HostSessionSnapshot | null;
  apiClient?: WidgetApiClient;
}

function generateClientMessageId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function resolveGreetingName(user: { name?: string | null; email?: string | null } | null) {
  const name = typeof user?.name === "string" ? user.name.trim() : "";
  const normalizedName = name.toLowerCase();
  if (name && normalizedName !== "account" && normalizedName !== "customer" && normalizedName !== "user") {
    return name;
  }

  const email = typeof user?.email === "string" ? user.email.trim() : "";
  if (!email) {
    return "";
  }

  const localPart = email.split("@")[0]?.trim();
  return localPart || "";
}

function toPersonalizedGreetingText(name: string) {
  return `Hi, ${name}! How can I help you today?`;
}

function isGenericInitialAvaGreeting(text: string) {
  const normalized = text
    .trim()
    .toLowerCase()
    .replace(/\u2019/g, "'")
    .replace(/\s+/g, " ");

  if (!normalized.startsWith("hi!")) {
    return false;
  }

  return (
    normalized.includes("how can i help you today") ||
    (normalized.includes("i'm ava from aveyo") &&
      normalized.includes("solar installation questions"))
  );
}

function personalizeInitialGreeting(
  thread: ConversationThread,
  greetingName: string
): ConversationThread {
  const name = greetingName.trim();
  if (!name || thread.messages.length === 0) {
    return thread;
  }

  const targetIndex = thread.messages.findIndex(
    (message) => message.kind === "ava" && isGenericInitialAvaGreeting(message.text)
  );
  if (targetIndex === -1) {
    return thread;
  }

  const targetMessage = thread.messages[targetIndex];
  if (!targetMessage) {
    return thread;
  }

  return {
    ...thread,
    messages: thread.messages.map((message, index) =>
      index === targetIndex
        ? {
            ...message,
            text: toPersonalizedGreetingText(name)
          }
        : message
    )
  };
}

const guestProjectSpecificKeywords = [
  "project status",
  "status update",
  "my project",
  "my installation",
  "my permit",
  "my timeline",
  "my account",
  "my quote",
  "my proposal",
  "my payment",
  "my invoice",
  "my bill",
  "project ref",
  "project reference",
  "fin number",
  "site address"
];

const guestCompanyInfoKeywords = [
  "aveyo",
  "about aveyo",
  "why aveyo",
  "why choose aveyo",
  "company",
  "different",
  "difference",
  "compare companies"
];

const guestPlanKeywords = [
  "subscription",
  "lease",
  "leasing",
  "own",
  "ownership",
  "buy",
  "purchase",
  "loan",
  "finance",
  "financing",
  "cash"
];

const guestSavingsKeywords = [
  "worth it",
  "save",
  "savings",
  "saving",
  "payback",
  "bill",
  "cost",
  "costs",
  "expensive",
  "monthly payment",
  "utility rates",
  "electric bill"
];

const guestProcessKeywords = [
  "process",
  "timeline",
  "timing",
  "how long",
  "after i sign up",
  "after signup",
  "next step",
  "next steps",
  "site survey",
  "permit",
  "permitting",
  "install",
  "inspection",
  "construction",
  "activation",
  "permission to operate",
  "pto"
];

const guestTrustKeywords = [
  "scam",
  "scams",
  "legit",
  "trust",
  "trustworthy",
  "bad experience",
  "bad name",
  "pushy",
  "pressure",
  "transparent",
  "transparency"
];

const guestIncentiveKeywords = [
  "incentive",
  "incentives",
  "rebate",
  "rebates",
  "tax credit",
  "net metering",
  "nem 3.0",
  "srec",
  "illinois shines"
];

const guestSensitiveInfoKeywords = [
  "employee",
  "employees",
  "staff",
  "team member",
  "team members",
  "people at aveyo",
  "person at aveyo",
  "rep name",
  "sales rep",
  "manager",
  "phone number",
  "direct number",
  "direct line",
  "cell",
  "cell number",
  "email address",
  "personal email",
  "contact info"
];

const guestBroadIntroKeywords = [
  "new to solar",
  "first time hearing about it",
  "first time hearing",
  "first time learning",
  "new to this",
  "just learning",
  "learning about solar",
  "where do i start",
  "just curious",
  "tell me about solar",
  "what should i know"
];

const guestSolarInfoKeywords = [
  "solar",
  "panels",
  "panel",
  "battery",
  "net metering",
  "inverter",
  "sunlight",
  "efficiency",
  "kwh",
  "payback",
  "electric bill",
  "utility"
];

const guestStateContexts = [
  {
    label: "Illinois",
    keywords: ["illinois", "illinois shines", "srec", "comed", "ameren"],
    shortReply:
      "Illinois is one of the stronger incentive markets on Aveyo's public site, with value that can come from Illinois Shines, SRECs, and utility rebates depending on the territory. If you want, I can compare how subscription and ownership usually feel there.",
    detailedReply:
      "Illinois is one of the strongest incentive conversations on Aveyo's public site.\n" +
      "- Illinois Shines and SREC value can materially improve the economics\n" +
      "- Utility rebates may add more value depending on the territory\n" +
      "- Final numbers still vary by system size and utility\n" +
      "If you want, I can also explain how subscription and ownership usually feel different there."
  },
  {
    label: "Pennsylvania",
    keywords: ["pennsylvania", "duquesne", "keystone state"],
    shortReply:
      "Pennsylvania is usually a rising-bills and predictability conversation. Aveyo's public site emphasizes incentives and lower, steadier monthly energy costs. If you want, I can compare the main plan tradeoffs.",
    detailedReply:
      "Pennsylvania is usually a predictability and rising-bill conversation.\n" +
      "- Aveyo's public site emphasizes federal incentives and relief from rising utility costs\n" +
      "- Savings still depend on your roof, usage, and utility territory\n" +
      "- The best fit often comes down to simplicity versus maximum long-term ROI\n" +
      "If you want, I can walk through the main plan tradeoffs."
  },
  {
    label: "Utah",
    keywords: ["utah", "american fork", "rocky mountain power"],
    shortReply:
      "Utah can be a strong solar fit because of the sunlight, and Aveyo's public site also emphasizes local expertise from its American Fork base. If you want, I can help you think through solar versus solar-plus-storage.",
    detailedReply:
      "Utah can be a strong solar fit because of the sunlight and Aveyo's local roots.\n" +
      "- Aveyo's public site highlights strong solar production potential\n" +
      "- The site also points to predictable-rate planning and local expertise from its American Fork base\n" +
      "- Exact savings still depend on your bill, roof, and shading\n" +
      "If you want, I can help you think through whether solar or solar-plus-storage makes more sense."
  },
  {
    label: "California",
    keywords: ["california", "nem 3.0", "pg&e", "sce", "sdg&e"],
    shortReply:
      "California is usually a solar-plus-storage conversation now. Aveyo's public site highlights high electricity rates and NEM 3.0, which is why batteries matter more there. If you want, I can explain when storage is worth the extra cost.",
    detailedReply:
      "California is usually a solar-plus-storage conversation now.\n" +
      "- Aveyo's public site highlights high electricity rates and NEM 3.0\n" +
      "- Batteries can matter more because stored energy is useful when rates peak\n" +
      "- The best system depends on your usage pattern, utility plan, and outage goals\n" +
      "If you want, I can explain when storage is worth the extra cost."
  }
] as const;

function hasAnyKeyword(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function isGuestProjectSpecificQuestion(normalizedText: string) {
  const personalProjectPattern =
    /\b(my|our|me|i|mine)\b.*\b(project|installation|permit|inspection|timeline|status|quote|proposal|design|application|account|payment|invoice|bill|site|address|fin)\b/;
  return (
    hasAnyKeyword(normalizedText, guestProjectSpecificKeywords) ||
    personalProjectPattern.test(normalizedText)
  );
}

function isSensitiveAveyoInfoQuestion(normalizedText: string) {
  const mentionsSensitiveInfo = hasAnyKeyword(normalizedText, guestSensitiveInfoKeywords);
  if (!mentionsSensitiveInfo) {
    return false;
  }

  return (
    normalizedText.includes("aveyo") ||
    normalizedText.includes("employee") ||
    normalizedText.includes("staff") ||
    normalizedText.includes("team")
  );
}

function getGuestStateContext(normalizedText: string) {
  return guestStateContexts.find((state) =>
    state.keywords.some((keyword) => normalizedText.includes(keyword))
  );
}

function wantsDetailedGuestReply(normalizedText: string) {
  return [
    "more detail",
    "more details",
    "tell me more",
    "explain more",
    "long version",
    "walk me through",
    "step by step",
    "break it down",
    "break that down",
    "compare",
    "comparison",
    "vs",
    "versus"
  ].some((keyword) => normalizedText.includes(keyword));
}

function isBroadGuestIntro(normalizedText: string) {
  if (hasAnyKeyword(normalizedText, guestBroadIntroKeywords)) {
    return true;
  }

  return (
    normalizedText.includes("how does solar work") &&
    !hasAnyKeyword(normalizedText, guestSavingsKeywords) &&
    !hasAnyKeyword(normalizedText, guestIncentiveKeywords) &&
    !hasAnyKeyword(normalizedText, guestPlanKeywords) &&
    !hasAnyKeyword(normalizedText, guestProcessKeywords)
  );
}

function buildGuestAvaReply(prompt: string) {
  const normalizedPrompt = prompt.trim().toLowerCase().replace(/\s+/g, " ");
  const stateContext = getGuestStateContext(normalizedPrompt);
  const wantsDetails = wantsDetailedGuestReply(normalizedPrompt);

  if (isBroadGuestIntro(normalizedPrompt) && !wantsDetails) {
    if (
      normalizedPrompt.includes("new to solar") ||
      normalizedPrompt.includes("first time hearing") ||
      normalizedPrompt.includes("first time learning")
    ) {
      return "Totally fair. Is this your first time hearing about solar, or have you looked into it a bit already?";
    }

    return "Happy to help. What do you want to start with: how it works, savings, batteries, or timing?";
  }

  if (isSensitiveAveyoInfoQuestion(normalizedPrompt)) {
    return (
      "That sounds like the kind of thing that gets me sent to an imaginary HR meeting. " +
      "I can't share private employee details or direct contact info, but I can help point you to a public Aveyo contact path if you tell me what you're trying to reach."
    );
  }

  if (isGuestProjectSpecificQuestion(normalizedPrompt)) {
    if (!wantsDetails) {
      return "I can't see your specific quote, status, or account details while you're signed out. If you sign in, I can help with that. I can still explain the usual next step or what typically affects timing.";
    }
    return (
      "I can't see your specific quote, project status, permits, pricing, or account details while you're signed out. " +
      "If you sign in, I can help with that.\n" +
      "- I can still explain what stage usually comes next\n" +
      "- I can walk through what typically affects timing or pricing\n" +
      "- I can help you figure out whether sales or customer care is the better next step"
    );
  }

  if (hasAnyKeyword(normalizedPrompt, guestPlanKeywords)) {
    if (!wantsDetails) {
      return "Broadly, subscription is more about simplicity and lower upfront friction, while ownership is more about long-term ROI and full control. If you want, I can compare them in more detail.";
    }
    return (
      "A simple way to compare Aveyo's public plan options:\n" +
      "- Subscription: lower upfront friction, a simpler monthly path, and long coverage highlighted on the plan page\n" +
      "- Ownership: more long-term upside, full ownership, financing options, and home-value potential\n" +
      "- The better fit depends on whether you care more about simplicity or maximum lifetime ROI\n" +
      "If you want, tell me whether your priority is monthly payment or long-term return and I can point you in the right direction."
    );
  }

  if (hasAnyKeyword(normalizedPrompt, guestProcessKeywords)) {
    if (!wantsDetails) {
      return "Usually it goes survey and engineering, then approvals, then install and inspections, then activation. Timing varies by city and utility. If you want, I can break down any stage.";
    }
    return (
      "Aveyo's public process is usually framed in four stages:\n" +
      "- Pre-Approvals: survey, financing clearance, and engineering\n" +
      "- Approvals: city and utility submissions\n" +
      "- Construction: install scheduling, installation, and inspections\n" +
      "- Activation: permission to operate and system turn-on\n" +
      "Exact timing varies by city, utility, and inspection backlog, but I can explain any stage in plain English if you'd like."
    );
  }

  if (
    stateContext &&
    (hasAnyKeyword(normalizedPrompt, guestSavingsKeywords) ||
      hasAnyKeyword(normalizedPrompt, guestIncentiveKeywords) ||
      hasAnyKeyword(normalizedPrompt, guestSolarInfoKeywords) ||
      normalizedPrompt.split(" ").length <= 4)
  ) {
    return wantsDetails ? stateContext.detailedReply : stateContext.shortReply;
  }

  if (hasAnyKeyword(normalizedPrompt, guestIncentiveKeywords)) {
    if (!wantsDetails) {
      return "Incentives usually depend on your state, utility, and timing. Federal credits, local programs, and utility rules can all matter. If you tell me your state, I can keep it practical.";
    }
    return (
      "Incentives are usually a mix of federal credits, state programs, utility rebates, and net-metering or export rules.\n" +
      "- The exact stack depends on your state and utility\n" +
      "- Some programs change over time or have qualification rules\n" +
      "- That is why the same system can look different from one market to another\n" +
      "If you tell me your state, I can explain the big factors that usually matter there."
    );
  }

  if (hasAnyKeyword(normalizedPrompt, guestSavingsKeywords)) {
    if (!wantsDetails) {
      return "Whether solar is worth it usually comes down to your bill, roof conditions, and local incentives. Homes with higher bills and good sun exposure often have more to gain. If you want, tell me your state or rough bill range.";
    }
    return (
      "Whether solar is worth it usually comes down to a few basics:\n" +
      "- your current electric bill and rate pressure\n" +
      "- usable roof space and shading\n" +
      "- local incentives and utility rules\n" +
      "- whether you want the lowest monthly cost or the best long-term ROI\n" +
      "Aveyo's approach is to design around the home's real usage and long-term fit, not just add more panels. " +
      "If you tell me your state or rough bill range, I can make this more concrete."
    );
  }

  if (hasAnyKeyword(normalizedPrompt, guestTrustKeywords)) {
    if (!wantsDetails) {
      return "That concern is fair. A good solar company should be clear about sizing, costs, timeline, and what happens if you move. Aveyo's public messaging leans hard on transparency and guided support.";
    }
    return (
      "That concern is fair. A lot of homeowners are cautious because solar can feel opaque or overly salesy.\n" +
      "- A good installer should explain sizing, costs, warranties, timeline, and what happens if you move\n" +
      "- Aveyo's public messaging leans on transparency and guiding homeowners from start to finish\n" +
      "- You should never feel rushed into a system or plan you do not understand\n" +
      "If you want, I can help you build a smart checklist for comparing installers."
    );
  }

  if (hasAnyKeyword(normalizedPrompt, guestCompanyInfoKeywords)) {
    if (!wantsDetails) {
      return "Aveyo's public approach is to guide homeowners from design through installation and support, with an emphasis on thoughtful system design and transparency. If you want, I can also tell you what to compare when choosing between installers.";
    }
    return (
      "Aveyo's public approach is to guide homeowners from consultation and system design through permitting, installation, activation, and support. " +
      "The emphasis is on thoughtful system design, transparency, and helping people choose a plan that actually fits the home and their goals.\n" +
      "If you're comparing installers, I can also help you think through what questions are worth asking."
    );
  }

  if (hasAnyKeyword(normalizedPrompt, guestSolarInfoKeywords)) {
    if (!wantsDetails) {
      return "Solar performance mostly comes down to roof direction, shade, energy usage, and local utility rules. If you want, tell me your state or biggest concern and I can keep it specific.";
    }
    return (
      "At a high level, solar performance depends on roof direction, shade, system size, household usage, battery strategy, and local utility rules. " +
      "Homes with higher bills and good sun exposure usually have more to gain.\n" +
      "If you want, tell me your state or biggest concern and I can make that more specific."
    );
  }

  return (
    "Happy to help. I can answer questions about solar savings, batteries, incentives, timelines, plan options, or what going solar with Aveyo typically looks like.\n" +
    "What are you most curious about?"
  );
}

function buildGuestReplyHistory(thread: ConversationThread): GuestReplyMessageInput[] {
  return thread.messages
    .filter(
      (message): message is TimelineMessage & { kind: "customer" | "ava" } =>
        message.kind === "customer" || message.kind === "ava"
    )
    .slice(-12)
    .map((message) => ({
      kind: message.kind,
      text: message.text
    }));
}

function createLocalTimelineMessage(
  conversationId: string,
  kind: "customer" | "ava",
  text: string
): TimelineMessage {
  return {
    id: `${kind}-${generateClientMessageId()}`,
    conversationId,
    kind,
    text,
    createdAt: new Date().toISOString(),
    deliveryState: "sent"
  };
}

function shouldPromptRepRequest(text: string) {
  const normalized = text.trim().toLowerCase().replace(/\s+/g, " ");
  if (!normalized) {
    return false;
  }

  const mentionsRepActionPhrase =
    normalized.includes("talk to a rep") ||
    normalized.includes("request form") ||
    normalized.includes("open the form") ||
    normalized.includes("show the form") ||
    normalized.includes("customer care") ||
    normalized.includes("support team") ||
    normalized.includes("support agent") ||
    normalized.includes("representative") ||
    normalized.includes("live agent") ||
    normalized.includes("human agent") ||
    (normalized.includes("connect") &&
      (normalized.includes("representative") ||
        normalized.includes("support agent") ||
        normalized.includes("customer care")));
  if (!mentionsRepActionPhrase) {
    return false;
  }

  return (
    normalized.includes("would you like") ||
    normalized.includes("do you want") ||
    normalized.includes("want me to") ||
    normalized.includes("should i") ||
    normalized.includes("if you'd like") ||
    normalized.includes("if you would like") ||
    normalized.includes("let me know if") ||
    normalized.includes("please confirm") ||
    normalized.includes("can i") ||
    normalized.includes("could i") ||
    normalized.endsWith("?")
  );
}

function isRepConfirmationYes(text: string) {
  const normalized = text
    .trim()
    .toLowerCase()
    .replace(/[^\w\s']/g, " ")
    .replace(/\s+/g, " ");
  if (!normalized) {
    return false;
  }

  const shortEscalationConfirmationPatterns = [
    /^(human|agent|rep|representative|person|customer care|support agent)(\s+(please|now))?$/,
    /^(human|agent|rep|representative)(\s+\1){1,3}$/
  ];
  if (shortEscalationConfirmationPatterns.some((pattern) => pattern.test(normalized))) {
    return true;
  }

  const yesPatterns = [
    /\b(yes|yeah|yep|yup)\b/,
    /\b(sure|ok|okay|alright|sounds good)\b/,
    /\b(go ahead|please do|do it|that works|that would help)\b/,
    /\b(connect|open|show|start)\b.*\b(form|request|rep|representative|agent|customer care)\b/,
    /\b(talk|speak|chat)\b.*\b(rep|representative|agent|customer care|human)\b/,
    /\b(i want|i'd like|i would like)\b.*\b(rep|representative|agent|customer care|human)\b/,
    /\b(call me|have someone call|reach out|contact me)\b/
  ];
  const noPatterns = [
    /\b(no|nope|nah)\b/,
    /\b(not now|not yet|maybe later|later)\b/,
    /\b(no thanks|don't|do not|never mind|nevermind|cancel)\b/,
    /\b(i'm good|im good|all good)\b/
  ];

  const hasYesIntent = yesPatterns.some((pattern) => pattern.test(normalized));
  const hasNoIntent = noPatterns.some((pattern) => pattern.test(normalized));
  if (hasNoIntent && !hasYesIntent) {
    return false;
  }
  return hasYesIntent;
}

// The inactivity timeout (in milliseconds) before the conversation timeline is reset.
// Currently set to 5 minutes (5 * 60 * 1000 ms).
// To change this duration, simply adjust the multiplier values.
const TIMELINE_RESET_INACTIVITY_MS = 5 * 60 * 1000;
const TIMELINE_RESET_STORAGE_PREFIX = "ava-widget-timeline-reset-v1:";
const AVA_TYPING_FALLBACK_MS = 15_000;
const AVA_TYPING_STOP_GRACE_MS = 3_200;
const REPRESENTATIVE_TYPING_FALLBACK_MS = 15_000;
const REPRESENTATIVE_TYPING_STOP_GRACE_MS = 3_200;
const HANDOFF_QUEUE_STATUS_DELAY_MS = 5_000;
const HANDOFF_QUEUE_STATUS_TEXT =
  "An agent is looking into your account. You will be connected soon.";

function allowsAvaReplyForThread(thread: ConversationThread) {
  return thread.handoff.state === "none" || thread.handoff.state === "resolved";
}

function toTimestampMs(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value).getTime();
  if (Number.isNaN(parsed)) {
    return null;
  }
  return parsed;
}

function getLastThreadActivityMs(thread: ConversationThread) {
  const latestMessage = thread.messages[thread.messages.length - 1];
  const latestMessageMs = toTimestampMs(latestMessage?.createdAt);
  if (latestMessageMs !== null) {
    return latestMessageMs;
  }
  return toTimestampMs(thread.updatedAt);
}

function readTimelineResetMs(conversationId: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const value = window.localStorage.getItem(`${TIMELINE_RESET_STORAGE_PREFIX}${conversationId}`);
    if (!value) {
      return null;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeTimelineResetMs(conversationId: string, resetMs: number | null) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const key = `${TIMELINE_RESET_STORAGE_PREFIX}${conversationId}`;
    if (resetMs === null) {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key, String(resetMs));
  } catch {
    // Ignore storage write failures in private mode or restricted contexts.
  }
}

function shouldSkipAutoTimelineReset(thread: ConversationThread) {
  return (
    thread.handoff.state === "pending" ||
    thread.handoff.state === "claimed" ||
    thread.handoff.state === "active"
  );
}

function createTimelineResetGreeting(
  conversationId: string,
  greetingName: string,
  resetMs: number
): TimelineMessage {
  return {
    id: `timeline-reset-greeting-${conversationId}-${resetMs}`,
    conversationId,
    kind: "ava",
    text: greetingName ? toPersonalizedGreetingText(greetingName) : "Hi! How can I help you today?",
    createdAt: new Date(resetMs).toISOString(),
    deliveryState: "sent"
  };
}

function isChatClosedSignalMessage(message: TimelineMessage | undefined) {
  if (!message || (message.kind !== "ava" && message.kind !== "system")) {
    return false;
  }
  return message.sessionControl?.kind === "chat_closed";
}

export function AvaWidgetShell({
  embedMode = false,
  defaultOpen = true,
  showEmbedNote,
  apiBaseUrl,
  sessionSnapshot,
  apiClient
}: AvaWidgetShellProps) {
  const authSession = useWidgetAuthSession({ apiBaseUrl, sessionSnapshot });
  const api = useMemo(
    () => apiClient ?? createWidgetApiClient({ apiBaseUrl }),
    [apiBaseUrl, apiClient]
  );
  const resolvedApiBaseUrl = useMemo(
    () => apiBaseUrl ?? resolveDefaultApiBaseUrl() ?? "",
    [apiBaseUrl]
  );
  const greetingName = resolveGreetingName(authSession.user);
  const shouldShowEmbedNote = showEmbedNote ?? !embedMode;
  const starterConversation = useMemo(() => createStarterConversation(), []);
  const loggedOutConversation = useMemo(() => createLoggedOutConversation(), []);
  const testModeConversation = useMemo(
    () => createTestModeConversation(greetingName),
    [greetingName]
  );
  const [thread, setThread] = useState<ConversationThread>(starterConversation);
  const [conversationReady, setConversationReady] = useState(false);
  const [isTestModeEnabled, setIsTestModeEnabled] = useState(false);
  const [testModeSearchQuery, setTestModeSearchQuery] = useState("");
  const [impersonationCustomers, setImpersonationCustomers] = useState<ImpersonationCustomer[]>([]);
  const [selectedImpersonationProjectRef, setSelectedImpersonationProjectRef] = useState("");
  const [activeImpersonation, setActiveImpersonation] = useState<ActiveImpersonation | null>(null);
  const [testModeBusy, setTestModeBusy] = useState(false);
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isPanelMounted, setIsPanelMounted] = useState(defaultOpen);
  const [isPanelVisible, setIsPanelVisible] = useState(defaultOpen);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestReason, setRequestReason] = useState("");
  const [draft, setDraft] = useState("");
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [handoffRequestPending, setHandoffRequestPending] = useState(false);
  const [isAvaTyping, setIsAvaTyping] = useState(false);
  const [isRepresentativeTyping, setIsRepresentativeTyping] = useState(false);
  const [ratingSubmissionRequestId, setRatingSubmissionRequestId] = useState<string | null>(null);
  const [timelineResetAtMs, setTimelineResetAtMs] = useState<number | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const launcherRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const avaTypingTimeoutRef = useRef<number | null>(null);
  const avaTypingStopTimeoutRef = useRef<number | null>(null);
  const representativeTypingTimeoutRef = useRef<number | null>(null);
  const representativeTypingStopTimeoutRef = useRef<number | null>(null);
  const handoffQueueStatusTimeoutRef = useRef<number | null>(null);
  const realtimeBusyRef = useRef(false);
  const modeStatusNoticeRef = useRef<string | null>(null);
  const pendingRepOfferMessageIdRef = useRef<string | null>(null);
  const handledChatClosedMessageIdRef = useRef<string | null>(null);

  const clearAvaTypingStopTimeout = useCallback(() => {
    if (avaTypingStopTimeoutRef.current === null) {
      return;
    }
    if (typeof window !== "undefined") {
      window.clearTimeout(avaTypingStopTimeoutRef.current);
    }
    avaTypingStopTimeoutRef.current = null;
  }, []);

  const clearAvaTypingTimeout = useCallback(() => {
    if (avaTypingTimeoutRef.current === null) {
      return;
    }
    if (typeof window !== "undefined") {
      window.clearTimeout(avaTypingTimeoutRef.current);
    }
    avaTypingTimeoutRef.current = null;
  }, []);

  const updateAvaTyping = useCallback(
    (isTyping: boolean) => {
      setIsAvaTyping(isTyping);
      clearAvaTypingStopTimeout();
      clearAvaTypingTimeout();
      if (!isTyping || typeof window === "undefined") {
        return;
      }
      avaTypingTimeoutRef.current = window.setTimeout(() => {
        avaTypingTimeoutRef.current = null;
        setIsAvaTyping(false);
      }, AVA_TYPING_FALLBACK_MS);
    },
    [clearAvaTypingStopTimeout, clearAvaTypingTimeout]
  );

  const scheduleAvaTypingStop = useCallback(() => {
    clearAvaTypingStopTimeout();
    if (typeof window === "undefined") {
      updateAvaTyping(false);
      return;
    }
    avaTypingStopTimeoutRef.current = window.setTimeout(() => {
      avaTypingStopTimeoutRef.current = null;
      updateAvaTyping(false);
    }, AVA_TYPING_STOP_GRACE_MS);
  }, [clearAvaTypingStopTimeout, updateAvaTyping]);

  const clearAvaTypingState = useCallback(() => {
    clearAvaTypingStopTimeout();
    updateAvaTyping(false);
  }, [clearAvaTypingStopTimeout, updateAvaTyping]);

  const clearRepresentativeTypingStopTimeout = useCallback(() => {
    if (representativeTypingStopTimeoutRef.current === null) {
      return;
    }
    if (typeof window !== "undefined") {
      window.clearTimeout(representativeTypingStopTimeoutRef.current);
    }
    representativeTypingStopTimeoutRef.current = null;
  }, []);

  const clearRepresentativeTypingTimeout = useCallback(() => {
    if (representativeTypingTimeoutRef.current === null) {
      return;
    }
    if (typeof window !== "undefined") {
      window.clearTimeout(representativeTypingTimeoutRef.current);
    }
    representativeTypingTimeoutRef.current = null;
  }, []);

  const updateRepresentativeTyping = useCallback(
    (isTyping: boolean) => {
      setIsRepresentativeTyping(isTyping);
      clearRepresentativeTypingStopTimeout();
      clearRepresentativeTypingTimeout();
      if (!isTyping || typeof window === "undefined") {
        return;
      }
      representativeTypingTimeoutRef.current = window.setTimeout(() => {
        representativeTypingTimeoutRef.current = null;
        setIsRepresentativeTyping(false);
      }, REPRESENTATIVE_TYPING_FALLBACK_MS);
    },
    [clearRepresentativeTypingStopTimeout, clearRepresentativeTypingTimeout]
  );

  const scheduleRepresentativeTypingStop = useCallback(() => {
    clearRepresentativeTypingStopTimeout();
    if (typeof window === "undefined") {
      updateRepresentativeTyping(false);
      return;
    }
    representativeTypingStopTimeoutRef.current = window.setTimeout(() => {
      representativeTypingStopTimeoutRef.current = null;
      updateRepresentativeTyping(false);
    }, REPRESENTATIVE_TYPING_STOP_GRACE_MS);
  }, [clearRepresentativeTypingStopTimeout, updateRepresentativeTyping]);

  const clearRepresentativeTypingState = useCallback(() => {
    clearRepresentativeTypingStopTimeout();
    updateRepresentativeTyping(false);
  }, [clearRepresentativeTypingStopTimeout, updateRepresentativeTyping]);

  const clearHandoffQueueStatusTimeout = useCallback(() => {
    if (handoffQueueStatusTimeoutRef.current === null) {
      return;
    }
    if (typeof window !== "undefined") {
      window.clearTimeout(handoffQueueStatusTimeoutRef.current);
    }
    handoffQueueStatusTimeoutRef.current = null;
  }, []);

  const scheduleHandoffQueueStatusMessage = useCallback(
    (conversationId: string) => {
      clearHandoffQueueStatusTimeout();
      if (typeof window === "undefined") {
        return;
      }

      handoffQueueStatusTimeoutRef.current = window.setTimeout(() => {
        handoffQueueStatusTimeoutRef.current = null;
        setThread((current) => {
          if (current.id !== conversationId) {
            return current;
          }

          if (current.handoff.state !== "pending" && current.handoff.state !== "claimed") {
            return current;
          }

          const hasQueueStatusMessage = current.messages.some(
            (message) => message.kind === "system" && message.text === HANDOFF_QUEUE_STATUS_TEXT
          );
          if (hasQueueStatusMessage) {
            return current;
          }

          return appendMessage(
            current,
            createSystemStatusMessage(current.id, HANDOFF_QUEUE_STATUS_TEXT)
          );
        });
      }, HANDOFF_QUEUE_STATUS_DELAY_MS);
    },
    [clearHandoffQueueStatusTimeout]
  );

  const canUseTestMode = authSession.authenticated && authSession.userType === "employee";
  const hasActiveImpersonation = activeImpersonation !== null;
  const personalizedThread = useMemo(() => {
    if (!authSession.authenticated) {
      return thread;
    }
    return personalizeInitialGreeting(thread, greetingName);
  }, [authSession.authenticated, greetingName, thread]);
  const activeThread = authSession.authenticated ? personalizedThread : thread;
  const visibleThread = useMemo(() => {
    if (!authSession.authenticated || !conversationReady || !timelineResetAtMs) {
      return activeThread;
    }

    const filteredMessages = activeThread.messages.filter((message) => {
      const createdAtMs = toTimestampMs(message.createdAt);
      if (createdAtMs === null) {
        return true;
      }
      return createdAtMs >= timelineResetAtMs;
    });

    if (filteredMessages.length > 0) {
      return {
        ...activeThread,
        messages: filteredMessages
      };
    }

    const resetGreeting = createTimelineResetGreeting(activeThread.id, greetingName, timelineResetAtMs);
    return {
      ...activeThread,
      messages: [resetGreeting]
    };
  }, [
    activeThread,
    authSession.authenticated,
    conversationReady,
    greetingName,
    timelineResetAtMs
  ]);

  const toImpersonationLabel = (customer: ImpersonationCustomer) =>
    customer.email || customer.customerName || customer.customerId || customer.projectRef;

  const loadImpersonationCustomers = async (query?: string) => {
    if (!canUseTestMode || testModeBusy) {
      return;
    }

    setTestModeBusy(true);
    try {
      const result = await api.listImpersonationCustomers(query, 25);
      setImpersonationCustomers(result.customers);
      setSelectedImpersonationProjectRef((current) => {
        if (current && result.customers.some((customer) => customer.projectRef === current)) {
          return current;
        }
        return "";
      });
      setRequestError(null);
    } catch (error) {
      setRequestError(
        error instanceof Error ? error.message : "Unable to load impersonation customers."
      );
    } finally {
      setTestModeBusy(false);
    }
  };

  const beginImpersonation = async (projectRef: string) => {
    if (!canUseTestMode || !isTestModeEnabled || !projectRef || testModeBusy) {
      return;
    }

    const selectedCustomer = impersonationCustomers.find(
      (customer) => customer.projectRef === projectRef
    );
    if (!selectedCustomer) {
      return;
    }

    setTestModeBusy(true);
    try {
      const result = await api.createImpersonationConversation({
        projectRef: selectedCustomer.projectRef,
        customerName: selectedCustomer.customerName ?? undefined,
        customerEmail: selectedCustomer.email ?? undefined
      });

      const label = toImpersonationLabel(selectedCustomer);
      const statusMessage = createSystemStatusMessage(
        result.conversation.id,
        `Impersonating ${label}`
      );
      setThread(appendMessage(result.conversation, statusMessage));
      setActiveImpersonation({
        projectRef: selectedCustomer.projectRef,
        label
      });
      setConversationReady(true);
      setShowRequestModal(false);
      setRequestReason("");
      setRequestError(null);
      setDraft("");
    } catch (error) {
      setRequestError(
        error instanceof Error ? error.message : "Unable to start impersonation."
      );
    } finally {
      setTestModeBusy(false);
    }
  };

  const cancelImpersonation = () => {
    setActiveImpersonation(null);
    setConversationReady(false);
    setShowRequestModal(false);
    setRequestReason("");
    setThread((current) => {
      if (!isTestModeEnabled || current.id === testModeConversation.id) {
        return testModeConversation;
      }
      return appendMessage(
        current,
        createSystemStatusMessage(current.id, "Impersonation cancelled")
      );
    });
  };

  const setTestMode = (enabled: boolean) => {
    if (!canUseTestMode || testModeBusy) {
      return;
    }

    setIsTestModeEnabled(enabled);
    setShowRequestModal(false);
    setRequestReason("");
    setDraft("");
    setRequestError(null);

    if (!enabled) {
      modeStatusNoticeRef.current = "Test mode off. Any active impersonation has ended.";
      setActiveImpersonation(null);
      setSelectedImpersonationProjectRef("");
      setImpersonationCustomers([]);
      setConversationReady(false);
      setThread((current) =>
        appendMessage(
          current,
          createSystemStatusMessage(current.id, "Test mode off. Any active impersonation has ended.")
        )
      );
      return;
    }

    modeStatusNoticeRef.current = null;
    setConversationReady(false);
    setThread(
      appendMessage(
        testModeConversation,
        createSystemStatusMessage(
          testModeConversation.id,
          "Test mode on. Impersonation is only active while test mode is enabled."
        )
      )
    );
    void loadImpersonationCustomers(testModeSearchQuery);
  };

  const sendDraft = async () => {
    if (!conversationReady || isSubmitting || testModeBusy) {
      return;
    }

    const messageText = normalizeMessageDraft(draft);
    if (!messageText) {
      return;
    }

    if (authSession.authenticated && pendingRepOfferMessageIdRef.current) {
      if (isRepConfirmationYes(messageText)) {
        pendingRepOfferMessageIdRef.current = null;
        setThread((current) =>
          appendMessage(current, createLocalTimelineMessage(current.id, "customer", messageText))
        );
        setDraft("");
        setRequestError(null);
        setShowRequestModal(true);
        return;
      }

      // Any other response means customer declined or continued the chat.
      pendingRepOfferMessageIdRef.current = null;
    }

    if (!authSession.authenticated) {
      const guestConversationId = thread.id;
      const guestCustomerMessage = createLocalTimelineMessage(guestConversationId, "customer", messageText);
      const nextGuestThread = appendMessage(thread, guestCustomerMessage);
      setThread((current) =>
        current.id === guestConversationId ? appendMessage(current, guestCustomerMessage) : current
      );
      setDraft("");
      setRequestError(null);
      setIsSubmitting(true);
      updateAvaTyping(true);
      try {
        const guestResult = await api.generateGuestReply({
          messages: buildGuestReplyHistory(nextGuestThread)
        });
        const guestReply = normalizeMessageDraft(guestResult.replyText) ?? buildGuestAvaReply(messageText);
        setThread((current) => {
          if (current.id !== guestConversationId) {
            return current;
          }
          return appendMessage(current, createLocalTimelineMessage(current.id, "ava", guestReply));
        });
      } catch {
        const guestFallbackReply = buildGuestAvaReply(messageText);
        setThread((current) => {
          if (current.id !== guestConversationId) {
            return current;
          }
          return appendMessage(current, createLocalTimelineMessage(current.id, "ava", guestFallbackReply));
        });
      } finally {
        updateAvaTyping(false);
        setIsSubmitting(false);
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const openFreshConversation = async () => {
        const created = await api.createConversation({
          greetingText: greetingName
            ? toPersonalizedGreetingText(greetingName)
            : "Hi! How can I help you today?"
        });
        return created.conversation;
      };
      const sendCustomerMessage = async (conversationId: string) =>
        api.createCustomerMessage({
          conversationId,
          text: messageText,
          clientMessageId: generateClientMessageId()
        });

      let targetThread = thread;
      if (thread.handoff.state === "resolved") {
        targetThread = await openFreshConversation();
      }

      let result;
      try {
        result = await sendCustomerMessage(targetThread.id);
      } catch (sendError) {
        const sendErrorMessage = sendError instanceof Error ? sendError.message : "";
        const shouldRetryOnNewConversation =
          /conversation is closed|start a new chat session/i.test(sendErrorMessage);
        if (!shouldRetryOnNewConversation) {
          throw sendError;
        }

        targetThread = await openFreshConversation();
        result = await sendCustomerMessage(targetThread.id);
      }

      setThread((current) => {
        if (current.id === targetThread.id) {
          return appendMessage(current, result.message);
        }
        return appendMessage(targetThread, result.message);
      });
      if (allowsAvaReplyForThread(targetThread)) {
        updateAvaTyping(true);
      }
      setDraft("");
      setRequestError(null);
    } catch (error) {
      setRequestError(
        error instanceof Error ? error.message : "Unable to send message right now."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitHandoffRequest = async () => {
    if (!authSession.authenticated || !conversationReady || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setHandoffRequestPending(true);
    try {
      const result = await api.requestHandoff({
        conversationId: thread.id,
        customerName: authSession.user?.name ?? "Customer",
        reason: requestReason.trim() || undefined
      });

      setThread(result.thread);
      scheduleHandoffQueueStatusMessage(result.thread.id);
      setShowRequestModal(false);
      setRequestReason("");
      setRequestError(null);
    } catch (error) {
      setRequestError(
        error instanceof Error ? error.message : "Unable to request handoff right now."
      );
    } finally {
      setIsSubmitting(false);
      setHandoffRequestPending(false);
    }
  };

  const submitHandoffRating = async (
    requestId: string,
    rating: "thumbs_up" | "thumbs_down"
  ) => {
    if (!authSession.authenticated || !conversationReady || isSubmitting || !thread.id) {
      return;
    }

    setRatingSubmissionRequestId(requestId);
    try {
      const result = await api.submitHandoffRating({
        conversationId: thread.id,
        rating
      });
      setThread(result.thread);
      setRequestError(null);
    } catch (error) {
      setRequestError(
        error instanceof Error ? error.message : "Unable to submit rating right now."
      );
    } finally {
      setRatingSubmissionRequestId(null);
    }
  };

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
      clearAvaTypingStopTimeout();
      clearAvaTypingTimeout();
      clearRepresentativeTypingStopTimeout();
      clearRepresentativeTypingTimeout();
      clearHandoffQueueStatusTimeout();
    };
  }, [
    clearAvaTypingStopTimeout,
    clearAvaTypingTimeout,
    clearRepresentativeTypingStopTimeout,
    clearRepresentativeTypingTimeout,
    clearHandoffQueueStatusTimeout
  ]);

  useEffect(() => {
    clearAvaTypingState();
    clearRepresentativeTypingState();
  }, [thread.id, clearAvaTypingState, clearRepresentativeTypingState]);

  useEffect(() => {
    if (!conversationReady) {
      clearAvaTypingState();
      clearRepresentativeTypingState();
    }
  }, [conversationReady, clearAvaTypingState, clearRepresentativeTypingState]);

  useEffect(() => {
    if (typeof window === "undefined" || window.parent === window) {
      return;
    }

    window.parent.postMessage(
      {
        source: "ava-widget",
        type: "open-state",
        open: isOpen
      },
      "*"
    );
  }, [isOpen]);

  useEffect(() => {
    if (authSession.loading) {
      return;
    }

    if (!authSession.authenticated) {
      setConversationReady(true);
      setThread((current) =>
        current.id === loggedOutConversation.id ? current : loggedOutConversation
      );
      pendingRepOfferMessageIdRef.current = null;
      modeStatusNoticeRef.current = null;
      setIsTestModeEnabled(false);
      setImpersonationCustomers([]);
      setSelectedImpersonationProjectRef("");
      setActiveImpersonation(null);
      setTestModeSearchQuery("");
      setTestModeBusy(false);
      return;
    }

    if (canUseTestMode && !isTestModeEnabled) {
      setConversationReady(false);
      setActiveImpersonation(null);
      setSelectedImpersonationProjectRef("");
      setImpersonationCustomers([]);
    }

    if (canUseTestMode && isTestModeEnabled) {
      if (!hasActiveImpersonation) {
        setConversationReady(false);
        setThread(testModeConversation);
      }
      return;
    }

    setConversationReady(false);
    setThread(createOptimisticCustomerGreetingConversation(greetingName));

    let cancelled = false;
    const loadConversation = async () => {
      try {
        setRequestError(null);
        const listResult = await api.listConversations({
          excludeImpersonation: canUseTestMode && !isTestModeEnabled,
          ownOnly: true
        });
        const latestOpenConversation =
          listResult.conversations.find((conversationItem) => conversationItem.handoff.state !== "resolved") ??
          null;
        let conversation = latestOpenConversation;
        if (!conversation) {
          const created = await api.createConversation({
            greetingText: greetingName
              ? toPersonalizedGreetingText(greetingName)
              : "Hi! How can I help you today?"
          });
          conversation = created.conversation;
        }
        if (!conversation) {
          throw new Error("Unable to load your conversation.");
        }

        if (cancelled) {
          return;
        }

        const modeStatusNotice = modeStatusNoticeRef.current;
        modeStatusNoticeRef.current = null;
        setThread(
          modeStatusNotice
            ? appendMessage(
                conversation,
                createSystemStatusMessage(conversation.id, modeStatusNotice)
              )
            : conversation
        );
        setConversationReady(true);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setConversationReady(false);
        setRequestError(
          error instanceof Error ? error.message : "Unable to load your conversation."
        );
      }
    };

    void loadConversation();
    return () => {
      cancelled = true;
    };
  }, [
    authSession.loading,
    authSession.authenticated,
    authSession.user?.id,
    authSession.user?.name,
    authSession.user?.email,
    loggedOutConversation,
    canUseTestMode,
    isTestModeEnabled,
    hasActiveImpersonation,
    greetingName,
    starterConversation,
    testModeConversation,
    api
  ]);

  useEffect(() => {
    if (canUseTestMode) {
      return;
    }

    modeStatusNoticeRef.current = null;
    setIsTestModeEnabled(false);
    setActiveImpersonation(null);
    setImpersonationCustomers([]);
    setSelectedImpersonationProjectRef("");
    setTestModeSearchQuery("");
    setTestModeBusy(false);
  }, [canUseTestMode]);

  useEffect(() => {
    if (!authSession.authenticated || !conversationReady) {
      setTimelineResetAtMs(null);
      return;
    }

    if (canUseTestMode && isTestModeEnabled) {
      setTimelineResetAtMs(null);
      return;
    }

    const conversationId = thread.id;
    const existingResetMs = readTimelineResetMs(conversationId);
    if (shouldSkipAutoTimelineReset(thread)) {
      setTimelineResetAtMs(existingResetMs);
      return;
    }

    const lastActivityMs = getLastThreadActivityMs(thread);
    if (lastActivityMs === null) {
      setTimelineResetAtMs(existingResetMs);
      return;
    }

    const nowMs = Date.now();
    const inactiveForMs = nowMs - lastActivityMs;
    if (inactiveForMs >= TIMELINE_RESET_INACTIVITY_MS) {
      const shouldCreateNewReset = !existingResetMs || existingResetMs < lastActivityMs;
      const nextResetMs = shouldCreateNewReset ? nowMs : existingResetMs;
      if (shouldCreateNewReset) {
        writeTimelineResetMs(conversationId, nextResetMs);
      }
      setTimelineResetAtMs(nextResetMs);
      return;
    }

    setTimelineResetAtMs(existingResetMs);
  }, [
    authSession.authenticated,
    canUseTestMode,
    conversationReady,
    isTestModeEnabled,
    thread
  ]);

  const syncConversationFromRealtime = useCallback(async () => {
    if (realtimeBusyRef.current) {
      return;
    }

    realtimeBusyRef.current = true;
    try {
      const refreshed = await api.getConversation(thread.id);
      setThread(refreshed.conversation);
      const latestMessage = refreshed.conversation.messages[refreshed.conversation.messages.length - 1];
      if (latestMessage?.kind === "ava") {
        clearAvaTypingState();
      }
      if (latestMessage?.kind === "representative") {
        clearRepresentativeTypingState();
      }
    } catch (error) {
      setRequestError(
        error instanceof Error ? error.message : "Realtime sync is temporarily unavailable."
      );
    } finally {
      realtimeBusyRef.current = false;
    }
  }, [api, clearAvaTypingState, clearRepresentativeTypingState, thread.id]);

  const handleRealtimeTyping = useCallback(
    (payload: { actor: "customer" | "representative" | "ava"; isTyping: boolean; conversationId: string }) => {
      if (payload.conversationId !== thread.id) {
        return;
      }

      if (payload.actor === "ava") {
        if (payload.isTyping) {
          updateAvaTyping(true);
        } else {
          scheduleAvaTypingStop();
        }
        return;
      }

      if (payload.actor === "representative") {
        if (payload.isTyping) {
          updateRepresentativeTyping(true);
        } else {
          scheduleRepresentativeTypingStop();
        }
      }
    },
    [
      scheduleAvaTypingStop,
      scheduleRepresentativeTypingStop,
      thread.id,
      updateAvaTyping,
      updateRepresentativeTyping
    ]
  );

  useWidgetRealtimeInvalidation({
    enabled: authSession.authenticated && conversationReady && Boolean(resolvedApiBaseUrl),
    baseUrl: resolvedApiBaseUrl,
    conversationId: thread.id,
    debounceMs: 150,
    onInvalidate: () => {
      void syncConversationFromRealtime();
    },
    onHeartbeat: () => {
      void syncConversationFromRealtime();
    },
    onTyping: handleRealtimeTyping,
    onError: () => {
      setRequestError("Realtime sync is temporarily unavailable.");
    }
  });

  useEffect(() => {
    if (!authSession.authenticated || !conversationReady) {
      return;
    }

    const latestMessage = visibleThread.messages[visibleThread.messages.length - 1];
    if (!latestMessage) {
      return;
    }

    if (
      latestMessage.kind === "system" &&
      (visibleThread.handoff.state === "pending" ||
        visibleThread.handoff.state === "claimed" ||
        visibleThread.handoff.state === "active")
    ) {
      pendingRepOfferMessageIdRef.current = null;
      return;
    }

    if (latestMessage.kind !== "ava") {
      return;
    }

    if (shouldPromptRepRequest(latestMessage.text)) {
      pendingRepOfferMessageIdRef.current = latestMessage.id;
    }
  }, [authSession.authenticated, conversationReady, visibleThread]);

  const openPanel = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsPanelMounted(true);
    requestAnimationFrame(() => {
      setIsPanelVisible(true);
      setIsOpen(true);
    });
  }, []);

  const closePanel = useCallback(() => {
    setIsPanelVisible(false);
    setIsOpen(false);
    closeTimerRef.current = window.setTimeout(() => {
      setIsPanelMounted(false);
      closeTimerRef.current = null;
    }, 240);
  }, []);

  useEffect(() => {
    if (!authSession.authenticated || !conversationReady) {
      return;
    }

    const latestMessage = visibleThread.messages[visibleThread.messages.length - 1];
    if (!isChatClosedSignalMessage(latestMessage)) {
      return;
    }

    if (handledChatClosedMessageIdRef.current === latestMessage.id) {
      return;
    }
    handledChatClosedMessageIdRef.current = latestMessage.id;

    pendingRepOfferMessageIdRef.current = null;
    clearAvaTypingState();
    clearRepresentativeTypingState();
    clearHandoffQueueStatusTimeout();
    setShowRequestModal(false);
    setRequestReason("");
    setRequestError(null);
    setRatingSubmissionRequestId(null);
    setDraft("");

    const resetMs = Date.now();
    setTimelineResetAtMs(resetMs);
    writeTimelineResetMs(visibleThread.id, resetMs);
    closePanel();
  }, [
    authSession.authenticated,
    clearAvaTypingState,
    clearHandoffQueueStatusTimeout,
    clearRepresentativeTypingState,
    closePanel,
    conversationReady,
    visibleThread
  ]);

  useEffect(() => {
    if (typeof window === "undefined" || window.parent === window) {
      return;
    }

    const onHostMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== "object") {
        return;
      }

      const payload = event.data as HostWidgetCommandMessage;
      if (payload.source !== "aveyo-host" || payload.type !== "set-open-state") {
        return;
      }

      if (payload.open === true) {
        openPanel();
        return;
      }

      if (payload.open === false) {
        closePanel();
      }
    };

    window.addEventListener("message", onHostMessage);
    return () => {
      window.removeEventListener("message", onHostMessage);
    };
  }, [closePanel, openPanel]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (panelRef.current?.contains(target) || launcherRef.current?.contains(target)) {
        return;
      }
      closePanel();
    };

    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [isOpen, closePanel]);

  const togglePanel = () => {
    if (embedMode) {
      return;
    }
    if (isOpen) {
      closePanel();
      return;
    }
    openPanel();
  };

  const composerActionDisabled =
    authSession.loading ||
    !conversationReady ||
    isSubmitting ||
    testModeBusy;

  const testModeOptions = impersonationCustomers.map((customer) => ({
    projectRef: customer.projectRef,
    label: customer.projectStatus
      ? `${toImpersonationLabel(customer)} - ${customer.projectRef} (${customer.projectStatus})`
      : `${toImpersonationLabel(customer)} - ${customer.projectRef}`
  }));

  const iframeEmbedSnippet = `<iframe
  src="https://ava.aveyo.com/embed"
  title="Ava support chat"
  loading="lazy"
  referrerpolicy="strict-origin-when-cross-origin"
  style="position:fixed;right:24px;bottom:24px;width:440px;height:760px;border:0;z-index:2147483000;"
></iframe>`;

  return (
    <div className="host-surface">
      <div className="floating-widget">
        {isPanelMounted ? (
          <section
            ref={panelRef}
            className={`widget-panel ${isPanelVisible ? "is-open" : "is-closed"}`}
            aria-hidden={!isPanelVisible}
          >
            {canUseTestMode && isTestModeEnabled ? (
              <WidgetTestMode
                searchQuery={testModeSearchQuery}
                onSearchQueryChange={setTestModeSearchQuery}
                onSearch={() => {
                  void loadImpersonationCustomers(testModeSearchQuery);
                }}
                options={testModeOptions}
                selectedProjectRef={selectedImpersonationProjectRef}
                onSelectProjectRef={(projectRef) => {
                  setSelectedImpersonationProjectRef(projectRef);
                  if (!projectRef) {
                    cancelImpersonation();
                    return;
                  }
                  void beginImpersonation(projectRef);
                }}
                activeImpersonationLabel={activeImpersonation?.label}
                onCancelImpersonation={cancelImpersonation}
                disabled={!authSession.authenticated}
                busy={testModeBusy || isSubmitting}
              />
            ) : null}

            <WidgetTimeline
              thread={visibleThread}
              showAvaTyping={isAvaTyping}
              showRepresentativeTyping={isRepresentativeTyping}
              showRequestModal={showRequestModal}
              requestSubmissionPending={handoffRequestPending}
              requestReason={requestReason}
              ratingSubmissionRequestId={ratingSubmissionRequestId}
              onRequestReasonChange={setRequestReason}
              onCancelRequest={() => setShowRequestModal(false)}
              onSubmitRequest={() => {
                void submitHandoffRequest();
              }}
              onSubmitHandoffRating={(requestId, rating) => {
                void submitHandoffRating(requestId, rating);
              }}
            />

            <WidgetComposer
              disabled={false}
              actionDisabled={composerActionDisabled}
              sending={isSubmitting}
              requestPending={handoffRequestPending}
              showTalkToRep={isTestModeEnabled}
              showTestModeToggle={canUseTestMode}
              testModeEnabled={isTestModeEnabled}
              testModeToggleDisabled={
                authSession.loading ||
                !authSession.authenticated ||
                testModeBusy ||
                isSubmitting
              }
              draft={draft}
              onDraftChange={setDraft}
              onSendDraft={() => {
                void sendDraft();
              }}
              onTestModeChange={setTestMode}
              onOpenRequestModal={() => {
                if (!composerActionDisabled && isTestModeEnabled) {
                  setShowRequestModal(true);
                }
              }}
            />
          </section>
        ) : null}

        {!embedMode ? (
          <div ref={launcherRef}>
            <LauncherButton isOpen={isOpen} onToggle={togglePanel} />
          </div>
        ) : null}
      </div>

      {shouldShowEmbedNote ? (
        <div className="embed-note">
          <p className="embed-note-title">Widget embed instructions</p>
          <ol className="embed-note-steps">
            <li>
              Canonical embed host URL: <code>https://ava.aveyo.com/embed</code>.
            </li>
            <li>
              Keep auth cookies scoped to `.aveyo.com` so logged-in sessions are shared with the
              embed.
            </li>
            <li>Paste this iframe snippet on the host page where you want the launcher to appear.</li>
          </ol>
          <p className="embed-note-footnote">Use this route for cross-app widget embedding.</p>
          <pre className="embed-note-code">
            <code>{iframeEmbedSnippet}</code>
          </pre>
          <p className="embed-note-footnote">
            Local testing URL: <code>{`${getLocalAppUrl("ava")}/embed`}</code>
          </p>
          {requestError ? (
            <p className="embed-note-error">{requestError}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

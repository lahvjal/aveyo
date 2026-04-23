import { type ConversationThread } from "@ava/chat-domain";
import { resolveRoleWithProfileFlags } from "@/lib/auth/session";
import type { AppRole, SessionAccessContext } from "@/lib/auth/types";
import {
  lookupEmployeeDirectoryContext,
  type EmployeeDirectoryLookupResult
} from "@/lib/ava/employee-directory";
import { lookupEmployeeKpiSummary, type EmployeeKpiLookupResult } from "@/lib/ava/employee-kpis";
import { lookupEmployeeNewsContext, type EmployeeNewsLookupResult } from "@/lib/ava/employee-news";
import {
  resolveEmployeeKnowledgePolicy,
  type EmployeeKnowledgePolicy
} from "@/lib/ava/employee-policy";

export type EmployeeKnowledgeIntent = "directory" | "news" | "kpi";

export interface EmployeeAvaContext {
  audience: "employee";
  actor: {
    role: AppRole;
    departmentName: string | null;
    policy: EmployeeKnowledgePolicy;
  };
  latestQuestion: string;
  detectedIntents: EmployeeKnowledgeIntent[];
  directory?: EmployeeDirectoryLookupResult;
  news?: EmployeeNewsLookupResult;
  kpis?: EmployeeKpiLookupResult;
}

const DIRECTORY_PATTERNS = [
  /\bwho is\b/,
  /\bwho's\b/,
  /\bemployees?\b/,
  /\bpeople\b/,
  /\bstaff\b/,
  /\bdepartment\b/,
  /\breport(?:ing)? to\b/,
  /\bmanager\b/,
  /\btitle\b/,
  /\bteam\b/,
  /\bworks in\b/,
  /\bwhat does\b/,
  /\btell me about\b/,
  /\borg chart\b/,
  /\bphone\b/,
  /\bemail\b/,
  /\bcontact\b/
];

const NEWS_PATTERNS = [
  /\bnews\b/,
  /\bevent\b/,
  /\bevents\b/,
  /\bannouncement\b/,
  /\bannouncements\b/,
  /\bupdate\b/,
  /\bupdates\b/,
  /\bwhat's new\b/,
  /\bwhats new\b/,
  /\bhappening\b/
];

const KPI_PATTERNS = [
  /\bkpi\b/,
  /\bkpis\b/,
  /\bmetric\b/,
  /\bmetrics\b/,
  /\bstat\b/,
  /\bstats\b/,
  /\bstatistics\b/,
  /\brevenue\b/,
  /\bsales\b/,
  /\binstall\b/,
  /\binstalls\b/,
  /\bperformance\b/,
  /\bgoal\b/,
  /\bgoals\b/,
  /\bnumbers\b/,
  /\bpull through\b/
];

function normalizeQuestion(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getLatestCustomerTexts(thread: ConversationThread, limit = 2) {
  const texts: string[] = [];
  for (let index = thread.messages.length - 1; index >= 0; index -= 1) {
    const message = thread.messages[index];
    if (message?.kind === "customer") {
      const trimmed = message.text.trim();
      if (trimmed) {
        texts.push(trimmed);
      }
      if (texts.length >= limit) {
        break;
      }
    }
  }

  return texts;
}

function getLatestCustomerText(thread: ConversationThread) {
  return getLatestCustomerTexts(thread, 1)[0] ?? "";
}

function getPreviousCustomerText(thread: ConversationThread) {
  return getLatestCustomerTexts(thread, 2)[1] ?? "";
}

const directPersonPatterns = [
  /\bcan you tell me about\b/,
  /\btell me about\b/,
  /\bwhat does\b/,
  /\bwhat do\b/,
  /\bwhere does\b/,
  /\bwhere is\b/,
  /\bwho handles\b/,
  /\bwho leads\b/,
  /\bwho runs\b/,
  /\bwho works in\b/,
  /\bdo you know\b/
];

const followUpNamePrefixes = [/^how about\b/, /^what about\b/, /^how bout\b/, /^about\b/, /^and\b/];

const nonNameTokens = new Set([
  "a",
  "an",
  "and",
  "anyone",
  "anybody",
  "about",
  "around",
  "department",
  "email",
  "employee",
  "employees",
  "for",
  "he",
  "her",
  "him",
  "how",
  "i",
  "in",
  "info",
  "information",
  "is",
  "manager",
  "me",
  "my",
  "of",
  "on",
  "or",
  "our",
  "people",
  "phone",
  "reports",
  "role",
  "team",
  "the",
  "their",
  "them",
  "title",
  "to",
  "what",
  "who"
]);

function tokenizeQuestion(value: string) {
  return value.split(" ").filter(Boolean);
}

function isLikelyNameToken(token: string) {
  return /^[a-z][a-z']{1,}$/.test(token) && !nonNameTokens.has(token);
}

function looksLikeStandaloneFullNameQuery(normalizedQuestion: string) {
  const tokens = tokenizeQuestion(normalizedQuestion);
  return (
    tokens.length >= 2 &&
    tokens.length <= 3 &&
    tokens.every((token) => isLikelyNameToken(token))
  );
}

function looksLikeSingleNameReference(normalizedQuestion: string) {
  const tokens = tokenizeQuestion(normalizedQuestion);
  return tokens.length === 1 && isLikelyNameToken(tokens[0] ?? "");
}

function stripFollowUpNamePrefix(normalizedQuestion: string) {
  for (const pattern of followUpNamePrefixes) {
    if (pattern.test(normalizedQuestion)) {
      return normalizedQuestion.replace(pattern, "").trim();
    }
  }
  return normalizedQuestion;
}

function looksLikeFollowUpNameQuery(normalizedQuestion: string) {
  const strippedQuestion = stripFollowUpNamePrefix(normalizedQuestion);
  if (strippedQuestion === normalizedQuestion) {
    return false;
  }

  const tokens = tokenizeQuestion(strippedQuestion);
  return (
    tokens.length >= 1 &&
    tokens.length <= 3 &&
    tokens.every((token) => isLikelyNameToken(token))
  );
}

function hasExplicitEmployeePersonSignal(normalizedQuestion: string) {
  if (!normalizedQuestion.trim()) {
    return false;
  }

  if (DIRECTORY_PATTERNS.some((pattern) => pattern.test(normalizedQuestion))) {
    return true;
  }

  return directPersonPatterns.some((pattern) => pattern.test(normalizedQuestion));
}

function looksLikeEmployeePersonQuery(question: string, previousQuestion?: string) {
  if (!question.trim()) {
    return false;
  }

  const normalizedQuestion = normalizeQuestion(question);
  if (
    hasExplicitEmployeePersonSignal(normalizedQuestion) ||
    looksLikeStandaloneFullNameQuery(normalizedQuestion)
  ) {
    return true;
  }

  const normalizedPreviousQuestion = normalizeQuestion(previousQuestion ?? "");
  if (!normalizedPreviousQuestion) {
    return false;
  }

  const previousQuestionLookedLikeDirectoryQuery =
    hasExplicitEmployeePersonSignal(normalizedPreviousQuestion) ||
    looksLikeStandaloneFullNameQuery(normalizedPreviousQuestion) ||
    looksLikeFollowUpNameQuery(normalizedPreviousQuestion) ||
    looksLikeSingleNameReference(normalizedPreviousQuestion);

  if (!previousQuestionLookedLikeDirectoryQuery) {
    return false;
  }

  return (
    looksLikeFollowUpNameQuery(normalizedQuestion) || looksLikeSingleNameReference(normalizedQuestion)
  );
}

export function detectEmployeeKnowledgeIntents(question: string): EmployeeKnowledgeIntent[] {
  const normalizedQuestion = normalizeQuestion(question);
  if (!normalizedQuestion) {
    return [];
  }

  const intents: EmployeeKnowledgeIntent[] = [];

  if (DIRECTORY_PATTERNS.some((pattern) => pattern.test(normalizedQuestion))) {
    intents.push("directory");
  }

  if (NEWS_PATTERNS.some((pattern) => pattern.test(normalizedQuestion))) {
    intents.push("news");
  }

  if (KPI_PATTERNS.some((pattern) => pattern.test(normalizedQuestion))) {
    intents.push("kpi");
  }

  return intents;
}

export async function buildEmployeeAvaContext(params: {
  actorUserId: string;
  thread: ConversationThread;
  actorRole?: AppRole;
  actorAccess?: SessionAccessContext;
}): Promise<EmployeeAvaContext | undefined> {
  const latestQuestion = getLatestCustomerText(params.thread);
  const previousQuestion = getPreviousCustomerText(params.thread);
  if (!latestQuestion) {
    return undefined;
  }

  const resolvedActor =
    params.actorAccess && params.actorRole
      ? {
          role: params.actorRole,
          access: params.actorAccess
        }
      : await resolveRoleWithProfileFlags(params.actorUserId, "unknown");
  const policy = resolveEmployeeKnowledgePolicy(resolvedActor.access);
  if (!policy.isEmployee) {
    return undefined;
  }

  const detectedIntents = detectEmployeeKnowledgeIntents(latestQuestion);
  const shouldQueryDirectory =
    detectedIntents.includes("directory") ||
    looksLikeEmployeePersonQuery(latestQuestion, previousQuestion);
  if (shouldQueryDirectory && !detectedIntents.includes("directory")) {
    detectedIntents.push("directory");
  }
  const employeeContext: EmployeeAvaContext = {
    audience: "employee",
    actor: {
      role: resolvedActor.role,
      departmentName: resolvedActor.access.departmentName,
      policy
    },
    latestQuestion,
    detectedIntents
  };

  if (shouldQueryDirectory) {
    employeeContext.directory = await lookupEmployeeDirectoryContext({
      question: latestQuestion,
      viewerUserId: params.actorUserId
    });
  }

  if (detectedIntents.includes("news")) {
    employeeContext.news = await lookupEmployeeNewsContext(latestQuestion);
  }

  if (detectedIntents.includes("kpi")) {
    employeeContext.kpis = await lookupEmployeeKpiSummary({
      question: latestQuestion,
      policy
    });
  }

  return employeeContext;
}

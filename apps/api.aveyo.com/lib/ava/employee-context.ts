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

function getLatestCustomerText(thread: ConversationThread) {
  for (let index = thread.messages.length - 1; index >= 0; index -= 1) {
    const message = thread.messages[index];
    if (message?.kind === "customer") {
      return message.text.trim();
    }
  }

  return "";
}

function looksLikeEmployeePersonQuery(question: string) {
  if (!question.trim()) {
    return false;
  }

  const normalizedQuestion = normalizeQuestion(question);
  if (DIRECTORY_PATTERNS.some((pattern) => pattern.test(normalizedQuestion))) {
    return true;
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
  if (directPersonPatterns.some((pattern) => pattern.test(normalizedQuestion))) {
    return true;
  }

  return /\b[A-Z][a-z]{1,}\s+[A-Z][a-z]{1,}\b/.test(question);
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

  if (detectedIntents.includes("directory") || looksLikeEmployeePersonQuery(latestQuestion)) {
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

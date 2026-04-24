import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ConversationThread, TimelineMessage } from "@ava/chat-domain";
import { buildEmployeeAvaContext, type EmployeeAvaContext } from "@/lib/ava/employee-context";
import {
  buildAuthenticatedPromptMessages,
  buildEmployeePromptMessages,
  buildGuestPromptMessages,
  buildPromptMessages,
  getGuestProjectReplyOverride,
  getGuestStarterReplyOverride
} from "@/lib/ava/service";

vi.mock("@/lib/ava/employee-context", () => ({
  buildEmployeeAvaContext: vi.fn()
}));

const mockedBuildEmployeeAvaContext = vi.mocked(buildEmployeeAvaContext);

function createMessage(
  index: number,
  kind: TimelineMessage["kind"],
  text: string
): TimelineMessage {
  return {
    id: `m-${index}`,
    conversationId: "guest-conversation",
    kind,
    text,
    createdAt: `2026-01-01T00:00:${String(index).padStart(2, "0")}.000Z`,
    deliveryState: "sent"
  };
}

function createThread(messages: TimelineMessage[], authenticated = false): ConversationThread {
  return {
    id: "guest-conversation",
    authenticated,
    messages,
    handoff: {
      state: "none"
    },
    updatedAt: messages[messages.length - 1]?.createdAt ?? "2026-01-01T00:00:00.000Z"
  };
}

function createEmployeeContext(): EmployeeAvaContext {
  return {
    audience: "employee",
    actor: {
      role: "support_agent",
      departmentName: "Sales",
      policy: {
        isEmployee: true,
        canAccessDirectory: true,
        canAccessNews: true,
        kpiScope: "department",
        kpiDepartmentIds: ["dept-sales"],
        kpiScopeLabel: "Sales"
      }
    },
    latestQuestion: "What department is Jane Doe in?",
    detectedIntents: ["directory"],
    directory: {
      status: "ok",
      requestType: "person",
      restrictedContactRequest: false,
      matchedDepartment: null,
      matches: [
        {
          name: "Jane Doe",
          title: "Sales Manager",
          department: "Sales",
          manager: "Avery Exec",
          reportingChain: ["Avery Exec"]
        }
      ],
      note: null
    }
  };
}

describe("buildGuestPromptMessages", () => {
  beforeEach(() => {
    mockedBuildEmployeeAvaContext.mockReset();
  });

  it("includes the new guest persona guidance and approved public-site grounding", () => {
    const thread = createThread([
      createMessage(1, "customer", "Is solar worth it in California?"),
      createMessage(2, "ava", "It depends on your roof and utility rates.")
    ]);

    const messages = buildGuestPromptMessages(thread);
    const systemPrompt = messages[0];
    const publicSiteContext = messages[1];

    expect(systemPrompt?.role).toBe("system");
    expect(typeof systemPrompt?.content).toBe("string");
    if (typeof systemPrompt?.content !== "string") {
      throw new Error("Expected guest system prompt content to be a string.");
    }
    expect(systemPrompt.content).toContain("friendly solar guide");
    expect(systemPrompt.content).toContain("Ask at most one short follow-up question");
    expect(systemPrompt.content).toContain("Do not repeatedly tell visitors to sign in");
    expect(systemPrompt.content).toContain("Default to brief replies");
    expect(systemPrompt.content).toContain("If the person is broad or vague");
    expect(systemPrompt.content).toContain("better than a mini-primer");
    expect(systemPrompt.content).toContain("private employee details");
    expect(systemPrompt.content).toContain("gentle awkward humor");
    expect(systemPrompt.content).toContain("Never say solar will eliminate");

    expect(publicSiteContext?.role).toBe("system");
    expect(typeof publicSiteContext?.content).toBe("string");
    if (typeof publicSiteContext?.content !== "string") {
      throw new Error("Expected guest public-site context content to be a string.");
    }
    expect(publicSiteContext.content).toContain("Aveyo Subscription Plan");
    expect(publicSiteContext.content).toContain("Permission to operate");
    expect(publicSiteContext.content).toContain("NEM 3.0");
    expect(publicSiteContext.content).toContain("American Fork");
    expect(publicSiteContext.content).toContain("meaningfully reduce utility costs");
    expect(publicSiteContext.content).not.toContain("eliminate most of the utility bill");
  });

  it("shares Ava's core personality between guest, customer, and employee prompts", () => {
    const customerThread = createThread([createMessage(1, "customer", "Can you help me?")], true);
    const guestThread = createThread([createMessage(1, "customer", "Can you help me?")], false);
    const employeeContext = createEmployeeContext();

    const customerMessages = buildPromptMessages(customerThread);
    const guestMessages = buildGuestPromptMessages(guestThread);
    const employeeMessages = buildEmployeePromptMessages(customerThread, employeeContext);
    const customerSystemPrompt = customerMessages[0];
    const guestSystemPrompt = guestMessages[0];
    const employeeSystemPrompt = employeeMessages[0];

    expect(customerSystemPrompt?.role).toBe("system");
    expect(guestSystemPrompt?.role).toBe("system");
    expect(employeeSystemPrompt?.role).toBe("system");
    expect(typeof customerSystemPrompt?.content).toBe("string");
    expect(typeof guestSystemPrompt?.content).toBe("string");
    expect(typeof employeeSystemPrompt?.content).toBe("string");
    if (
      typeof customerSystemPrompt?.content !== "string" ||
      typeof guestSystemPrompt?.content !== "string" ||
      typeof employeeSystemPrompt?.content !== "string"
    ) {
      throw new Error("Expected customer, guest, and employee system prompts to be strings.");
    }

    expect(customerSystemPrompt.content).toContain("Ask at most one short follow-up question");
    expect(guestSystemPrompt.content).toContain("Ask at most one short follow-up question");
    expect(employeeSystemPrompt.content).toContain("Ask at most one short follow-up question");
    expect(customerSystemPrompt.content).toContain("Never say solar will eliminate");
    expect(guestSystemPrompt.content).toContain("Never say solar will eliminate");
    expect(employeeSystemPrompt.content).toContain("Never say solar will eliminate");
    expect(customerSystemPrompt.content).toContain("gentle awkward humor");
    expect(guestSystemPrompt.content).toContain("gentle awkward humor");
    expect(employeeSystemPrompt.content).toContain("gentle awkward humor");
    expect(customerSystemPrompt.content).toContain("Default to brief replies");
    expect(guestSystemPrompt.content).toContain("Default to brief replies");
    expect(employeeSystemPrompt.content).toContain("Default to brief replies");
    expect(customerSystemPrompt.content).toContain("support assistant for signed-in customers");
    expect(guestSystemPrompt.content).toContain("friendly solar guide for visitors who are not signed in");
    expect(employeeSystemPrompt.content).toContain("internal assistant for authenticated employees");
  });

  it("routes authenticated employees through the employee prompt path", async () => {
    mockedBuildEmployeeAvaContext.mockResolvedValue(createEmployeeContext());

    const thread = createThread([createMessage(1, "customer", "What department is Jane Doe in?")], true);
    const messages = await buildAuthenticatedPromptMessages(thread, {
      actorUserId: "employee-1"
    });
    const systemPrompt = messages[0];
    const employeeContextMessage = messages[1];

    expect(systemPrompt?.role).toBe("system");
    expect(employeeContextMessage?.role).toBe("system");
    expect(typeof systemPrompt?.content).toBe("string");
    expect(typeof employeeContextMessage?.content).toBe("string");
    if (
      typeof systemPrompt?.content !== "string" ||
      typeof employeeContextMessage?.content !== "string"
    ) {
      throw new Error("Expected employee prompt messages to contain system strings.");
    }

    expect(systemPrompt.content).toContain("internal assistant for authenticated employees");
    expect(employeeContextMessage.content).toContain("Approved employee knowledge context");
    expect(employeeContextMessage.content).toContain("Jane Doe");
  });

  it("falls back to the customer prompt path when the actor is not an employee", async () => {
    mockedBuildEmployeeAvaContext.mockResolvedValue(undefined);

    const thread = createThread([createMessage(1, "customer", "Can you check my project?")], true);
    const messages = await buildAuthenticatedPromptMessages(thread, {
      actorUserId: "customer-1"
    });
    const systemPrompt = messages[0];

    expect(systemPrompt?.role).toBe("system");
    expect(typeof systemPrompt?.content).toBe("string");
    if (typeof systemPrompt?.content !== "string") {
      throw new Error("Expected customer system prompt content to be a string.");
    }

    expect(systemPrompt.content).toContain("support assistant for signed-in customers");
  });

  it("keeps recent guest chat history in order after the system messages", () => {
    const thread = createThread(
      Array.from({ length: 14 }, (_, index) =>
        createMessage(index + 1, index % 2 === 0 ? "customer" : "ava", `message-${index + 1}`)
      )
    );

    const messages = buildGuestPromptMessages(thread);

    expect(messages).toHaveLength(14);
    expect(messages[2]).toEqual({ role: "user", content: "message-3" });
    expect(messages.slice(2, 5)).toEqual([
      { role: "user", content: "message-3" },
      { role: "assistant", content: "message-4" },
      { role: "user", content: "message-5" }
    ]);
    expect(messages.at(-1)).toEqual({ role: "assistant", content: "message-14" });
  });

  it("adds a guest sign-in context message when a project login URL is available", () => {
    const loginUrl =
      "https://auth.aveyo.com/login?returnTo=https%3A%2F%2Fcustomer.aveyo.com%2Fdashboard";
    const thread = createThread([createMessage(1, "customer", "Can you check my project?")]);

    const messages = buildGuestPromptMessages(thread, {
      guestProjectLoginUrl: loginUrl
    });
    const loginContext = messages[2];

    expect(loginContext?.role).toBe("system");
    expect(typeof loginContext?.content).toBe("string");
    if (typeof loginContext?.content !== "string") {
      throw new Error("Expected guest sign-in context content to be a string.");
    }

    expect(loginContext.content).toContain("Approved sign-in URL");
    expect(loginContext.content).toContain(loginUrl);
    expect(messages[3]).toEqual({ role: "user", content: "Can you check my project?" });
  });

  it("returns a login prompt for project-specific guest questions", () => {
    const loginUrl =
      "https://auth.aveyo.com/login?returnTo=https%3A%2F%2Fcustomer.aveyo.com%2Fdashboard";
    const thread = createThread([createMessage(1, "customer", "What's the status of my project?")]);

    expect(getGuestProjectReplyOverride(thread, loginUrl)).toBe(
      "I can help with your specific project, quote, or account details once you're signed in.\n" +
        `Log in here: ${loginUrl}\n` +
        "I can still explain the usual next step or what typically affects timing if that helps."
    );
  });

  it("returns a short clarifying reply for beginner intros", () => {
    const thread = createThread([createMessage(1, "customer", "im new to solar")]);

    expect(getGuestStarterReplyOverride(thread)).toBe(
      "Totally fair. Is this your first time hearing about solar, or have you looked into it a bit already?"
    );
  });

  it("returns a short narrowing question for broad solar starters", () => {
    const thread = createThread([createMessage(1, "customer", "tell me about solar")]);

    expect(getGuestStarterReplyOverride(thread)).toBe(
      "Happy to help. What do you want to start with: how it works, savings, batteries, or timing?"
    );
  });
});

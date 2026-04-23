import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ConversationThread, TimelineMessage } from "@ava/chat-domain";
import { buildEmployeeAvaContext } from "@/lib/ava/employee-context";
import { resolveRoleWithProfileFlags } from "@/lib/auth/session";
import { lookupEmployeeDirectoryContext } from "@/lib/ava/employee-directory";
import { lookupEmployeeKpiSummary } from "@/lib/ava/employee-kpis";
import { lookupEmployeeNewsContext } from "@/lib/ava/employee-news";

vi.mock("@/lib/auth/session", () => ({
  resolveRoleWithProfileFlags: vi.fn()
}));

vi.mock("@/lib/ava/employee-directory", () => ({
  lookupEmployeeDirectoryContext: vi.fn()
}));

vi.mock("@/lib/ava/employee-news", () => ({
  lookupEmployeeNewsContext: vi.fn()
}));

vi.mock("@/lib/ava/employee-kpis", () => ({
  lookupEmployeeKpiSummary: vi.fn()
}));

const mockedResolveRoleWithProfileFlags = vi.mocked(resolveRoleWithProfileFlags);
const mockedLookupEmployeeDirectoryContext = vi.mocked(lookupEmployeeDirectoryContext);
const mockedLookupEmployeeNewsContext = vi.mocked(lookupEmployeeNewsContext);
const mockedLookupEmployeeKpiSummary = vi.mocked(lookupEmployeeKpiSummary);

function createMessage(text: string): TimelineMessage {
  return {
    id: "message-1",
    conversationId: "conversation-1",
    kind: "customer",
    text,
    createdAt: "2026-01-01T00:00:00.000Z",
    deliveryState: "sent"
  };
}

function createThread(text: string): ConversationThread {
  return {
    id: "conversation-1",
    authenticated: true,
    messages: [createMessage(text)],
    handoff: {
      state: "none"
    },
    updatedAt: "2026-01-01T00:00:00.000Z"
  };
}

describe("buildEmployeeAvaContext", () => {
  beforeEach(() => {
    mockedResolveRoleWithProfileFlags.mockReset();
    mockedLookupEmployeeDirectoryContext.mockReset();
    mockedLookupEmployeeNewsContext.mockReset();
    mockedLookupEmployeeKpiSummary.mockReset();
  });

  it("uses the authenticated request access context and performs natural person lookups", async () => {
    mockedLookupEmployeeDirectoryContext.mockResolvedValue({
      status: "ok",
      requestType: "person",
      restrictedContactRequest: false,
      matchedDepartment: null,
      matches: [
        {
          name: "John Doe",
          title: "Closer",
          department: "Sales",
          manager: "Jane Smith",
          reportingChain: ["Jane Smith"]
        }
      ],
      note: null
    });

    const result = await buildEmployeeAvaContext({
      actorUserId: "employee-1",
      actorRole: "support_agent",
      actorAccess: {
        userType: "employee",
        departmentId: "dept-sales",
        departmentName: "Sales",
        departmentPath: [],
        subDepartments: [],
        subDepartmentIds: [],
        isManager: false,
        isAdmin: false,
        isExecutive: false,
        isSuperAdmin: false
      },
      thread: createThread("Tell me about John")
    });

    expect(mockedResolveRoleWithProfileFlags).not.toHaveBeenCalled();
    expect(mockedLookupEmployeeDirectoryContext).toHaveBeenCalledWith({
      question: "Tell me about John",
      viewerUserId: "employee-1"
    });
    expect(result?.audience).toBe("employee");
    expect(result?.actor.policy.isEmployee).toBe(true);
    expect(result?.directory?.status).toBe("ok");
  });
});

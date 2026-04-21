import { beforeEach, describe, expect, it, vi } from "vitest";
import { ServiceError } from "@/lib/service-error";
import { createMessageResult, runAvaReplyJobSweep } from "@/lib/conversations/service";
import { claimAvaReplyJobs, enqueueAvaReplyJob } from "@/lib/ava/reply-jobs";
import {
  appendAvaMessage,
  appendMessage,
  getConversation,
  isAgentImpersonationConversation,
  publishTypingEvent
} from "@/lib/store/mock-store";
import { generateAvaReplyText } from "@/lib/ava/service";
import { CUSTOMER_CARE_OUTSIDE_WORKING_HOURS_REPLY, isCustomerCareAvailable } from "@/lib/customer-care-hours";

vi.mock("@/lib/store/mock-store", () => {
  class MockStoreError extends Error {
    status: number;

    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }

  return {
    appendAvaMessage: vi.fn(),
    appendMessage: vi.fn(),
    closeConversationSession: vi.fn(),
    createConversation: vi.fn(),
    getAvaConversationContext: vi.fn(),
    getConversationCustomerDetails: vi.fn(),
    getConversation: vi.fn(),
    isAgentImpersonationConversation: vi.fn(),
    listConversations: vi.fn(),
    publishTypingEvent: vi.fn(),
    runCustomerSessionIdleAutomation: vi.fn(),
    StoreError: MockStoreError
  };
});

vi.mock("@/lib/ava/reply-jobs", () => ({
  cancelAvaReplyJob: vi.fn(),
  claimAvaReplyJobs: vi.fn(),
  completeAvaReplyJob: vi.fn(),
  enqueueAvaReplyJob: vi.fn(),
  failAvaReplyJob: vi.fn()
}));

vi.mock("@/lib/ava/service", () => ({
  generateAvaReplyText: vi.fn()
}));

vi.mock("@/lib/customer-care-hours", () => ({
  CUSTOMER_CARE_OUTSIDE_WORKING_HOURS_REPLY:
    "Aveyo Customer Care is currently outside working hours, so I can't connect you with an agent right now. I can still help with project questions, status updates, scheduling, and next steps. Ask me anything about your project.",
  isCustomerCareAvailable: vi.fn()
}));

const mockedClaimAvaReplyJobs = vi.mocked(claimAvaReplyJobs);
const mockedEnqueueAvaReplyJob = vi.mocked(enqueueAvaReplyJob);
const mockedAppendAvaMessage = vi.mocked(appendAvaMessage);
const mockedAppendMessage = vi.mocked(appendMessage);
const mockedGetConversation = vi.mocked(getConversation);
const mockedIsAgentImpersonationConversation = vi.mocked(isAgentImpersonationConversation);
const mockedPublishTypingEvent = vi.mocked(publishTypingEvent);
const mockedGenerateAvaReplyText = vi.mocked(generateAvaReplyText);
const mockedIsCustomerCareAvailable = vi.mocked(isCustomerCareAvailable);

describe("createMessageResult", () => {
  beforeEach(() => {
    mockedClaimAvaReplyJobs.mockReset();
    mockedClaimAvaReplyJobs.mockResolvedValue([]);
    mockedEnqueueAvaReplyJob.mockReset();
    mockedEnqueueAvaReplyJob.mockResolvedValue({
      id: "reply-job-1",
      conversationId: "c-1",
      triggerMessageId: "m-customer-1",
      requestedByAuthUserId: "customer-1",
      status: "pending",
      availableAt: "2026-01-01T00:00:00.000Z",
      claimedBy: null,
      claimedAt: null,
      leaseExpiresAt: null,
      attempts: 0,
      lastError: null,
      replyMessageId: null,
      completedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    });
    mockedAppendAvaMessage.mockReset();
    mockedAppendMessage.mockReset();
    mockedGetConversation.mockReset();
    mockedIsAgentImpersonationConversation.mockReset();
    mockedIsAgentImpersonationConversation.mockResolvedValue(false);
    mockedGenerateAvaReplyText.mockReset();
    mockedGenerateAvaReplyText.mockResolvedValue(undefined);
    mockedIsCustomerCareAvailable.mockReset();
    mockedIsCustomerCareAvailable.mockReturnValue(true);
    mockedPublishTypingEvent.mockReset();
    mockedPublishTypingEvent.mockResolvedValue(undefined);
  });

  it("passes clientMessageId to store append payload", async () => {
    mockedAppendMessage.mockResolvedValue({
      id: "m-1",
      conversationId: "c-1",
      kind: "representative",
      text: "hello",
      createdAt: "2026-01-01T00:00:00.000Z",
      deliveryState: "sent"
    });

    await createMessageResult(
      {
        conversationId: "c-1",
        kind: "representative",
        text: "hello",
        representativeId: "rep-1",
        clientMessageId: "client-msg-1"
      },
      "rep-1"
    );

    expect(mockedAppendMessage).toHaveBeenCalledWith(
      "c-1",
      expect.objectContaining({
        kind: "representative",
        clientMessageId: "client-msg-1"
      }),
      "rep-1"
    );
  });

  it("maps unexpected errors to 500", async () => {
    mockedAppendMessage.mockRejectedValue(new Error("boom"));
    await expect(
      createMessageResult(
        {
          conversationId: "c-1",
          kind: "representative",
          text: "hello",
          representativeId: "rep-1"
        },
        "rep-1"
      )
    ).rejects.toMatchObject({ status: 500 } as Partial<ServiceError>);
  });

  it("returns customer message without waiting for ava generation", async () => {
    const customerMessage = {
      id: "m-customer-1",
      conversationId: "c-1",
      kind: "customer" as const,
      text: "Need help",
      createdAt: "2026-01-01T00:00:00.000Z",
      deliveryState: "sent" as const
    };
    mockedAppendMessage.mockResolvedValue(customerMessage);
    mockedGetConversation.mockImplementation(() => new Promise(() => {}));

    await expect(
      createMessageResult(
        {
          conversationId: "c-1",
          kind: "customer",
          text: "Need help",
          clientMessageId: "client-msg-customer-1"
        },
        "customer-1"
      )
    ).resolves.toEqual({ message: customerMessage });

    expect(mockedEnqueueAvaReplyJob).toHaveBeenCalledWith({
      conversationId: "c-1",
      triggerMessageId: "m-customer-1",
      requestedByAuthUserId: "customer-1"
    });
  });
});

describe("runAvaReplyJobSweep", () => {
  beforeEach(() => {
    mockedClaimAvaReplyJobs.mockReset();
    mockedAppendAvaMessage.mockReset();
    mockedGetConversation.mockReset();
    mockedIsAgentImpersonationConversation.mockReset();
    mockedGenerateAvaReplyText.mockReset();
    mockedIsCustomerCareAvailable.mockReset();
    mockedPublishTypingEvent.mockReset();
    mockedPublishTypingEvent.mockResolvedValue(undefined);
  });

  it("keeps human handoff prompts available in impersonation tests after hours", async () => {
    mockedClaimAvaReplyJobs.mockResolvedValue([
      {
        id: "reply-job-1",
        conversationId: "c-1",
        triggerMessageId: "m-customer-1",
        requestedByAuthUserId: "employee-1",
        status: "pending",
        availableAt: "2026-01-01T00:00:00.000Z",
        claimedBy: null,
        claimedAt: null,
        leaseExpiresAt: null,
        attempts: 0,
        lastError: null,
        replyMessageId: null,
        completedAt: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      }
    ]);
    mockedGetConversation.mockResolvedValue({
      id: "c-1",
      authenticated: true,
      updatedAt: "2026-01-01T00:00:00.000Z",
      handoff: { state: "none" },
      messages: [
        {
          id: "m-customer-1",
          conversationId: "c-1",
          kind: "customer",
          text: "talk to an agent",
          createdAt: "2026-01-01T00:00:00.000Z",
          deliveryState: "sent"
        }
      ]
    });
    mockedIsCustomerCareAvailable.mockReturnValue(false);
    mockedIsAgentImpersonationConversation.mockResolvedValue(true);
    mockedAppendAvaMessage.mockResolvedValue({
      id: "m-ava-1",
      conversationId: "c-1",
      kind: "ava",
      text: "I understand you want to speak with a customer care agent. Would you like to be connected to a customer care agent now?",
      createdAt: "2026-01-01T00:00:01.000Z",
      deliveryState: "sent"
    });

    const result = await runAvaReplyJobSweep({ conversationId: "c-1" });

    expect(result.completedJobs).toBe(1);
    expect(mockedAppendAvaMessage).toHaveBeenCalledWith(
      "c-1",
      "I understand you want to speak with a customer care agent. Would you like to be connected to a customer care agent now?",
      expect.anything()
    );
    expect(mockedGenerateAvaReplyText).not.toHaveBeenCalled();
  });

  it("uses the closed-hours reply for real customer chats after hours", async () => {
    mockedClaimAvaReplyJobs.mockResolvedValue([
      {
        id: "reply-job-1",
        conversationId: "c-1",
        triggerMessageId: "m-customer-1",
        requestedByAuthUserId: "customer-1",
        status: "pending",
        availableAt: "2026-01-01T00:00:00.000Z",
        claimedBy: null,
        claimedAt: null,
        leaseExpiresAt: null,
        attempts: 0,
        lastError: null,
        replyMessageId: null,
        completedAt: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      }
    ]);
    mockedGetConversation.mockResolvedValue({
      id: "c-1",
      authenticated: true,
      updatedAt: "2026-01-01T00:00:00.000Z",
      handoff: { state: "none" },
      messages: [
        {
          id: "m-customer-1",
          conversationId: "c-1",
          kind: "customer",
          text: "talk to an agent",
          createdAt: "2026-01-01T00:00:00.000Z",
          deliveryState: "sent"
        }
      ]
    });
    mockedIsCustomerCareAvailable.mockReturnValue(false);
    mockedIsAgentImpersonationConversation.mockResolvedValue(false);
    mockedAppendAvaMessage.mockResolvedValue({
      id: "m-ava-1",
      conversationId: "c-1",
      kind: "ava",
      text: CUSTOMER_CARE_OUTSIDE_WORKING_HOURS_REPLY,
      createdAt: "2026-01-01T00:00:01.000Z",
      deliveryState: "sent"
    });

    await runAvaReplyJobSweep({ conversationId: "c-1" });

    expect(mockedAppendAvaMessage).toHaveBeenCalledWith(
      "c-1",
      CUSTOMER_CARE_OUTSIDE_WORKING_HOURS_REPLY,
      expect.anything()
    );
  });
});


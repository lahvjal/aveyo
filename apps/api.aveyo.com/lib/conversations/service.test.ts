import { beforeEach, describe, expect, it, vi } from "vitest";
import { ServiceError } from "@/lib/service-error";
import { createMessageResult } from "@/lib/conversations/service";
import { claimAvaReplyJobs, enqueueAvaReplyJob } from "@/lib/ava/reply-jobs";
import { appendMessage, getConversation, publishTypingEvent } from "@/lib/store/mock-store";

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

const mockedClaimAvaReplyJobs = vi.mocked(claimAvaReplyJobs);
const mockedEnqueueAvaReplyJob = vi.mocked(enqueueAvaReplyJob);
const mockedAppendMessage = vi.mocked(appendMessage);
const mockedGetConversation = vi.mocked(getConversation);
const mockedPublishTypingEvent = vi.mocked(publishTypingEvent);

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
    mockedAppendMessage.mockReset();
    mockedGetConversation.mockReset();
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


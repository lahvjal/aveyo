import { beforeEach, describe, expect, it, vi } from "vitest";
import { ServiceError } from "@/lib/service-error";
import { createMessageResult } from "@/lib/conversations/service";
import { appendMessage } from "@/lib/store/mock-store";

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
    createConversation: vi.fn(),
    getAvaConversationContext: vi.fn(),
    getConversationCustomerDetails: vi.fn(),
    getConversation: vi.fn(),
    listConversations: vi.fn(),
    StoreError: MockStoreError
  };
});

vi.mock("@/lib/ava/service", () => ({
  generateAvaReplyText: vi.fn()
}));

const mockedAppendMessage = vi.mocked(appendMessage);

describe("createMessageResult", () => {
  beforeEach(() => {
    mockedAppendMessage.mockReset();
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
});


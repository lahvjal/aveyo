import { beforeEach, describe, expect, it, vi } from "vitest";
import { ServiceError } from "@/lib/service-error";
import { getRealtimeEventsResult } from "@/lib/realtime/service";
import { listRealtimeEvents, runCustomerSessionIdleAutomation, StoreError } from "@/lib/store/mock-store";

vi.mock("@/lib/store/mock-store", () => {
  class MockStoreError extends Error {
    status: number;

    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }

  return {
    listRealtimeEvents: vi.fn(),
    publishTypingEvent: vi.fn(),
    runCustomerSessionIdleAutomation: vi.fn(),
    StoreError: MockStoreError
  };
});

const mockedListRealtimeEvents = vi.mocked(listRealtimeEvents);
const mockedRunCustomerSessionIdleAutomation = vi.mocked(runCustomerSessionIdleAutomation);

describe("getRealtimeEventsResult", () => {
  beforeEach(() => {
    mockedListRealtimeEvents.mockReset();
    mockedRunCustomerSessionIdleAutomation.mockReset();
    mockedRunCustomerSessionIdleAutomation.mockResolvedValue(undefined);
  });

  it("returns newest event id as cursor", async () => {
    mockedListRealtimeEvents.mockResolvedValue({
      events: [
        { id: "evt-1", type: "message_created", conversationId: "c1", createdAt: "2026-01-01", payload: {} },
        { id: "evt-2", type: "message_created", conversationId: "c1", createdAt: "2026-01-02", payload: {} }
      ],
      latestEventId: "evt-2",
      cursorFound: true
    });

    const result = await getRealtimeEventsResult("user-1", "evt-0");
    expect(result.events).toHaveLength(2);
    expect(result.cursor).toBe("evt-2");
    expect(result.cursorStale).toBe(false);
  });

  it("marks stale cursor and rewinds to latest id", async () => {
    mockedListRealtimeEvents.mockResolvedValue({
      events: [],
      latestEventId: "evt-latest",
      cursorFound: false
    });

    const result = await getRealtimeEventsResult("user-1", "evt-stale");
    expect(result.events).toEqual([]);
    expect(result.cursor).toBe("evt-latest");
    expect(result.cursorStale).toBe(true);
  });

  it("handles first-page empty result", async () => {
    mockedListRealtimeEvents.mockResolvedValue({
      events: [],
      latestEventId: undefined,
      cursorFound: true
    });

    const result = await getRealtimeEventsResult("user-1");
    expect(result.events).toEqual([]);
    expect(result.cursor).toBeUndefined();
    expect(result.cursorStale).toBe(false);
  });

  it("maps store errors into service errors", async () => {
    mockedListRealtimeEvents.mockRejectedValue(new StoreError(403, "forbidden"));
    await expect(getRealtimeEventsResult("user-1")).rejects.toMatchObject({
      status: 403,
      message: "forbidden"
    } as Partial<ServiceError>);
  });

  it("continues when idle automation check fails", async () => {
    mockedRunCustomerSessionIdleAutomation.mockRejectedValue(new Error("automation unavailable"));
    mockedListRealtimeEvents.mockResolvedValue({
      events: [],
      latestEventId: "evt-latest",
      cursorFound: true
    });

    const result = await getRealtimeEventsResult("user-1");
    expect(result.cursor).toBe("evt-latest");
  });
});


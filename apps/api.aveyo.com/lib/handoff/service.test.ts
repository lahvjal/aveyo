import { beforeEach, describe, expect, it, vi } from "vitest";
import { ServiceError } from "@/lib/service-error";
import {
  createHandoffClaimResult,
  createHandoffRatingResult,
  getQueueResult
} from "@/lib/handoff/service";
import { claimHandoff, listQueue, StoreError, submitHandoffRating } from "@/lib/store/mock-store";

vi.mock("@/lib/store/mock-store", () => {
  class MockStoreError extends Error {
    status: number;

    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }

  return {
    listQueue: vi.fn(),
    requestHandoff: vi.fn(),
    claimHandoff: vi.fn(),
    resolveHandoff: vi.fn(),
    submitHandoffRating: vi.fn(),
    StoreError: MockStoreError
  };
});

const mockedClaimHandoff = vi.mocked(claimHandoff);
const mockedListQueue = vi.mocked(listQueue);
const mockedSubmitHandoffRating = vi.mocked(submitHandoffRating);

describe("createHandoffClaimResult", () => {
  beforeEach(() => {
    mockedClaimHandoff.mockReset();
    mockedListQueue.mockReset();
  });

  it("returns 400 for invalid payload", async () => {
    await expect(createHandoffClaimResult({}, "actor-1")).rejects.toMatchObject({
      status: 400
    } as Partial<ServiceError>);
  });

  it("surfaces conflict status for claim races", async () => {
    mockedClaimHandoff.mockRejectedValue(new StoreError(409, "already claimed"));

    await expect(
      createHandoffClaimResult(
        {
          requestId: "req-1",
          representative: { id: "rep-1", name: "Rep One" }
        },
        "rep-1"
      )
    ).rejects.toMatchObject({
      status: 409,
      message: "already claimed"
    } as Partial<ServiceError>);
  });
});

describe("getQueueResult", () => {
  it("returns pending/active/resolved counts with scoped query", async () => {
    mockedListQueue.mockResolvedValue([
      {
        requestId: "req-pending",
        conversationId: "conv-1",
        customerName: "Pending Customer",
        status: "pending",
        position: 1,
        estimatedWaitSeconds: 120,
        elapsedWaitSeconds: 33,
        requestedAt: "2026-01-02T00:00:00.000Z",
        claimedAt: null,
        claimedByAuthUserId: null,
        resolvedAt: null,
        resolvedByAuthUserId: null,
        customerRating: null
      },
      {
        requestId: "req-active",
        conversationId: "conv-2",
        customerName: "Active Customer",
        status: "active",
        position: 0,
        estimatedWaitSeconds: 0,
        elapsedWaitSeconds: 90,
        requestedAt: "2026-01-02T00:01:00.000Z",
        claimedAt: "2026-01-02T00:02:00.000Z",
        claimedByAuthUserId: "rep-1",
        resolvedAt: null,
        resolvedByAuthUserId: null,
        customerRating: null
      },
      {
        requestId: "req-resolved",
        conversationId: "conv-3",
        customerName: "Resolved Customer",
        status: "resolved",
        position: 0,
        estimatedWaitSeconds: 0,
        elapsedWaitSeconds: 190,
        requestedAt: "2026-01-02T00:02:00.000Z",
        claimedAt: "2026-01-02T00:03:00.000Z",
        claimedByAuthUserId: "rep-1",
        resolvedAt: "2026-01-02T00:06:00.000Z",
        resolvedByAuthUserId: "rep-1",
        customerRating: "thumbs_up"
      }
    ]);

    const result = await getQueueResult("rep-1", { resolvedScope: "agent" });

    expect(mockedListQueue).toHaveBeenCalledWith("rep-1", { resolvedScope: "agent" });
    expect(result.pendingCount).toBe(1);
    expect(result.activeCount).toBe(1);
    expect(result.resolvedCount).toBe(1);
  });

  it("maps store errors into service errors", async () => {
    mockedListQueue.mockRejectedValue(new StoreError(403, "forbidden"));
    await expect(getQueueResult("rep-1")).rejects.toMatchObject({
      status: 403,
      message: "forbidden"
    } as Partial<ServiceError>);
  });
});

describe("createHandoffRatingResult", () => {
  beforeEach(() => {
    mockedSubmitHandoffRating.mockReset();
  });

  it("returns 400 for missing conversationId", async () => {
    await expect(
      createHandoffRatingResult(
        {
          rating: "thumbs_up"
        },
        "customer-1"
      )
    ).rejects.toMatchObject({
      status: 400,
      message: "conversationId is required."
    } as Partial<ServiceError>);
  });

  it("returns 400 for invalid rating value", async () => {
    await expect(
      createHandoffRatingResult(
        {
          conversationId: "conv-1",
          rating: "invalid" as "thumbs_up"
        },
        "customer-1"
      )
    ).rejects.toMatchObject({
      status: 400,
      message: "rating must be thumbs_up or thumbs_down."
    } as Partial<ServiceError>);
  });

  it("maps store errors into service errors", async () => {
    mockedSubmitHandoffRating.mockRejectedValue(new StoreError(409, "No resolved handoff"));

    await expect(
      createHandoffRatingResult(
        {
          conversationId: "conv-1",
          rating: "thumbs_down"
        },
        "customer-1"
      )
    ).rejects.toMatchObject({
      status: 409,
      message: "No resolved handoff"
    } as Partial<ServiceError>);
  });
});


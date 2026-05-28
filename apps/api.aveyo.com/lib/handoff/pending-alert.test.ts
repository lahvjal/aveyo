import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockedGetSupabase = vi.hoisted(() => vi.fn());
const mockedSendGChat = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServiceRoleClient: mockedGetSupabase,
}));

vi.mock("@/lib/gchat/notify", () => ({
  sendGChatPendingHandoffAlert: mockedSendGChat,
}));

import {
  PENDING_THRESHOLD_SECONDS,
  schedulePendingHandoffGChatAlert,
} from "@/lib/handoff/pending-alert";

describe("schedulePendingHandoffGChatAlert", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    process.env.GOOGLE_CHAT_WEBHOOK_URL = "https://chat.example.com/webhook";
    mockedSendGChat.mockResolvedValue({ ok: true, status: 200 });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    delete process.env.GOOGLE_CHAT_WEBHOOK_URL;
  });

  it("sends GChat when handoff is still pending after the threshold", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "req-1",
        conversation_id: "conv-1",
        reason: "help",
        requested_at: "2026-05-28T15:00:00.000Z",
        status: "pending",
        gchat_alerted_at: null,
      },
      error: null,
    });
    const is = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const update = vi.fn().mockReturnValue({ is });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select, update });
    const schema = vi.fn().mockReturnValue({ from });

    mockedGetSupabase.mockReturnValue({ schema });

    const promise = schedulePendingHandoffGChatAlert({
      requestId: "req-1",
      conversationId: "conv-1",
      reason: "help",
      requestedAt: "2026-05-28T15:00:00.000Z",
    });

    await vi.advanceTimersByTimeAsync(PENDING_THRESHOLD_SECONDS * 1000);
    await promise;

    expect(mockedSendGChat).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalled();
  });

  it("does not send when handoff was claimed before the threshold", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "req-1",
        conversation_id: "conv-1",
        reason: "help",
        requested_at: "2026-05-28T15:00:00.000Z",
        status: "claimed",
        gchat_alerted_at: null,
      },
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    const schema = vi.fn().mockReturnValue({ from });

    mockedGetSupabase.mockReturnValue({ schema });

    const promise = schedulePendingHandoffGChatAlert({
      requestId: "req-1",
      conversationId: "conv-1",
      reason: "help",
      requestedAt: "2026-05-28T15:00:00.000Z",
    });

    await vi.advanceTimersByTimeAsync(PENDING_THRESHOLD_SECONDS * 1000);
    await promise;

    expect(mockedSendGChat).not.toHaveBeenCalled();
  });

  it("skips when webhook URL is not configured", async () => {
    delete process.env.GOOGLE_CHAT_WEBHOOK_URL;

    await schedulePendingHandoffGChatAlert({
      requestId: "req-1",
      conversationId: "conv-1",
      reason: null,
      requestedAt: "2026-05-28T15:00:00.000Z",
    });

    expect(mockedGetSupabase).not.toHaveBeenCalled();
    expect(mockedSendGChat).not.toHaveBeenCalled();
  });
});

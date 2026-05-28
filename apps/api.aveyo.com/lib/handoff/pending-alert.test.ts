import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockedGetSupabase = vi.hoisted(() => vi.fn());
const mockedSendGChat = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServiceRoleClient: mockedGetSupabase,
}));

vi.mock("@/lib/gchat/notify", () => ({
  sendGChatHandoffRequestedAlert: mockedSendGChat,
}));

import { sendHandoffRequestedGChatAlert } from "@/lib/handoff/pending-alert";

describe("sendHandoffRequestedGChatAlert", () => {
  beforeEach(() => {
    process.env.GOOGLE_CHAT_WEBHOOK_URL = "https://chat.example.com/webhook";
    mockedSendGChat.mockResolvedValue({ ok: true, status: 200 });
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.GOOGLE_CHAT_WEBHOOK_URL;
  });

  it("sends GChat immediately when webhook is configured", async () => {
    const is = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const update = vi.fn().mockReturnValue({ is });
    const from = vi.fn().mockReturnValue({ update });
    const schema = vi.fn().mockReturnValue({ from });

    mockedGetSupabase.mockReturnValue({ schema });

    await sendHandoffRequestedGChatAlert({
      requestId: "req-1",
      conversationId: "conv-1",
      reason: "help",
      requestedAt: "2026-05-28T15:00:00.000Z",
    });

    expect(mockedSendGChat).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalled();
  });

  it("skips when webhook URL is not configured", async () => {
    delete process.env.GOOGLE_CHAT_WEBHOOK_URL;

    await sendHandoffRequestedGChatAlert({
      requestId: "req-1",
      conversationId: "conv-1",
      reason: null,
      requestedAt: "2026-05-28T15:00:00.000Z",
    });

    expect(mockedGetSupabase).not.toHaveBeenCalled();
    expect(mockedSendGChat).not.toHaveBeenCalled();
  });
});

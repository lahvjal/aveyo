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

  it("sends GChat with customer name, email, and reason", async () => {
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
      customerName: "Jane Doe",
      customerEmail: "jane@example.com",
      reason: "Need billing help",
    });

    expect(mockedSendGChat).toHaveBeenCalledWith({
      customerName: "Jane Doe",
      customerEmail: "jane@example.com",
      reason: "Need billing help",
      webhookUrl: "https://chat.example.com/webhook",
    });
    expect(update).toHaveBeenCalled();
  });

  it("skips when webhook URL is not configured", async () => {
    delete process.env.GOOGLE_CHAT_WEBHOOK_URL;

    await sendHandoffRequestedGChatAlert({
      requestId: "req-1",
      conversationId: "conv-1",
      customerName: "Jane Doe",
      customerEmail: null,
      reason: null,
    });

    expect(mockedGetSupabase).not.toHaveBeenCalled();
    expect(mockedSendGChat).not.toHaveBeenCalled();
  });
});

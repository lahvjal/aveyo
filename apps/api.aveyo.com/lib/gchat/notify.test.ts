import { describe, expect, it, vi, afterEach } from "vitest";
import { sendGChatHandoffRequestedAlert } from "@/lib/gchat/notify";

describe("sendGChatHandoffRequestedAlert", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("includes customer name, email, and reason in the message body", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    await sendGChatHandoffRequestedAlert({
      customerName: "Jane Doe",
      customerEmail: "jane@example.com",
      reason: "Cancel project",
      webhookUrl: "https://chat.example.com/webhook",
    });

    const body = JSON.parse(
      (fetchMock.mock.calls[0]?.[1] as RequestInit).body as string
    ) as { text: string };

    expect(body.text).toContain("New customer handoff requested");
    expect(body.text).toContain("*Customer:* `Jane Doe` (jane@example.com)");
    expect(body.text).toContain("*Reason:* `Cancel project`");
    expect(body.text).not.toContain("Conversation:");
    expect(body.text).not.toContain("Request ID:");
  });

  it("uses fallbacks when email and reason are missing", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    await sendGChatHandoffRequestedAlert({
      customerName: "  ",
      customerEmail: null,
      reason: null,
      webhookUrl: "https://chat.example.com/webhook",
    });

    const body = JSON.parse(
      (fetchMock.mock.calls[0]?.[1] as RequestInit).body as string
    ) as { text: string };

    expect(body.text).toContain("*Customer:* `Unknown` (Unknown)");
    expect(body.text).toContain("*Reason:* `Not provided`");
  });
});

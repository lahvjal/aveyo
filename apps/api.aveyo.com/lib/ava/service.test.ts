import { describe, expect, it } from "vitest";
import type { ConversationThread, TimelineMessage } from "@ava/chat-domain";
import { buildGuestPromptMessages, getGuestStarterReplyOverride } from "@/lib/ava/service";

function createMessage(
  index: number,
  kind: TimelineMessage["kind"],
  text: string
): TimelineMessage {
  return {
    id: `m-${index}`,
    conversationId: "guest-conversation",
    kind,
    text,
    createdAt: `2026-01-01T00:00:${String(index).padStart(2, "0")}.000Z`,
    deliveryState: "sent"
  };
}

function createGuestThread(messages: TimelineMessage[]): ConversationThread {
  return {
    id: "guest-conversation",
    authenticated: false,
    messages,
    handoff: {
      state: "none"
    },
    updatedAt: messages[messages.length - 1]?.createdAt ?? "2026-01-01T00:00:00.000Z"
  };
}

describe("buildGuestPromptMessages", () => {
  it("includes the new guest persona guidance and approved public-site grounding", () => {
    const thread = createGuestThread([
      createMessage(1, "customer", "Is solar worth it in California?"),
      createMessage(2, "ava", "It depends on your roof and utility rates.")
    ]);

    const messages = buildGuestPromptMessages(thread);
    const systemPrompt = messages[0];
    const publicSiteContext = messages[1];

    expect(systemPrompt?.role).toBe("system");
    expect(typeof systemPrompt?.content).toBe("string");
    if (typeof systemPrompt?.content !== "string") {
      throw new Error("Expected guest system prompt content to be a string.");
    }
    expect(systemPrompt.content).toContain("friendly solar guide");
    expect(systemPrompt.content).toContain("Ask at most one short follow-up question");
    expect(systemPrompt.content).toContain("Do not repeatedly tell visitors to sign in");
    expect(systemPrompt.content).toContain("Default to brief replies");
    expect(systemPrompt.content).toContain("If the visitor is broad or vague");
    expect(systemPrompt.content).toContain("better than a mini-primer");

    expect(publicSiteContext?.role).toBe("system");
    expect(typeof publicSiteContext?.content).toBe("string");
    if (typeof publicSiteContext?.content !== "string") {
      throw new Error("Expected guest public-site context content to be a string.");
    }
    expect(publicSiteContext.content).toContain("Aveyo Subscription Plan");
    expect(publicSiteContext.content).toContain("Permission to operate");
    expect(publicSiteContext.content).toContain("NEM 3.0");
    expect(publicSiteContext.content).toContain("American Fork");
  });

  it("keeps recent guest chat history in order after the system messages", () => {
    const thread = createGuestThread(
      Array.from({ length: 14 }, (_, index) =>
        createMessage(index + 1, index % 2 === 0 ? "customer" : "ava", `message-${index + 1}`)
      )
    );

    const messages = buildGuestPromptMessages(thread);

    expect(messages).toHaveLength(14);
    expect(messages[2]).toEqual({ role: "user", content: "message-3" });
    expect(messages.slice(2, 5)).toEqual([
      { role: "user", content: "message-3" },
      { role: "assistant", content: "message-4" },
      { role: "user", content: "message-5" }
    ]);
    expect(messages.at(-1)).toEqual({ role: "assistant", content: "message-14" });
  });

  it("returns a short clarifying reply for beginner intros", () => {
    const thread = createGuestThread([createMessage(1, "customer", "im new to solar")]);

    expect(getGuestStarterReplyOverride(thread)).toBe(
      "Totally fair. Is this your first time hearing about solar, or have you looked into it a bit already?"
    );
  });

  it("returns a short narrowing question for broad solar starters", () => {
    const thread = createGuestThread([createMessage(1, "customer", "tell me about solar")]);

    expect(getGuestStarterReplyOverride(thread)).toBe(
      "Happy to help. What do you want to start with: how it works, savings, batteries, or timing?"
    );
  });
});

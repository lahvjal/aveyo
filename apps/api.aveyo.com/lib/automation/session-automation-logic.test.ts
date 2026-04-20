import { describe, expect, it } from "vitest";
import {
  getIdleAutomationDecision,
  RESOLVED_SESSION_AUTO_CLOSE_AFTER_MS,
  SESSION_IDLE_AUTOMATION_SOURCE,
  SESSION_IDLE_CLOSE_AFTER_PROMPT_MS,
  SESSION_IDLE_PROMPT_AFTER_MS,
  shouldAutoCloseResolvedConversation
} from "@/lib/automation/session-automation-logic";

function isoAt(offsetMs: number) {
  return new Date(offsetMs).toISOString();
}

function automationPayload(kind: "idle_prompt" | "idle_close") {
  return {
    automation: {
      source: SESSION_IDLE_AUTOMATION_SOURCE,
      kind
    }
  };
}

describe("getIdleAutomationDecision", () => {
  it("returns none when the conversation never started", () => {
    const nowMs = Date.UTC(2026, 0, 1, 0, 5, 0);
    expect(
      getIdleAutomationDecision(
        [
          {
            senderKind: "ava",
            createdAt: isoAt(nowMs - 10_000)
          }
        ],
        nowMs
      )
    ).toEqual({ action: "none" });
  });

  it("prompts after the latest customer message ages past the idle threshold", () => {
    const nowMs = Date.UTC(2026, 0, 1, 0, 5, 0);
    const customerMessageAt = nowMs - SESSION_IDLE_PROMPT_AFTER_MS - 5_000;
    expect(
      getIdleAutomationDecision(
        [
          {
            senderKind: "customer",
            createdAt: isoAt(customerMessageAt)
          }
        ],
        nowMs
      )
    ).toEqual({
      action: "prompt",
      customerMessageAt: isoAt(customerMessageAt)
    });
  });

  it("does not close when the customer replied after the prompt", () => {
    const nowMs = Date.UTC(2026, 0, 1, 0, 5, 0);
    const customerMessageAt = nowMs - 3 * 60_000;
    const promptAt = customerMessageAt + SESSION_IDLE_PROMPT_AFTER_MS + 1_000;
    const followUpAt = nowMs - 10_000;

    expect(
      getIdleAutomationDecision(
        [
          {
            senderKind: "customer",
            createdAt: isoAt(customerMessageAt)
          },
          {
            senderKind: "ava",
            createdAt: isoAt(promptAt),
            payload: automationPayload("idle_prompt")
          },
          {
            senderKind: "customer",
            createdAt: isoAt(followUpAt)
          }
        ],
        nowMs
      )
    ).toEqual({ action: "none" });
  });

  it("closes when the prompt aged out without a customer reply", () => {
    const nowMs = Date.UTC(2026, 0, 1, 0, 5, 0);
    const customerMessageAt = nowMs - 3 * 60_000;
    const promptAt = nowMs - SESSION_IDLE_CLOSE_AFTER_PROMPT_MS - 5_000;

    expect(
      getIdleAutomationDecision(
        [
          {
            senderKind: "customer",
            createdAt: isoAt(customerMessageAt)
          },
          {
            senderKind: "ava",
            createdAt: isoAt(promptAt),
            payload: automationPayload("idle_prompt")
          }
        ],
        nowMs
      )
    ).toEqual({
      action: "close",
      customerMessageAt: isoAt(customerMessageAt),
      promptAt: isoAt(promptAt)
    });
  });

  it("skips duplicate closes after a close automation message already exists", () => {
    const nowMs = Date.UTC(2026, 0, 1, 0, 5, 0);
    const customerMessageAt = nowMs - 3 * 60_000;
    const promptAt = nowMs - SESSION_IDLE_CLOSE_AFTER_PROMPT_MS - 5_000;
    const closeAt = promptAt + 1_000;

    expect(
      getIdleAutomationDecision(
        [
          {
            senderKind: "customer",
            createdAt: isoAt(customerMessageAt)
          },
          {
            senderKind: "ava",
            createdAt: isoAt(promptAt),
            payload: automationPayload("idle_prompt")
          },
          {
            senderKind: "ava",
            createdAt: isoAt(closeAt),
            payload: automationPayload("idle_close")
          }
        ],
        nowMs
      )
    ).toEqual({ action: "none" });
  });
});

describe("shouldAutoCloseResolvedConversation", () => {
  it("returns true when the resolved conversation exceeded the cutoff", () => {
    const nowMs = Date.UTC(2026, 0, 1, 0, 40, 0);
    expect(
      shouldAutoCloseResolvedConversation(
        isoAt(nowMs - RESOLVED_SESSION_AUTO_CLOSE_AFTER_MS - 1_000),
        nowMs
      )
    ).toBe(true);
  });

  it("returns false when the resolved conversation is still within the cutoff", () => {
    const nowMs = Date.UTC(2026, 0, 1, 0, 40, 0);
    expect(
      shouldAutoCloseResolvedConversation(
        isoAt(nowMs - RESOLVED_SESSION_AUTO_CLOSE_AFTER_MS + 1_000),
        nowMs
      )
    ).toBe(false);
  });
});

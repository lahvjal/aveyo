import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/config", () => ({
  getOpenAiApiKey: () => undefined
}));

import { detectCustomerMessageSentimentForIncomingMessage } from "@/lib/sentiment/customer-sentiment";

describe("detectCustomerMessageSentimentForIncomingMessage", () => {
  it("marks repeated short human escalation as escalated", async () => {
    const result = await detectCustomerMessageSentimentForIncomingMessage("human", {
      recentCustomerMessages: ["human", "human"]
    });

    expect(result.source).toBe("heuristic");
    expect(result.sentiment.level).toBe("escalated");
    expect(result.sentiment.score).toBeGreaterThanOrEqual(70);
  });

  it("marks short human confirmation as frustrated at minimum", async () => {
    const result = await detectCustomerMessageSentimentForIncomingMessage("human", {
      recentCustomerMessages: []
    });

    expect(result.sentiment.level === "frustrated" || result.sentiment.level === "escalated").toBe(true);
    expect(result.sentiment.score).toBeGreaterThanOrEqual(40);
  });

  it("does not force escalation floor for non-escalation short replies", async () => {
    const result = await detectCustomerMessageSentimentForIncomingMessage("thanks", {
      recentCustomerMessages: ["human", "human"]
    });

    expect(result.sentiment.level).toBe("calm");
    expect(result.sentiment.score).toBeLessThan(40);
  });
});

import { type TimelineMessage } from "@ava/chat-domain";

export function getCustomerMessageSentimentLevel(message: TimelineMessage) {
  if (message.kind !== "customer") {
    return null;
  }
  return message.customerSentiment?.level ?? null;
}

export function getCustomerMessageSentimentLabel(level: "calm" | "frustrated" | "escalated") {
  if (level === "escalated") {
    return "Customer sentiment: Escalated";
  }
  if (level === "frustrated") {
    return "Customer sentiment: Frustrated";
  }
  return "Customer sentiment: Calm";
}

import OpenAI from "openai";
import { type CustomerSentiment, type CustomerSentimentLevel } from "@ava/chat-domain";
import { getOpenAiApiKey } from "@/lib/ai/config";

type CustomerRating = "thumbs_up" | "thumbs_down";
type CustomerSentimentSource = "ai" | "heuristic";

interface CustomerMessageLike {
  body: string;
  created_at: string;
  payload: Record<string, unknown> | null;
}

const CUSTOMER_FRUSTRATION_KEYWORDS = [
  "not helpful",
  "frustrated",
  "annoyed",
  "angry",
  "upset",
  "ridiculous",
  "still waiting",
  "taking too long"
];

const CUSTOMER_STRONG_NEGATIVE_INTENTS = [
  "not working",
  "doesnt work",
  "doesn't work",
  "still not working",
  "not acceptable",
  "unacceptable",
  "this is useless",
  "this is ridiculous",
  "this sucks",
  "awful",
  "terrible",
  "worst",
  "i am angry",
  "im angry",
  "i'm angry",
  "i am upset",
  "im upset",
  "i'm upset",
  "very frustrated",
  "so frustrated",
  "no response",
  "nobody is helping",
  "no one is helping"
];

const CUSTOMER_MILD_NEGATIVE_INTENTS = [
  "problem",
  "issue",
  "error",
  "failed",
  "failure",
  "stuck",
  "confused",
  "not sure",
  "still broken",
  "again",
  "still waiting",
  "still no",
  "need help",
  "help me"
];

const CUSTOMER_URGENCY_INTENTS = [
  "urgent",
  "asap",
  "right now",
  "immediately",
  "today",
  "cannot wait",
  "can't wait",
  "cant wait",
  "deadline"
];

const CUSTOMER_DEESCALATION_INTENTS = [
  "all good",
  "all set",
  "never mind",
  "no worries",
  "no problem",
  "its okay",
  "it's okay",
  "im good",
  "i'm good",
  "works now",
  "working now",
  "resolved",
  "fixed"
];

const CUSTOMER_POSITIVE_INTENTS = [
  "thanks",
  "thank you",
  "appreciate it",
  "that helps",
  "helpful",
  "got it"
];
const SHORT_ESCALATION_KEYWORDS = [
  "human",
  "agent",
  "rep",
  "representative",
  "person",
  "real person",
  "customer care",
  "support agent"
];
const SHORT_ESCALATION_SUPPORT_WORDS = [
  "need",
  "want",
  "talk",
  "speak",
  "connect",
  "help",
  "please",
  "now",
  "real"
];
const MAX_SHORT_ESCALATION_WORDS = 3;

const RECENT_SENTIMENT_WEIGHTS = [1.4, 1.8, 2.3, 2.9, 3.6] as const;
const SENTIMENT_PAYLOAD_VERSION = 1;
const DEFAULT_SENTIMENT_AI_TIMEOUT_MS = 1_800;
const SENTIMENT_CLASSIFIER_MODEL = "gpt-4o-mini";

let cachedSentimentOpenAiClient: OpenAI | null | undefined;

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function getSentimentOpenAiClient() {
  if (cachedSentimentOpenAiClient !== undefined) {
    return cachedSentimentOpenAiClient;
  }

  const apiKey = getOpenAiApiKey();
  cachedSentimentOpenAiClient = apiKey ? new OpenAI({ apiKey }) : null;
  return cachedSentimentOpenAiClient;
}

function parseSentimentLevel(value: unknown): CustomerSentimentLevel | null {
  if (value === "calm" || value === "frustrated" || value === "escalated") {
    return value;
  }
  return null;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeIntentText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\w\s']/g, " ")
    .replace(/\s+/g, " ");
}

function isShortEscalationRequestText(text: string) {
  const normalized = normalizeIntentText(text);
  if (!normalized) {
    return false;
  }

  const words = normalized.split(" ");
  if (words.length > MAX_SHORT_ESCALATION_WORDS) {
    return false;
  }

  if (SHORT_ESCALATION_KEYWORDS.includes(normalized)) {
    return true;
  }

  const hasEscalationKeyword = words.some((word) =>
    SHORT_ESCALATION_KEYWORDS.some((keyword) => keyword.split(" ").includes(word))
  );
  if (!hasEscalationKeyword) {
    return false;
  }

  const hasSupportWord = words.some((word) => SHORT_ESCALATION_SUPPORT_WORDS.includes(word));
  return hasSupportWord || words.length === 1;
}

function getConsecutiveShortEscalationCount(params: {
  currentText: string;
  recentCustomerMessages: string[] | undefined;
}) {
  if (!isShortEscalationRequestText(params.currentText)) {
    return 0;
  }

  const recentMessages = params.recentCustomerMessages ?? [];
  const sequence = [...recentMessages.slice(-4), params.currentText];
  let count = 0;

  for (let index = sequence.length - 1; index >= 0; index -= 1) {
    const messageText = sequence[index];
    if (!messageText || !isShortEscalationRequestText(messageText)) {
      break;
    }
    count += 1;
  }
  return count;
}

function applyShortEscalationContext(params: {
  text: string;
  recentCustomerMessages: string[] | undefined;
  sentiment: CustomerSentiment;
}) {
  const consecutiveCount = getConsecutiveShortEscalationCount({
    currentText: params.text,
    recentCustomerMessages: params.recentCustomerMessages
  });
  if (consecutiveCount <= 0) {
    return params.sentiment;
  }

  let scoreFloor = 46;
  if (consecutiveCount >= 3) {
    scoreFloor = 74;
  } else if (consecutiveCount >= 2) {
    scoreFloor = 58;
  }

  const adjustedScore = Math.max(params.sentiment.score, scoreFloor);
  return {
    level: sentimentLevelFromScore(adjustedScore),
    score: adjustedScore
  };
}

function countIntentMatches(normalizedText: string, intents: string[]) {
  if (!normalizedText) {
    return 0;
  }
  const padded = ` ${normalizedText} `;
  let hits = 0;
  for (const intent of intents) {
    if (padded.includes(` ${intent} `)) {
      hits += 1;
    }
  }
  return hits;
}

export function sentimentLevelFromScore(score: number): CustomerSentimentLevel {
  if (score >= 70) {
    return "escalated";
  }
  if (score >= 40) {
    return "frustrated";
  }
  return "calm";
}

function parseAiSentimentResult(content: string): CustomerSentiment | null {
  const normalized = content.trim();
  if (!normalized) {
    return null;
  }

  const candidates = [normalized];
  const jsonStart = normalized.indexOf("{");
  const jsonEnd = normalized.lastIndexOf("}");
  if (jsonStart >= 0 && jsonEnd > jsonStart) {
    candidates.push(normalized.slice(jsonStart, jsonEnd + 1));
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      const parsedRecord = asRecord(parsed);
      if (!parsedRecord) {
        continue;
      }
      const parsedLevel = parseSentimentLevel(parsedRecord.level);
      const parsedScoreRaw = parsedRecord.score;
      const parsedScore =
        typeof parsedScoreRaw === "number" && Number.isFinite(parsedScoreRaw)
          ? clampScore(parsedScoreRaw)
          : undefined;

      if (parsedLevel && parsedScore !== undefined) {
        return {
          level: parsedLevel,
          score: parsedScore
        };
      }
      if (parsedScore !== undefined) {
        return {
          level: sentimentLevelFromScore(parsedScore),
          score: parsedScore
        };
      }
      if (parsedLevel) {
        const defaultScore = parsedLevel === "escalated" ? 78 : parsedLevel === "frustrated" ? 54 : 24;
        return {
          level: parsedLevel,
          score: defaultScore
        };
      }
    } catch {
      continue;
    }
  }

  return null;
}

async function runAiSentimentClassifier(
  text: string,
  signal: AbortSignal
): Promise<CustomerSentiment | null> {
  const openAiClient = getSentimentOpenAiClient();
  if (!openAiClient) {
    return null;
  }

  const completion = await openAiClient.chat.completions.create(
    {
      model: SENTIMENT_CLASSIFIER_MODEL,
      temperature: 0,
      max_tokens: 60,
      response_format: {
        type: "json_object"
      },
      messages: [
        {
          role: "system",
          content:
            "Classify the customer message sentiment for support chat triage. " +
            "Return ONLY JSON with keys level and score. " +
            "Allowed level values: calm, frustrated, escalated. " +
            "Use score 0-100 where calm is 0-39, frustrated is 40-69, escalated is 70-100. " +
            "Interpret semantics, tone, urgency, frustration, and negative escalation in the message."
        },
        {
          role: "user",
          content: text
        }
      ]
    },
    {
      signal
    }
  );

  const rawContent = completion.choices[0]?.message?.content;
  if (typeof rawContent !== "string") {
    return null;
  }
  return parseAiSentimentResult(rawContent);
}

export function detectCustomerMessageSentiment(text: string): CustomerSentiment {
  const normalized = normalizeIntentText(text);
  let score = 22;

  if (normalized) {
    const frustrationHits = countIntentMatches(normalized, CUSTOMER_FRUSTRATION_KEYWORDS);
    const strongNegativeHits = countIntentMatches(normalized, CUSTOMER_STRONG_NEGATIVE_INTENTS);
    const mildNegativeHits = countIntentMatches(normalized, CUSTOMER_MILD_NEGATIVE_INTENTS);
    const urgencyHits = countIntentMatches(normalized, CUSTOMER_URGENCY_INTENTS);
    const positiveHits = countIntentMatches(normalized, CUSTOMER_POSITIVE_INTENTS);
    const deEscalationHits = countIntentMatches(normalized, CUSTOMER_DEESCALATION_INTENTS);

    score += Math.min(34, (frustrationHits + strongNegativeHits) * 9);
    score += Math.min(14, mildNegativeHits * 4);
    score += Math.min(10, urgencyHits * 3);
    score -= Math.min(12, positiveHits * 4);
    score -= Math.min(14, deEscalationHits * 5);
  }

  const questionMarkCount = (text.match(/\?/g) ?? []).length;
  if (questionMarkCount >= 2) {
    score += 4;
  }
  if (/[!?]{2,}/.test(text)) {
    score += 3;
  }
  const uppercaseWordCount = (text.match(/\b[A-Z]{3,}\b/g) ?? []).length;
  if (uppercaseWordCount >= 2) {
    score += 4;
  }

  const normalizedScore = clampScore(score);
  return {
    level: sentimentLevelFromScore(normalizedScore),
    score: normalizedScore
  };
}

export async function detectCustomerMessageSentimentForIncomingMessage(
  text: string,
  options?: {
    timeoutMs?: number;
    recentCustomerMessages?: string[];
  }
): Promise<{
  sentiment: CustomerSentiment;
  source: CustomerSentimentSource;
}> {
  const heuristicSentiment = applyShortEscalationContext({
    text,
    recentCustomerMessages: options?.recentCustomerMessages,
    sentiment: detectCustomerMessageSentiment(text)
  });
  const openAiClient = getSentimentOpenAiClient();
  if (!openAiClient) {
    return {
      sentiment: heuristicSentiment,
      source: "heuristic"
    };
  }

  const timeoutMs =
    typeof options?.timeoutMs === "number" && options.timeoutMs > 0
      ? Math.floor(options.timeoutMs)
      : DEFAULT_SENTIMENT_AI_TIMEOUT_MS;
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, timeoutMs);

  try {
    const aiSentiment = await runAiSentimentClassifier(text, abortController.signal);
    if (!aiSentiment) {
      return {
        sentiment: heuristicSentiment,
        source: "heuristic"
      };
    }

    // Keep AI semantic interpretation primary while retaining some heuristic stability.
    const blendedScore = clampScore(Math.round(aiSentiment.score * 0.8 + heuristicSentiment.score * 0.2));
    const blendedSentiment = applyShortEscalationContext({
      text,
      recentCustomerMessages: options?.recentCustomerMessages,
      sentiment: {
        level: sentimentLevelFromScore(blendedScore),
        score: blendedScore
      }
    });
    return {
      sentiment: blendedSentiment,
      source: "ai"
    };
  } catch {
    return {
      sentiment: heuristicSentiment,
      source: "heuristic"
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export function readCustomerSentimentFromPayload(
  payload: Record<string, unknown> | null | undefined
): CustomerSentiment | null {
  const payloadRecord = asRecord(payload);
  const sentimentRecord = asRecord(payloadRecord?.customerSentiment);
  if (!sentimentRecord) {
    return null;
  }
  const levelValue = sentimentRecord.level;
  const level =
    levelValue === "calm" || levelValue === "frustrated" || levelValue === "escalated"
      ? levelValue
      : undefined;
  const scoreValue = sentimentRecord.score;
  const score = typeof scoreValue === "number" && Number.isFinite(scoreValue) ? clampScore(scoreValue) : undefined;

  if (level && score !== undefined) {
    return { level, score };
  }
  if (score !== undefined) {
    return { level: sentimentLevelFromScore(score), score };
  }
  return null;
}

export function getCustomerSentimentForMessage(params: {
  body: string;
  payload: Record<string, unknown> | null | undefined;
}): CustomerSentiment {
  return readCustomerSentimentFromPayload(params.payload) ?? detectCustomerMessageSentiment(params.body);
}

export function serializeCustomerSentimentPayload(
  sentiment: CustomerSentiment,
  source?: CustomerSentimentSource
) {
  return {
    level: sentiment.level,
    score: sentiment.score,
    version: SENTIMENT_PAYLOAD_VERSION,
    source: source ?? "heuristic"
  };
}

function getRecencyWeight(index: number, totalMessages: number) {
  const distanceFromLatest = totalMessages - 1 - index;
  if (distanceFromLatest < RECENT_SENTIMENT_WEIGHTS.length) {
    const recentWeightIndex = RECENT_SENTIMENT_WEIGHTS.length - 1 - distanceFromLatest;
    return RECENT_SENTIMENT_WEIGHTS[recentWeightIndex] ?? 1;
  }
  const decaySteps = distanceFromLatest - RECENT_SENTIMENT_WEIGHTS.length + 1;
  return Math.max(0.5, 1 - decaySteps * 0.04);
}

function weightedAverage(values: number[], weights: number[]) {
  if (values.length === 0 || weights.length === 0 || values.length !== weights.length) {
    return null;
  }
  let weightedTotal = 0;
  let totalWeight = 0;
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    const weight = weights[index];
    if (value === undefined || weight === undefined) {
      continue;
    }
    weightedTotal += value * weight;
    totalWeight += weight;
  }
  if (totalWeight <= 0) {
    return null;
  }
  return weightedTotal / totalWeight;
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function computeOverallCustomerSentiment(params: {
  customerMessages: CustomerMessageLike[];
  staleMinutes: number | null;
  rating: CustomerRating | null;
}) {
  const sortedCustomerMessages = [...params.customerMessages].sort((left, right) =>
    left.created_at.localeCompare(right.created_at)
  );

  if (sortedCustomerMessages.length === 0) {
    let emptyScore = 18;
    if (params.staleMinutes !== null && params.staleMinutes >= 10) {
      emptyScore += Math.min(20, Math.floor(params.staleMinutes * 0.9));
    }
    if (params.rating === "thumbs_down") {
      emptyScore += 18;
    } else if (params.rating === "thumbs_up") {
      emptyScore -= 10;
    }
    return clampScore(emptyScore);
  }

  const perMessageScores = sortedCustomerMessages.map((message) =>
    getCustomerSentimentForMessage({
      body: message.body,
      payload: message.payload
    }).score
  );
  const recentFiveScores = perMessageScores.slice(-5);
  const recentFiveWeightTemplate = [1.2, 1.7, 2.4, 3.2, 4.2];
  const recentFiveWeights = recentFiveScores.map((_, index) => {
    const startIndex = Math.max(0, recentFiveWeightTemplate.length - recentFiveScores.length);
    return recentFiveWeightTemplate[startIndex + index] ?? 1;
  });
  const recentFiveWeightedAverage = weightedAverage(recentFiveScores, recentFiveWeights) ?? 0;
  const perMessageWeights = perMessageScores.map((_, index) =>
    getRecencyWeight(index, perMessageScores.length)
  );
  const recencyWeightedAverage =
    weightedAverage(perMessageScores, perMessageWeights) ?? recentFiveWeightedAverage;
  const wholeChatAverage = average(perMessageScores) ?? recentFiveWeightedAverage;

  // Keep the most recent five messages dominant while still preserving whole-chat context.
  let score =
    recentFiveWeightedAverage * 0.72 + recencyWeightedAverage * 0.18 + wholeChatAverage * 0.1;

  const latestScore = recentFiveScores[recentFiveScores.length - 1] ?? score;
  const recentFiveAverage = average(recentFiveScores) ?? latestScore;

  if (params.staleMinutes !== null && params.staleMinutes >= 10) {
    score += Math.min(20, Math.floor(params.staleMinutes * 0.9));
  }
  if (params.rating === "thumbs_down") {
    score += 18;
  }
  if (params.rating === "thumbs_up") {
    score -= 10;
  }

  const recentFiveFrustratedCount = recentFiveScores.filter((value) => value >= 40).length;
  const recentFiveEscalatedCount = recentFiveScores.filter((value) => value >= 70).length;

  if (recentFiveEscalatedCount >= 2 || latestScore >= 78) {
    score = Math.max(score, 74);
  } else if (recentFiveFrustratedCount >= 2 || latestScore >= 55) {
    score = Math.max(score, 45);
  } else if (latestScore >= 45 && recentFiveAverage >= 38) {
    score = Math.max(score, 41);
  }

  if (recentFiveFrustratedCount === 0 && latestScore <= 30 && recentFiveAverage <= 32) {
    score = Math.min(score, 38);
  }

  return clampScore(score);
}

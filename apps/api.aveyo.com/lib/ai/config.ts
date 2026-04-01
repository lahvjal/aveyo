function normalizeEnvValue(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function getOpenAiApiKey() {
  return normalizeEnvValue(process.env.OPENAI_API_KEY);
}

/**
 * Ava chat policy: support-agent names shown to customers (and anywhere in the
 * Ava chat experience) must be first name only.
 */
export function toAgentFirstName(
  name: string | null | undefined,
  fallback = "Representative"
): string {
  const trimmed = name?.trim();
  if (!trimmed) {
    return fallback;
  }
  return trimmed.split(/\s+/)[0] || fallback;
}

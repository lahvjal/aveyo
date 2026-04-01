import { type TicketTone } from "@/lib/dashboard-types";

interface InitialChipProps {
  initials: string;
  tone?: TicketTone;
  size?: number;
  avatarUrl?: string | null;
}

export function InitialChip({ initials, tone = "sand", size = 30, avatarUrl }: InitialChipProps) {
  const photoUrl = typeof avatarUrl === "string" ? avatarUrl.trim() : "";
  const hasPhoto = Boolean(photoUrl);

  return (
    <span
      className={`initial-chip ${tone}${hasPhoto ? " with-avatar" : ""}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundImage: hasPhoto ? `url(${photoUrl})` : undefined
      }}
      aria-hidden
    >
      {hasPhoto ? null : initials}
    </span>
  );
}

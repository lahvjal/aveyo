import { prisma } from "@/lib/mysql/client";

const UNSUBSCRIBE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS marketing_email_unsubscribes (
    email VARCHAR(255) NOT NULL,
    reason TEXT NULL,
    source VARCHAR(64) NOT NULL DEFAULT 'web',
    user_agent VARCHAR(255) NULL,
    unsubscribed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (email)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(rawEmail: string): string | null {
  const normalized = rawEmail.trim().toLowerCase();
  if (!normalized || !EMAIL_PATTERN.test(normalized)) {
    return null;
  }
  return normalized;
}

let ensured = false;
async function ensureUnsubscribeTable(): Promise<void> {
  if (ensured) {
    return;
  }

  await prisma.$executeRawUnsafe(UNSUBSCRIBE_TABLE_SQL);
  ensured = true;
}

export async function saveEmailUnsubscribe(input: {
  email: string;
  source: string;
  reason?: string | null;
  userAgent?: string | null;
}): Promise<{ success: true; email: string }> {
  const email = normalizeEmail(input.email);
  if (!email) {
    throw new Error("A valid email address is required.");
  }

  await ensureUnsubscribeTable();

  const source = input.source?.trim() ? input.source.trim() : "web";
  const reason = input.reason?.trim() ? input.reason.trim() : null;
  const userAgent = input.userAgent?.trim() ? input.userAgent.trim().slice(0, 255) : null;

  await prisma.$executeRaw`
    INSERT INTO marketing_email_unsubscribes (email, reason, source, user_agent, unsubscribed_at)
    VALUES (${email}, ${reason}, ${source}, ${userAgent}, NOW())
    ON DUPLICATE KEY UPDATE
      reason = COALESCE(VALUES(reason), reason),
      source = VALUES(source),
      user_agent = VALUES(user_agent),
      unsubscribed_at = NOW()
  `;

  return { success: true, email };
}

export async function isEmailUnsubscribed(rawEmail: string): Promise<boolean> {
  const email = normalizeEmail(rawEmail);
  if (!email) {
    return false;
  }

  await ensureUnsubscribeTable();

  const rows = await prisma.$queryRaw<Array<{ email: string }>>`
    SELECT email
    FROM marketing_email_unsubscribes
    WHERE email = ${email}
    LIMIT 1
  `;

  return rows.length > 0;
}

const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { Resend } = require("resend");
const mysql = require("mysql2/promise");
const {
  EMAIL_SUBJECTS,
  renderUpdatedPortalEmailHtml,
  renderWelcomeEmailHtml
} = require("./portal-email-template.js");

const args = new Map();
for (const rawArg of process.argv.slice(2)) {
  const [key, value] = rawArg.split("=");
  if (key?.startsWith("--")) {
    args.set(key.slice(2), value ?? "true");
  }
}

function getArg(name, fallback) {
  const value = args.get(name);
  return value === undefined ? fallback : value;
}

function toBoolean(value, fallback = false) {
  if (value === undefined) {
    return fallback;
  }
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "n"].includes(normalized)) {
    return false;
  }
  return fallback;
}

function toNumber(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeEmailCell(cell) {
  return String(cell)
    .split(",")
    .map((part) => part.replace(/\(.*?\)/g, "").trim().toLowerCase())
    .filter(Boolean);
}

function isLikelyEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function inferNameFromEmail(email) {
  const localPart = email.split("@")[0] ?? "";
  const cleaned = localPart.replace(/[._-]+/g, " ").replace(/\d+/g, " ").trim();
  if (!cleaned) {
    return "there";
  }
  const words = cleaned
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  return words.join(" ");
}

function collectRecipients(csvPath) {
  const content = readFileSync(csvPath, "utf8");
  const lines = content.split(/\r?\n/).slice(1).filter(Boolean);
  const unique = new Set();
  for (const line of lines) {
    const emails = normalizeEmailCell(line);
    for (const email of emails) {
      if (isLikelyEmail(email)) {
        unique.add(email);
      }
    }
  }
  return Array.from(unique.values());
}

function requireValue(label, value) {
  if (!value || !String(value).trim()) {
    throw new Error(`${label} is required for live marketing sends.`);
  }
  return String(value).trim();
}

function chunk(values, size) {
  const out = [];
  for (let i = 0; i < values.length; i += size) {
    out.push(values.slice(i, i + size));
  }
  return out;
}

async function getUnsubscribedRecipients(recipients) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return new Set();
  }

  if (recipients.length === 0) {
    return new Set();
  }

  let connection;
  try {
    connection = await mysql.createConnection(databaseUrl);

    const [tableRows] = await connection.query(
      "SHOW TABLES LIKE 'marketing_email_unsubscribes'"
    );
    if (!Array.isArray(tableRows) || tableRows.length === 0) {
      return new Set();
    }

    const unsubscribed = new Set();
    const normalizedRecipients = recipients.map((email) => email.toLowerCase());
    for (const emailChunk of chunk(normalizedRecipients, 200)) {
      const placeholders = emailChunk.map(() => "?").join(",");
      const [rows] = await connection.query(
        `SELECT email FROM marketing_email_unsubscribes WHERE email IN (${placeholders})`,
        emailChunk
      );
      for (const row of rows) {
        if (row.email) {
          unsubscribed.add(String(row.email).toLowerCase());
        }
      }
    }

    return unsubscribed;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn("Unable to load unsubscribed recipients. Continuing send.", reason);
    return new Set();
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

function buildRecipientUrl(baseUrl, email) {
  const url = new URL(baseUrl);
  url.searchParams.set("email", email);
  return url.toString();
}

function deriveUnsubscribeApiUrl(pageUrl) {
  const url = new URL(pageUrl);
  url.pathname = "/api/preferences/unsubscribe";
  url.search = "";
  url.hash = "";
  return url.toString();
}

function pickResendApiKey() {
  const keyCandidates = [
    { name: "RESEND_AVEYOORG_API_KEY", value: process.env.RESEND_AVEYOORG_API_KEY },
    { name: "AVEYOORG_RESEND_API_KEY", value: process.env.AVEYOORG_RESEND_API_KEY },
    { name: "RESEND_API_KEY", value: process.env.RESEND_API_KEY }
  ];

  const selected = keyCandidates.find((candidate) => candidate.value && String(candidate.value).trim());
  if (!selected) {
    throw new Error(
      "No Resend API key configured. Set RESEND_AVEYOORG_API_KEY (preferred) or RESEND_API_KEY."
    );
  }

  return {
    keyName: selected.name,
    keyValue: String(selected.value).trim()
  };
}

async function main() {
  const campaign = getArg("campaign", "welcome");
  if (!["welcome", "updated"].includes(campaign)) {
    throw new Error(`Unsupported --campaign value "${campaign}". Use "welcome" or "updated".`);
  }

  const csvPath = resolve(
    process.cwd(),
    getArg("csv", "../../customer-emails-2026-not-completed.csv")
  );
  const portalUrl = getArg("portal-url", "https://customer.aveyo.com");
  const imageUrl = getArg("image-url", "https://customer.aveyo.com/email/customer-portal-preview.png");
  const inlineImage = toBoolean(getArg("inline-image", "false"), false);
  const screenshotPath = getArg(
    "image",
    "/Users/vel/.cursor/projects/Users-vel-Documents-Aveyo-monoveyo/assets/custportal-4ec0aa81-59fc-4044-9b0a-542e46e83c4b.png"
  );
  const dryRun = toBoolean(getArg("dry-run", "true"), true);
  const limit = toNumber(getArg("limit", "0"), 0);
  const supportEmail = getArg("support-email", "customercare@aveyo.com");
  const defaultUnsubscribeUrl = `${portalUrl.replace(/\/$/, "")}/preferences/unsubscribe`;
  const unsubscribeUrl = getArg(
    "unsubscribe-url",
    process.env.MARKETING_UNSUBSCRIBE_URL || defaultUnsubscribeUrl
  );
  const unsubscribeApiUrl = getArg(
    "unsubscribe-api-url",
    process.env.MARKETING_UNSUBSCRIBE_API_URL || ""
  );
  const preferencesUrl = getArg("preferences-url", process.env.MARKETING_PREFERENCES_URL || "");
  const companyName = getArg("company-name", process.env.MARKETING_COMPANY_NAME || "Aveyo");
  const companyAddress = getArg("company-address", process.env.MARKETING_COMPANY_ADDRESS || "");

  const recipients = collectRecipients(csvPath);
  const limitedRecipients = limit > 0 ? recipients.slice(0, limit) : recipients;
  const imageSrc = inlineImage ? "cid:portal-preview" : imageUrl;
  const screenshotBase64 = inlineImage ? readFileSync(screenshotPath).toString("base64") : null;

  console.log(`Campaign: ${campaign}`);
  console.log(`Dry run: ${dryRun}`);
  console.log(`Recipient count: ${limitedRecipients.length}`);
  console.log(`CSV: ${csvPath}`);
  console.log(`Portal URL: ${portalUrl}`);
  console.log(`Image source: ${imageSrc}`);
  console.log(`Inline image mode: ${inlineImage}`);

  if (dryRun) {
    console.log("Dry run enabled. No emails sent.");
    console.log("First 10 recipients:", limitedRecipients.slice(0, 10));
    return;
  }

  const { keyName, keyValue } = pickResendApiKey();

  const resend = new Resend(keyValue);
  const from = process.env.CAMPAIGN_FROM || "Aveyo Support <support@send.aveyo.com>";
  const liveUnsubscribeUrl = requireValue("unsubscribe-url", unsubscribeUrl);
  const liveUnsubscribeApiBaseUrl = unsubscribeApiUrl
    ? requireValue("unsubscribe-api-url", unsubscribeApiUrl)
    : deriveUnsubscribeApiUrl(liveUnsubscribeUrl);
  const liveCompanyAddress = requireValue("company-address", companyAddress);
  console.log(`Resend key source: ${keyName}`);

  const unsubscribedRecipients = await getUnsubscribedRecipients(limitedRecipients);
  const filteredRecipients = limitedRecipients.filter(
    (recipient) => !unsubscribedRecipients.has(recipient.toLowerCase())
  );
  console.log(
    `Suppressed unsubscribed recipients: ${unsubscribedRecipients.size}. Sending to ${filteredRecipients.length}.`
  );

  let successCount = 0;
  let failureCount = 0;

  for (const recipient of filteredRecipients) {
    const recipientUnsubscribeUrl = buildRecipientUrl(liveUnsubscribeUrl, recipient);
    const recipientUnsubscribeApiUrl = buildRecipientUrl(liveUnsubscribeApiBaseUrl, recipient);
    const subject = EMAIL_SUBJECTS[campaign];
    const html =
      campaign === "welcome"
        ? renderWelcomeEmailHtml({
            portalUrl,
            imageSrc,
            footerContext: {
              recipientEmail: recipient,
              unsubscribeUrl: recipientUnsubscribeUrl,
              preferencesUrl,
              supportEmail,
              companyName,
              companyAddress: liveCompanyAddress
            }
          })
        : renderUpdatedPortalEmailHtml({
            portalUrl,
            imageSrc,
            name: inferNameFromEmail(recipient),
            footerContext: {
              recipientEmail: recipient,
              unsubscribeUrl: recipientUnsubscribeUrl,
              preferencesUrl,
              supportEmail,
              companyName,
              companyAddress: liveCompanyAddress
            }
          });

    try {
      const payload = {
        from,
        to: recipient,
        subject,
        html,
        headers: {
          "List-Unsubscribe": `<${recipientUnsubscribeApiUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
        }
      };

      if (inlineImage && screenshotBase64) {
        payload.attachments = [
          {
            filename: "customer-portal-preview.png",
            content: screenshotBase64,
            contentType: "image/png",
            disposition: "inline",
            contentId: "portal-preview"
          }
        ];
      }

      const { error } = await resend.emails.send(payload);

      if (error) {
        failureCount += 1;
        console.error(`Failed: ${recipient}`, error);
      } else {
        successCount += 1;
      }
    } catch (error) {
      failureCount += 1;
      console.error(`Failed: ${recipient}`, error);
    }
  }

  console.log(`Done. Success: ${successCount} | Failed: ${failureCount}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

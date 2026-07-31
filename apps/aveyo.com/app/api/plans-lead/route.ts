import { NextResponse } from "next/server";
import { sanitizePlansLeadPayload, type PlansLeadPayload } from "@/lib/plans-lead";

export const runtime = "nodejs";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getLeadRows(payload: PlansLeadPayload) {
  return [
    ["Selected plan", payload.selectedPlanName || "Not selected"],
    ["Selected plan id", payload.selectedPlanId || "Not selected"],
    ["First name", payload.firstName],
    ["Last name", payload.lastName],
    ["Email", payload.email],
    ["Phone", payload.phone],
    ["ZIP code", payload.zipCode],
    ["Address", payload.address],
    ["City", payload.city],
    ["Home ownership", payload.homeOwnership],
    ["Electric bill", payload.electricBill],
    ["Page slug", payload.pageSlug],
    ["Offer name", payload.offerName],
    ["UTM source", payload.utmSource],
    ["UTM campaign", payload.utmCampaign],
    ["UTM adset", payload.utmAdset],
    ["UTM ad", payload.utmAd],
    ["fbclid", payload.fbclid],
    ["Consent to contact", payload.consentToContact],
    ["Submitted at", payload.submittedAt]
  ];
}

function buildEmailHtml(payload: PlansLeadPayload) {
  const rows = getLeadRows(payload)
    .map(
      ([label, value]) =>
        `<tr><td style="padding:10px 12px;border-bottom:1px solid #e5eaef;font-weight:600;vertical-align:top;">${escapeHtml(
          label
        )}</td><td style="padding:10px 12px;border-bottom:1px solid #e5eaef;">${escapeHtml(
          value || ""
        )}</td></tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;background:#f4f6f6;color:#212120;font-family:Arial,sans-serif;">
    <div style="max-width:720px;margin:0 auto;padding:32px 20px;">
      <div style="background:#ffffff;border:1px solid #dbe2e8;border-radius:24px;overflow:hidden;">
        <div style="padding:24px 24px 12px;">
          <p style="margin:0 0 8px;color:#6b7280;font-size:12px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;">
            Aveyo plans lead
          </p>
          <h1 style="margin:0;font-size:32px;line-height:1.1;">
            New plans form submission
          </h1>
          <p style="margin:12px 0 0;color:#5f646b;font-size:16px;line-height:1.7;">
            A new lead was submitted through the dedicated Aveyo plans form.
          </p>
        </div>
        <div style="padding:12px 24px 24px;">
          <table style="width:100%;border-collapse:collapse;border:1px solid #e5eaef;border-radius:16px;overflow:hidden;">
            <tbody>${rows}</tbody>
          </table>
          <h2 style="margin:24px 0 12px;font-size:18px;">Raw payload</h2>
          <pre style="margin:0;padding:16px;background:#0A1628;color:#ffffff;border-radius:16px;overflow:auto;font-size:13px;line-height:1.6;">${escapeHtml(
            JSON.stringify(payload, null, 2)
          )}</pre>
        </div>
      </div>
    </div>
  </body>
</html>`;
}

function buildEmailText(payload: PlansLeadPayload) {
  const rows = getLeadRows(payload)
    .map(([label, value]) => `${label}: ${value || ""}`)
    .join("\n");

  return `${rows}\n\nRaw payload:\n${JSON.stringify(payload, null, 2)}`;
}

function getConfiguredRecipients() {
  return (process.env.AVEYO_PLANS_LEAD_EMAIL_TO ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export async function POST(request: Request) {
  let payload: PlansLeadPayload;

  try {
    const body = await request.json();
    payload = sanitizePlansLeadPayload(body);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Invalid request body."
      },
      { status: 400 }
    );
  }

  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const fromAddress =
    process.env.AVEYO_PLANS_LEAD_EMAIL_FROM?.trim() ||
    "Aveyo Plans <support@send.goaveyo.com>";
  const recipients = getConfiguredRecipients();

  if (!resendApiKey || recipients.length === 0) {
    console.error("Plans lead email delivery is not configured.");

    return NextResponse.json(
      {
        success: false,
        error: "Lead delivery is not configured yet."
      },
      { status: 500 }
    );
  }

  const subject = payload.selectedPlanName
    ? `New Aveyo plans lead: ${payload.selectedPlanName}`
    : "New Aveyo plans lead";

  try {
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromAddress,
        to: recipients,
        subject,
        html: buildEmailHtml(payload),
        text: buildEmailText(payload)
      })
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error("Failed to send plans lead email.", errorText);

      return NextResponse.json(
        {
          success: false,
          error: "We couldn't deliver this request. Please try again."
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, payload });
  } catch (error) {
    console.error("Unexpected plans lead email error.", error);

    return NextResponse.json(
      {
        success: false,
        error: "We couldn't deliver this request. Please try again."
      },
      { status: 500 }
    );
  }
}

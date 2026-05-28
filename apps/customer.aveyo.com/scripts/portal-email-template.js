const AVEYO_COLORS = {
  text: "#1f2937",
  mutedText: "#4b5563",
  panel: "#ffffff",
  border: "#e5e7eb",
  page: "#f9fafb",
  action: "#111827",
  actionText: "#ffffff",
  accent: "#111827"
};

const AVEYO_LOGO_URL = "https://www.aveyo.com/aveyo-logo.svg";

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildFooter({
  unsubscribeUrl,
  preferencesUrl,
  privacyPolicyUrl,
  companyName,
  companyAddress
}) {
  const safeUnsubscribeUrl = escapeHtml(unsubscribeUrl);
  const safePreferencesUrl = escapeHtml(preferencesUrl || "");
  const safePrivacyPolicyUrl = escapeHtml(privacyPolicyUrl || "");
  const safeCompanyName = escapeHtml(companyName || "");
  const safeCompanyAddress = escapeHtml(companyAddress || "");

  const preferencesRow = preferencesUrl
    ? `<a href="${safePreferencesUrl}" style="color:${AVEYO_COLORS.accent};">Manage preferences</a> • `
    : "";
  const privacyRow = privacyPolicyUrl
    ? ` • <a href="${safePrivacyPolicyUrl}" style="color:${AVEYO_COLORS.accent};">Privacy Policy</a>`
    : "";
  const addressRow = safeCompanyAddress
    ? `<p style="margin:0 0 10px 0;">${safeCompanyName ? `${safeCompanyName} • ` : ""}${safeCompanyAddress}</p>`
    : "";

  return `
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid ${AVEYO_COLORS.border};font-size:12px;line-height:1.6;color:${AVEYO_COLORS.mutedText};">
      <p style="margin:0 0 10px 0;">
        You are receiving this marketing email because your email is associated with an active Aveyo solar project.
      </p>
      <p style="margin:0 0 10px 0;">
        ${preferencesRow}<a href="${safeUnsubscribeUrl}" style="color:${AVEYO_COLORS.accent};">Unsubscribe</a>${privacyRow}
      </p>
      <p style="margin:0 0 10px 0;">
        For help, chat with Ava at <a href="https://www.aveyo.com" style="color:${AVEYO_COLORS.accent};">aveyo.com</a>.
      </p>
      ${addressRow}
    </div>
  `;
}

function buildShell({
  eyebrow,
  heading,
  introHtml,
  bodyHtml,
  imageSrc,
  ctaLabel,
  portalUrl,
  footerContext
}) {
  const safePortalUrl = escapeHtml(portalUrl);
  const safeImageSrc = escapeHtml(imageSrc);
  const safeLogoUrl = escapeHtml(AVEYO_LOGO_URL);
  const footerHtml = buildFooter(footerContext);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(heading)}</title>
  </head>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: ${AVEYO_COLORS.text}; margin: 0; padding: 24px; background: ${AVEYO_COLORS.page};">
    <div style="max-width: 560px; margin: 0 auto; background: ${AVEYO_COLORS.panel}; border: 1px solid ${AVEYO_COLORS.border}; border-radius: 16px; overflow: hidden;">
      <div style="padding: 24px 24px 16px; background: ${AVEYO_COLORS.action}; color: ${AVEYO_COLORS.actionText};">
        <img src="${safeLogoUrl}" alt="Aveyo logo" width="132" style="display:block;width:132px;max-width:100%;height:auto;margin:0 0 14px 0;" />
        <p style="margin:0 0 8px 0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;font-weight:700;opacity:0.9;">${escapeHtml(eyebrow)}</p>
        <h1 style="margin:0;font-size:24px;line-height:1.2;">${escapeHtml(heading)}</h1>
      </div>
      <div style="padding: 24px;">
        ${introHtml}
        ${bodyHtml}
        <p style="margin: 28px 0; text-align: center;">
          <a href="${safePortalUrl}" style="display: inline-block; padding: 12px 20px; background: ${AVEYO_COLORS.action}; color: ${AVEYO_COLORS.actionText}; text-decoration: none; border-radius: 10px; font-weight: 700;">
            ${escapeHtml(ctaLabel)}
          </a>
        </p>
        <p style="margin:0 0 8px 0;">If the button does not work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; font-size: 13px; color: ${AVEYO_COLORS.mutedText}; margin:0 0 20px 0;">
          <a href="${safePortalUrl}" style="color:${AVEYO_COLORS.accent};">${safePortalUrl}</a>
        </p>
        <div style="margin:0 0 18px 0;">
          <p style="margin:0 0 10px 0;font-size:13px;line-height:1.4;color:${AVEYO_COLORS.mutedText};font-weight:700;letter-spacing:0.02em;">
            HERE'S WHAT IT LOOKS LIKE
          </p>
          <img src="${safeImageSrc}" alt="Aveyo Customer Portal screenshot" width="512" style="display:block;width:100%;max-width:512px;height:auto;border:1px solid ${AVEYO_COLORS.border};border-radius:10px;" />
        </div>
        ${footerHtml}
      </div>
    </div>
  </body>
</html>`;
}

function paragraph(text) {
  return `<p style="margin:0 0 16px 0;font-size:16px;line-height:1.65;color:${AVEYO_COLORS.text};">${text}</p>`;
}

function getDefaultFooterContext() {
  return {
    recipientEmail: "{{email}}",
    unsubscribeUrl: "{{unsubscribe_url}}",
    preferencesUrl: "{{preferences_url}}",
    supportEmail: "customercare@aveyo.com",
    companyName: "Aveyo",
    companyAddress: "{{company_address}}",
    privacyPolicyUrl: "https://www.aveyo.com/privacy-policy"
  };
}

const EMAIL_SUBJECTS = {
  welcome: "WELCOME TO AVEYO & THE CUSTOMER PORTAL",
  updated: "LOGIN TO YOUR UPDATED CUSTOMER PORTAL"
};

function renderWelcomeEmailHtml({ portalUrl, imageSrc, footerContext }) {
  const introHtml = paragraph(
    "<strong>Going solar? In this economy? Good choice.</strong>"
  );

  const bodyHtml = [
    paragraph("We are pleased to have you."),
    paragraph(
      "This is a big day in your world. It marks the beginning of living more sustainably and gaining freedom from energy hikes and endless energy bills. We want to make this process as quick and easy as possible."
    ),
    paragraph("<strong>Easy begins with the Customer Portal.</strong>"),
    paragraph(
      "Inside, you will find everything you need to track your project status, see updates, and connect with support. You will also have access to Ava, our 24/7 chat agent for quick answers."
    ),
    paragraph(
      "<strong>Setting it up is simple:</strong> click the link below, enter the email associated with your Aveyo account, then click the login link sent to your inbox."
    ),
    `<p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:${AVEYO_COLORS.mutedText};"><strong>Portal highlights:</strong> dashboard, project updates, and support in one place.</p>`
  ].join("");

  return buildShell({
    eyebrow: "Aveyo Welcome Email",
    heading: "Welcome to Aveyo & the Customer Portal",
    introHtml,
    bodyHtml,
    imageSrc,
    ctaLabel: "Open Customer Portal",
    portalUrl,
    footerContext: {
      ...getDefaultFooterContext(),
      ...(footerContext || {})
    }
  });
}

function renderUpdatedPortalEmailHtml({ portalUrl, imageSrc, name, footerContext }) {
  const safeName = escapeHtml(name || "there");
  const introHtml = paragraph("<strong>We've updated our Customer Portal. Let's get you logged in.</strong>");
  const bodyHtml = [
    paragraph(`Hey ${safeName},`),
    paragraph(
      "We've updated our Customer Portal to make it even easier to navigate. The Portal is your one-stop-shop to see what's new with your solar project. Logging in is easy:"
    ),
    `<p style="margin:0 0 14px 0;font-size:14px;line-height:1.6;color:${AVEYO_COLORS.text};font-weight:700;text-transform:uppercase;letter-spacing:0.02em;">Enter the Customer Portal in 3 easy steps</p>`,
    `<ol style="margin:0 0 18px 20px;padding:0;color:${AVEYO_COLORS.text};font-size:15px;line-height:1.7;">
      <li>Follow the link below.</li>
      <li>Enter the same email address this message was sent to.</li>
      <li>A login link will be sent to your inbox. Click the link and you're in.</li>
    </ol>`,
    paragraph(
      "This Portal gives you access to your project, answers any questions, and instantly connects you with customer support agents. So, what are you waiting for?"
    ),
    `<p style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:${AVEYO_COLORS.text};font-weight:700;text-transform:uppercase;letter-spacing:0.02em;">Here's what you've been missing out on:</p>`,
    `<ul style="margin:0 0 16px 18px;padding:0;color:${AVEYO_COLORS.text};font-size:15px;line-height:1.7;">
      <li>Dashboard</li>
      <li>Updates</li>
      <li>And more</li>
    </ul>`,
    `<p style="margin:0 0 16px 0;font-size:16px;line-height:1.65;color:${AVEYO_COLORS.text};font-weight:700;text-transform:uppercase;">Login today for the best customer support in solar.</p>`
  ].join("");

  return buildShell({
    eyebrow: "Customer Portal Update",
    heading: "Login to Your Updated Customer Portal",
    introHtml,
    bodyHtml,
    imageSrc,
    ctaLabel: "Login to Customer Portal",
    portalUrl,
    footerContext: {
      ...getDefaultFooterContext(),
      ...(footerContext || {})
    }
  });
}

module.exports = {
  EMAIL_SUBJECTS,
  renderWelcomeEmailHtml,
  renderUpdatedPortalEmailHtml
};

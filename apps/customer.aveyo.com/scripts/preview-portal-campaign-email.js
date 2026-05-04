const { readFileSync, writeFileSync } = require("node:fs");
const { resolve } = require("node:path");

const {
  EMAIL_SUBJECTS,
  renderUpdatedPortalEmailHtml,
  renderWelcomeEmailHtml
} = require("./portal-email-template.js");

const portalUrl = process.env.PORTAL_URL || "https://customer.aveyo.com";
const previewName = process.env.PREVIEW_NAME || "Donny";
const screenshotPath =
  process.env.PORTAL_SCREENSHOT_PATH ||
  "/Users/vel/.cursor/projects/Users-vel-Documents-Aveyo-monoveyo/assets/custportal-4ec0aa81-59fc-4044-9b0a-542e46e83c4b.png";
const outputPath =
  process.env.EMAIL_PREVIEW_OUTPUT ||
  resolve(process.cwd(), "../../customer-portal-campaign-preview.html");
const previewRecipient = process.env.PREVIEW_RECIPIENT || "donny@aveyo.com";
const previewUnsubscribeUrl =
  process.env.PREVIEW_UNSUBSCRIBE_URL || "https://customer.aveyo.com/preferences/unsubscribe";
const previewPreferencesUrl =
  process.env.PREVIEW_PREFERENCES_URL || "https://customer.aveyo.com/preferences";
const previewCompanyAddress =
  process.env.PREVIEW_COMPANY_ADDRESS || "Aveyo, 3400 E Main St, St. Charles, IL 60174";
const previewSupportEmail = process.env.PREVIEW_SUPPORT_EMAIL || "customercare@aveyo.com";

const screenshotBuffer = readFileSync(screenshotPath);
const screenshotDataUri = `data:image/png;base64,${screenshotBuffer.toString("base64")}`;

const welcomeHtml = renderWelcomeEmailHtml({
  portalUrl,
  imageSrc: screenshotDataUri,
  footerContext: {
    recipientEmail: previewRecipient,
    unsubscribeUrl: previewUnsubscribeUrl,
    preferencesUrl: previewPreferencesUrl,
    supportEmail: previewSupportEmail,
    companyName: "Aveyo",
    companyAddress: previewCompanyAddress
  }
});

const updatedHtml = renderUpdatedPortalEmailHtml({
  portalUrl,
  imageSrc: screenshotDataUri,
  name: previewName,
  footerContext: {
    recipientEmail: previewRecipient,
    unsubscribeUrl: previewUnsubscribeUrl,
    preferencesUrl: previewPreferencesUrl,
    supportEmail: previewSupportEmail,
    companyName: "Aveyo",
    companyAddress: previewCompanyAddress
  }
});

const wrapper = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Aveyo Portal Campaign Preview</title>
    <style>
      :root { color-scheme: light; }
      body { margin: 0; padding: 24px; font-family: Arial, Helvetica, sans-serif; background: #edf1f6; color: #212120; }
      h1 { margin: 0 0 16px 0; font-size: 28px; }
      h2 { margin: 24px 0 8px 0; font-size: 18px; }
      p.meta { margin: 0; color: #4c4e4e; font-size: 14px; }
      iframe { width: 100%; height: 1120px; border: 1px solid #cfd8e3; border-radius: 10px; background: #fff; }
      .panel { max-width: 1100px; margin: 0 auto; }
    </style>
  </head>
  <body>
    <div class="panel">
      <h1>Aveyo Customer Email Preview</h1>
      <p class="meta">Generated locally only. Nothing has been sent.</p>
      <h2>${EMAIL_SUBJECTS.welcome}</h2>
      <iframe title="Welcome email preview" srcdoc='${welcomeHtml.replaceAll("'", "&apos;")}'></iframe>
      <h2>${EMAIL_SUBJECTS.updated}</h2>
      <iframe title="Updated portal email preview" srcdoc='${updatedHtml.replaceAll("'", "&apos;")}'></iframe>
    </div>
  </body>
</html>`;

writeFileSync(outputPath, wrapper, "utf8");
console.log(`Preview written to ${outputPath}`);

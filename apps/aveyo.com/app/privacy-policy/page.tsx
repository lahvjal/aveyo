import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/site/legal-document-page";
import { loadLegalContent } from "@/lib/legal/load-legal-content";

const LAST_UPDATED = "June 11, 2026";

export const metadata: Metadata = {
  title: "Privacy Policy | Aveyo Solar",
  description:
    "Learn how Aveyo Solar collects, uses, and protects personal information across our website, customer portal, and solar services."
};

export default function PrivacyPolicyPage() {
  const content = loadLegalContent("privacy-policy");

  return (
    <LegalDocumentPage
      eyebrow="Legal"
      title="Privacy Policy"
      description="How Aveyo collects, uses, shares, and protects personal information when you visit our website, use our customer portal, or work with us on a solar project."
      lastUpdated={LAST_UPDATED}
      content={content}
    />
  );
}

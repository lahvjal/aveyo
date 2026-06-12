import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/site/legal-document-page";
import { loadLegalContent } from "@/lib/legal/load-legal-content";

const LAST_UPDATED = "June 11, 2026";

export const metadata: Metadata = {
  title: "Terms of Service | Aveyo Solar",
  description:
    "Read the terms that govern your use of Aveyo Solar websites, digital tools, and online services."
};

export default function TermsOfServicePage() {
  const content = loadLegalContent("terms-of-service");

  return (
    <LegalDocumentPage
      eyebrow="Legal"
      title="Terms of Service"
      description="The rules and conditions for using Aveyo websites, digital tools, and online services."
      lastUpdated={LAST_UPDATED}
      content={content}
    />
  );
}

import Link from "next/link";
import MarkdownArticle from "@/components/site/markdown-article";
import { SiteHero, SitePageShell, SiteSection } from "@/components/site/page-kit";
import { CardGradientBorder } from "@/components/ui/card-gradient-border";
import {
  AVEYO_CUSTOMER_CARE_PHONE,
  AVEYO_CUSTOMER_CARE_PHONE_HREF,
  AVEYO_INFO_EMAIL,
  AVEYO_INFO_EMAIL_HREF
} from "@/lib/site-config";

export function LegalDocumentPage({
  eyebrow,
  title,
  description,
  lastUpdated,
  content
}: {
  eyebrow: string;
  title: string;
  description: string;
  lastUpdated: string;
  content: string;
}) {
  return (
    <SitePageShell
      cta={{
        eyebrow: "Questions?",
        title: "Need Help Understanding These Policies?\nTalk To Aveyo.",
        description:
          "Our team can answer questions about how we handle your information or what these terms mean for your project.",
        actionLabel: "Contact Aveyo",
        actionHref: "/contact"
      }}
    >
      <SiteHero
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={[
          { href: "/privacy-policy", label: "Privacy Policy", variant: "light" },
          { href: "/terms-of-service", label: "Terms of Service", variant: "outline" }
        ]}
      />

      <SiteSection tone="light">
        <article className="relative overflow-hidden rounded-[var(--site-radius-corner)] bg-white shadow-[0_24px_70px_rgba(10,22,40,0.08)]">
          <CardGradientBorder className="rounded-[var(--site-radius-corner)]" />
          <div className="relative z-[2] px-6 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
            <div className="border-b border-[color:var(--site-border-soft)] pb-6">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-[color:var(--site-text-muted-alt)]">
                Last updated {lastUpdated}
              </p>
              <p className="mt-4 max-w-[780px] text-[length:var(--site-body)] leading-[1.85] text-[color:var(--site-text-muted)]">
                If you have questions about this document, contact us at{" "}
                <a href={AVEYO_INFO_EMAIL_HREF} className="font-medium text-[color:var(--site-black)] underline-offset-4 hover:underline">
                  {AVEYO_INFO_EMAIL}
                </a>{" "}
                or{" "}
                <a
                  href={AVEYO_CUSTOMER_CARE_PHONE_HREF}
                  className="font-medium text-[color:var(--site-black)] underline-offset-4 hover:underline"
                >
                  {AVEYO_CUSTOMER_CARE_PHONE}
                </a>
                .
              </p>
            </div>

            <div className="pt-2">
              <MarkdownArticle content={content} />
            </div>

            <div className="mt-10 border-t border-[color:var(--site-border-soft)] pt-6 text-[length:var(--site-body)] text-[color:var(--site-text-muted)]">
              <p>
                Related documents:{" "}
                <Link href="/privacy-policy" className="font-medium text-[color:var(--site-black)] underline-offset-4 hover:underline">
                  Privacy Policy
                </Link>
                {" · "}
                <Link href="/terms-of-service" className="font-medium text-[color:var(--site-black)] underline-offset-4 hover:underline">
                  Terms of Service
                </Link>
              </p>
            </div>
          </div>
        </article>
      </SiteSection>
    </SitePageShell>
  );
}

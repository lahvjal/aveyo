import type { Metadata } from "next";
import ContactInquiryForms from "@/app/contact/contact-inquiry-forms";
import {
  SiteCard,
  SiteCardGrid,
  SiteFaq,
  SiteHero,
  SitePageShell,
  SiteSection
} from "@/components/site/page-kit";
import { CardGradientBorder } from "@/components/ui/card-gradient-border";
import {
  AVEYO_CUSTOMER_CARE_PHONE,
  AVEYO_CUSTOMER_CARE_PHONE_HREF,
  AVEYO_INFO_EMAIL,
  AVEYO_INFO_EMAIL_HREF,
  AVEYO_SALES_PHONE,
  AVEYO_SALES_PHONE_HREF
} from "@/lib/site-config";

const faqItems = [
  {
    question: "What are the benefits of going solar?",
    answer:
      "The biggest benefits usually come down to lower energy costs, protection from rising utility rates, and cleaner energy generation for the home."
  },
  {
    question: "How much is my solar system going to cost?",
    answer:
      "System cost depends on your home, usage, roof conditions, and the financing option that fits you best. A quote is the fastest way to get a real number."
  },
  {
    question: "How long does the install take?",
    answer:
      "From contract to activation, timing depends on design, permitting, utility coordination, and inspection cadence. Our process page shows the typical milestone flow."
  },
  {
    question: "Do I get tax incentives?",
    answer:
      "In many markets, yes. Federal and state programs can materially improve the economics of going solar, and our team can explain what may apply."
  }
];

export const metadata: Metadata = {
  title: "Contact Aveyo | Solar Support And Sales",
  description:
    "Reach Aveyo for sales questions, customer care, referrals, and general solar support."
};

export default function ContactPage() {
  return (
    <SitePageShell
      cta={{
        eyebrow: "Need A Quote?",
        title: "Talk Through The Right Next Step.\nWe Will Help You Get Started.",
        description: "Whether you are researching solar or ready for a quote, our team can help you move forward clearly.",
        actionLabel: "Talk To Sales",
        actionHref: "#sales-form"
      }}
    >
      <SiteHero
        eyebrow="Contact Aveyo"
        title="Need To Get In Touch?"
        description="Whether you are ready for a quote, need customer care, or just want to ask a question, we will point you to the right team."
        actions={[
          { href: "#sales-form", label: "Talk To Sales", variant: "light" },
          { href: AVEYO_CUSTOMER_CARE_PHONE_HREF, label: "Call Customer Care", variant: "outline" }
        ]}
        stats={[
          { value: AVEYO_SALES_PHONE, label: "Sales" },
          { value: AVEYO_CUSTOMER_CARE_PHONE, label: "Customer Care" },
          { value: AVEYO_INFO_EMAIL, label: "Email" }
        ]}
      />

      <SiteSection
        eyebrow="Contact Options"
        title="Choose The Fastest Path To The Right Team"
        description="Different questions need different routes. These options make it easier to get to the right conversation quickly."
      >
        <SiteCardGrid columns={4}>
          <SiteCard
            title="Sales"
            description="Speak to a Solar Educator for a quote, pricing, or help deciding whether solar is right for your home."
            footer={
              <a href="#sales-form" className="text-[length:var(--site-body)] font-bold text-[#0A1628] text-[color:var(--site-black)]">
                Talk To Sales
              </a>
            }
          />
          <SiteCard
            title="Get More Info"
            description="Not ready for a quote yet? Send a message and we will help answer questions about process, timing, or system fit."
            footer={
              <a href="#team-form" className="text-[length:var(--site-body)] font-bold text-[#0A1628] text-[color:var(--site-black)]">
                Message Our Team
              </a>
            }
          />
          <SiteCard
            title="Call Customer Care"
            description="Need to speak with a representative about an active project or an existing customer need? Call customer care directly."
            footer={
              <a
                href={AVEYO_CUSTOMER_CARE_PHONE_HREF}
                className="text-[length:var(--site-body)] font-bold text-[#0A1628] text-[color:var(--site-black)]"
              >
                {AVEYO_CUSTOMER_CARE_PHONE}
              </a>
            }
          />
          <SiteCard
            title="Refer A Friend"
            description="Want to send someone our way? Start with a quick referral email and our team will take it from there."
            footer={
              <a
                href={`${AVEYO_INFO_EMAIL_HREF}?subject=${encodeURIComponent("Aveyo Referral")}`}
                className="text-[length:var(--site-body)] font-bold text-[#0A1628] text-[color:var(--site-black)]"
              >
                Refer A Friend
              </a>
            }
          />
        </SiteCardGrid>
      </SiteSection>

      <SiteSection
        eyebrow="FAQ"
        title="Have Questions About Solar?"
        description="A few quick answers to the questions we hear most often."
        tone="cream"
      >
        <SiteFaq items={faqItems} />
      </SiteSection>

      <SiteSection
        eyebrow="Contact Forms"
        title="Send The Right Team A Message"
        description="These forms are a quick way to generate a message to Aveyo without needing a separate portal or account."
      >
        <ContactInquiryForms />
      </SiteSection>

      <SiteSection
        eyebrow="Industry Partners"
        title="Powered By Strong Operational Partnerships"
        description="Aveyo works across sales, install, engineering, roofing, and activation disciplines so customers get a more coordinated experience."
        tone="navy"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {["Sales", "Engineering", "Roofing", "Installation"].map((item) => (
            <div
              key={item}
              className="relative overflow-hidden rounded-[var(--site-radius-corner)] bg-white/[0.05] p-[var(--site-card-padding-tight)] text-center text-[length:var(--site-body-large)] font-semibold text-white"
            >
              <CardGradientBorder className="rounded-[var(--site-radius-corner)]" />
              <div className="relative z-[2]">{item}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-4 text-[length:var(--site-body)] text-white/72">
          <a href={AVEYO_SALES_PHONE_HREF}>{AVEYO_SALES_PHONE}</a>
          <span aria-hidden>•</span>
          <a href={AVEYO_CUSTOMER_CARE_PHONE_HREF}>{AVEYO_CUSTOMER_CARE_PHONE}</a>
          <span aria-hidden>•</span>
          <a href={AVEYO_INFO_EMAIL_HREF}>{AVEYO_INFO_EMAIL}</a>
        </div>
      </SiteSection>
    </SitePageShell>
  );
}

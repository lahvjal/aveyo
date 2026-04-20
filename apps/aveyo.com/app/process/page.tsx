import type { Metadata } from "next";
import Testimonials from "@/components/Testimonials";
import {
  SiteCard,
  SiteCardGrid,
  SiteHero,
  SitePageShell,
  SiteSection,
  SiteSplitSection
} from "@/components/site/page-kit";
import { CardGradientBorder } from "@/components/ui/card-gradient-border";
import { getCustomerPortalUrl } from "@/lib/site-config";

const steps = [
  {
    label: "01",
    title: "Site Survey",
    description:
      "We inspect the roof, attic, electrical infrastructure, and shading to confirm your home is ready for solar."
  },
  {
    label: "02",
    title: "CAD / Engineering",
    description:
      "The system is designed for strong yield, cleaner aesthetics, and the right balance of offset and cost."
  },
  {
    label: "03",
    title: "Permits Sent / Approved",
    description: "We manage the city paperwork and keep the approval process moving."
  },
  {
    label: "04",
    title: "The Install",
    description: "Most installs take one to two days depending on system size and site conditions."
  },
  {
    label: "05",
    title: "The Inspection",
    description: "An inspector confirms the system is installed correctly and ready for the next step."
  },
  {
    label: "06",
    title: "Net Meter Installation",
    description:
      "Your meter setup is finalized so production and home energy usage can be measured correctly."
  },
  {
    label: "07",
    title: "Activation",
    description: "Once everything clears, it is time to turn the system on and start the offset."
  }
];

const supportFeatures = [
  "Account manager",
  "Customer service access",
  "Your install app",
  "Constant communication"
];

export const metadata: Metadata = {
  title: "Our Process | Aveyo",
  description:
    "See the seven-step Aveyo solar process, from site survey through activation, with transparent communication throughout."
};

export default function ProcessPage() {
  return (
    <SitePageShell
      cta={{
        eyebrow: "Start Your Project",
        title: "Find A Plan That Is Right For You.\nSee What You Can Save.",
        description: "Ready to move forward? Start with a conversation and we will map out the next step clearly.",
        actionLabel: "Pick A Plan",
        actionHref: "/contact#sales-form"
      }}
    >
      <SiteHero
        eyebrow="How It Works"
        title={
          <>
            The Smoothest Install
            <br />
            In The Industry
          </>
        }
        description="Full transparency creates a better experience. Our process is designed so you always know what happens next and who is owning it."
        actions={[
          { href: "/contact#sales-form", label: "Talk To Sales", variant: "light" },
          { href: getCustomerPortalUrl(), label: "Portal Login", variant: "outline" }
        ]}
        stats={[
          { value: "07", label: "Steps To Solar Savings" },
          { value: "1-2", label: "Typical Install Days" },
          { value: "Always", label: "Transparent Communication" }
        ]}
      />

      <SiteSection
        eyebrow="07 Steps"
        title={
          <>
            Here Is What
            <br />
            The Process Looks Like
          </>
        }
        description="The point of a better process is not just speed. It is reducing confusion, surfacing progress clearly, and making the handoff from one stage to the next feel seamless."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {steps.map((step) => (
            <SiteCard
              key={step.label}
              eyebrow={step.label}
              title={step.title}
              description={step.description}
            />
          ))}
        </div>
      </SiteSection>

      <SiteSplitSection
        eyebrow="Customer Portal"
        title={
          <>
            A Portal To Track
            <br />
            Your Install
          </>
        }
        description="You will receive access to a portal that makes the progress of your system easier to follow in real time."
        tone="cream"
        body={
          <>
            <p>
              Too many solar projects feel opaque after the contract is signed. We built the Aveyo process to
              keep customers informed instead of guessing.
            </p>
            <p>
              Your portal gives you one place to track progress, understand what stage is active, and know what
              comes next.
            </p>
          </>
        }
        visual={
          <SiteCard
            eyebrow="Portal Access"
            title="See milestone progress without wondering who to call."
            description="Track status, stay aligned with the next milestone, and keep the project grounded in clear expectations."
            footer={
              <div className="pt-2">
                <a
                  href={getCustomerPortalUrl()}
                  className="inline-flex items-center justify-center rounded-full rounded-[var(--site-button-radius)] bg-[#212120] bg-[color:var(--site-black)] px-[var(--site-button-px)] py-[var(--site-button-py)] text-[length:var(--site-button-text)] font-bold text-white transition-opacity hover:opacity-90"
                >
                  Portal Login
                </a>
              </div>
            }
          />
        }
      />

      <SiteSection
        eyebrow="Dedicated Team"
        title={
          <>
            A Dedicated Team,
            <br />
            All The Way Through
          </>
        }
        description="Too many companies leave customers out of the loop after the sale. Aveyo is structured to keep communication active from design through activation."
        tone="navy"
      >
        <div className="relative overflow-hidden rounded-[var(--site-radius-corner)] bg-white/[0.04] p-[var(--site-card-padding-compact)]">
          <CardGradientBorder className="rounded-[var(--site-radius-corner)]" />
          <div className="relative z-[2] grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {supportFeatures.map((feature) => (
              <div
                key={feature}
                className="relative overflow-hidden rounded-[var(--site-radius-corner)] bg-white/[0.05] p-[var(--site-card-padding-tight)] text-[length:var(--site-body-large)] font-semibold text-white"
              >
                <CardGradientBorder className="rounded-[var(--site-radius-corner)]" />
                <div className="relative z-[2]">{feature}</div>
              </div>
            ))}
          </div>
        </div>
      </SiteSection>

      <Testimonials />
    </SitePageShell>
  );
}

import type { Metadata } from "next";
import {
  SiteCard,
  SiteCardGrid,
  SiteHero,
  SitePageShell,
  SiteSplitSection,
  SiteSection
} from "@/components/site/page-kit";
import { CardGradientBorder } from "@/components/ui/card-gradient-border";

const timelineItems = [
  {
    label: "Early 2022",
    description:
      "Leaders from across the solar industry came together around one idea: build a better solar company by combining trusted expertise, proven processes, and hard-earned relationships."
  },
  {
    label: "2023",
    description:
      "Aveyo officially launched with a clear mission to raise the bar for what the residential solar experience should feel like."
  },
  {
    label: "Since 2023",
    description:
      "Every team, design choice, and process improvement has been focused on transparency, smoother installs, and stronger savings for homeowners."
  }
];

const integrationFunctions = [
  "Sales",
  "Install",
  "CAD / Engineering",
  "Survey",
  "Net Metering",
  "Roofing",
  "Activation",
  "Marketing"
];

export const metadata: Metadata = {
  title: "About Aveyo | Solar As It Should Be",
  description:
    "Learn how Aveyo was built to create a smoother, more transparent solar experience from first conversation to final activation."
};

export default function AboutPage() {
  return (
    <SitePageShell
      cta={{
        eyebrow: "Get Started",
        title: "Find A Plan That Is Right For You.\nSee What Solar Can Save.",
        description: "Let our team walk you through options built around your home, your goals, and your budget.",
        actionLabel: "Pick A Plan",
        actionHref: "/contact#sales-form"
      }}
    >
      <SiteHero
        eyebrow="The Aveyo Story"
        title={
          <>
            Welcome To
            <br />
            Solar As It Should Be.
          </>
        }
        description="Aveyo was established with one goal in mind: to give customers a better solar experience."
        actions={[
          { href: "/why-solar", label: "Why Solar", variant: "light" },
          { href: "/process", label: "See Our Process", variant: "outline" }
        ]}
        stats={[
          { value: "2023", label: "Established" },
          { value: "8", label: "Integrated Functions" },
          { value: "1", label: "Customer-First Mission" }
        ]}
        visual={
          <div className="grid gap-4">
            <div className="relative overflow-hidden rounded-[var(--site-radius-corner)] bg-white/[0.07] p-[var(--site-card-padding-comfortable)] backdrop-blur-[12px]">
              <CardGradientBorder className="rounded-[var(--site-radius-corner)]" />
              <div className="relative z-[2]">
                <p className="text-sm text-[length:var(--site-paragraph)] font-bold uppercase tracking-[0.28em] text-white/60">
                  Mission
                </p>
                <p className="mt-4 text-[length:var(--site-h4)] leading-[1.05] tracking-[-0.03em]">
                  Better service. Better savings. A smoother solar journey from start to finish.
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="relative overflow-hidden rounded-[var(--site-radius-corner)] bg-[#10223b] bg-[color:var(--site-navy-soft)] p-[var(--site-card-padding-compact)]">
                <CardGradientBorder className="rounded-[var(--site-radius-corner)]" />
                <div className="relative z-[2]">
                  <p className="text-[length:var(--site-paragraph)] uppercase tracking-[0.24em] text-white/55">
                    Built By Operators
                  </p>
                  <p className="mt-3 text-[length:var(--site-body-large)] leading-[1.6] text-white/80">
                    Aveyo was formed by experienced teams who knew homeowners deserved a better experience.
                  </p>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-[var(--site-radius-corner)] bg-[#10223b] bg-[color:var(--site-navy-soft)] p-[var(--site-card-padding-compact)]">
                <CardGradientBorder className="rounded-[var(--site-radius-corner)]" />
                <div className="relative z-[2]">
                  <p className="text-[length:var(--site-paragraph)] uppercase tracking-[0.24em] text-white/55">
                    Built For Clarity
                  </p>
                  <p className="mt-3 text-[length:var(--site-body-large)] leading-[1.6] text-white/80">
                    Transparent communication and accountable execution sit at the center of every install.
                  </p>
                </div>
              </div>
            </div>
          </div>
        }
      />

      <SiteSection
        eyebrow="Timeline"
        title={
          <>
            Built To Change
            <br />
            The Solar Experience
          </>
        }
        description="Aveyo came together because the industry needed a more transparent, more accountable way to bring solar to homeowners."
      >
        <SiteCardGrid>
          {timelineItems.map((item) => (
            <SiteCard
              key={item.label}
              eyebrow={item.label}
              title={item.label}
              description={item.description}
            />
          ))}
        </SiteCardGrid>
      </SiteSection>

      <SiteSplitSection
        eyebrow="Industry-Leading Partnerships"
        title={
          <>
            Expertise From
            <br />
            Every Angle
          </>
        }
        description="We are an amalgamation of solar and install companies that wanted to do better by the customer."
        body={
          <>
            <p>
              By bringing multiple disciplines together under one roof, Aveyo can move faster, communicate
              more clearly, and hold every stage of the process to a higher standard.
            </p>
            <p>
              That structure is what lets us deliver a cleaner handoff from sales to design to install, with
              fewer surprises along the way.
            </p>
          </>
        }
        tone="cream"
        visual={
          <div className="grid gap-4">
            <SiteCard
              eyebrow="What Our Partnerships Create"
              title="A tighter feedback loop from the first call to final activation."
              description="Cross-functional teams can solve issues early, align on expectations, and keep the homeowner experience consistent."
            />
            <SiteCardGrid columns={2}>
              <SiteCard
                title="Seamless Coordination"
                description="Sales, design, roofing, install, and activation can move in sync instead of in silos."
              />
              <SiteCard
                title="Shared Accountability"
                description="When one team owns the experience end-to-end, quality control becomes clearer and stronger."
              />
            </SiteCardGrid>
          </div>
        }
      />

      <SiteSection
        eyebrow="Vertically Integrated"
        title={
          <>
            We Control The Details
            <br />
            So You Feel The Difference
          </>
        }
        description="At Aveyo, vertical integration means we manage every stage of the process instead of handing customers from vendor to vendor."
        tone="navy"
      >
        <div className="relative overflow-hidden rounded-[var(--site-radius-corner)] bg-white/[0.04] p-[var(--site-card-padding-compact)] shadow-[0_20px_60px_rgba(0,0,0,0.16)]">
          <CardGradientBorder className="rounded-[var(--site-radius-corner)]" />
          <div className="relative z-[2] grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {integrationFunctions.map((item) => (
              <div
                key={item}
                className="relative overflow-hidden rounded-[var(--site-radius-corner)] bg-white/[0.04] p-[var(--site-card-padding-tight)] text-[length:var(--site-body-large)] font-semibold text-white"
              >
                <CardGradientBorder className="rounded-[var(--site-radius-corner)]" />
                <div className="relative z-[2]">{item}</div>
              </div>
            ))}
          </div>
          <p className="relative z-[2] mt-6 max-w-[820px] text-[length:var(--site-body)] leading-[1.8] text-white/74">
            No middlemen, no broken handoffs, and no confusion about who owns the next step. That structure
            keeps projects moving with more efficiency, accountability, and quality at every stage.
          </p>
        </div>
      </SiteSection>
    </SitePageShell>
  );
}

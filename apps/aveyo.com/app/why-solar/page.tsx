import type { Metadata } from "next";
import type { CSSProperties } from "react";
import SolarSavingsEstimator from "@/components/site/solar-savings-estimator";
import {
  SiteCard,
  SiteCardGrid,
  SiteHero,
  SitePageShell,
  SiteSection,
  SiteSplitSection
} from "@/components/site/page-kit";
import { CardGradientBorder } from "@/components/ui/card-gradient-border";
import { sitePageStyleVars } from "@/lib/site-page-design-system";

const whySolarStyleVars = {
  ...sitePageStyleVars,
  "--site-navy": "var(--site-black)",
  "--site-navy-soft": "var(--site-black)",
  "--site-surface-light-top": "var(--site-white)",
  "--site-surface-light-bottom": "var(--site-gray-light-5)",
  "--site-hero-overlay": "linear-gradient(135deg, rgba(0, 0, 0, 0.22) 0%, rgba(33, 33, 32, 0.12) 100%)",
  "--site-radius-field": "var(--site-radius-corner)"
} as CSSProperties;

const benefits = [
  {
    title: "Generate Your Own Power At A Lower Cost",
    description:
      "Producing more of your own power can reduce reliance on the grid and bring long-term energy spend into a more controlled range."
  },
  {
    title: "Store Power For The Moments You Need It",
    description:
      "Battery-ready system planning helps create more flexibility and resilience when usage spikes or conditions shift."
  },
  {
    title: "Leverage Sustainability",
    description:
      "Solar lets your home create cleaner energy without the same fossil-fuel intensity as traditional generation."
  }
];

export const metadata: Metadata = {
  title: "Why Solar | Aveyo",
  description:
    "See how solar can lower costs, support energy independence, and improve the long-term performance of your home energy system."
};

export default function WhySolarPage() {
  return (
    <SitePageShell
      style={whySolarStyleVars}
      cta={{
        eyebrow: "Explore Your Savings",
        title: "Find A Plan That Is Right For You.\nSee What You Can Save.",
        description: "Let us map out the solar plan that fits your usage, your home, and your long-term goals.",
        actionLabel: "Pick A Plan",
        actionHref: "/contact#sales-form"
      }}
    >
      <SiteHero
        eyebrow="Why Solar"
        title={
          <>
            The Smartest Way
            <br />
            To Power Your Home
          </>
        }
        description="Aveyo makes going solar simple. Sustainability comes standard, and the savings become easier to understand when the system is designed around your real usage."
        actions={[
          { href: "/contact#sales-form", label: "Pick A Plan", variant: "light" },
          { href: "/process", label: "How It Works", variant: "outline" }
        ]}
        spotlight="radial-gradient(circle at top right, rgba(255, 255, 255, 0.08), transparent 45%)"
        stats={[
          { value: "50", label: "States Covered By Calculator" },
          { value: "3", label: "Core Solar Benefits" },
          { value: "1", label: "Customized System Per Home" }
        ]}
        visual={
          <div className="relative overflow-hidden rounded-[var(--site-radius-corner)] bg-white/[0.06] p-[var(--site-card-padding-comfortable)] shadow-[0_28px_80px_rgba(0,0,0,0.24)] backdrop-blur-[12px]">
            <CardGradientBorder className="rounded-[var(--site-radius-corner)]" />
            <div className="relative z-[2]">
              <p className="text-sm text-[length:var(--site-paragraph)] font-bold uppercase tracking-[0.28em] text-white/60">
                What Better Design Means
              </p>
              <div className="mt-6 grid gap-4">
                {["Optimize sunlight", "Maximize conversion", "Design for real household usage"].map((item) => (
                  <div
                    key={item}
                    className="relative overflow-hidden rounded-[var(--site-radius-corner)] bg-[#10223b] bg-[color:var(--site-navy-soft)] p-[var(--site-card-padding-tight)] text-[length:var(--site-body)] font-semibold"
                  >
                    <CardGradientBorder className="rounded-[var(--site-radius-corner)]" />
                    <div className="relative z-[2]">{item}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        }
      />

      <SiteSection
        eyebrow="Savings Calculator"
        title="A Realistic Look At What Solar Can Change"
        description="Use the example calculator to see how state-level energy pricing and your current bill can change the size and value of a system."
      >
        <SolarSavingsEstimator />
      </SiteSection>

      <SiteSplitSection
        eyebrow="System Design"
        title={
          <>
            High-End System Design.
            <br />
            Customized For You.
          </>
        }
        description="Better-built systems start with better design inputs. We shape each recommendation around roof conditions, energy use, and long-term performance."
        tone="cream"
        body={
          <>
            <p>
              Strong system design is about more than simply adding panels. It is about balancing production,
              aesthetics, electrical fit, and long-term value.
            </p>
            <p>
              Aveyo uses that design process to help homeowners move toward better offset and cleaner project
              economics without unnecessary complexity.
            </p>
          </>
        }
        visual={
          <SiteCardGrid columns={2}>
            <SiteCard
              title="Optimize Sunlight"
              description="Panel placement, roof geometry, and shade behavior all matter when designing for real performance."
            />
            <SiteCard
              title="Maximize Conversion"
              description="System architecture is chosen to help the home capture more usable value from the sunlight available."
            />
          </SiteCardGrid>
        }
      />

      <SiteSection
        eyebrow="Benefits"
        title="Three Reasons Homeowners Start With Solar"
        description="The decision usually comes down to a mix of economics, resilience, and long-term sustainability."
        tone="navy"
      >
        <SiteCardGrid columns={3}>
          {benefits.map((benefit) => (
            <SiteCard key={benefit.title} title={benefit.title} description={benefit.description} tone="dark" />
          ))}
        </SiteCardGrid>
      </SiteSection>

      <SiteSplitSection
        eyebrow="Panels"
        title={
          <>
            High-End Panels
            <br />
            For High-End Conversion
          </>
        }
        description="The panel conversation is not just about hardware. It is about durability, output quality, and how the system works together over time."
        body={
          <>
            <p>
              We focus on components that support long-term efficiency, strong production, and a clean finished
              result on the home.
            </p>
            <p>That includes attention to conversion quality, overall reliability, and the total system design.</p>
          </>
        }
        visual={
          <SiteCard
            eyebrow="Panel Priorities"
            title="Built around quality components and better long-term performance."
            description="US-made options, high-end photovoltaics, and a stronger design standard all help shape a system that feels better from day one."
          />
        }
      />
    </SitePageShell>
  );
}

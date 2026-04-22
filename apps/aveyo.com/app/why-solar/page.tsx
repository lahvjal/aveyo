import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Image from "next/image";
import {
  SiteCard,
  SiteCardGrid,
  SiteHero,
  SiteImageRow,
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
        backgroundSrc="/images/web_photos/whysolarHero.jpg"
        backgroundAlt="Modern home with dark solar panels on roof, golden hour, lush landscaping"
      />

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
        footer={
          <SiteImageRow
            images={[
              {
                src: "/images/web_photos/WhySolar_01_Hero-Solar-Home-Exterior_Drone.jpg",
                alt: "Aerial view of suburban home with solar panels on roof, bright sunny day"
              },
              { 
                src: "/images/web_photos/whysolarImage.jpg",
                alt: "Family in bright modern kitchen, morning light, casual and relaxed" 
              }
            ]}
          />
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
          <div className="relative h-[400px] overflow-hidden rounded-[var(--site-radius-corner)]">
            <Image
              src="/images/web_photos/WhySolar_02_System-Design-CloseUp.jpg"
              alt="Close-up of black monocrystalline solar panels in clean grid pattern on roof, overhead angle"
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
          </div>
        }
      />
    </SitePageShell>
  );
}

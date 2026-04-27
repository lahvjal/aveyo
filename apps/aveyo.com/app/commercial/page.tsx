import type { Metadata } from "next";
import {
  SiteCard,
  SiteCardGrid,
  SiteFaq,
  SiteHero,
  SiteImageBreak,
  SitePageShell,
  SiteSection,
  SiteSplitSection
} from "@/components/site/page-kit";
import { SiteButtonLink } from "@/components/site/site-button-link";
import { CardGradientBorder } from "@/components/ui/card-gradient-border";

const commercialBenefits = [
  {
    title: "Cost Savings",
    description:
      "Many customers reduce electric utility costs by 60% to 90%, creating room to reinvest those monthly savings back into the business."
  },
  {
    title: "Tax Incentives",
    description:
      "Federal, state, and local incentives can materially improve project economics. Our advisors help identify what applies in your market."
  },
  {
    title: "Energy Independence",
    description:
      "A commercial solar strategy can reduce exposure to utility volatility and create more predictable long-term operating costs."
  },
  {
    title: "Sustainability Goals",
    description:
      "Solar supports ESG and sustainability targets while aligning energy strategy with long-term brand and operating priorities."
  }
];

const processSteps = [
  "Site Assessment",
  "Design & Engineering",
  "Permitting & Incentives",
  "Installation",
  "Monitoring & Maintenance"
];

const systemTypes = [
  {
    title: "Rooftop Systems",
    description: "Turn underused roof space into a long-term energy asset without expanding your footprint."
  },
  {
    title: "Ground-Mounted Arrays",
    description: "A strong fit for larger sites with open land that can support higher production capacity."
  },
  {
    title: "Solar Carports & Canopies",
    description: "Create shade for customers and employees while generating power above valuable parking areas."
  },
  {
    title: "Parking Lot Solar",
    description: "Convert parking infrastructure into distributed on-site generation for high-usage facilities."
  }
];

const financingOptions = [
  "Federal ITC",
  "Accelerated Depreciation (MACRS)",
  "State & Local Incentives",
  "Ownership (CapEx)",
  "Lease",
  "Power Purchase Agreement (PPA)"
];

const faqItems = [
  {
    question: "What are the benefits of going solar?",
    answer:
      "Commercial solar can lower operating costs, reduce exposure to utility rate hikes, and support sustainability commitments with measurable production data."
  },
  {
    question: "How much will a commercial solar system cost?",
    answer:
      "System cost depends on available space, site conditions, energy usage, and the financing structure you choose. The best first step is a tailored evaluation."
  },
  {
    question: "How long does installation take?",
    answer:
      "Timelines vary by system size, permitting, and utility coordination, but our process is structured to keep planning, approvals, and installation moving cleanly."
  },
  {
    question: "Do commercial projects qualify for incentives?",
    answer:
      "In many cases, yes. Federal tax credits, depreciation, and state-specific programs can all improve project economics."
  }
];

export const metadata: Metadata = {
  title: "Commercial Solar | Aveyo",
  description:
    "Reduce operating costs and strengthen long-term energy strategy with a commercial solar solution designed around your facility."
};

export default function CommercialPage() {
  return (
    <SitePageShell
      cta={{
        eyebrow: "Commercial Evaluation",
        title: "Ready To Power Your Business With Solar?",
        description: "Request a custom evaluation and see how a commercial solar strategy could impact your bottom line.",
        actionLabel: "Request Evaluation",
        actionHref: "/contact#sales-form"
      }}
    >
      <SiteHero
        eyebrow="Commercial Solar"
        title={
          <>
            Power Your Business
            <br />
            With Solar Energy
          </>
        }
        description="Reduce energy costs, strengthen your bottom line, and move toward long-term sustainability goals with a commercial system built around your facility."
        actions={[
          { href: "/contact#sales-form", label: "Request Evaluation", variant: "light" },
          { href: "/process", label: "Learn How It Works", variant: "outline" }
        ]}
        backgroundSrc="/images/web_photos/commercialHero.png"
        backgroundAlt="A commercial building with solar panels on the roof"
      />

      <SiteSection
        eyebrow="Why Go Solar"
        title={
          <>
            Commercial Benefits
            <br />
            That Compound Over Time
          </>
        }
        description="A commercial project is not just about lowering bills today. It is about creating a more durable, more predictable energy strategy."
      >
        <SiteCardGrid columns={4}>
          {commercialBenefits.map((item) => (
            <SiteCard key={item.title} title={item.title} description={item.description} />
          ))}
        </SiteCardGrid>
      </SiteSection>

      <SiteImageBreak
        images={[
          { src: "/images/web_photos/Commercial_02_Ground-Mounted-Array_ALT.jpg", alt: "Ground-mounted solar array on open grassland, afternoon light, dramatic sky" }
        ]}
      />

      <SiteSection
        eyebrow="How It Works"
        title="A Clear Process From Assessment To Long-Term Performance"
        description="Each project moves through a sequence built to reduce friction and keep planning, approvals, and installation aligned."
        tone="cream"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {processSteps.map((step, index) => (
            <div
              key={step}
              className="relative overflow-hidden rounded-[var(--site-radius-corner)] bg-white p-[var(--site-card-padding-compact)] shadow-[0_18px_44px_rgba(10,22,40,0.08)]"
            >
              <CardGradientBorder className="rounded-[var(--site-radius-corner)]" />
              <div className="relative z-[2]">
                <p className="text-sm text-[length:var(--site-paragraph)] font-bold uppercase tracking-[0.28em] text-[#6b7280] text-[color:var(--site-text-muted-alt)]">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-4 text-[length:var(--site-body-large)] leading-[1.2] text-[#212120] text-[color:var(--site-black)]">
                  {step}
                </h3>
              </div>
            </div>
          ))}
        </div>
      </SiteSection>

      {/* <SiteSplitSection
        eyebrow="System Types"
        title={
          <>
            Four Ways To Match
            <br />
            Solar To Your Property
          </>
        }
        description="Commercial sites vary widely, so we shape the system strategy around your footprint, energy profile, and operating reality."
        visual={
          <SiteCardGrid columns={2}>
            <SiteCard
              title={systemTypes[0].title}
              description={systemTypes[0].description}
              imageSrc="/images/web_photos/Commercial_01_Rooftop-System-Commercial-Building.jpeg"
              imageAlt="Commercial flat roof with rows of solar panels"
            />
            <SiteCard
              title={systemTypes[1].title}
              description={systemTypes[1].description}
              imageSrc="/images/web_photos/Commercial_02_Ground-Mounted-Array.jpg"
              imageAlt="Large ground-mounted solar array on grassland"
            />
            <SiteCard
              title={systemTypes[2].title}
              description={systemTypes[2].description}
            />
            <SiteCard
              title={systemTypes[3].title}
              description={systemTypes[3].description}
            />
          </SiteCardGrid>
        }
        body={
          <>
            <p>
              Rooftop, ground-mount, carport, and parking-lot systems each solve a different operational
              problem. The right answer depends on the site and the goals.
            </p>
            <p>
              Our evaluation process helps determine the strongest mix of production, constructability, and
              return for your business.
            </p>
          </>
        }
      /> */}

      {/* <SiteSection
        eyebrow="Our Work"
        title="Installed In Partnership With Sola United"
        description="A strong commercial install depends on real coordination across design, permitting, build quality, and long-term support."
      >
        <SiteCardGrid>
          <SiteCard
            title="Gaslamp Restaurant"
            description="Designed to maximize available roof area while minimizing disruption to ongoing operations."
            imageSrc="/images/web_photos/Commercial_05_Our-Work-Gallery-1-Warehouse-Install.jpeg"
            imageAlt="Solar installers on commercial flat roof positioning panels in long rows"
          />
          <SiteCard
            title="Escondido Church"
            description="Full rooftop coverage configured for high production and long-term performance."
            imageSrc="/images/web_photos/Commercial_06_Our-Work-Gallery-2-Completed-Building.jpeg"
            imageAlt="Completed commercial rooftop solar installation on church building"
          />
        </SiteCardGrid>
      </SiteSection> */}

      {/* <SiteSection
        eyebrow="Financing"
        title="Flexible Financing & Incentives"
        description="Commercial solar should match the way your business evaluates capital, tax strategy, and long-term energy spend."
        tone="navy"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {financingOptions.map((item) => (
            <div
              key={item}
              className="relative overflow-hidden rounded-[var(--site-radius-corner)] bg-white/[0.05] p-[var(--site-card-padding-tight)] text-[length:var(--site-body-large)] font-semibold text-white"
            >
              <CardGradientBorder className="rounded-[var(--site-radius-corner)]" />
              <div className="relative z-[2]">{item}</div>
            </div>
          ))}
        </div>
      </SiteSection> */}

      {/* <SiteSection
        eyebrow="Project Fit"
        title="Example Commercial Use Cases"
        description="Different facilities need different solar strategies. These sample use cases show the types of projects we can evaluate."
        tone="cream"
      >
        <SiteCardGrid>
          {[
            "Retail center with large daytime load",
            "Industrial site with available roof area",
            "Office campus focused on ESG progress",
            "Parking-heavy property suited for canopies",
            "Multi-building site needing phased rollout"
          ].map((item) => (
            <SiteCard
              key={item}
              title={item}
              description="Request a tailored evaluation to see how solar could fit your site, usage profile, and investment goals."
              footer={
                <SiteButtonLink href="/contact#sales-form" variant="ghost">
                  View Project Fit
                </SiteButtonLink>
              }
            />
          ))}
        </SiteCardGrid>
      </SiteSection>

      <SiteSection
        eyebrow="Long-Term Support"
        title="Monitoring, Maintenance & Guarantees"
        description="Performance does not stop at commissioning. We plan around visibility, maintenance, and long-term accountability."
      >
        <SiteCardGrid columns={3}>
          <SiteCard
            title="Real-Time Monitoring"
            description="Track production and system performance with ongoing visibility into how the project is operating."
          />
          <SiteCard
            title="Proactive Maintenance"
            description="Keep the system working efficiently with a support model designed for long-term uptime."
          />
          <SiteCard
            title="Performance Confidence"
            description="Every install is backed by structured workmanship, equipment, and production support considerations."
          />
        </SiteCardGrid>
      </SiteSection>

      <SiteSection
        eyebrow="FAQ"
        title="Have Questions About Commercial Solar?"
        description="A few of the most common questions we hear from business owners and operators."
        tone="navy"
      >
        <SiteFaq items={faqItems} tone="navy" />
      </SiteSection> */}
    </SitePageShell>
  );
}

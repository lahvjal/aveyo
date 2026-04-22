import type { Metadata } from "next";
import {
  SiteHero,
  SiteImageBreak,
  SitePageShell,
  SiteSection
} from "@/components/site/page-kit";
import { CardGradientBorder } from "@/components/ui/card-gradient-border";

const timelineItems = [
  {
    label: "Early 2022",
    description:
      "Leaders, from all over the solar industry, came together to make this lofty goal a reality. It was decided they would combine their well-established, well-respected companies to form a better solar company. Seamlessly integrating their expertise, processes, and relationships to create something the solar world desperately needed."
  },
  {
    label: "2023",
    description:
      "Aveyo was officially established, and we've been running forward ever since. The mission became a company, and the better-customer-experience vision had a name."
  },
  {
    label: "Since 2023",
    description:
      "We've dedicated our efforts, designs, and energy to providing our customers with a transparent, smooth experience so they can save bigger and live brighter. Ultimately, we hope to help you power more of what matters most."
  }
];

export const metadata: Metadata = {
  title: "About Aveyo | Solar As It Should Be",
  description:
    "Learn how Aveyo was built to create a smoother, more transparent solar experience from first conversation to final activation."
};

function StoryTimelineDocument() {
  return (
    <article className="relative overflow-hidden rounded-[var(--site-radius-corner)] bg-gradient-to-b from-[#fcfbf8] to-white shadow-[0_24px_70px_rgba(10,22,40,0.08)]">
      <CardGradientBorder className="rounded-[var(--site-radius-corner)]" />
      <div className="relative z-[2] px-6 py-7 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
        <div className="border-b border-[color:var(--site-border-soft)] pb-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[color:var(--site-text-muted-alt)]">
                Aveyo Story Archive
              </p>
              <h3 className="mt-3 text-[length:var(--site-h5)] leading-[1.05] tracking-[-0.02em] text-[color:var(--site-black)]">
                A Brief Documented Timeline
              </h3>
            </div>
            <div className="grid gap-1 text-sm text-[color:var(--site-text-muted)]">
              <span>Document type: Company history</span>
              <span>Prepared for prospective homeowners</span>
            </div>
          </div>

          <p className="mt-6 max-w-[780px] text-[length:var(--site-body)] leading-[1.85] text-[color:var(--site-text-muted)]">
            Aveyo was built around a simple idea: homeowners deserve a cleaner, more transparent solar
            experience. The timeline below reads like a company record, tracing how that idea became a
            business and then a mission we continue to refine.
          </p>
        </div>

        <div className="divide-y divide-[color:var(--site-border-soft)]">
          {timelineItems.map((item, index) => (
            <section
              key={item.label}
              className="grid gap-4 py-6 md:grid-cols-[180px_minmax(0,1fr)] md:gap-8 lg:py-7"
            >
              <div className="md:pt-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[color:var(--site-text-muted-alt)]">
                  Section {String(index + 1).padStart(2, "0")}
                </p>
                <h4 className="mt-2 text-[length:var(--site-h7)] font-extrabold uppercase tracking-[0.08em] text-[color:var(--site-black)]">
                  {item.label}
                </h4>
              </div>

              <div className="space-y-4 text-[length:var(--site-body)] leading-[1.9] text-[color:var(--site-text-muted)]">
                <p>{item.description}</p>
              </div>
            </section>
          ))}
        </div>

        <div className="border-t border-[color:var(--site-border-soft)] pt-6">
          <p className="text-sm uppercase tracking-[0.22em] text-[color:var(--site-text-muted-alt)]">
            Solar As It Should Be
          </p>
        </div>
      </div>
    </article>
  );
}

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
        backgroundSrc="/images/web_photos/aveyobuilding.jpg"
        backgroundAlt="Aveyo team members standing together outdoors, blue sky, natural light"
      />

      <SiteSection
        eyebrow="The Aveyo Story"
        title={
          <>
            Est. 2023
            <br />
            Timeline
          </>
        }
        description={
          <>
            <p>Aveyo was established with one goal in mind: to give customers a better solar experience.</p>
          </>
        }
      >
        <div className="divide-y divide-[color:var(--site-border-soft)]">
          {timelineItems.map((item, index) => (
            <section
              key={item.label}
              className="grid gap-4 py-6 md:grid-cols-[180px_minmax(0,1fr)] md:gap-8 lg:py-7"
            >
              <div className="md:pt-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[color:var(--site-text-muted-alt)]">
                  Section {String(index + 1).padStart(2, "0")}
                </p>
                <h4 className="mt-2 text-[length:var(--site-h7)] font-extrabold uppercase tracking-[0.08em] text-[color:var(--site-black)]">
                  {item.label}
                </h4>
              </div>

              <div className="space-y-4 text-[length:var(--site-body)] leading-[1.9] text-[color:var(--site-text-muted)]">
                <p>{item.description}</p>
              </div>
            </section>
          ))}
        </div>
      </SiteSection>

      <SiteImageBreak
        images={[
          {
            src: "/images/web_photos/Newsfeed_03_CEO-Lobby-Backdrop.jpg",
            alt: "Aveyo office lobby with brand logo, modern reception desk, and seating area",
            objectPosition: "left center"
          },
          {
            src: "/images/web_photos/roofsolarinstall.png",
            alt: "Solar installation crew on residential rooftop mid-install, four workers with different tasks, sunny day"
          }
        ]}
      />

      {/* <SiteSplitSection
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
      /> */}

      {/* <SiteSection
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
      </SiteSection> */}
    </SitePageShell>
  );
}

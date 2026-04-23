import Image from "next/image";
import type { Metadata } from "next";
import Testimonials from "@/components/Testimonials";
import {
  SiteHero,
  SiteImageBreak,
  SitePageShell,
  SiteSection,
  SiteSplitSection
} from "@/components/site/page-kit";
import { CardGradientBorder } from "@/components/ui/card-gradient-border";
import { getCustomerPortalUrl } from "@/lib/site-config";

type PortalMilestone = { title: string; description: string };

type PortalStage = {
  eyebrow: string;
  title: string;
  summary: string;
  milestones: PortalMilestone[];
};

/** Stage names and milestone order match the customer portal (`sectionDisplayNames` + `milestoneUtils`). */
const portalStages: PortalStage[] = [
  {
    eyebrow: "01",
    title: "Pre-Approvals",
    summary:
      "We validate your home, secure financing clearance, and finish engineering before permits and construction ramp up.",
    milestones: [
      {
        title: "Site Survey",
        description:
          "We inspect the roof, attic, electrical infrastructure, and shading so your home is confirmed ready for solar."
      },
      {
        title: "Notice to Proceed approved by financing",
        description:
          "Financing clears the project to proceed so engineering, permitting, and scheduling can move forward on time."
      },
      {
        title: "Engineering",
        description:
          "CAD, structural and electrical engineering, and your planset are completed and aligned with your signed agreement."
      }
    ]
  },
  {
    eyebrow: "02",
    title: "Approvals",
    summary: "We shepherd city and utility paperwork so interconnection and program requirements are satisfied before install.",
    milestones: [
      {
        title: "All city and utility approvals submitted",
        description:
          "Permit packages and utility paperwork are submitted and tracked until program and jurisdiction requirements are met."
      }
    ]
  },
  {
    eyebrow: "03",
    title: "Construction",
    summary: "Scheduling, installation, and inspections so your system is built correctly and cleared for energization.",
    milestones: [
      {
        title: "Confirmed Install Appointment Date",
        description:
          "Your installation date is set and communicated so you know when the crew will be on site."
      },
      {
        title: "Install Substantial Completion",
        description:
          "The installation crew finishes the work and equipment is in place on your home, ready for inspections."
      },
      {
        title: "City and/or Utility Inspections",
        description:
          "Jurisdiction and/or utility inspections verify the system meets code and interconnection rules before energization."
      }
    ]
  },
  {
    eyebrow: "04",
    title: "Activation",
    summary: "Final utility permission and turn-on—the same finish line you see in your portal when the system is live.",
    milestones: [
      {
        title: "Permission To Operate Received from Utility Company",
        description:
          "The utility issues PTO so your system can be energized and export to the grid safely and compliantly."
      },
      {
        title: "System Active and Producing",
        description:
          "Your system is turned on and producing so you can start using clean power at home with ongoing support."
      }
    ]
  }
];

const supportFeatures = [
  "Account manager",
  "Customer service access",
  "Customer portal & Ava assistance",
  "Constant communication"
];

export const metadata: Metadata = {
  title: "Our Process | Aveyo",
  description:
    "Four project stages—Pre-Approvals, Approvals, Construction, and Activation—with the same milestones you track in the customer portal."
};

function ProcessTimeline() {
  return (
    <article className="relative overflow-hidden rounded-[var(--site-radius-corner)]">
      <CardGradientBorder className="rounded-[var(--site-radius-corner)]" />
      <div className="relative z-[2] px-6 py-7 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
        <div className="pb-6">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[color:var(--site-text-muted-alt)]">
            Project Roadmap
          </p>
        </div>

        <div className="mt-8 space-y-6 lg:space-y-8">
          {portalStages.map((stage) => (
            <section
              key={stage.title}
              className="relative overflow-hidden rounded-[var(--site-radius-corner)]"
            >
              <div className="grid gap-0 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
                <div className="relative px-6 py-6 lg:px-7 lg:py-7">
                  <div className="relative pl-12">
                    <div className="absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-full bg-[#0A1628] text-sm font-extrabold text-white">
                      {stage.eyebrow}
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[color:var(--site-text-muted-alt)]">
                      Stage {stage.eyebrow}
                    </p>
                    <h4 className="mt-2 text-[length:var(--site-h5)] leading-[1.08] tracking-[-0.02em] text-[color:var(--site-black)]">
                      {stage.title}
                    </h4>
                    <p className="mt-4 text-[length:var(--site-body)] leading-[1.8] text-[color:var(--site-text-muted)]">
                      {stage.summary}
                    </p>
                  </div>
                </div>

                <ol
                  className="space-y-0 px-6 py-4 sm:px-7 sm:py-5"
                  aria-label={`${stage.title} milestones`}
                >
                  {stage.milestones.map((milestone, milestoneIndex) => {
                    const isLastMilestone = milestoneIndex === stage.milestones.length - 1;

                    return (
                      <li
                        key={milestone.title}
                        className={`relative pl-12 ${isLastMilestone ? "pb-0 pt-3" : "pb-5 pt-3"}`}
                      >
                        {!isLastMilestone ? (
                          <div
                            className="absolute bottom-0 left-[11px] top-9 w-px bg-[color:var(--site-border-soft)]"
                            aria-hidden
                          />
                        ) : null}
                        <div
                          className="absolute left-0 top-5 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[color:var(--site-gray-light-4)] text-[11px] font-bold text-[color:var(--site-black)]"
                          aria-hidden
                        >
                          {milestoneIndex + 1}
                        </div>
                        <div className="rounded-[calc(var(--site-radius-corner)-8px)] px-5 py-4">
                          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--site-text-muted-alt)]">
                            Milestone {milestoneIndex + 1}
                          </p>
                          <h5 className="mt-2 text-[length:var(--site-h7)] font-extrabold leading-snug text-[color:var(--site-black)]">
                            {milestone.title}
                          </h5>
                          <p className="mt-2 text-[length:var(--site-body)] leading-[1.75] text-[color:var(--site-text-muted)]">
                            {milestone.description}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </section>
          ))}
        </div>
      </div>
    </article>
  );
}

export default function ProcessPage() {
  return (
    <SitePageShell
      cta={{
        eyebrow: "Start Your Project",
        title: "Find A Plan That Is Right For You.\nSee What You Can Save.",
        description: "Ready to move forward? Start with a conversation and we will map out the next step clearly.",
        actionLabel: "Pick A Plan",
        actionHref: "/#pricing"
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
        backgroundSrc="/images/web_photos/WhySolar_02_System-Design-CloseUp_ALT5.jpg"
        backgroundAlt="Residential rooftop with large solar panel array at dusk, warm interior lights visible through windows"
      />

      <SiteSection
        eyebrow="Four Stages"
        title={
          <>
            Here Is What
            <br />
            The Process Looks Like
          </>
        }
        description="Each stage groups the milestones you see in the Aveyo customer portal, in the same order—from Pre-Approvals through Activation."
      >
        <ProcessTimeline />
      </SiteSection>

      <SiteImageBreak
        images={[
          { src: "/images/web_photos/WhySolar_02_System-Design-CloseUp_ALT3.jpg", alt: "Residential rooftop with solar panels beside stone chimney, golden hour light" }
        ]}
      />

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
          <div className="relative h-[400px] overflow-hidden rounded-[var(--site-radius-corner)] shadow-[0_20px_60px_rgba(10,22,40,0.12)]">
            <Image
              src="/images/web_photos/customerPortal.png"
              alt="Man viewing the Aveyo customer portal on a laptop at a kitchen table"
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
          </div>
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

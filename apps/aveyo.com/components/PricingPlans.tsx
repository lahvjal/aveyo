"use client";

import { ReactNode, useState } from "react";

type PlanId = "lease" | "own";

type Stat = {
  value: ReactNode;
  label: string;
  accent?: boolean;
  secondaryValue?: ReactNode;
  showArrow?: boolean;
  isWord?: boolean;
  labelTop?: string;
};

type PlanConfig = {
  tabTag: string;
  tabTitle: string;
  tabSub: string;
  heroLabel: string;
  heroTitle: ReactNode;
  heroDescription: string;
  heroBg: string;
  heroDescriptionColor: string;
  tabActiveBg: string;
  tabActiveAccent: string;
  statAccent: string;
  dotColor: string;
  buttonColor: string;
  stats: Stat[];
  included: string[];
  notable: string[];
  bestFor: string;
};

const planConfig: Record<PlanId, PlanConfig> = {
  lease: {
    tabTag: "Option A",
    tabTitle: "Lease / PPA",
    tabSub: "No money down",
    heroLabel: "Lease / PPA",
    heroTitle: (
      <>
        No money
        <br />
        down.
      </>
    ),
    heroDescription:
      "Low monthly payment. Zero maintenance. Savings start immediately.",
    heroBg: "#0d1f36",
    heroDescriptionColor: "rgba(133, 183, 235, 0.7)",
    tabActiveBg: "#0d1f36",
    tabActiveAccent: "#85B7EB",
    statAccent: "#378ADD",
    dotColor: "#378ADD",
    buttonColor: "#185FA5",
    stats: [
      {
        value: (
          <>
            15<sup className="text-[0.5em] align-super">%</sup>
          </>
        ),
        label: "Low monthly payment",
      },
      {
        value: "$0",
        label: "Down payment",
        accent: true,
      },
      {
        value: (
          <>
            1.99<sup className="text-[0.5em] align-super">%</sup>
          </>
        ),
        showArrow: true,
        secondaryValue: (
          <>
            3.99<sup className="text-[0.55em] align-super">%</sup>
          </>
        ),
        label: "Annual escalator range",
        accent: true,
      },
      {
        value: "25",
        label: "Year term",
      },
    ],
    included: [
      "Eliminates most or all of your utility bill",
      "$0 maintenance, forever",
      "Workmanship + manufacturer warranties",
    ],
    notable: [
      "Batteries available for a small add-on",
      "Easily transferable when you sell",
      "25-year term with full coverage",
    ],
    bestFor:
      "Best for homeowners who want instant savings with zero upfront cost.",
  },
  own: {
    tabTag: "Option B",
    tabTitle: "Buy & Own",
    tabSub: "Maximum savings",
    heroLabel: "Buy & Own",
    heroTitle: (
      <>
        Maximum
        <br />
        savings.
      </>
    ),
    heroDescription:
      "Own your power. Increase your home value. Highest lifetime ROI.",
    heroBg: "#0f200e",
    heroDescriptionColor: "rgba(151, 196, 89, 0.7)",
    tabActiveBg: "#0f200e",
    tabActiveAccent: "#97C459",
    statAccent: "#639922",
    dotColor: "#639922",
    buttonColor: "#3B6D11",
    stats: [
      {
        value: (
          <>
            Upfront
            <br />
            cost
          </>
        ),
        label: "Pay in full or finance",
        isWord: true,
        labelTop: "8px",
      },
      {
        value: (
          <>
            Loan
            <br />
            payment
          </>
        ),
        label: "Fixed monthly if financed",
        isWord: true,
        labelTop: "8px",
      },
      {
        value: (
          <>
            4<sup className="text-[0.5em] align-super">%</sup>
          </>
        ),
        showArrow: true,
        secondaryValue: (
          <>
            7<sup className="text-[0.55em] align-super">%</sup>
          </>
        ),
        label: "Increases home value",
        accent: true,
      },
      {
        value: (
          <>
            30<sup className="text-[0.5em] align-super">+</sup>
          </>
        ),
        label: "Year lifespan",
      },
    ],
    included: [
      "Eliminates most or all of your utility bill",
      "25-yr warranty, 30+ yr lifespan",
      "No transfer process needed at home sale",
    ],
    notable: [
      "Batteries optional",
      "Highest lifetime ROI of any plan",
      "Full ownership - no contracts",
    ],
    bestFor:
      "Best for long-term homeowners who want maximum savings and full ownership.",
  },
};

export default function PricingPlans() {
  const [activePlan, setActivePlan] = useState<PlanId>("lease");
  const currentPlan = planConfig[activePlan];

  return (
    <section id="pricing" className="bg-white px-5 py-20 font-telegraf md:py-24">
      <div className="mx-auto w-full max-w-[820px]">
        <p className="mb-[10px] text-center text-[11px] uppercase tracking-[0.18em] text-[#9a9a94]">
          Solar financing
        </p>

        <h2 className="mb-10 text-center text-[clamp(2rem,5vw,3rem)] font-regular leading-[1.15] text-[#1a1a18]">
          Find a plan that
          <br />
          <em className="text-[#5a5a56]">works for you</em>
        </h2>

        {/* Plan selector */}
        <div
          className="mx-auto mb-10 flex max-w-[560px] overflow-hidden rounded-[14px] border border-black/[0.18]"
          style={{ borderWidth: "0.5px" }}
        >
          <button
            type="button"
            onClick={() => setActivePlan("lease")}
            className="flex-1 px-5 py-4 text-left transition-colors duration-200"
            style={{
              background: activePlan === "lease" ? planConfig.lease.tabActiveBg : "#ffffff",
            }}
          >
            <p
              className="mb-[3px] text-[10px] uppercase tracking-[0.1em]"
              style={{
                color:
                  activePlan === "lease" ? planConfig.lease.tabActiveAccent : "#9a9a94",
              }}
            >
              {planConfig.lease.tabTag}
            </p>
            <p
              className="text-[1.1rem] font-regular"
              style={{ color: activePlan === "lease" ? "#ffffff" : "#5a5a56" }}
            >
              {planConfig.lease.tabTitle}
            </p>
            <p
              className="mt-[2px] text-[12px]"
              style={{
                color:
                  activePlan === "lease" ? planConfig.lease.tabActiveAccent : "#9a9a94",
              }}
            >
              {planConfig.lease.tabSub}
            </p>
          </button>

          <div className="shrink-0 bg-black/[0.18]" style={{ width: "0.5px" }} />

          <button
            type="button"
            onClick={() => setActivePlan("own")}
            className="flex-1 px-5 py-4 text-left transition-colors duration-200"
            style={{
              background: activePlan === "own" ? planConfig.own.tabActiveBg : "#ffffff",
            }}
          >
            <p
              className="mb-[3px] text-[10px] uppercase tracking-[0.1em]"
              style={{
                color: activePlan === "own" ? planConfig.own.tabActiveAccent : "#9a9a94",
              }}
            >
              {planConfig.own.tabTag}
            </p>
            <p
              className="text-[1.1rem] font-regular"
              style={{ color: activePlan === "own" ? "#ffffff" : "#5a5a56" }}
            >
              {planConfig.own.tabTitle}
            </p>
            <p
              className="mt-[2px] text-[12px]"
              style={{
                color: activePlan === "own" ? planConfig.own.tabActiveAccent : "#9a9a94",
              }}
            >
              {planConfig.own.tabSub}
            </p>
          </button>
        </div>

        {/* Main panel */}
        <div
          className="overflow-hidden rounded-[20px] border border-black/10"
          style={{ borderWidth: "0.5px" }}
        >
          {/* Hero + stats */}
          <div className="grid grid-cols-1 min-[561px]:grid-cols-2">
            <div
              className="flex min-h-[220px] flex-col justify-end px-7 py-8"
              style={{ background: currentPlan.heroBg }}
            >
              <p
                className="mb-[6px] text-[10px] uppercase tracking-[0.15em]"
                style={{ color: currentPlan.tabActiveAccent }}
              >
                {currentPlan.heroLabel}
              </p>
              <h3 className="mb-2 text-[1.85rem] font-regular leading-[1.2] text-white">
                {currentPlan.heroTitle}
              </h3>
              <p
                className="text-[13px] leading-[1.6]"
                style={{ color: currentPlan.heroDescriptionColor }}
              >
                {currentPlan.heroDescription}
              </p>
            </div>

            <div
              className="grid grid-cols-2 border-t border-black/10 min-[561px]:border-l min-[561px]:border-t-0"
              style={{ borderWidth: "0.5px" }}
            >
              {currentPlan.stats.map((stat, index) => {
                const isSecondColumn = index % 2 === 1;
                const isBottomRow = index >= 2;

                return (
                  <div
                    key={`${activePlan}-stat-${index}`}
                    className="px-5 py-5"
                    style={{
                      borderRightWidth: isSecondColumn ? "0px" : "0.5px",
                      borderBottomWidth: isBottomRow ? "0px" : "0.5px",
                      borderStyle: "solid",
                      borderColor: "rgba(0, 0, 0, 0.1)",
                    }}
                  >
                    <p
                      className={`${
                        stat.isWord
                          ? "pt-1 text-base font-light leading-[1.3]"
                          : "text-[1.6rem] font-light leading-none"
                      } text-[#1a1a18]`}
                    >
                      {stat.value}
                    </p>
                    {stat.showArrow ? (
                      <p className="my-[2px] text-[11px] text-[#9a9a94]">↓</p>
                    ) : null}
                    {stat.secondaryValue ? (
                      <p className="text-[1.1rem] font-light text-[#1a1a18]">
                        {stat.secondaryValue}
                      </p>
                    ) : null}
                    <p
                      className="text-[11px] leading-[1.4]"
                      style={{
                        marginTop: stat.labelTop ?? "5px",
                        color: stat.accent ? currentPlan.statAccent : "#9a9a94",
                      }}
                    >
                      {stat.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Features */}
          <div
            className="bg-[#f5f5f3] px-7 py-6"
            style={{
              borderTop: "0.5px solid rgba(0, 0, 0, 0.1)",
            }}
          >
            <div className="grid grid-cols-1 gap-6 min-[461px]:grid-cols-2">
              <div>
                <p className="mb-3 text-[10px] uppercase tracking-[0.12em] text-[#9a9a94]">
                  Included
                </p>
                <div className="flex flex-col gap-2">
                  {currentPlan.included.map((item) => (
                    <div key={item} className="flex items-start gap-[9px] text-[13px] leading-[1.4] text-[#5a5a56]">
                      <span
                        className="mt-[5px] h-[5px] w-[5px] shrink-0 rounded-full"
                        style={{ backgroundColor: currentPlan.dotColor }}
                      />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-[10px] uppercase tracking-[0.12em] text-[#9a9a94]">
                  Also notable
                </p>
                <div className="flex flex-col gap-2">
                  {currentPlan.notable.map((item) => (
                    <div key={item} className="flex items-start gap-[9px] text-[13px] leading-[1.4] text-[#5a5a56]">
                      <span
                        className="mt-[5px] h-[5px] w-[5px] shrink-0 rounded-full"
                        style={{ backgroundColor: currentPlan.dotColor }}
                      />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div
            className="flex flex-wrap items-center justify-between gap-4 bg-white px-7 py-5"
            style={{
              borderTop: "0.5px solid rgba(0, 0, 0, 0.1)",
            }}
          >
            <p className="max-w-[380px] text-[13px] italic leading-[1.55] text-[#9a9a94]">
              {currentPlan.bestFor}
            </p>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                className="rounded-[8px] border border-black/[0.18] bg-transparent px-4 py-[10px] text-[13px] text-[#5a5a56] transition-colors hover:bg-[#f5f5f3]"
              >
                Learn more
              </button>
              <button
                type="button"
                className="rounded-[8px] px-5 py-[10px] text-[13px] font-medium text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: currentPlan.buttonColor }}
              >
                Check eligibility →
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


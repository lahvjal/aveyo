"use client";

import Link from "next/link";
import { homepageStyleVars } from "@/lib/homepage-design-system";
import { AVEYO_PLAN_OPTIONS, buildPlansFormHref } from "@/lib/plans-lead";

interface PricingPlansProps {
  currentQueryString?: string;
  originPath?: string;
  pageSlug?: string;
  offerName?: string;
}

function buildReturnToHref(originPath: string, currentQueryString: string) {
  const normalizedOriginPath =
    originPath.startsWith("/") && !originPath.startsWith("//") ? originPath : "/";
  const normalizedQueryString = currentQueryString.replace(/^\?/, "");
  const queryString = normalizedQueryString ? `?${normalizedQueryString}` : "";

  return `${normalizedOriginPath}${queryString}#pricing`;
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3 text-[color:var(--home-gray-dark-4)]">
          <span className="mt-[7px] inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[color:var(--home-black)] text-[9px] font-bold leading-none text-white">
            ✓
          </span>
          <span className="text-[length:var(--home-h6)] leading-[1.42]">
            {item}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function PricingPlans({
  currentQueryString = "",
  originPath = "/",
  pageSlug,
  offerName
}: PricingPlansProps) {
  return (
    <section
      id="pricing"
      className="bg-[color:var(--home-white)] px-5 py-20 font-telegraf md:py-28"
      style={homepageStyleVars}
    >
      <div className="mx-auto w-full max-w-[1240px]">
        <div className="mx-auto mb-12 max-w-[720px] text-center md:mb-14">
          <h2 className="text-[clamp(2.2rem,6vw,4.375rem)] leading-[0.98] text-[color:var(--home-black)]">
            Find A Plan That
            <br />
            Works For You
          </h2>
          <p className="mt-5 text-[length:var(--home-text-large)] leading-[1.4] text-[color:var(--home-gray-dark-4)] md:text-[length:var(--home-h5)]">
            Choose from our most popular options:
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-[30px]">
          {AVEYO_PLAN_OPTIONS.map((plan) => {
            const planHref = buildPlansFormHref({
              currentQueryString,
              selectedPlanId: plan.id,
              selectedPlanName: plan.title,
              pageSlug,
              offerName,
              returnTo: buildReturnToHref(originPath, currentQueryString)
            });

            return (
              <article
                key={plan.id}
                className="flex h-full flex-col justify-between rounded-[var(--home-card-radius)] bg-gradient-to-b from-[#f4faff] to-[#d8d8d8] px-6 py-8 md:p-[var(--home-card-padding)]"
              >
                <div>
                  {plan.badge ? (
                    <span className="mb-7 inline-flex items-center justify-center rounded-[30px] bg-[#70beff] px-5 py-2.5 text-[length:var(--home-h7)] font-semibold text-[color:var(--home-black)]">
                      {plan.badge}
                    </span>
                  ) : (
                    <div className="mb-4 md:mb-[80px]" />
                  )}

                  <h3 className="text-[42px] leading-[0.95] text-[color:var(--home-black)] md:text-[length:var(--home-h3)]">
                    {plan.title}
                  </h3>
                  <p className="mt-4 text-[length:var(--home-text-large)] leading-[1.5] text-[color:var(--home-gray-dark-4)] md:text-[length:var(--home-h5)]">
                    {plan.subtitle}
                  </p>

                  <div className="mt-8">
                    <h4 className="text-[length:var(--home-h5)] leading-[1.15] text-[color:var(--home-black)]">
                      Benefits
                    </h4>
                    <div className="mt-4">
                      <BulletList items={plan.benefits} />
                    </div>
                  </div>

                  <div className="mt-7">
                    <h4 className="text-[length:var(--home-h5)] leading-[1.15] text-[color:var(--home-black)]">
                      Also Notable
                    </h4>
                    <div className="mt-4">
                      <BulletList items={plan.notable} />
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap gap-2.5">
                  <Link
                    href={planHref}
                    className="rounded-[var(--home-button-radius)] bg-[color:var(--home-black)] px-[var(--home-button-px)] py-[var(--home-button-py)] text-[length:var(--home-h7)] font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    Check Eligibility →
                  </Link>
                  <Link
                    href={planHref}
                    className="rounded-[var(--home-button-radius)] bg-[color:var(--home-white)] px-[var(--home-button-px)] py-[var(--home-button-py)] text-[length:var(--home-h7)] font-semibold text-[color:var(--home-black)] transition-colors hover:bg-[#f2f2f2]"
                  >
                    Learn More →
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}


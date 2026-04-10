"use client";

type FinancingPlan = {
  badge?: string;
  title: string;
  subtitle: string;
  benefits: string[];
  notable: string[];
};

const plans: FinancingPlan[] = [
  {
    badge: "Most Popular",
    title: "Aveyo Subscription Plan",
    subtitle: "Leasing Solar Panels",
    benefits: [
      "Reduces Or Eliminates Most Of Your Utility Bill (Refer To Your Install Agreement)",
      "25 Years Of Warranties And Insurance Included *",
      "System Transfers With Sale Of Home To New Owner",
    ],
    notable: [
      "Batteries Available Upon Request",
      "Must Pass Initial Site Inspection By Aveyo",
    ],
  },
  {
    title: "Solar Panels Ownership",
    subtitle: "Purchasing Solar Panels",
    benefits: [
      "Reduces Or Eliminates Most Of Your Utility Bill",
      "10-Yr Battery, Roof Warranty.",
      "No Transfer Process Needed At Home Sale",
    ],
    notable: [
      "Batteries Optional",
      "Highest Lifetime ROI Of Any Plan",
      "Full Ownership",
      "We Also Offer Financing Options",
      "Increases Home Value",
    ],
  },
];

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3 text-[#4c4e4e]">
          <span className="mt-[7px] inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#212120] text-[9px] font-bold leading-none text-white">
            ✓
          </span>
          <span className="text-[18px] leading-[1.42] md:text-[24px]">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function PricingPlans() {
  return (
    <section id="pricing" className="bg-white px-5 py-20 font-telegraf md:py-28">
      <div className="mx-auto w-full max-w-[1240px]">
        <div className="mx-auto mb-12 max-w-[720px] text-center md:mb-14">
          <h2 className="text-[clamp(2.2rem,6vw,4.375rem)] leading-[0.98] text-[#212120]">
            Find A Plan That
            <br />
            Works For You
          </h2>
          <p className="mt-5 text-[20px] leading-[1.4] text-[#4c4e4e] md:text-[24px]">
            Choose from our most popular options:
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-[30px]">
          {plans.map((plan) => (
            <article
              key={plan.title}
              className="flex h-full flex-col justify-between rounded-[10px] bg-gradient-to-b from-[#f4faff] to-[#d8d8d8] px-6 py-8 md:px-10 md:pb-12 md:pt-10"
            >
              <div>
                {plan.badge ? (
                  <span className="mb-7 inline-flex items-center justify-center rounded-[30px] bg-[#70beff] px-5 py-2.5 text-[20px] text-[#212120] md:text-[24px]">
                    {plan.badge}
                  </span>
                ) : (
                  <div className="mb-4 md:mb-[80px]" />
                )}

                <h3 className="text-[clamp(2.25rem,4.2vw,3.25rem)] leading-[0.95] text-[#212120]">
                  {plan.title}
                </h3>
                <p className="mt-4 text-[20px] leading-[1.5] text-[#4c4e4e] md:text-[24px]">
                  {plan.subtitle}
                </p>

                <div className="mt-8">
                  <h4 className="text-[35px] leading-[1.15] text-[#212120]">Benefits</h4>
                  <div className="mt-4">
                    <BulletList items={plan.benefits} />
                  </div>
                </div>

                <div className="mt-7">
                  <h4 className="text-[35px] leading-[1.15] text-[#212120]">Also Notable</h4>
                  <div className="mt-4">
                    <BulletList items={plan.notable} />
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-2.5">
                <button
                  type="button"
                  className="rounded-[60px] bg-[#212120] px-5 py-3 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Check Eligibility →
                </button>
                <button
                  type="button"
                  className="rounded-[60px] bg-white px-5 py-3 text-[13px] font-semibold text-[#212120] transition-colors hover:bg-[#f2f2f2]"
                >
                  Learn More →
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}


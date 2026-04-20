import { homepageStyleVars } from "@/lib/homepage-design-system";
import type { ReactNode } from "react";

export type MisconceptionItem = {
  title: string;
  description: string;
};

const ICONS: ReactNode[] = [
  <svg key="battery" className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="3.5" y="8" width="14" height="8" rx="1.5" strokeWidth={1.7} />
    <rect x="18.5" y="10" width="2" height="4" rx="0.6" strokeWidth={1.7} />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M6 12h4" />
  </svg>,
  <svg key="money" className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="3" y="7" width="18" height="10" rx="2" strokeWidth={1.7} />
    <circle cx="12" cy="12" r="2.2" strokeWidth={1.7} />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M6.5 10h0.01M17.5 14h0.01" />
  </svg>,
  <svg key="transfer" className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="8" cy="9" r="2.5" strokeWidth={1.7} />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M3.5 17c1.1-2.2 3-3.3 4.5-3.3 1.6 0 3.5 1.1 4.6 3.3" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M14 8h7m0 0-2.8-2.8M21 8l-2.8 2.8" />
  </svg>,
];

const DEFAULT_MYTHS: MisconceptionItem[] = [
  {
    title: "It Doesn't Really Work",
    description: "Oh, but it does. In fact, the energy your roof produces will offset the energy your home uses.",
  },
  {
    title: "It's Expensive",
    description: "Most of the time, you can go solar without any up-front costs. After that, your payment is less than your current energy bill.",
  },
  {
    title: "It's Non-Transferable",
    description: "Transferring your solar loan is easier than you could ever imagine. In fact, it transfers as naturally as your home loan.",
  },
];

export default function Misconceptions({ myths: mythsProp }: { myths?: MisconceptionItem[] }) {
  const myths = mythsProp ?? DEFAULT_MYTHS;

  return (
    <section
      className="bg-[color:var(--home-white)] px-5 pb-[160px] pt-[20px]"
      style={homepageStyleVars}
    >
      <div
        className="mx-auto w-full max-w-[1880px] overflow-hidden rounded-[var(--home-card-radius)] px-[70px] py-20 sm:px-10 sm:py-24 lg:py-[160px]"
        style={{
          background:
            "radial-gradient(65.78% 62.03% at 50% 0%, rgba(244, 244, 244, 0.20) 0%, rgba(142, 142, 142, 0.00) 100%), radial-gradient(67.23% 23.5% at 50% 108.93%, rgba(107, 146, 188, 0.40) 0%, rgba(33, 33, 32, 0.40) 100%), #212120",
        }}
      >
        <div className="flex flex-col items-center text-center">
          <p
            className="mb-[-14px] bg-clip-text text-[96px] font-light leading-none text-transparent sm:text-[130px] lg:mb-[-40px] lg:text-[170px]"
            style={{ backgroundImage: "linear-gradient(rgb(255, 255, 255) 0%, rgb(153 153 153 / 10%) 70%)" }}
          >
            3
          </p>
          <h2 className="mt-[-30px] text-[length:var(--home-h4)] capitalize leading-[1.3] text-white">
            Common Misconceptions
            <br />
            About Going Solar
          </h2>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-[70px] md:grid-cols-3 lg:gap-[70px] lg:mt-[140px]">
          {myths.map((myth, index) => (
            <div key={index} className="flex flex-col items-center gap-9 text-center text-white">
              <div className="flex h-12 w-12 items-center justify-center">{ICONS[index % ICONS.length]}</div>
              <div className="flex flex-col items-center gap-6 lg:gap-10">
                <h3 className="whitespace-pre-line text-[length:var(--home-h4)] capitalize leading-[1.15]">
                  {myth.title}
                </h3>
                <p className="text-[length:var(--home-h7)] leading-[1.5] text-white/95">
                  {myth.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


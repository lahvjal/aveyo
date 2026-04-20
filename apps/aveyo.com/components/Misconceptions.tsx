import { homepageStyleVars } from "@/lib/homepage-design-system";

export default function Misconceptions() {
  const myths = [
    {
      icon: (
        <svg
          className="h-8 w-8 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <rect x="3.5" y="8" width="14" height="8" rx="1.5" strokeWidth={1.7} />
          <rect x="18.5" y="10" width="2" height="4" rx="0.6" strokeWidth={1.7} />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M6 12h4" />
        </svg>
      ),
      title: "It Doesn't Really Work",
      description:
        "Oh, but it does. In fact, the energy your roof produces will offset the energy your home uses.",
    },
    {
      icon: (
        <svg
          className="h-8 w-8 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <rect x="3" y="7" width="18" height="10" rx="2" strokeWidth={1.7} />
          <circle cx="12" cy="12" r="2.2" strokeWidth={1.7} />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M6.5 10h0.01M17.5 14h0.01" />
        </svg>
      ),
      title: "It's Expensive",
      description:
        "Most of the time, you can go solar without any up-front costs. After that, your payment is less than your current energy bill.",
    },
    {
      icon: (
        <svg
          className="h-8 w-8 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <circle cx="8" cy="9" r="2.5" strokeWidth={1.7} />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M3.5 17c1.1-2.2 3-3.3 4.5-3.3 1.6 0 3.5 1.1 4.6 3.3" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M14 8h7m0 0-2.8-2.8M21 8l-2.8 2.8" />
        </svg>
      ),
      title: "It's Non-Transferable",
      description:
        "Transferring your solar loan is easier than you could ever imagine. In fact, it transfers as naturally as your home loan.",
    },
  ];

  return (
    <section
      className="bg-[color:var(--home-white)] px-5 pb-[160px] pt-[20px]"
      style={homepageStyleVars}
    >
      <div
        className="mx-auto w-full max-w-[1880px] overflow-hidden rounded-[var(--home-card-radius)] px-6 py-20 sm:px-10 sm:py-24 lg:px-[150px] lg:py-[160px]"
        style={{
          background:
            "radial-gradient(130% 130% at 50% 110%, #6b92bc 0%, #597695 25%, #465a6e 50%, #343d47 75%, #2a2f33 87.5%, var(--home-black) 100%), linear-gradient(90deg, var(--home-black) 0%, var(--home-black) 100%)",
        }}
      >
        <div className="flex flex-col items-center text-center">
          <p className="mb-[-14px] text-[96px] leading-none text-white/55 sm:text-[130px] lg:mb-[-40px] lg:text-[170px]">
            3
          </p>
          <h2 className="text-[length:var(--home-h4-mobile)] capitalize leading-[1.3] text-white sm:text-[length:var(--home-h4)] lg:text-[44px]">
            Common Misconceptions
            <br />
            About Going Solar
          </h2>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-14 md:grid-cols-3 md:gap-8 lg:mt-[140px] lg:gap-[100px]">
          {myths.map((myth, index) => (
            <div key={index} className="flex flex-col items-center gap-9 text-center text-white">
              <div className="flex h-12 w-12 items-center justify-center">{myth.icon}</div>
              <div className="flex flex-col items-center gap-6 lg:gap-10">
                <h3 className="text-[36px] capitalize leading-[1.15] sm:text-[40px] lg:text-[44px]">
                  {myth.title}
                </h3>
                <p className="text-[15px] leading-[1.5] text-white/95 lg:text-[length:var(--home-h7)]">
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


"use client";

import Image from "next/image";
import Link from "next/link";
import { CardGradientBorder } from "@/components/ui/card-gradient-border";
import { homepageStyleVars } from "@/lib/homepage-design-system";
import type { StatePageData } from "@/lib/state-page-data";
import AerialView from "@/components/AerialView";
import Misconceptions from "@/components/Misconceptions";
import Testimonials from "@/components/Testimonials";
import SpendLess from "@/components/SpendLess";
import PricingPlans from "@/components/PricingPlans";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

function StateHero({ data }: { data: StatePageData }) {
  return (
    <section className="relative min-h-[90vh] overflow-hidden text-white" style={homepageStyleVars}>
      <div className="absolute inset-0 z-0 bg-[#212120]">
        {data.heroVideoUrl ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            autoPlay
            loop
            muted
            playsInline
            poster={data.heroBackgroundImage}
            className="h-full w-full object-cover"
            src={data.heroVideoUrl}
          />
        ) : (
          <Image
            src={data.heroBackgroundImage}
            alt={`Solar home in ${data.name}`}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
        )}
      </div>
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.5) 100%)"
        }}
      />

      <div className="relative z-[2] mx-auto flex min-h-[90vh] max-w-[1240px] flex-col justify-end px-5 pb-20 pt-36 sm:px-6 lg:px-8 lg:pb-24">
        <div className="flex items-center gap-2 text-[length:var(--home-h7)] font-extrabold uppercase tracking-[0.2em] text-white/70">
          <span className="inline-block h-2 w-2 rounded-full bg-white/50" />
          Aveyo &middot; {data.name}
        </div>

        <h1 className="mt-4 max-w-[780px] font-telegraf text-[clamp(2rem,5vw,3.5rem)] font-extrabold leading-[1.1] tracking-tight">
          {data.heroHeadingPrefix}{" "}
          <em className="not-italic text-white/90">{data.heroHeadingHighlight}</em>
        </h1>

        <p className="mt-6 max-w-[620px] text-[length:var(--home-h6)] leading-[1.6] text-white/80">
          {data.heroDescription}
        </p>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/contact#sales-form"
            className="inline-flex items-center justify-center rounded-[var(--home-button-radius)] bg-white px-[var(--home-button-px)] py-[var(--home-button-py)] text-[length:var(--home-h7)] font-extrabold text-[#212120] transition-colors hover:bg-white/90"
          >
            Get My Free Quote
          </Link>
          <a
            href="#incentives"
            className="inline-flex items-center justify-center rounded-[var(--home-button-radius)] border border-white/40 bg-white/[0.08] px-[var(--home-button-px)] py-[var(--home-button-py)] text-[length:var(--home-h7)] font-extrabold text-white backdrop-blur-sm transition-colors hover:bg-white/[0.15]"
          >
            See {data.name} Incentives
          </a>
        </div>

        <div className="mt-8 flex items-center gap-3">
          <div className="flex -space-x-2">
            {[
              "/images/60ce4b9e24c4050c4952b8dc3b2d103527329365.png",
              "/images/9b1764311761fff86e6a0fc0da2b83c8349b2232.png",
              "/images/670245b8e18e43e51438ec1398a32333ad7e8550.png",
              "/images/8dc0606780d56d1febf32090a940fda53f20c567.png"
            ].map((src) => (
              <div
                key={src}
                className="h-8 w-8 rounded-full border-2 border-white/30 bg-cover bg-center"
                style={{ backgroundImage: `url("${src}")` }}
              />
            ))}
          </div>
          <span className="text-sm font-bold text-white/70">Trusted By Over +5k Homeowners</span>
        </div>
      </div>
    </section>
  );
}

function StateTrustBar({ data }: { data: StatePageData }) {
  return (
    <div
      className="overflow-hidden border-y border-white/10 bg-[#212120] py-3"
      style={homepageStyleVars}
    >
      <div className="[mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <div className="flex w-max animate-[state-trust-scroll_28s_linear_infinite] items-center whitespace-nowrap motion-reduce:animate-none [will-change:transform]">
          {Array.from({ length: 2 }).map((_, loopIndex) => (
            <div
              key={loopIndex}
              className="flex shrink-0 items-center gap-4 pr-4 sm:gap-5 sm:pr-5 lg:gap-6 lg:pr-6"
              aria-hidden={loopIndex === 1}
            >
              {Array.from({ length: 3 }).map((_, groupIndex) => (
                <div key={`${loopIndex}-${groupIndex}`} className="flex shrink-0 items-center gap-4 sm:gap-5 lg:gap-6">
                  <span className="inline-flex h-10 shrink-0 items-center justify-center gap-2.5 px-4 text-sm font-semibold text-white/80 min-w-[220px]">
                    <svg className="h-4 w-4 shrink-0 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Serving {data.name} Homeowners
                  </span>
                  <span className="inline-flex h-10 shrink-0 items-center justify-center gap-2.5 px-4 text-sm font-semibold text-white/80 min-w-[168px]">
                    <span className="flex items-center gap-1 text-[#F0B046]">
                      {Array.from({ length: 5 }).map((_, starIndex) => (
                        <svg key={starIndex} className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </span>
                    4.9 Star Rating
                  </span>
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center">
                    <Image
                      src="/images/web_photos/aveyo-icon.svg"
                      alt=""
                      width={23}
                      height={19}
                      className="h-auto w-[18px] opacity-90"
                    />
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StateIncentives({ data }: { data: StatePageData }) {
  return (
    <section
      id="incentives"
      className="bg-[#f9f9f9] py-20 lg:py-28"
      style={homepageStyleVars}
    >
      <div className="mx-auto max-w-[1240px] px-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[680px] text-center">
          <h2 className="font-telegraf text-[length:var(--home-h4)] font-extrabold leading-[1.15] text-[#212120] md:text-[length:var(--home-h3)]">
            {data.incentivesHeading}
          </h2>
          <p className="mt-5 text-[length:var(--home-paragraph)] leading-[1.7] text-[#7D8081]">
            {data.incentivesDescription}
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          {data.incentives.map((incentive) => (
            <div
              key={incentive.title}
              className="relative overflow-hidden rounded-[var(--home-card-radius)] border border-[#e5e5e5] bg-white p-8 lg:p-10"
            >
              <CardGradientBorder className="rounded-[var(--home-card-radius)]" />
              <div className="relative z-[2]">
                <span className="inline-block rounded-full bg-[#212120] px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-white">
                  {incentive.tag}
                </span>
                <h3 className="mt-4 text-[length:var(--home-h7)] font-extrabold text-[#212120]">
                  {incentive.title}
                </h3>
                <p className="mt-2 font-telegraf text-[length:var(--home-h4)] font-extrabold text-[#212120]">
                  {incentive.value}
                </p>
                <p className="mt-4 text-[length:var(--home-paragraph)] leading-[1.7] text-[#7D8081]">
                  {incentive.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function StatePageTemplate({ data }: { data: StatePageData }) {
  return (
    <main>
      <Navbar />
      <StateHero data={data} />
      <StateTrustBar data={data} />
      <Testimonials />
      <SpendLess slides={data.spendLessSlides} />
      <StateIncentives data={data} />
      <AerialView content={data.aerial} />
      <Misconceptions myths={data.misconceptions} />
      <PricingPlans />
      <Footer image={data.footerImage} />
    </main>
  );
}

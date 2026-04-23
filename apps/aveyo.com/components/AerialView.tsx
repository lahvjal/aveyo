/* eslint-disable jsx-a11y/media-has-caption */
"use client";

import { ViewportReveal } from "@/components/ui/viewport-reveal";
import { homepageStyleVars } from "@/lib/homepage-design-system";
import type { AerialViewContent } from "@/lib/state-page-data";
import { useEffect, useRef, useState } from "react";

const GLYPH_ASPECT = 23 / 19;
const GLYPH_START_POSITION = { x: 0.8, y: -0.3};
const GLYPH_END_POSITION = { x: 0.5, y: 0.5 };
const GLYPH_END_WIDTH = { vwRatio: 0.26, min: 230, max: 460 };
const GLYPH_START_SCALE = { vwMultiplier: 8, normalMultiplier: 4.5 };

const DEFAULTS: AerialViewContent = {
  videoUrl: "https://wg22fhqtugwjii3h.public.blob.vercel-storage.com/video/aerial-vid.mp4",
  headingLine1: "Bringing the energy",
  headingLine2: "With Transparency",
  subtitle: "Redefining What Home Solar Should Feel Like",
  body: "We built Aveyo specifically for you. To give you meaningful savings, better service, and a hassle-free experience the entire way through. We understand all too well why solar has a bad name, which is why everything we do is focused on providing you with the best service possible.",
  cards: [
    { topText: "An Industry-Exclusive", boldLine1: "Stress-Free", boldLine2: "Guarantee", bottomText: "On Every System We Install" },
    { topText: "We\u2019re Always", boldLine1: "100%", boldLine2: "Transparent", bottomText: "Through The Entire Process" },
  ],
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
const lerp = (start: number, end: number, t: number) => start + (end - start) * t;

export default function AerialView({ content }: { content?: AerialViewContent }) {
  const c = content ?? DEFAULTS;
  const sectionRef = useRef<HTMLDivElement>(null);
  const [maskState, setMaskState] = useState({
    width: 0,
    height: 0,
    left: 0,
    top: 0,
    topCover: 0,
    bottomCover: 0,
    leftCover: 0,
    rightCover: 0,
    sideCoverTop: 0,
    sideCoverHeight: 0,
  });

  useEffect(() => {
    const sectionEl = sectionRef.current;
    if (!sectionEl) return;

    let rafId = 0;

    const updateMask = () => {
      rafId = 0;

      const rect = sectionEl.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const scrollDistance = rect.height - viewportHeight;
      const rawProgress = scrollDistance > 0 ? -rect.top / scrollDistance : 1;
      const progress = clamp(rawProgress, 0, 1);

      // Ease out for a smoother settle near the end.
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      const normalWidth = clamp(
        viewportWidth * GLYPH_END_WIDTH.vwRatio,
        GLYPH_END_WIDTH.min,
        GLYPH_END_WIDTH.max
      );
      const startWidth = Math.max(
        viewportWidth * GLYPH_START_SCALE.vwMultiplier,
        normalWidth * GLYPH_START_SCALE.normalMultiplier
      );
      const width = lerp(startWidth, normalWidth, easedProgress);
      const height = width / GLYPH_ASPECT;

      const centerX = lerp(
        viewportWidth * GLYPH_START_POSITION.x,
        viewportWidth * GLYPH_END_POSITION.x,
        easedProgress
      );
      const centerY = lerp(
        viewportHeight * GLYPH_START_POSITION.y,
        viewportHeight * GLYPH_END_POSITION.y,
        easedProgress
      );

      const left = centerX - width / 2;
      const top = centerY - height / 2;
      const right = left + width;
      const bottom = top + height;

      const topCover = clamp(top, 0, viewportHeight);
      const bottomCover = clamp(viewportHeight - bottom, 0, viewportHeight);
      const leftCover = clamp(left, 0, viewportWidth);
      const rightCover = clamp(viewportWidth - right, 0, viewportWidth);
      const sideCoverTop = clamp(top, 0, viewportHeight);
      const sideCoverBottom = clamp(bottom, 0, viewportHeight);
      const sideCoverHeight = Math.max(0, sideCoverBottom - sideCoverTop);

      setMaskState({
        width,
        height,
        left,
        top,
        topCover,
        bottomCover,
        leftCover,
        rightCover,
        sideCoverTop,
        sideCoverHeight,
      });
    };

    const requestUpdate = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(updateMask);
    };

    updateMask();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, []);

  return (
    <section
      id="about"
      className="bg-[color:var(--home-white)]"
      style={homepageStyleVars}
    >
      <div
        ref={sectionRef}
        className="relative"
        style={{ position: "static", height: "300vh" }}
      >
        <div className="sticky top-0 h-screen w-screen overflow-hidden">
          <div className="absolute inset-0 z-[1]">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="h-full w-full object-cover"
              src={c.videoUrl}
            />
          </div>

          <div className="pointer-events-none absolute inset-0 z-[2]">
            {/* White edge covers framing the centered mask window */}
            <div
              className="absolute left-0 right-0 top-0 bg-[color:var(--home-white)]"
              style={{ height: `${maskState.topCover}px` }}
            />
            <div
              className="absolute bottom-[-5px] left-0 right-0 bg-[color:var(--home-white)]"
              style={{ height: `${maskState.bottomCover + 10}px` }}
            />
            <div
              className="absolute left-0 bg-[color:var(--home-white)]"
              style={{
                top: `${maskState.sideCoverTop}px`,
                height: `${maskState.sideCoverHeight}px`,
                width: `${maskState.leftCover}px`,
              }}
            />
            <div
              className="absolute right-[5px] bg-[color:var(--home-white)]"
              style={{
                top: `${maskState.sideCoverTop}px`,
                height: `${maskState.sideCoverHeight}px`,
                width: `${maskState.rightCover}px`,
              }}
            />

            {/* White mask with transparent "A" knockout */}
            <div
              className="absolute"
              style={{
                left: `${maskState.left}px`,
                top: `${maskState.top}px`,
                width: `${maskState.width}px`,
                height: `${maskState.height}px`,
              }}
            >
              <svg
                viewBox="0 0 23 19"
                xmlns="http://www.w3.org/2000/svg"
                className="h-full w-full"
                aria-hidden="true"
              >
                <path
                  fill="var(--home-white)"
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M0 0H23V19H0V0ZM22.2627 18.3031H18.0517C16.5845 18.3031 15.3026 17.2539 14.9425 15.7481L11.1605 0H15.3291C16.7911 0 18.0729 1.04915 18.4331 2.54405L22.2627 18.3031ZM0 18.3031H7.24081C8.41142 18.3031 9.48669 17.6344 10.0482 16.5527L13.5282 9.88811H6.32975C5.16444 9.88811 4.09448 10.5513 3.52771 11.6222L0 18.3031ZM0.0582655 8.42038H4.86782C6.03843 8.42038 7.11369 7.75176 7.67516 6.66999L11.1605 0H6.38802C5.22801 0 4.15274 0.663194 3.58598 1.73409L0.0582655 8.42038Z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="pb-0 mt-[-30vh] z-2 relative w-full">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center gap-10 px-5 text-center lg:gap-[40px]">
          {/* <div className="relative h-[140px] w-[180px] sm:h-[190px] sm:w-[240px] lg:h-[238px] lg:w-[306px]">
            <svg
              viewBox="0 0 23 19"
              xmlns="http://www.w3.org/2000/svg"
              className="h-full w-full"
              aria-hidden="true"
            >
              <defs>
                <clipPath id="about-a-glyph-clip">
                  <path d="M22.2627 18.3031H18.0517C16.5845 18.3031 15.3026 17.2539 14.9425 15.7481L11.1605 0H15.3291C16.7911 0 18.0729 1.04915 18.4331 2.54405L22.2627 18.3031ZM0 18.3031H7.24081C8.41142 18.3031 9.48669 17.6344 10.0482 16.5527L13.5282 9.88811H6.32975C5.16444 9.88811 4.09448 10.5513 3.52771 11.6222L0 18.3031ZM0.0582655 8.42038H4.86782C6.03843 8.42038 7.11369 7.75176 7.67516 6.66999L11.1605 0H6.38802C5.22801 0 4.15274 0.663194 3.58598 1.73409L0.0582655 8.42038Z" />
                </clipPath>
              </defs>
              <image
                href="/images/5332468fd6c2c4a0ca4b4b468d05950f98454323.png"
                x="0"
                y="0"
                width="23"
                height="19"
                preserveAspectRatio="xMidYMid slice"
                clipPath="url(#about-a-glyph-clip)"
              />
            </svg>
          </div> */}

          <ViewportReveal
            className="flex flex-col items-center gap-4 lg:gap-[30px]"
            delayMs={40}
          >
            <h2 className="text-[44px] leading-[1.02] tracking-[-0.01em] text-[color:var(--home-black)] sm:text-[56px] lg:w-[646px] lg:text-[length:var(--home-h2)]">
              {c.headingLine1}
              <br />
              {c.headingLine2}
            </h2>
            <p className="text-lg leading-[1.4] text-[color:var(--home-black)] sm:text-xl lg:text-[length:var(--home-h5)]">
              {c.subtitle}
            </p>
          </ViewportReveal>

          <ViewportReveal
            as="p"
            className="w-full max-w-[700px] text-center text-sm leading-[1.7] text-[color:var(--home-foreground-primary)] sm:text-[15px] lg:text-base"
            delayMs={120}
          >
            {c.body}
          </ViewportReveal>
        </div>

        <div className={`mx-auto mt-10 grid w-full max-w-[1880px] grid-cols-1 gap-5 px-5 lg:mt-[40px] ${c.cards.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
          {c.cards.map((card, index) => (
            <ViewportReveal
              key={card.boldLine1}
              className="rounded-[var(--home-card-radius)] bg-gradient-to-b from-[#f4faff] to-[#d8d8d8] px-6 py-10 text-center sm:px-8 lg:px-10 lg:py-[60px]"
              delayMs={180 + index * 80}
            >
              <p className="text-[length:var(--home-h7)] leading-[1.5] text-[color:var(--home-gray-dark-2)]">
        
                {card.topText}
              </p>
              <div className="my-6 text-[color:var(--home-black)]">
                <p className="text-[length:var(--home-h4)] leading-none">
                  {card.boldLine1}
                </p>
                {card.boldLine2 && (
                  <p className="text-[length:var(--home-h4)] leading-none">
                    {card.boldLine2}
                  </p>
                )}
              </div>
              <p className="text-[length:var(--home-h7)] leading-[1.5] text-[color:var(--home-gray-dark-2)]">
                {card.bottomText}
              </p>
            </ViewportReveal>
          ))}
        </div>
      </div>

    </section>
  );
}


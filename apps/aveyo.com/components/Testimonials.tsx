"use client";

import { CarouselIndicators } from "@/components/ui/carousel-indicators";
import { CardGradientBorder } from "@/components/ui/card-gradient-border";
import { homepageStyleVars } from "@/lib/homepage-design-system";
import { useCallback, useEffect, useMemo, useState } from "react";

type Testimonial = {
  image: string;
  name: string;
  source: string;
  rating: number;
  quote: string;
};

const testimonials: Testimonial[] = [
  {
    image: "https://lh3.googleusercontent.com/a-/ALV-UjWZfD3ChPHK_TISEflrBwIWc3DaXiij9pFanH8muv8FI-43-niJ=w72-h72-p-rp-mo-br100",
    name: "Vicki",
    source: "Google Review",
    rating: 5,
    quote:
      "The whole process could not have been easier for us. Austin and Reed stopped by our house one day and after talking with them, we decided to sign us up! ...",
  },
  {
    image: "https://lh3.googleusercontent.com/a-/ALV-UjUpazMLxcucpPisXPQ7gPkHbQFC-w7J1-aOnpGDuc6pPu1skOy8yA=w72-h72-p-rp-mo-br100",
    name: "Doug Quick",
    source: "Google Review",
    rating: 5,
    quote:
      "Sawyer, our sales rep has been terrific! He's followed through when I've fired off questions, long after it was even installed. It's still soon to evaluate the savings overall, but I'm optimistic. I'll know more by later in the Summer!",
  },
  {
    image: "https://lh3.googleusercontent.com/a/ACg8ocLUSlWyTZp8dC7KNUvk49bp5rOYjkjcfryvQNLxl3Mjuzcd=w72-h72-p-rp-mo-br100",
    name: "Brent Ward",
    source: "Google Review",
    rating: 5,
    quote:
      "Austin Townsend and his team did a great job on my solar project. He would answer promptly when I had a question. I would definitely recommend Austin and his team.",
  },
  {
    image: "https://lh3.googleusercontent.com/a/ACg8ocKTyFnTK0cBLrLsVy-2MAjNTz-cyWTqKqN77k3O2p1wIDIJ=w72-h72-p-rp-mo-br100",
    name: "Travis Keesee",
    source: "Google Review",
    rating: 5,
    quote:
      "Great experience from the initial knock on the door. Everyone was very professional and kept us informed every step of the way.",
  },
  {
    image: "https://lh3.googleusercontent.com/a-/ALV-UjV-X9dowkSWiXhRtB1Uo_onL3NwTqE2mmhUKYmjdPQOUEj6GN5r=w72-h72-p-rp-mo-ba4-br100",
    name: "James Mayes",
    source: "Google Review",
    rating: 5,
    quote:
      "The setup was great and installation was very quick. So far it's great keeping our electric bill down",
  },
  {
    image: "https://lh3.googleusercontent.com/a-/ALV-UjWsfNhh1jr7SyufiRoqKzwflkwzgbmah3KNPO4dGKsreCTsWXvL=w72-h72-p-rp-mo-ba4-br100",
    name: "Mike Gooch",
    source: "Google Review",
    rating: 5,
    quote:
      "I'm very impressed with Aveyo. Their bid was great compared to the other companies I reached out to and their install was faster than anticipated. I'm in love with my lower electricity bill too! I highly recommend using them for your panels.",
  },
  {
    image: "https://lh3.googleusercontent.com/a/ACg8ocLAsI6zpdWaaAe2FGLgYGkhlQmuLAlpVZZRodtvGUvki8qU2w=w72-h72-p-rp-mo-br100",
    name: "Steven Brown",
    source: "Google Review",
    rating: 5,
    quote:
      "Aveyo service people installed our solar system in one day. The system was doing great but had to disconnect from the grid till approval from Ameren came through. That took about 10 days. The solar is working great.",
  },
  {
    image: "https://lh3.googleusercontent.com/a/ACg8ocLTFXdkyNWcp77BS7dsJkvsjouHSaAzx3-W0plr6hdnUe6Ikg=w72-h72-p-rp-mo-br100",
    name: "Lynette Evans",
    source: "Google Review",
    rating: 5,
    quote:
      "Scott Burgess gets an A+ from me. I really was quite worried about the solar plunge and if it was the right thing to do. Scott took the extra time to re-explain the solar process and how it works with Ameren. He was very knowledgeable ...",
  },
  {
    image: "https://lh3.googleusercontent.com/a-/ALV-UjXEILtzn1SFyjIt_kOLpqRsA1mL04Y9tEhGcT8X6uLTPW9c_jLB=w72-h72-p-rp-mo-br100",
    name: "Ellen Rhoades",
    source: "Google Review",
    rating: 5,
    quote:
      "From the salesperson to the roof inspector and the installers, everything has gone smoothly. They talked us through the whole process and answered any questions we had. Thank you Aveyo, you made our father's dream come true ...",
  },
  {
    image: "https://lh3.googleusercontent.com/a-/ALV-UjWH1NoGsA_rwOFySM7QTzVF-27ZQEKeSi4vzTyGcnrA_680-JtcDA=w72-h72-p-rp-mo-ba3-br100",
    name: "Karen Laszko",
    source: "Google Review",
    rating: 5,
    quote:
      "Best company I've ever worked with. Kind, patient, and knowledgeable. Kept me informed the whole way through and I am loving my solar system.",
  },
];

const extendedTestimonials = [...testimonials, ...testimonials, ...testimonials];

const GAP = 20;

/** How much of the previous/next card shows outside the active strip (each side). */
function getPeekPx(viewportWidth: number): number {
  if (viewportWidth >= 1280) return 64;
  if (viewportWidth >= 640) return 52;
  return 40;
}

/** How many cards are fully visible in the viewport at this breakpoint (1, 2, or 3). */
function getVisibleCount(viewportWidth: number): number {
  if (viewportWidth >= 1280) return 3;
  if (viewportWidth >= 900) return 2;
  return 1;
}

export default function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(testimonials.length);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slideWidth, setSlideWidth] = useState(600);
  const [visibleCount, setVisibleCount] = useState(1);
  const [peekPx, setPeekPx] = useState(52);

  useEffect(() => {
    const updateDimensions = () => {
      const vw = window.innerWidth;
      const horizontalPadding = 48;
      const maxViewport = Math.min(1280, vw - horizontalPadding);
      const peek = getPeekPx(vw);
      setPeekPx(peek);
      const count = getVisibleCount(vw);
      setVisibleCount(count);

      // Fit: active strip (full cards) + left/right peek within maxViewport
      const activeBudget = maxViewport - 2 * peek;

      if (count === 1) {
        setSlideWidth(Math.min(600, Math.max(280, Math.floor(activeBudget))));
      } else {
        const w = Math.floor((activeBudget - GAP * (count - 1)) / count);
        setSlideWidth(Math.max(260, w));
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  useEffect(() => {
    setCurrentIndex((i) => Math.min(i, extendedTestimonials.length - visibleCount));
  }, [visibleCount]);

  useEffect(() => {
    if (!isTransitioning) return;

    const timer = setTimeout(() => {
      setIsTransitioning(false);
      setCurrentIndex((i) => {
        if (i < testimonials.length) return i + testimonials.length;
        if (i >= testimonials.length * 2) return i - testimonials.length;
        return i;
      });
    }, 700);

    return () => clearTimeout(timer);
  }, [isTransitioning, currentIndex]);

  const goToSlide = useCallback(
    (index: number) => {
      if (isTransitioning) return;
      setIsTransitioning(true);
      setCurrentIndex(index);
    },
    [isTransitioning]
  );

  const handleNavClick = (index: number) => {
    const targetIndex = testimonials.length + index;
    goToSlide(targetIndex);
  };

  const step = slideWidth + GAP;

  // Align first active slide `peekPx` from the left edge so prev/next cards peek in.
  const translateX = peekPx - currentIndex * step;

  const realIndex = currentIndex % testimonials.length;

  const slideHeight = useMemo(
    () => (slideWidth < 1000 ? (slideWidth < 600 ? 460 : 540) : 580),
    [slideWidth]
  );

  const renderSlide = (testimonial: Testimonial, index: number) => {
    const inActiveWindow =
      index >= currentIndex && index < currentIndex + visibleCount;

    return (
      <div
        key={index}
        onClick={() => goToSlide(index)}
        className={`relative flex shrink-0 flex-col overflow-hidden rounded-[var(--home-card-radius)] bg-[color:var(--home-gray-light-5)] shadow-[0_12px_40px_rgba(15,23,42,0.07)] ring-1 ring-black/[0.03] ${
          !inActiveWindow ? "cursor-pointer" : ""
        }`}
        style={{
          width: slideWidth,
          height: slideHeight,
        }}
      >
        <CardGradientBorder className="rounded-[var(--home-card-radius)]" />
        <div className="relative z-[2] flex h-full flex-col px-8 pb-9 pt-8 sm:p-[var(--home-card-padding)]">
          <span
            className="pointer-events-none absolute right-5 top-4 select-none text-[72px] font-regular leading-none text-[color:var(--home-black)]/10 sm:right-6 sm:top-5 sm:text-[88px]"
            aria-hidden
          >
            &ldquo;
          </span>

          <div className="relative flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[#E8EAEC] shadow-[0_2px_10px_rgba(0,0,0,0.08)] ring-2 ring-white sm:h-14 sm:w-14">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={testimonial.image}
                  alt={`${testimonial.name} Google review avatar`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="min-w-0">
                <h3 className="text-[17px] font-bold leading-tight tracking-tight text-[color:var(--home-black)] sm:text-lg">
                  {testimonial.name}
                </h3>
                <p className="mt-1 text-[14px] leading-snug text-[color:var(--home-gray-dark-4)]">{testimonial.source}</p>
              </div>
            </div>

            <div className="flex gap-0.5">
              {[...Array(testimonial.rating)].map((_, i) => (
                <svg
                  key={i}
                  className="h-[18px] w-[18px] text-[color:var(--home-testimonial-star)]"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>

            <p className="min-h-0 flex-1 overflow-y-auto text-left text-[15px] font-regular leading-[1.55] text-[color:var(--home-black)] sm:text-base sm:leading-[1.5]">
              {testimonial.quote}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section
      className="overflow-hidden bg-[color:var(--home-white)] py-20 font-telegraf lg:py-28"
      style={homepageStyleVars}
    >
      <div className="mx-auto mb-12 max-w-7xl px-4 sm:mb-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[color:var(--home-gray-light-5)] px-4 py-2 text-sm font-semibold text-[color:var(--home-black)] shadow-[0_8px_24px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.04]">
            <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--home-testimonial-star)]" aria-hidden />
            4.9 stars on Google
          </div>
          <h2 className="mb-4 text-[length:var(--home-h4-mobile)] text-[color:var(--home-black)] sm:text-[length:var(--home-h4)]">
            Google Reviews
          </h2>
          <p className="text-[color:var(--home-gray-dark-4)]">
            See why people love Aveyo—here's what they have to say.
          </p>
     
        </div>
      </div>

      <div className="relative flex flex-col items-center">
        <p className="sr-only" aria-live="polite">
          Showing {visibleCount} review card{visibleCount === 1 ? "" : "s"} in the main area, with part of the
          previous and next cards visible on the sides. Use the controls to change slides.
        </p>

        <div className="w-full max-w-full overflow-hidden">
          <div className="mx-auto w-full overflow-hidden py-[50px]">
            <div
              className="flex items-stretch"
              style={{
                gap: GAP,
                transform: `translateX(${translateX}px)`,
                transition: isTransitioning ? "transform 700ms cubic-bezier(0.33, 1, 0.68, 1)" : "none",
              }}
            >
              {extendedTestimonials.map((testimonial, index) => renderSlide(testimonial, index))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <CarouselIndicators
            count={testimonials.length}
            activeIndex={realIndex}
            onSelect={handleNavClick}
            getAriaLabel={(index) => `Go to review ${index + 1}`}
          />
        </div>
      </div>
    </section>
  );
}

"use client";

import { CarouselIndicators } from "@/components/ui/carousel-indicators";
import { CardGradientBorder } from "@/components/ui/card-gradient-border";
import { useCarouselAutoplay } from "@/components/ui/use-carousel-autoplay";
import { useCarouselWheelNavigation } from "@/components/ui/use-carousel-wheel-navigation";
import { customerReviews, type CustomerReview } from "@/lib/customer-reviews";
import { homepageStyleVars } from "@/lib/homepage-design-system";
import { useCallback, useEffect, useMemo, useState } from "react";

const testimonials = customerReviews;

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
  const goToNextSlide = useCallback(() => {
    goToSlide(currentIndex + 1);
  }, [currentIndex, goToSlide]);
  const goToPreviousSlide = useCallback(() => {
    goToSlide(currentIndex - 1);
  }, [currentIndex, goToSlide]);

  const handleAutoAdvance = useCallback(() => {
    if (isTransitioning) {
      return;
    }

    setIsTransitioning(true);
    setCurrentIndex((index) => index + 1);
  }, [isTransitioning]);

  const step = slideWidth + GAP;

  // Align first active slide `peekPx` from the left edge so prev/next cards peek in.
  const translateX = peekPx - currentIndex * step;

  const realIndex = currentIndex % testimonials.length;
  const { isPlaying, autoplayDurationMs, toggle } = useCarouselAutoplay({
    restartKey: realIndex,
    onAdvance: handleAutoAdvance,
  });
  const handleCarouselWheel = useCarouselWheelNavigation({
    onNext: goToNextSlide,
    onPrevious: goToPreviousSlide,
  });

  const slideHeight = useMemo(
    () => (slideWidth < 1000 ? (slideWidth < 600 ? 460 : 540) : 580),
    [slideWidth]
  );

  const renderSlide = (testimonial: CustomerReview, index: number) => {
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
            4.7 stars on Google
          </div>
          <h2 className="mb-4 text-[length:var(--home-h4-mobile)] text-[color:var(--home-black)] sm:text-[length:var(--home-h4)]">
            Google Reviews
          </h2>
          <p className="text-[color:var(--home-gray-dark-4)]">
            See why people love Aveyo. Here&apos;s what they have to say.
          </p>
     
        </div>
      </div>

      <div className="relative flex flex-col items-center">
        <p className="sr-only" aria-live="polite">
          Showing {visibleCount} review card{visibleCount === 1 ? "" : "s"} in the main area, with part of the
          previous and next cards visible on the sides. Use the controls to change slides or pause autoplay.
        </p>

        <div className="w-full max-w-full overflow-hidden" onWheel={handleCarouselWheel}>
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
            isPlaying={isPlaying}
            autoplayDurationMs={autoplayDurationMs}
            onTogglePlayback={toggle}
            playLabel="Play review carousel autoplay"
            pauseLabel="Pause review carousel autoplay"
          />
        </div>
      </div>
    </section>
  );
}

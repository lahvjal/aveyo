/* eslint-disable jsx-a11y/media-has-caption */
"use client";

import {
  BenefitSlideCard,
  type BenefitSlideCardData,
} from "@/components/ui/benefit-slide-card";
import { CarouselIndicators } from "@/components/ui/carousel-indicators";
import { useCarouselAutoplay } from "@/components/ui/use-carousel-autoplay";
import { useCarouselWheelNavigation } from "@/components/ui/use-carousel-wheel-navigation";
import { ViewportReveal } from "@/components/ui/viewport-reveal";
import { homepageStyleVars } from "@/lib/homepage-design-system";
import { EditableSiteImage } from "@/components/site/editable-site-image";
import { EditableSiteVideo } from "@/components/site/editable-site-video";
import { useCallback, useEffect, useRef, useState } from "react";

const benefitSlides: BenefitSlideCardData[] = [
  {
    title: "Enjoy energy independence",
    description:
      "With solar energy, you can generate your own electricity, reducing your dependence on utility companies and protecting against rising energy costs.",
    image: "/images/acee720d028f8c4b741423529df186e9a70cf7d1.png",
    alt: "Aerial view of a solar-powered home on a hillside",
    hasDarkOverlay: true,
  },
  {
    title: "Reduce your carbon footprint",
    description:
      "Going solar is not only good for your wallet but also for the planet. Reduce your reliance on fossil fuels and help combat climate change.",
    image: "/images/40f27c8586df6b6a5f2dc93ca6989928eaff7a6d.png",
    alt: "A parent and child beside an electric vehicle outdoors",
    hasDarkOverlay: true,
  },
  {
    title: "Receive great tax breaks & incentives",
    description:
      "Every state has its own set of tax breaks and incentives for those who go solar. Check your state's specifics (and what you could earn) here:",
    image: "/images/ea97db20ed6cd0d4806a5afd7890d36c3d89842d.png",
    alt: "A person typing on a laptop at a wooden desk",
    hasDarkOverlay: true,
  },
  {
    title: "Increase your home's value",
    description:
      "Installing solar panels can significantly enhance your property's value, making it more attractive to potential buyers.",
    image: "/images/8e4311cef2aa5e0e923e53d10a172ca3e5cd3989.png",
    alt: "Close view of rooftop solar panels on a home",
    hasDarkOverlay: true,
  },
];

const extendedBenefitSlides = [...benefitSlides, ...benefitSlides, ...benefitSlides];
const INITIAL_CENTER_SLIDE = 1;
const SAVINGS_VIDEO_SRC = "/images/web_photos/benefits.mp4";
const SAVINGS_VIDEO_LAST_FRAME_EPSILON = 0.05;
const SAVINGS_COUNTER_START = 150;
const SAVINGS_COUNTER_END = 50;
const SAVINGS_COUNTER_DURATION_MS = 52000;
const easeOutExpo = (progress: number) =>
  progress === 1 ? 1 : 1 - Math.pow(2, -80 * progress);

export default function Benefits() {
  const [currentIndex, setCurrentIndex] = useState(
    benefitSlides.length + INITIAL_CENTER_SLIDE
  );
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slideWidth, setSlideWidth] = useState(885);
  const [gap] = useState(20);
  const [displayedSavings, setDisplayedSavings] = useState(SAVINGS_COUNTER_START);
  const savingsScrollRef = useRef<HTMLDivElement>(null);
  const savingsVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const sectionEl = savingsScrollRef.current;
    const videoEl = savingsVideoRef.current;
    if (!sectionEl || !videoEl) return;

    let rafId = 0;
    let counterRafId = 0;
    let hasStarted = false;
    let hasCompleted = false;
    let hasAnimatedSavings = false;

    const startSavingsAnimation = () => {
      if (hasAnimatedSavings) return;
      hasAnimatedSavings = true;

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setDisplayedSavings(SAVINGS_COUNTER_END);
        return;
      }

      const animationStart = performance.now();

      const tick = (now: number) => {
        const elapsed = now - animationStart;
        const progress = Math.min(elapsed / SAVINGS_COUNTER_DURATION_MS, 1);
        const easedProgress = easeOutExpo(progress);
        const nextValue = Math.round(
          SAVINGS_COUNTER_START +
            (SAVINGS_COUNTER_END - SAVINGS_COUNTER_START) * easedProgress
        );

        setDisplayedSavings(nextValue);

        if (progress < 1) {
          counterRafId = window.requestAnimationFrame(tick);
        }
      };

      counterRafId = window.requestAnimationFrame(tick);
    };

    const requestUpdate = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;

        if (hasStarted || hasCompleted) return;

        const rect = sectionEl.getBoundingClientRect();
        const fullyInViewport = rect.top >= 0 && rect.bottom <= window.innerHeight;

        if (fullyInViewport) {
          hasStarted = true;
          startSavingsAnimation();
          void videoEl.play().catch(() => {
            hasStarted = false;
          });
        }
      });
    };

    const handleMetadata = () => {
      hasStarted = false;
      hasCompleted = false;
      hasAnimatedSavings = false;
      videoEl.currentTime = 0;
      videoEl.pause();
      setDisplayedSavings(SAVINGS_COUNTER_START);
      requestUpdate();
    };

    const handleEnded = () => {
      hasCompleted = true;
      videoEl.pause();
      videoEl.currentTime = Math.max(videoEl.duration - SAVINGS_VIDEO_LAST_FRAME_EPSILON, 0);
    };

    if (videoEl.readyState >= 1) {
      handleMetadata();
    } else {
      videoEl.addEventListener("loadedmetadata", handleMetadata);
    }

    videoEl.addEventListener("ended", handleEnded);
    requestUpdate();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      if (counterRafId) window.cancelAnimationFrame(counterRafId);
      videoEl.removeEventListener("loadedmetadata", handleMetadata);
      videoEl.removeEventListener("ended", handleEnded);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, []);

  useEffect(() => {
    const updateWidth = () => {
      if (window.innerWidth < 640) {
        setSlideWidth(Math.max(300, window.innerWidth * 0.84));
      } else if (window.innerWidth < 1024) {
        setSlideWidth(Math.min(760, window.innerWidth * 0.74));
      } else {
        setSlideWidth(885);
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  useEffect(() => {
    if (!isTransitioning) return;

    const timer = setTimeout(() => {
      setIsTransitioning(false);

      // Snap back to the middle set to keep the loop seamless.
      if (currentIndex < benefitSlides.length) {
        setCurrentIndex(currentIndex + benefitSlides.length);
      } else if (currentIndex >= benefitSlides.length * 2) {
        setCurrentIndex(currentIndex - benefitSlides.length);
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [currentIndex, isTransitioning]);

  const goToSlide = useCallback(
    (index: number) => {
      if (isTransitioning) return;
      setIsTransitioning(true);
      setCurrentIndex(index);
    },
    [isTransitioning]
  );

  const handleNavClick = (index: number) => {
    goToSlide(benefitSlides.length + index);
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

  const getTransformOffset = () => {
    const offset = currentIndex * (slideWidth + gap);
    return -offset;
  };

  const slideHeight = 545;
  const realIndex =
    ((currentIndex % benefitSlides.length) + benefitSlides.length) %
    benefitSlides.length;
  const { isPlaying, autoplayDurationMs, toggle } = useCarouselAutoplay({
    restartKey: realIndex,
    onAdvance: handleAutoAdvance,
  });
  const handleCarouselWheel = useCarouselWheelNavigation({
    onNext: goToNextSlide,
    onPrevious: goToPreviousSlide,
  });

  return (
    <section
      className="overflow-x-hidden overflow-y-hidden bg-[color:var(--home-white)] px-5 py-5"
      style={homepageStyleVars}
    >
      <div className="flex flex-col gap-5">
        {/* Row 1 - Savings Hero */}
        <div
          ref={savingsScrollRef}
          className="relative flex h-[calc(100vh-40px)] max-h-[800px] w-full flex-col items-center justify-center overflow-hidden rounded-[var(--home-card-radius)] px-6 py-16 text-center sm:px-10 lg:px-16"
          style={{ background: "#5f91af" }}
        >
          <div className="absolute inset-0">
            <EditableSiteVideo
              ref={savingsVideoRef}
              src={SAVINGS_VIDEO_SRC}
              label="Savings calculator background video"
              muted
              playsInline
              preload="auto"
              className="h-full w-full object-cover"
              aria-hidden="true"
            />
          </div>
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(17, 45, 78, 0.18) 0%, rgba(9, 40, 61, 0.55) 100%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at center 38%, rgba(217, 240, 255, 0.24) 0%, rgba(217, 240, 255, 0) 48%)",
            }}
          />

          <ViewportReveal
            className="relative z-10 flex max-w-[980px] flex-col items-center gap-8 lg:gap-[60px]"
            delayMs={40}
          >
            <div className="flex flex-col items-center gap-5">
              <h2 className="text-white text-[40px] leading-[1.2] capitalize sm:text-[55px] lg:text-[length:var(--home-h2)]">
                How Much Could You
                <br />
                Save By Going Solar?
              </h2>
              <p className="text-lg leading-[1.4] text-white lg:text-[length:var(--home-h5)]">
                (hint: they&apos;re all good things)
              </p>
            </div>

            <div className="flex flex-col items-center justify-center">
              <div className="flex items-start justify-center gap-1.5">
                <span className="self-end pb-6 text-[80px] font-black leading-[0.8] tracking-tight text-white lg:pb-10 lg:text-[122px]">
                  $
                </span>
                <span
                  className="inline-block tabular-nums text-[180px] font-black leading-[0.8] tracking-tight lg:text-[287px]"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.3) 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {displayedSavings.toLocaleString()}
                </span>
                <div className="self-end pb-6 text-lg leading-[1.16] tracking-tight text-white lg:pb-10 lg:text-2xl">
                  <span className="block">per</span>
                  <span className="block">month</span>
                </div>
              </div>
            </div>
          </ViewportReveal>
        </div>

        {/* Row 2 - Benefits Carousel */}
        <ViewportReveal
          className="relative rounded-[var(--home-card-radius)]"
          delayMs={120}
          style={{ height: `${slideHeight}px` }}
          onWheel={handleCarouselWheel}
        >
          <div
            className="flex h-full items-center"
            style={{
              gap: `${gap}px`,
              transform: `translateX(calc(50vw - ${slideWidth / 2}px + ${getTransformOffset()}px))`,
              transition: isTransitioning
                ? "transform 700ms cubic-bezier(0.33, 1, 0.68, 1)"
                : "none",
            }}
          >
            {extendedBenefitSlides.map((slide, index) => (
              <BenefitSlideCard
                key={`${slide.title}-${index}`}
                slide={slide}
                width={slideWidth}
                height={slideHeight}
                isActive={index === currentIndex}
                onSelect={() => {
                  if (index !== currentIndex) {
                    goToSlide(index);
                  }
                }}
              />
            ))}
          </div>

          {/* Navigation overlays the bottom of the slides */}
          <div className="pointer-events-none absolute inset-x-0 bottom-[10px] z-20 flex justify-center">
            <CarouselIndicators
              count={benefitSlides.length}
              activeIndex={realIndex}
              onSelect={handleNavClick}
              getAriaLabel={(index) => `Go to benefit slide ${index + 1}`}
              className="pointer-events-auto"
              isPlaying={isPlaying}
              autoplayDurationMs={autoplayDurationMs}
              onTogglePlayback={toggle}
              playLabel="Play benefits carousel autoplay"
              pauseLabel="Pause benefits carousel autoplay"
            />
          </div>
        </ViewportReveal>
        
        {/* Row 3 - Image Grid */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <ViewportReveal
            className="relative h-[545px] overflow-hidden rounded-[var(--home-card-radius)]"
            delayMs={180}
          >
            <EditableSiteImage
              src="/images/c71bbfe115affc201a1c2f1a5878d801dcfcaa9a.png"
              alt=""
              fill
              className="object-cover"
              sizes="(min-width: 1024px) calc((100vw - 60px) / 2), 100vw"
            />
            <EditableSiteImage
              src="/images/07a138d4d98b66756dd6ed3a82d673a7eb8b76f8.png"
              alt="Aerial view of homes with rooftop solar panels"
              fill
              className="object-cover"
              sizes="(min-width: 1024px) calc((100vw - 60px) / 2), 100vw"
            />
          </ViewportReveal>
          <ViewportReveal
            className="relative h-[545px] overflow-hidden rounded-[var(--home-card-radius)]"
            delayMs={260}
          >
            <EditableSiteImage
              src="/images/6101f18224076c77286f18820dfd5c3e40ad55fb.png"
              alt="Family preparing food in a bright kitchen"
              fill
              className="object-cover"
              sizes="(min-width: 1024px) calc((100vw - 60px) / 2), 100vw"
            />
          </ViewportReveal>
        </div>
      </div>
    </section>
  );
}

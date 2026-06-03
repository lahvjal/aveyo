"use client";

import { CarouselIndicators } from "@/components/ui/carousel-indicators";
import { useCarouselAutoplay } from "@/components/ui/use-carousel-autoplay";
import { useCarouselWheelNavigation } from "@/components/ui/use-carousel-wheel-navigation";
import { ViewportReveal } from "@/components/ui/viewport-reveal";
import { homepageStyleVars } from "@/lib/homepage-design-system";
import { EditableSiteImage } from "@/components/site/editable-site-image";
import { EditableSiteVideo } from "@/components/site/editable-site-video";
import { useState, useEffect, useCallback, useRef, useMemo, type MutableRefObject } from "react";
import { usePathname } from "next/navigation";
import { isHomePath } from "@/lib/pricing-navigation";
import { defaultSpendLessSlides, type SpendLessSlide } from "@/lib/state-page-data";

type SpendLessProps = {
  slides?: SpendLessSlide[];
  /** Overrides pathname-derived slot keys (e.g. for Storybook). */
  slotPrefix?: string;
};

function resolveSpendLessSlotPrefix(pathname: string, override?: string) {
  if (override) {
    return override;
  }
  if (isHomePath(pathname)) {
    return "homepage-spendless";
  }
  const slug = pathname.replace(/^\/+|\/+$/g, "").split("/")[0];
  return slug ? `${slug}-spendless` : "homepage-spendless";
}

function buildSpendLessSlideSlot(prefix: string, logicalIndex: number) {
  return `${prefix}-slide-${logicalIndex}`;
}

type VideoSlideProps = {
  slide: SpendLessSlide;
  isActive: boolean;
  logicalIndex: number;
  mediaSlot: string;
  playbackPositionsRef: MutableRefObject<Record<number, number>>;
};

function restoreVideoPlaybackPosition(
  video: HTMLVideoElement,
  logicalIndex: number,
  playbackPositionsRef: MutableRefObject<Record<number, number>>
) {
  const savedTime = playbackPositionsRef.current[logicalIndex];
  if (typeof savedTime !== "number" || !Number.isFinite(savedTime)) {
    return;
  }

  if (Math.abs(video.currentTime - savedTime) < 0.1) {
    return;
  }

  try {
    video.currentTime = savedTime;
  } catch {
    // Metadata may not be ready yet; onLoadedMetadata retries this.
  }
}

function VideoSlide({ slide, isActive, logicalIndex, mediaSlot, playbackPositionsRef }: VideoSlideProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleLoadedMetadata = useCallback(() => {
    if (!videoRef.current) {
      return;
    }

    restoreVideoPlaybackPosition(videoRef.current, logicalIndex, playbackPositionsRef);
  }, [logicalIndex, playbackPositionsRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (isActive) {
      restoreVideoPlaybackPosition(video, logicalIndex, playbackPositionsRef);
      video.play().catch(() => {});
      return;
    }

    playbackPositionsRef.current[logicalIndex] = video.currentTime;
    video.pause();
  }, [isActive, logicalIndex, playbackPositionsRef]);

  useEffect(() => {
    const playbackPositions = playbackPositionsRef.current;
    const video = videoRef.current;

    return () => {
      if (!video) {
        return;
      }

      playbackPositions[logicalIndex] = video.currentTime;
    };
  }, [logicalIndex, playbackPositionsRef]);

  return (
    <EditableSiteVideo
      ref={videoRef}
      src={slide.src}
      videoSlot={mediaSlot}
      label={slide.title}
      autoPlay={isActive}
      muted
      loop
      playsInline
      preload="auto"
      poster={slide.poster}
      className="absolute inset-0 h-full w-full object-cover"
      onLoadedMetadata={handleLoadedMetadata}
    />
  );
}

function getLogicalSlideIndex(index: number, slideCount: number) {
  return ((index % slideCount) + slideCount) % slideCount;
}

export default function SpendLess({ slides: slidesProp, slotPrefix: slotPrefixProp }: SpendLessProps) {
  const pathname = usePathname() ?? "/";
  const slotPrefix = resolveSpendLessSlotPrefix(pathname, slotPrefixProp);
  const slides = slidesProp ?? defaultSpendLessSlides;
  const extendedSlides = useMemo(() => [...slides, ...slides, ...slides], [slides]);

  const [currentIndex, setCurrentIndex] = useState(slides.length); // Start at first "real" slide in middle set
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slideWidth, setSlideWidth] = useState(1200);
  const [gap] = useState(20);
  const playbackPositionsRef = useRef<Record<number, number>>({});

  // Update slide width on resize
  useEffect(() => {
    const updateWidth = () => {
      if (window.innerWidth < 1024) {
        setSlideWidth(window.innerWidth * 0.85);
      } else {
        setSlideWidth(1200);
      }
    };
    
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // Handle infinite loop - snap to equivalent position without animation
  useEffect(() => {
    if (!isTransitioning) return;

    const timer = setTimeout(() => {
      setIsTransitioning(false);
      
      // If we've gone too far left or right, snap to the equivalent middle position
      if (currentIndex < slides.length) {
        setCurrentIndex(currentIndex + slides.length);
      } else if (currentIndex >= slides.length * 2) {
        setCurrentIndex(currentIndex - slides.length);
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [isTransitioning, currentIndex, slides.length]);

  const goToSlide = useCallback((index: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex(index);
  }, [isTransitioning]);

  const goToNext = useCallback(() => {
    goToSlide(currentIndex + 1);
  }, [currentIndex, goToSlide]);

  const goToPrev = useCallback(() => {
    goToSlide(currentIndex - 1);
  }, [currentIndex, goToSlide]);

  const handleNavClick = (index: number) => {
    // Navigate to the equivalent slide in the middle set
    const targetIndex = slides.length + index;
    goToSlide(targetIndex);
  };

  const handleAutoAdvance = useCallback(() => {
    if (isTransitioning) {
      return;
    }

    setIsTransitioning(true);
    setCurrentIndex((index) => index + 1);
  }, [isTransitioning]);

  // Calculate the transform offset to center the current slide
  const getTransformOffset = () => {
    const offset = currentIndex * (slideWidth + gap);
    return -offset;
  };

  const renderSlide = (slide: SpendLessSlide, index: number) => {
    const isCenter = index === currentIndex;
    const logicalIndex = getLogicalSlideIndex(index, slides.length);
    const mediaSlot = buildSpendLessSlideSlot(slotPrefix, logicalIndex);

    return (
      <div
        key={index}
        onClick={() => {
          if (index < currentIndex) goToPrev();
          if (index > currentIndex) goToNext();
        }}
        className={`relative flex-shrink-0 overflow-hidden rounded-[var(--home-card-radius)] ${
          !isCenter ? "cursor-pointer" : ""
        }`}
        style={{
          width: slideWidth,
          height: slideWidth < 1000 ? (slideWidth < 600 ? 400 : 500) : 610,
        }}
      >
        {/* Background - Image or Video */}
        {slide.type === "video" ? (
          <VideoSlide
            slide={slide}
            isActive={isCenter}
            logicalIndex={logicalIndex}
            mediaSlot={mediaSlot}
            playbackPositionsRef={playbackPositionsRef}
          />
        ) : (
          <EditableSiteImage
            src={slide.src}
            photoSlot={mediaSlot}
            alt={slide.title}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 85vw, 1200px"
            priority={isCenter}
          />
        )}
        
        {/* Gradient for text readability */}
        <div 
          className="absolute inset-0 transition-opacity duration-500"
          style={{
            background: "radial-gradient(ellipse at bottom left, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 60%)",
            opacity: isCenter ? 1 : 0,
          }}
        />

        {/* Content */}
        <div 
          className="absolute bottom-0 left-0 flex flex-col gap-2.5 p-8 transition-opacity duration-300 sm:p-12 lg:p-[70px]"
          style={{
            opacity: isCenter ? 1 : 0,
          }}
        >
          <p className="max-w-[249px] text-base font-extrabold leading-[1.5] text-white sm:text-[length:var(--home-text-medium-extra-bold)]">
            {slide.title}
          </p>
          <p className="max-w-[249px] text-sm font-normal leading-[1.5] text-white sm:text-[length:var(--home-h7)]">
            {slide.description}
          </p>
        </div>
      </div>
    );
  };

  // Get the real slide index (0, 1, or 2) for navigation indicator
  const realIndex = currentIndex % slides.length;
  const { isPlaying, autoplayDurationMs, toggle } = useCarouselAutoplay({
    restartKey: realIndex,
    onAdvance: handleAutoAdvance,
  });
  const handleCarouselWheel = useCarouselWheelNavigation({
    onNext: goToNext,
    onPrevious: goToPrev,
  });

  return (
    <section
      className="overflow-hidden bg-[color:var(--home-white)] py-[160px]"
      style={homepageStyleVars}
    >
      {/* Heading */}
      <ViewportReveal
        className="max-w-[1200px] mx-auto px-5 mb-[70px]"
        delayMs={40}
      >
        <h2 className="text-[40px] leading-none capitalize text-[color:var(--home-black)] sm:text-[55px] md:text-[length:var(--home-h2)]">
          Spend Less On Power.
          <br />
          Spend More On Life
        </h2>
      </ViewportReveal>

      {/* Carousel */}
      <ViewportReveal
        className="relative"
        delayMs={140}
        onWheel={handleCarouselWheel}
      >
        <div 
          className="flex items-center"
          style={{
            gap: `${gap}px`,
            transform: `translateX(calc(50vw - ${slideWidth / 2}px + ${getTransformOffset()}px))`,
            transition: isTransitioning ? "transform 700ms cubic-bezier(0.33, 1, 0.68, 1)" : "none",
          }}
        >
          {extendedSlides.map((slide, index) => renderSlide(slide, index))}
        </div>

        {/* Navigation */}
        <div className="flex justify-center mt-8">
          <CarouselIndicators
            count={slides.length}
            activeIndex={realIndex}
            onSelect={handleNavClick}
            isPlaying={isPlaying}
            autoplayDurationMs={autoplayDurationMs}
            onTogglePlayback={toggle}
            playLabel="Play spend less carousel autoplay"
            pauseLabel="Pause spend less carousel autoplay"
          />
        </div>
      </ViewportReveal>
    </section>
  );
}

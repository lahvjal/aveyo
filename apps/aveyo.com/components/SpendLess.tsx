"use client";

import { CarouselIndicators } from "@/components/ui/carousel-indicators";
import { useCarouselAutoplay } from "@/components/ui/use-carousel-autoplay";
import { useCarouselWheelNavigation } from "@/components/ui/use-carousel-wheel-navigation";
import { homepageStyleVars } from "@/lib/homepage-design-system";
import Image from "next/image";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { defaultSpendLessSlides, type SpendLessSlide } from "@/lib/state-page-data";

type SpendLessProps = {
  slides?: SpendLessSlide[];
};

export default function SpendLess({ slides: slidesProp }: SpendLessProps) {
  const slides = slidesProp ?? defaultSpendLessSlides;
  const extendedSlides = useMemo(() => [...slides, ...slides, ...slides], [slides]);

  const [currentIndex, setCurrentIndex] = useState(slides.length); // Start at first "real" slide in middle set
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slideWidth, setSlideWidth] = useState(1200);
  const [gap] = useState(20);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Video slide component to handle play/pause
  const VideoSlide = ({ slide, isCenter }: { slide: SpendLessSlide; isCenter: boolean }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
      if (videoRef.current) {
        if (isCenter) {
          videoRef.current.play().catch(() => {});
        } else {
          videoRef.current.pause();
        }
      }
    }, [isCenter]);

    return (
      <video
        ref={videoRef}
        muted
        loop
        playsInline
        poster={slide.poster}
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src={slide.src} type="video/mp4" />
      </video>
    );
  };

  const renderSlide = (slide: SpendLessSlide, index: number) => {
    const isCenter = index === currentIndex;

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
          <VideoSlide slide={slide} isCenter={isCenter} />
        ) : (
          <Image
            src={slide.src}
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
          className="absolute bottom-0 left-0 p-8 sm:p-12 lg:p-[70px] flex flex-col gap-2.5 transition-all duration-700"
          style={{
            transform: isCenter ? "translateX(0)" : "translateX(340px)",
            opacity: isCenter ? 1 : 0,
            transitionTimingFunction: "cubic-bezier(0.33, 1, 0.68, 1)",
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
      <div className="max-w-[1200px] mx-auto px-5 mb-[70px]">
        <h2 className="text-[40px] leading-none capitalize text-[color:var(--home-black)] sm:text-[55px] md:text-[length:var(--home-h2)]">
          Spend Less On Power.
          <br />
          Spend More On Life
        </h2>
      </div>

      {/* Carousel */}
      <div className="relative" ref={containerRef} onWheel={handleCarouselWheel}>
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
      </div>
    </section>
  );
}

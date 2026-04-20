"use client";

import { homepageStyleVars } from "@/lib/homepage-design-system";
import Image from "next/image";
import { useState, useEffect, useCallback, useRef } from "react";

type SlideType = {
  type: "image" | "video";
  src: string;
  poster?: string;
  title: string;
  description: string;
};

const slides: SlideType[] = [
  {
    type: "video",
    src: "/video/solarsJustSmarter.mp4",
    poster: "/images/b5026257c6fa0a3b4b068cefc432973fe3966e19.png",
    title: "Your home, powered smarter.",
    description: "Solar energy that works around the clock, keeping your family comfortable and connected.",
  },
  {
    type: "image",
    src: "/images/family-karaoke.png",
    title: "Home is where the smart is.",
    description: "Generating pure, sustainable energy means you can power more of what matters most:",
  },
  {
    type: "image",
    src: "/images/45963692b81b39be37da6b988910cdf8f25e2996.png",
    title: "Power up. Bill Down.",
    description: "Power more of what you love doing at-home without worrying about your monthly bill.",
  },
];

// Create extended slides array for infinite loop effect
const extendedSlides = [...slides, ...slides, ...slides];

export default function SpendLess() {
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
  }, [isTransitioning, currentIndex]);

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

  // Calculate the transform offset to center the current slide
  const getTransformOffset = () => {
    const offset = currentIndex * (slideWidth + gap);
    return -offset;
  };

  // Video slide component to handle play/pause
  const VideoSlide = ({ slide, isCenter }: { slide: SlideType; isCenter: boolean }) => {
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

  const renderSlide = (slide: SlideType, index: number) => {
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
      <div className="relative" ref={containerRef}>
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
          <div 
            className="relative flex items-center gap-[25px] px-[30px] py-7 rounded-full overflow-hidden backdrop-blur-[17px]"
            style={{
              background: "linear-gradient(90deg, rgba(0, 0, 0, 0.08) 0%, rgba(0, 0, 0, 0.08) 100%), linear-gradient(90deg, rgba(76, 76, 76, 0.18) 0%, rgba(115, 115, 115, 0.18) 49.519%, rgba(78, 78, 78, 0.18) 100%)"
            }}
          >
            {/* Noise texture overlay */}
            <div 
              className="pointer-events-none absolute inset-0 z-0 rounded-full opacity-[0.06] mix-blend-overlay"
              style={{
                backgroundImage: `url('/images/04ace053e2cc3324a9bd79a136ce79eb15125e2d.png')`,
                backgroundSize: "424px 424px"
              }}
            />
            <div
              className="pointer-events-none absolute inset-0 z-[1] rounded-full p-[0.9px]"
              aria-hidden="true"
              style={{
                background:
                  "linear-gradient(90deg, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.72) 50%, rgba(255,255,255,0.34) 100%)",
                WebkitMask:
                  "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                WebkitMaskComposite: "xor",
                maskComposite: "exclude",
              }}
            />
            
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => handleNavClick(index)}
                className="relative z-10 flex items-center justify-center"
                aria-label={`Go to slide ${index + 1}`}
              >
                <div 
                  className="h-2.5 bg-white rounded-full transition-all duration-300"
                  style={{ width: index === realIndex ? 34 : 10 }}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

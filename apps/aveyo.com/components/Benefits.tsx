"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

type BenefitSlide = {
  title: string;
  description: string;
  image: string;
  alt: string;
  overlayGradient?: string;
  overlayImage?: string;
  textMaxWidth: number;
};

const benefitSlides: BenefitSlide[] = [
  {
    title: "Receive great\ntax breaks\n& incentives",
    description:
      "Every state has its own set of tax breaks and incentives for those who go solar.",
    image: "/images/c0d1abba2b2c1ac1593864f21643530eac213fcd.png",
    alt: "Handshake representing tax incentives",
    overlayGradient:
      "linear-gradient(-90deg, rgba(233, 245, 254, 0) 22.703%, rgba(233, 245, 254, 0.96) 54.328%)",
    textMaxWidth: 403,
  },
  {
    title: "Increase your\nhome's value",
    description:
      "Installing solar panels can significantly enhance your property's value, making it more attractive to potential buyers.",
    image: "/images/85dd509c9b739e584415a89e5c88ae1d363dfc7f.png",
    alt: "Modern home with solar panels",
    textMaxWidth: 369,
  },
  {
    title: "Reduce your\ncarbon footprint",
    description:
      "Going solar is not only good for your wallet but also for the planet. Reduce your reliance on fossil fuels and help combat climate change.",
    image: "/images/dc2367f6d24cea3f9eddecd34270fa88db67d99f.png",
    alt: "Person at home representing sustainability",
    overlayImage: "/images/f53250c103bdb100179a190a6ac36da264063058.png",
    overlayGradient:
      "linear-gradient(-41deg, rgba(255, 255, 255, 0) 42.8%, rgba(255, 255, 255, 0.82) 94.5%)",
    textMaxWidth: 341,
  },
];

const extendedBenefitSlides = [...benefitSlides, ...benefitSlides, ...benefitSlides];

export default function Benefits() {
  const [currentIndex, setCurrentIndex] = useState(benefitSlides.length);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slideWidth, setSlideWidth] = useState(885);
  const [gap] = useState(20);

  useEffect(() => {
    const updateWidth = () => {
      if (window.innerWidth < 640) {
        setSlideWidth(Math.max(300, window.innerWidth * 0.82));
      } else if (window.innerWidth < 1024) {
        setSlideWidth(window.innerWidth * 0.7);
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

  const goToNext = useCallback(() => {
    goToSlide(currentIndex + 1);
  }, [currentIndex, goToSlide]);

  const goToPrev = useCallback(() => {
    goToSlide(currentIndex - 1);
  }, [currentIndex, goToSlide]);

  const handleNavClick = (index: number) => {
    goToSlide(benefitSlides.length + index);
  };

  const getTransformOffset = () => {
    const offset = currentIndex * (slideWidth + gap);
    return -offset;
  };

  const slideHeight = 545;
  const realIndex =
    ((currentIndex % benefitSlides.length) + benefitSlides.length) %
    benefitSlides.length;

  const renderSlide = (slide: BenefitSlide, index: number) => {
    const isCenter = index === currentIndex;

    return (
      <article
        key={`${slide.title}-${index}`}
        onClick={() => {
          if (index < currentIndex) goToPrev();
          if (index > currentIndex) goToNext();
        }}
        className={`relative flex-shrink-0 overflow-hidden rounded-[10px] ${
          !isCenter ? "cursor-pointer" : ""
        }`}
        style={{ width: slideWidth, height: slideHeight }}
      >
        <Image
          src={slide.image}
          alt={slide.alt}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 82vw, (max-width: 1024px) 70vw, 885px"
          priority={isCenter}
        />
        {slide.overlayImage ? (
          <Image
            src={slide.overlayImage}
            alt=""
            fill
            className="object-cover opacity-35"
            sizes="(max-width: 640px) 82vw, (max-width: 1024px) 70vw, 885px"
          />
        ) : null}
        {slide.overlayGradient ? (
          <div className="absolute inset-0" style={{ background: slide.overlayGradient }} />
        ) : null}

        <div
          className="absolute inset-0 flex items-center px-7 py-8 sm:px-10 lg:px-[70px] lg:py-[50px] transition-all duration-700"
          style={{
            transform: isCenter ? "translateX(0)" : "translateX(220px)",
            opacity: isCenter ? 1 : 0,
            transitionTimingFunction: "cubic-bezier(0.33, 1, 0.68, 1)",
          }}
        >
          <div className="flex flex-col gap-3 text-[#212120] sm:gap-5" style={{ maxWidth: `${slide.textMaxWidth}px` }}>
            <h3 className="whitespace-pre-line text-[26px] leading-[1.2] sm:text-[34px] lg:text-[44px]">
              {slide.title}
            </h3>
            <p className="text-sm leading-[1.45] lg:text-base lg:leading-[1.5]">
              {slide.description}
            </p>
          </div>
        </div>
      </article>
    );
  };

  return (
    <section className="bg-white px-5 py-5">
      <div className="flex flex-col gap-5">
        {/* Row 1 - Savings Hero */}
        <div 
          className="relative w-full h-[100vh] min-h-[80vh] rounded-[10px] flex flex-col items-center pt-[240px] overflow-hidden"
          style={{
            background: "linear-gradient(to bottom, #d9f0ff 0%, #669bbc 100%)"
          }}
        >
          {/* Roof Background Image */}
          <div className="absolute bottom-0 left-0 right-0 w-[100%] h-[100%] pointer-events-none">
            <Image
              src="/images/roof.png"
              alt="Roof"
              objectFit="fit"
              width={1000}
              height={1000}
              className="object-cover object-top"
              sizes="100vw"
              style={{ position: "absolute", top: "auto", height: "auto", width: "100%", bottom: "0" }}
            />
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center gap-8 lg:gap-[60px] text-center">
            {/* Heading */}
            <div className="flex flex-col gap-5 items-center">
              <h2 className="text-white text-[40px] sm:text-[55px] lg:text-[70px] leading-[1.2] capitalize">
                How Much Could You
                <br />
                Save By Going Solar?
              </h2>
              <p className="text-white text-lg lg:text-2xl leading-[1.4]">
                (hint: they&apos;re all good things)
              </p>
            </div>

            {/* Savings Display */}
            <div className="flex flex-col items-center justify-center">
              <div className="flex items-start justify-center gap-1.5">
                <span className="text-white text-[80px] lg:text-[122px] font-black leading-[0.8] tracking-tight self-end pb-6 lg:pb-10">
                  $
                </span>
                <span 
                  className="text-[180px] lg:text-[287px] font-black leading-[0.8] tracking-tight"
                  style={{
                    background: "linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.3) 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  50
                </span>
                <div className="flex flex-col justify-end text-white text-lg lg:text-2xl leading-[1.16] tracking-tight self-end pb-6 lg:pb-10">
                  <span>per</span>
                  <span>month</span>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Solar Panels */}
          <div className="absolute bottom-[40%] left-1/2 -translate-x-1/2 w-[45%] h-[200px] lg:h-[250px] flex items-center justify-center z-20">
            {/* Left Panel */}
            <div 
              className="w-[33.3%] h-[240px] mr-[-5%]"
              style={{ filter: "drop-shadow(0px 60px 40px rgba(0,0,0,0.4))" }}
            >
              <Image
                src="/images/70c7503126cf0e979006cc52f143f6f9e8c48785.png"
                alt="Solar panel"
                fill
                className="object-contain"
                sizes="281px"
                style={{position: "absolute", top: "20%" }}
              />
            </div>
            {/* Center Panel */}
            <div 
              className="w-[33.3%] h-[240px] z-[1000] flex items-center justify-center"
              style={{ filter: "drop-shadow(0px 60px 40px rgba(0,0,0,0.4))" }}
            >
              <Image
                src="/images/287b6fd0335e31748824a52330fcbe2370906ae6.png"
                alt="Solar panel"
                objectFit="fit"
                width={1000}
                height={1000}
                className="object-contain"
                sizes="281px"
                style={{ height: "88%", width: "100%" }}
              />
            </div>
            {/* Right Panel */}
            <div 
              className="w-[33.3%] h-[240px] ml-[-5%]"
              style={{ filter: "drop-shadow(0px 60px 40px rgba(0,0,0,0.4))" }}
            >
              <Image
                src="/images/3ad96054047e30dbc89a51be9a76fcb8d78c6537.png"
                alt="Solar panel"
                fill
                className="object-contain"
                sizes="281px"
                style={{position: "absolute", top: "40%" }}
              />
            </div>
          </div>
        </div>

        {/* Row 2 - Benefits Carousel */}
        <div className="relative rounded-[10px]" style={{ height: `${slideHeight}px` }}>
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
            {extendedBenefitSlides.map((slide, index) => renderSlide(slide, index))}
          </div>

          {/* Navigation overlays the bottom of the slides */}
          <div className="pointer-events-none absolute inset-x-0 bottom-[10px] z-20 flex justify-center">
            <div
              className="pointer-events-auto relative flex items-center gap-[25px] overflow-hidden rounded-full px-[30px] py-7 backdrop-blur-[17px]"
              style={{
                background:
                  "linear-gradient(90deg, rgba(0, 0, 0, 0.08) 0%, rgba(0, 0, 0, 0.08) 100%), linear-gradient(90deg, rgba(76, 76, 76, 0.18) 0%, rgba(115, 115, 115, 0.18) 49.519%, rgba(78, 78, 78, 0.18) 100%)",
              }}
            >
              <div
                className="pointer-events-none absolute inset-0 z-0 rounded-full opacity-[0.06] mix-blend-overlay"
                style={{
                  backgroundImage:
                    "url('/images/04ace053e2cc3324a9bd79a136ce79eb15125e2d.png')",
                  backgroundSize: "424px 424px",
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

              {benefitSlides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => handleNavClick(index)}
                  className="relative z-10 flex items-center justify-center"
                  aria-label={`Go to benefit slide ${index + 1}`}
                >
                  <div
                    className="h-2.5 rounded-full bg-white transition-all duration-300"
                    style={{ width: index === realIndex ? 34 : 10 }}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Row 3 - Image Grid */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="relative h-[545px] overflow-hidden rounded-[10px]">
            <Image
              src="/images/c71bbfe115affc201a1c2f1a5878d801dcfcaa9a.png"
              alt=""
              fill
              className="object-cover"
              sizes="(min-width: 1024px) calc((100vw - 60px) / 2), 100vw"
            />
            <Image
              src="/images/07a138d4d98b66756dd6ed3a82d673a7eb8b76f8.png"
              alt="Aerial view of homes with rooftop solar panels"
              fill
              className="object-cover"
              sizes="(min-width: 1024px) calc((100vw - 60px) / 2), 100vw"
            />
          </div>
          <div className="relative h-[545px] overflow-hidden rounded-[10px]">
            <Image
              src="/images/6101f18224076c77286f18820dfd5c3e40ad55fb.png"
              alt="Family preparing food in a bright kitchen"
              fill
              className="object-cover"
              sizes="(min-width: 1024px) calc((100vw - 60px) / 2), 100vw"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

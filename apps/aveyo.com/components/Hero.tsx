"use client";

import Image from "next/image";
import { useState, useEffect } from "react";

const testimonials = [
  {
    quote: "Great company! Very fast and professional",
    name: "James Pisa",
    image: "/images/60ce4b9e24c4050c4952b8dc3b2d103527329365.png",
  },
  {
    quote: "Saved us thousands on our energy bills. Highly recommend!",
    name: "Sarah Mitchell",
    image: "/images/9b1764311761fff86e6a0fc0da2b83c8349b2232.png",
  },
  {
    quote: "The installation was seamless and the team was incredible",
    name: "Michael Chen",
    image: "/images/670245b8e18e43e51438ec1398a32333ad7e8550.png",
  },
  {
    quote: "Best decision we made for our home. Clean energy, real savings",
    name: "Emily Rodriguez",
    image: "/images/8dc0606780d56d1febf32090a940fda53f20c567.png",
  },
];

export default function Hero() {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col justify-between">
      {/* Background Video with Gradient Overlay */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="https://wg22fhqtugwjii3h.public.blob.vercel-storage.com/video/hero-vid.mp4" type="video/mp4" />
        </video>
        {/* Dark radial gradient overlay for text readability */}
        <div 
          className="absolute inset-0 opacity-80"
          style={{
            background: "radial-gradient(ellipse at 14% 47%, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 70%)"
          }}
        />
      </div>

      {/* Container - max-width 1920px, left-aligned content */}
      <div className="relative z-10 w-full max-w-[1920px] mx-auto px-8 pt-[30vh] pb-[80px] flex flex-col justify-between flex-1">
        
        {/* Main Content - Left Aligned */}
        <div className="flex flex-col gap-[50px] items-start w-[656px] max-w-full">
          {/* Headline */}
          <h1 className="font-normal text-5xl sm:text-6xl md:text-7xl lg:text-[95px] text-white leading-none capitalize">
            Power What
            <br />
            Matters Most
          </h1>
          
          {/* Subtitle */}
          <p className="font-normal text-xl sm:text-2xl md:text-[32px] text-white leading-[1.3]">
            Changing your energy means changing lives
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-5 items-start">
            <button className="bg-white text-black px-[22px] py-[18px] rounded-full font-bold text-base flex items-center gap-2 hover:bg-white/90 transition-colors capitalize">
              Pick a Plan
              <svg width="15" height="8" viewBox="0 0 15 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14.3536 4.35355C14.5488 4.15829 14.5488 3.84171 14.3536 3.64645L11.1716 0.464466C10.9763 0.269204 10.6597 0.269204 10.4645 0.464466C10.2692 0.659728 10.2692 0.976311 10.4645 1.17157L13.2929 4L10.4645 6.82843C10.2692 7.02369 10.2692 7.34027 10.4645 7.53553C10.6597 7.7308 10.9763 7.7308 11.1716 7.53553L14.3536 4.35355ZM0 4.5H14V3.5H0V4.5Z" fill="currentColor"/>
              </svg>
            </button>
            <button className="bg-[#212120] text-white px-[22px] py-[18px] rounded-full font-bold text-base flex items-center gap-2 hover:bg-[#212120]/90 transition-colors capitalize">
              How it works
              <svg width="15" height="8" viewBox="0 0 15 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14.3536 4.35355C14.5488 4.15829 14.5488 3.84171 14.3536 3.64645L11.1716 0.464466C10.9763 0.269204 10.6597 0.269204 10.4645 0.464466C10.2692 0.659728 10.2692 0.976311 10.4645 1.17157L13.2929 4L10.4645 6.82843C10.2692 7.02369 10.2692 7.34027 10.4645 7.53553C10.6597 7.7308 10.9763 7.7308 11.1716 7.53553L14.3536 4.35355ZM0 4.5H14V3.5H0V4.5Z" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row items-end justify-between w-full gap-8 mt-auto max-w-[1920px] mx-auto">
          {/* Trust Badge - Left */}
          <div className="flex items-end gap-4 pb-5">
            {/* Avatar Stack */}
            <div className="flex items-center pr-2.5">
              <div className="relative w-[43px] h-[43px] rounded-full overflow-hidden -mr-2.5">
                <Image
                  src="/images/9b1764311761fff86e6a0fc0da2b83c8349b2232.png"
                  alt="Customer"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="relative w-[43px] h-[43px] rounded-full overflow-hidden -mr-2.5">
                <Image
                  src="/images/670245b8e18e43e51438ec1398a32333ad7e8550.png"
                  alt="Customer"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="relative w-[43px] h-[43px] rounded-full overflow-hidden -mr-2.5">
                <Image
                  src="/images/8dc0606780d56d1febf32090a940fda53f20c567.png"
                  alt="Customer"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
            {/* Text */}
            <div className="text-white font-bold text-base capitalize leading-[1.5] whitespace-nowrap">
              <p>Trusted By Over</p>
              <p>+5k Homeowners</p>
            </div>
          </div>

          {/* Testimonial Carousel - Right */}
          <div className="flex flex-col gap-2.5 items-start w-[353px]">
            <div className="relative w-full overflow-hidden">
              <div 
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${activeSlide * 100}%)` }}
              >
                {testimonials.map((testimonial, index) => (
                  <div 
                    key={index}
                    className="w-full flex-shrink-0"
                  >
                    <div 
                      className="relative rounded-[10px] p-[30px] border border-white/[0.78] backdrop-blur-[23px]"
                      style={{
                        background: "linear-gradient(90deg, rgba(0, 0, 0, 0.08) 0%, rgba(0, 0, 0, 0.08) 100%), linear-gradient(90deg, rgba(76, 76, 76, 0.18) 0%, rgba(115, 115, 115, 0.18) 49.519%, rgba(78, 78, 78, 0.18) 100%)"
                      }}
                    >
                      {/* Noise texture overlay */}
                      <div 
                        className="absolute inset-0 rounded-[10px] opacity-[0.06] mix-blend-overlay"
                        style={{
                          backgroundImage: `url('/images/04ace053e2cc3324a9bd79a136ce79eb15125e2d.png')`,
                          backgroundSize: "424px 424px"
                        }}
                      />
                      <div className="relative flex flex-col gap-5">
                        <p className="text-white font-bold text-base leading-[1.2]">
                          {testimonial.quote}
                        </p>
                        <div className="flex items-center gap-2.5">
                          <div className="relative w-[27px] h-[27px] rounded-full overflow-hidden">
                            <Image
                              src={testimonial.image}
                              alt={testimonial.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <p className="text-white text-[13px] leading-[1.2]">{testimonial.name}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Progress Indicator Navigation */}
            <div className="w-full flex gap-2.5">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveSlide(index)}
                  className={`flex-1 h-[2px] rounded-full transition-colors duration-300 ${
                    index === activeSlide ? "bg-white" : "bg-white/30"
                  }`}
                  aria-label={`Go to testimonial ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

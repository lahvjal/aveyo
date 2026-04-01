export default function CTASection() {
  return (
    <section id="contact" className="py-20 lg:py-28 bg-brand-cream relative overflow-hidden">
      {/* Decorative A Logo */}
      <div className="absolute bottom-0 right-0 pointer-events-none opacity-10">
        <svg
          viewBox="0 0 200 200"
          className="w-[400px] h-[400px] text-brand-navy translate-x-1/4 translate-y-1/4"
          fill="currentColor"
        >
          <path d="M100 20L40 180H60L75 140H125L140 180H160L100 20ZM85 120L100 70L115 120H85Z" />
        </svg>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center">
          <h2 className="font-serif text-4xl sm:text-5xl text-brand-navy mb-6 leading-tight">
            Speak With An Aveyo Advisor.
            <br />
            See What Solar Can Do For You.
          </h2>
          <p className="text-brand-gray max-w-2xl mx-auto mb-8">
            Get a free, no-obligation quote and find out how much you could save by switching to solar energy. Our advisors are here to answer all your questions.
          </p>
          <button className="px-8 py-4 bg-brand-navy text-white rounded-full font-medium hover:bg-brand-navy/90 transition-all">
            Get My Free Quote
          </button>
        </div>
      </div>
    </section>
  );
}


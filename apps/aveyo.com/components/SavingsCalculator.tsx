import { EditableSiteImage } from "@/components/site/editable-site-image";

export default function SavingsCalculator() {
  return (
    <section className="py-20 lg:py-28 bg-brand-navy relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-white">
            <p className="text-brand-gold text-sm font-medium tracking-wider uppercase mb-4">
              Savings Calculator
            </p>
            <h2 className="font-serif text-4xl sm:text-5xl leading-tight mb-6">
              How Much Could You
              <br />
              Save By Going Solar?
            </h2>
            <div className="flex items-baseline gap-2 mb-6">
              <span className="font-serif text-7xl sm:text-8xl text-brand-gold">$50</span>
              <span className="text-white/60 text-xl">+/mo</span>
            </div>
            <p className="text-white/70 max-w-md">
              The average homeowner saves over $50 per month on their electricity bill after switching to solar. Start your journey to energy independence today.
            </p>
          </div>

          {/* Right - Laptop Mockup */}
          <div className="relative">
            <div className="relative z-10">
              {/* Laptop frame placeholder */}
              <div className="relative bg-gray-800 rounded-2xl p-4 shadow-2xl">
                <div className="bg-gray-900 rounded-lg aspect-[16/10] flex items-center justify-center">
                  <div className="text-center p-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-brand-gold/20 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-white/60 text-sm">Solar Savings Calculator</p>
                  </div>
                </div>
                {/* Laptop base */}
                <div className="h-4 bg-gray-700 -mx-4 -mb-4 rounded-b-2xl mt-4" />
              </div>
              {/* Actual image overlay */}
              <EditableSiteImage
                src="/images/laptop-mockup.png"
                alt="Savings calculator on laptop"
                width={600}
                height={400}
                className="w-full h-auto absolute inset-0"
              />
            </div>
            {/* Decorative glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-gold/20 rounded-full blur-3xl" />
          </div>
        </div>
      </div>

      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>
    </section>
  );
}


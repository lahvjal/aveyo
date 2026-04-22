import { CardGradientBorder } from "@/components/ui/card-gradient-border";
import { homepageStyleVars } from "@/lib/homepage-design-system";

type TrustSeal = {
  eyebrow: string;
  title: string;
  description: string;
  glow: string;
  mark: "google" | "bbb" | "uv50";
};

const trustSeals: TrustSeal[] = [
  {
    eyebrow: "Google Reviews",
    title: "4.9 Star Rating",
    description:
      "Homeowners consistently rate Aveyo highly for clarity, communication, and the overall installation experience.",
    glow: "rgba(251, 188, 4, 0.28)",
    mark: "google"
  },
  {
    eyebrow: "Better Business Bureau",
    title: "A+ BBB Rating",
    description:
      "Aveyo holds an A+ BBB rating, reflecting our commitment to trust, accountability, and doing right by customers.",
    glow: "rgba(32, 94, 173, 0.18)",
    mark: "bbb"
  },
  {
    eyebrow: "Utah Valley BusinessQ",
    title: "UV50 #1 Startup To Watch",
    description:
      "Recognized by the UV50 for the momentum, innovation, and local impact Aveyo is building right here in Utah Valley.",
    glow: "rgba(241, 184, 70, 0.26)",
    mark: "uv50"
  }
];

function StarIcon() {
  return (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

function GoogleSealMark() {
  return (
    <div className="relative flex h-[166px] w-[166px] items-center justify-center rounded-full bg-white shadow-[0_24px_60px_rgba(15,23,42,0.12)] ring-1 ring-black/[0.08]">
      <div className="absolute inset-[10px] rounded-full border border-black/[0.06]" aria-hidden="true" />
      <div className="text-center">
        <div className="flex justify-center gap-1.5" aria-hidden="true">
          {["#4285F4", "#EA4335", "#FBBC05", "#34A853"].map((color) => (
            <span key={color} className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
          ))}
        </div>
        <div className="mt-3 text-[12px] font-black uppercase tracking-[0.28em] text-[#5F6368]">Google</div>
        <div className="mt-3 flex justify-center gap-1 text-[#F0B046]" aria-hidden="true">
          {Array.from({ length: 5 }).map((_, index) => (
            <StarIcon key={index} />
          ))}
        </div>
        <div className="mt-3 text-[56px] font-black leading-none tracking-[-0.04em] text-[color:var(--home-black)]">
          4.9
        </div>
      </div>
    </div>
  );
}

function BbbSealMark() {
  return (
    <div className="relative flex h-[166px] w-[166px] items-center justify-center rounded-full bg-[linear-gradient(180deg,#0D5CC0_0%,#093C84_100%)] text-white shadow-[0_24px_60px_rgba(15,23,42,0.14)] ring-1 ring-[#0D5CC0]/30">
      <div className="absolute inset-[10px] rounded-full border border-white/25" aria-hidden="true" />
      <div className="absolute inset-[22px] rounded-full border border-white/12" aria-hidden="true" />
      <div className="text-center">
        <div className="text-[12px] font-black uppercase tracking-[0.3em] text-white/82">BBB</div>
        <div className="mt-3 text-[58px] font-black leading-none tracking-[-0.04em]">A+</div>
        <div className="mt-3 text-[11px] font-bold uppercase tracking-[0.28em] text-white/82">Accredited</div>
      </div>
    </div>
  );
}

function Uv50SealMark() {
  return (
    <div className="relative flex h-[188px] items-end justify-center">
      <div
        className="absolute bottom-0 left-1/2 h-[58px] w-[30px] -translate-x-[54px] rotate-[-8deg] rounded-b-[12px] bg-[#BC7D1C]"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 left-1/2 h-[58px] w-[30px] translate-x-[24px] rotate-[8deg] rounded-b-[12px] bg-[#D89B32]"
        aria-hidden="true"
      />
      <div className="relative flex h-[162px] w-[162px] items-center justify-center rounded-full bg-[linear-gradient(180deg,#FCE3A4_0%,#F1B846_100%)] shadow-[0_24px_60px_rgba(111,74,14,0.18)] ring-1 ring-[#C98E25]/40">
        <div className="absolute inset-[10px] rounded-full border border-white/40" aria-hidden="true" />
        <div className="absolute inset-[22px] rounded-full border border-[#8A5A07]/18" aria-hidden="true" />
        <div className="text-center text-[#6B4500]">
          <div className="text-[11px] font-black uppercase tracking-[0.24em]">Utah Valley</div>
          <div className="mt-2 text-[38px] font-black leading-none tracking-[-0.04em]">UV50</div>
          <div className="mt-2 text-[12px] font-black uppercase tracking-[0.22em]">#1 Startup</div>
        </div>
      </div>
    </div>
  );
}

function SealMark({ mark }: { mark: TrustSeal["mark"] }) {
  switch (mark) {
    case "google":
      return <GoogleSealMark />;
    case "bbb":
      return <BbbSealMark />;
    case "uv50":
      return <Uv50SealMark />;
    default:
      return null;
  }
}

export default function TrustSeals() {
  return (
    <section className="bg-[color:var(--home-white)] px-5 pb-20 lg:pb-28" style={homepageStyleVars}>
      <div className="mx-auto max-w-[1200px]">
        <div className="mx-auto max-w-[760px] text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--home-gray-light-5)] px-4 py-2 text-sm font-semibold text-[color:var(--home-black)] shadow-[0_8px_24px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.04]">
            <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--home-testimonial-star)]" aria-hidden="true" />
            Recognized &amp; Rated
          </div>
          <h2 className="mt-5 font-telegraf text-[40px] leading-[1.05] text-[color:var(--home-black)] sm:text-[55px] lg:text-[length:var(--home-h2)]">
            Recognition That Reflects The Standard We Build To
          </h2>
          <p className="mt-5 text-[15px] leading-[1.7] text-[color:var(--home-gray-dark-4)] sm:text-[length:var(--home-paragraph)]">
            From homeowner reviews to independent accreditation and local business recognition, these seals reinforce
            the trust Aveyo works to earn on every project.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {trustSeals.map((seal) => (
            <article
              key={seal.title}
              className="relative h-full overflow-hidden rounded-[var(--home-card-radius)] border border-black/[0.05] bg-[color:var(--home-gray-light-5)] px-6 py-8 shadow-[0_20px_50px_rgba(15,23,42,0.06)] sm:px-8"
            >
              <CardGradientBorder className="rounded-[var(--home-card-radius)]" />
              <div
                className="pointer-events-none absolute left-1/2 top-2 h-28 w-40 -translate-x-1/2 rounded-full blur-3xl"
                style={{ background: seal.glow }}
                aria-hidden="true"
              />
              <div className="relative z-[2] flex h-full flex-col items-center text-center">
                <div className="flex min-h-[188px] items-center justify-center">
                  <SealMark mark={seal.mark} />
                </div>
                <div className="mt-4 inline-flex rounded-full bg-black/[0.04] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--home-gray-dark-4)]">
                  {seal.eyebrow}
                </div>
                <h3 className="mt-5 text-[30px] font-extrabold leading-[1.05] tracking-[-0.02em] text-[color:var(--home-black)]">
                  {seal.title}
                </h3>
                <p className="mt-4 max-w-[320px] text-[15px] leading-[1.65] text-[color:var(--home-gray-dark-4)] sm:text-base">
                  {seal.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

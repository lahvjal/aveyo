import { EditableSiteImage } from "@/components/site/editable-site-image";
import { CardGradientBorder } from "@/components/ui/card-gradient-border";
import { ViewportReveal } from "@/components/ui/viewport-reveal";
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
    eyebrow: "On Google",
    title: "4.7 Stars on Google",
    description:
      "Based on customer reviews on Google as of April 2026.",
    glow: "rgba(15, 23, 42, 0.08)",
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

const GOOGLE_G_ICON_SRC = "/images/google-g-icon.png";
const UV50_SEAL_SRC =
  "/images/uuid=5D04EEDD-1AB9-41F2-9354-F9A4E8129BFE&code=001&library=3&type=1&mode=1&loc=true&cap=true.png";

function GoogleSealMark() {
  return (
    <div className="flex w-full items-center justify-center">
      <EditableSiteImage
        src={GOOGLE_G_ICON_SRC}
        alt=""
        aria-hidden="true"
        width={512}
        height={512}
        sizes="120px"
        className="h-[120px] w-[120px]"
      />
    </div>
  );
}

function BbbSealMark() {
  return (
    <div className="flex w-full max-w-[280px] items-center justify-center">
      <iframe
        title="BBB Accredited Business seal"
        frameBorder="0"
        scrolling="no"
        sandbox="allow-scripts allow-same-origin"
        referrerPolicy="strict-origin-when-cross-origin"
        style={{ border: 0, height: 80, width: 280, maxWidth: "100%" }}
        src="https://seal-utah.bbb.org/frame/blue-seal-280-80-bbb-90036849.png?chk=AE5088513B"
      />
    </div>
  );
}

function Uv50SealMark() {
  return (
    <div className="flex w-full max-w-[250px] items-center justify-center">
      <EditableSiteImage
        src={UV50_SEAL_SRC}
        alt="UV50 2025 Winner seal"
        width={1024}
        height={768}
        sizes="(min-width: 1024px) 250px, (min-width: 640px) 220px, 70vw"
        className="h-auto w-full object-contain"
      />
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
        <ViewportReveal
          className="mx-auto max-w-[760px] text-center"
          delayMs={40}
        >
          <h2 className="font-telegraf text-[40px] leading-[1.05] text-[color:var(--home-black)] sm:text-[55px] lg:text-[length:var(--home-h2)]">
            Recognition That Reflects The Standard We Build To
          </h2>
          <p className="mt-5 text-[15px] leading-[1.7] text-[color:var(--home-gray-dark-4)] sm:text-[length:var(--home-paragraph)]">
            From homeowner reviews to independent accreditation and local business recognition, these seals reinforce
            the trust Aveyo works to earn on every project.
          </p>
        </ViewportReveal>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {trustSeals.map((seal, index) => (
            <ViewportReveal
              key={seal.title}
              as="article"
              className="relative h-full overflow-hidden rounded-[var(--home-card-radius)] border border-black/[0.05] bg-[color:var(--home-gray-light-5)] px-6 py-8 shadow-[0_20px_50px_rgba(15,23,42,0.06)] sm:px-8"
              delayMs={120 + index * 90}
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
            </ViewportReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ViewportReveal } from "@/components/ui/viewport-reveal";
import designSystem from "@/design-system.json";
import {
  AVEYO_ADDRESS,
  AVEYO_CUSTOMER_CARE_PHONE,
  AVEYO_CUSTOMER_CARE_PHONE_HREF,
  AVEYO_INFO_EMAIL,
  AVEYO_INFO_EMAIL_HREF,
  AVEYO_SALES_PHONE,
  AVEYO_SALES_PHONE_HREF
} from "@/lib/site-config";
import {
  buildPricingModalHref,
  isHomePath,
  isPricingSectionHref
} from "@/lib/pricing-navigation";
import { stateNavLinks } from "@/lib/state-page-data";

export interface FooterCtaConfig {
  eyebrow?: string;
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}

const footerColumns: Array<{
  label: string;
  links: Array<{ name: string; href: string }>;
}> = [
  {
    label: "Footer company links",
    links: [
      { name: "About Us", href: "/about" },
      { name: "Services", href: "/process" },
      { name: "Solar Calculator", href: "/contact#sales-form" },
      { name: "Blog", href: "/newsfeed" },
      { name: "Contact Us", href: "/contact" }
    ]
  },
  {
    label: "Footer support links",
    links: [
      { name: "FAQs", href: "/contact" },
      { name: "Support", href: AVEYO_CUSTOMER_CARE_PHONE_HREF },
      {
        name: "Terms of Use",
        href: `${AVEYO_INFO_EMAIL_HREF}?subject=${encodeURIComponent("Aveyo Terms Of Use")}`
      },
      {
        name: "Privacy Policy",
        href: `${AVEYO_INFO_EMAIL_HREF}?subject=${encodeURIComponent("Aveyo Privacy Policy")}`
      }
    ]
  },
  {
    label: "Footer location links",
    links: stateNavLinks
  }
];

const legalLinks = [
  {
    name: "Privacy Policy",
    href: `${AVEYO_INFO_EMAIL_HREF}?subject=${encodeURIComponent("Aveyo Privacy Policy")}`
  },
  {
    name: "Terms of Service",
    href: `${AVEYO_INFO_EMAIL_HREF}?subject=${encodeURIComponent("Aveyo Terms Of Service")}`
  },
  {
    name: "Cookies Policy",
    href: `${AVEYO_INFO_EMAIL_HREF}?subject=${encodeURIComponent("Aveyo Cookies Policy")}`
  }
] as const;

const contactLinks = [
  { name: AVEYO_SALES_PHONE, href: AVEYO_SALES_PHONE_HREF },
  { name: AVEYO_CUSTOMER_CARE_PHONE, href: AVEYO_CUSTOMER_CARE_PHONE_HREF },
  { name: AVEYO_INFO_EMAIL, href: AVEYO_INFO_EMAIL_HREF }
] as const;

const footerAddresses = [
  { state: "California", address: "1640 Second St, Norco, CA 92860" },
  { state: "Illinois", address: "916 Community Dr, Springfield, IL 62703" },
  { state: "Pennsylvania", address: "8162 Perry Hwy, Pittsburgh, PA 15237" },
  { state: "Utah", address: AVEYO_ADDRESS }
] as const;

const footerTokens = designSystem.components.footer;
const designTokens = designSystem.tokens;

const defaultCta: Required<Pick<FooterCtaConfig, "title" | "description" | "actionLabel">> = {
  title: "Speak With An Aveyo Advisor. See What Solar Can Do For You.",
  description: "We're here to answer your burning questions. No upsells. No commitments. Just top-tier help.",
  actionLabel: "Ask Ava"
};

const footerStyleVars = {
  "--footer-black": designTokens.colors.black,
  "--footer-white": designTokens.colors.white,
  "--footer-gray-light": designTokens.colors.grayLight4,
  "--footer-ava-accent": designTokens.colors.footerAvaAccent,
  "--footer-h2": `${designTokens.fontSize.h2}px`,
  "--footer-h5": `${designTokens.fontSize.h5}px`,
  "--footer-h7": `${designTokens.fontSize.h7}px`,
  "--footer-paragraph": `${designTokens.fontSize.paragraph}px`,
  "--footer-button-px": `${designTokens.spacing.buttonHorizontal}px`,
  "--footer-button-py": `${designTokens.spacing.buttonVertical}px`,
  "--footer-footer-px": `${designTokens.spacing.footerHorizontal}px`,
  "--footer-footer-py": `${designTokens.spacing.footerVertical}px`,
  "--footer-button-radius": `${designTokens.radius.button}px`,
  "--footer-height": `${footerTokens.layout.height}px`,
  "--footer-cta-top": `${footerTokens.layout.ctaTop}px`,
  "--footer-cta-width": `${footerTokens.layout.ctaContentWidth}px`,
  "--footer-image-top": `${footerTokens.layout.imageTop}px`,
  "--footer-image-height": `${footerTokens.layout.imageHeight}px`,
  "--footer-brand-width": `${footerTokens.layout.brandMarkWidth}px`,
  "--footer-brand-height": `${footerTokens.layout.brandMarkHeight}px`,
  "--footer-panel-height": `${footerTokens.layout.bottomPanelHeight}px`,
  "--footer-button-width": `${footerTokens.button.width}px`,
  "--footer-button-height": `${footerTokens.button.height}px`,
  "--footer-panel-blur": `${footerTokens.effects.panelBlur}px`
} as CSSProperties;

function isExternalHref(href: string) {
  return (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  );
}

function renderFooterLink(link: { name: string; href: string }, className: string) {
  if (isExternalHref(link.href)) {
    return (
      <a
        href={link.href}
        className={className}
        target={link.href.startsWith("http") ? "_blank" : undefined}
        rel={link.href.startsWith("http") ? "noreferrer" : undefined}
      >
        {link.name}
      </a>
    );
  }

  return (
    <Link href={link.href} className={className}>
      {link.name}
    </Link>
  );
}

function splitLines(value: string) {
  return value.split("\n");
}

function buildMapsSearchHref(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function openAvaWidget() {
  const launcher = document.querySelector<HTMLButtonElement>('button[aria-label="Open Ava widget"]');
  if (launcher) {
    launcher.click();
    launcher.focus();
    return;
  }

  window.location.assign("/contact");
}

function handleFooterAction(
  actionHref: string | undefined,
  pathname: string,
  searchParams: ReturnType<typeof useSearchParams>,
  router: ReturnType<typeof useRouter>
) {
  if (actionHref) {
    if (isPricingSectionHref(actionHref) && !isHomePath(pathname)) {
      router.push(buildPricingModalHref(pathname, searchParams), { scroll: false });
      return;
    }
    window.location.assign(actionHref);
    return;
  }

  openAvaWidget();
}

function AvaGlyphIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M23.6958 30.57C24.6443 27.2441 27.244 24.6444 30.5699 23.6959L50.8524 17.9116C51.6065 17.6966 52.3034 18.3935 52.0884 19.1476L46.3041 39.4301C45.3556 42.756 42.7559 45.3557 39.43 46.3042L19.1475 52.0884C18.3935 52.3035 17.6965 51.6065 17.9116 50.8525L23.6958 30.57Z"
        fill="white"
      />
    </svg>
  );
}

function ArrowGlyph() {
  return (
    <svg color="white" width="15" height="8" viewBox="0 0 15 8" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M14.3536 4.35355C14.5488 4.15829 14.5488 3.84171 14.3536 3.64645L11.1716 0.464466C10.9763 0.269204 10.6597 0.269204 10.4645 0.464466C10.2692 0.659728 10.2692 0.976311 10.4645 1.17157L13.2929 4L10.4645 6.82843C10.2692 7.02369 10.2692 7.34027 10.4645 7.53553C10.6597 7.7308 10.9763 7.7308 11.1716 7.53553L14.3536 4.35355ZM0 4.5H14V3.5H0V4.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function AskAvaBadge() {
  return (
    <span className="inline-flex w-[50px] items-center gap-[5px] leading-none text-white font-bold">
      <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[var(--footer-ava-accent)]">
        <AvaGlyphIcon />

      </span>
      <span className="leading-none text-[var(--footer-h7)]">Ava</span>
    </span>
  );
}

export default function Footer({ cta, image }: { cta?: FooterCtaConfig; image?: string }) {
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const router = useRouter();
  const resolvedCta = {
    title: cta?.title ?? defaultCta.title,
    description: cta?.description ?? defaultCta.description,
    actionLabel: cta?.actionLabel ?? defaultCta.actionLabel,
    actionHref: cta?.actionHref
  };
  const titleLines = splitLines(resolvedCta.title);
  const descriptionLines = splitLines(resolvedCta.description);
  const usesAskAvaPill = !resolvedCta.actionHref && resolvedCta.actionLabel.trim().toLowerCase() === "ask ava";

  return (
    <footer
      className="relative overflow-hidden bg-[var(--footer-gray-light)] text-[var(--footer-black)]"
      style={footerStyleVars}
    >
      <div className="relative min-h-[1480px] sm:min-h-[1660px] xl:h-[var(--footer-height)]">
        <div
          className="absolute inset-0"
          style={{ background: footerTokens.backgrounds.rootGradient }}
        />

        <div className="absolute inset-x-0 left-1/2 top-[88px] z-20 w-[calc(100%-2rem)] max-w-[1200px] -translate-x-1/2 sm:top-[132px] xl:top-[var(--footer-cta-top)] xl:w-[var(--footer-cta-width)]">
          <ViewportReveal
            className="text-center"
            delayMs={40}
          >
            <h2 className="mx-auto max-w-[1000px] text-[42px] leading-[0.96] tracking-[-0.04em] sm:text-[56px] xl:text-[var(--footer-h2)]">
              {titleLines.map((line, index) => (
                <span key={`${line}-${index}`}>
                  {index > 0 ? <br /> : null}
                  {line}
                </span>
              ))}
            </h2>

            <p className="mx-auto mt-8 max-w-[600px] text-base leading-[1.4] text-[var(--footer-black)]/88 sm:text-[20px] xl:w-[600px] xl:text-[var(--footer-h5)]">
              {descriptionLines.map((line, index) => (
                <span key={`${line}-${index}`}>
                  {index > 0 ? <br /> : null}
                  {line}
                </span>
              ))}
            </p>

            <div className="mt-10 flex justify-center sm:mt-12 xl:mt-[60px]">
              <button
                type="button"
                onClick={() =>
                  handleFooterAction(resolvedCta.actionHref, pathname, searchParams, router)
                }
                className={`inline-flex min-h-[54px] items-center whitespace-nowrap rounded-[var(--footer-button-radius)] bg-[var(--footer-black)] px-[var(--footer-button-px)] py-[var(--footer-button-py)] text-[var(--footer-h7)] font-medium leading-none tracking-[-0.01em] text-white transition-transform duration-200 hover:scale-[1.01] xl:h-[var(--footer-button-height)] ${
                  usesAskAvaPill ? "justify-between" : "justify-center gap-2"
                }`}
                style={usesAskAvaPill ? { width: `${footerTokens.button.width}px` } : undefined}
              >
                {usesAskAvaPill ? (
                  <>
                    <span className="leading-none font-bold text-white">Ask</span>
                    <AskAvaBadge />
                    <ArrowGlyph />
                  </>
                ) : (
                  <>
                    <span className="leading-none text-white">{resolvedCta.actionLabel}</span>
                    <ArrowGlyph />
                  </>
                )}
              </button>
            </div>
          </ViewportReveal>
        </div>

        <div className="absolute inset-x-0 bottom-0 top-[460px] sm:top-[560px] xl:top-[var(--footer-image-top)]">
          <div className="relative h-full">
            <div
              className="absolute left-1/2 top-0 h-[343px] w-[440px] -translate-x-1/2 sm:h-[500px] sm:w-[640px] xl:h-[var(--footer-brand-height)] xl:w-[var(--footer-brand-width)]"
              style={{ opacity: footerTokens.effects.brandMarkOpacity }}
              aria-hidden="true"
            >
              <Image
                src={footerTokens.assets.backgroundLogo}
                alt=""
                fill
                sizes="(min-width: 1280px) 870px, (min-width: 640px) 640px, 440px"
                className="object-contain"
              />
            </div>

            <div className="absolute inset-x-0 bottom-0 h-[920px] w-full sm:h-[1080px] xl:h-[var(--footer-image-height)]">
              <Image
                src={image ?? footerTokens.assets.houseImage}
                alt=""
                fill
                sizes="100vw"
                className="object-cover"
              />
              <div
                className="absolute inset-0"
                style={{ background: footerTokens.backgrounds.imageFade }}
              />
            </div>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 z-30 h-[420px] text-white sm:h-[430px] xl:h-[var(--footer-panel-height)]">
          <div
            className="absolute inset-0 overflow-hidden backdrop-blur-[var(--footer-panel-blur)]"
            style={{ background: footerTokens.backgrounds.panelOverlay }}
          >
            <div className="absolute left-[-120px] top-[18px] h-[220px] w-[360px] rounded-full bg-black/24 blur-[120px]" />
            <div className="absolute left-[23%] top-[30px] h-[230px] w-[260px] rounded-full bg-black/18 blur-[120px]" />
            <div className="absolute right-[-140px] top-[46px] h-[260px] w-[340px] rounded-full bg-[#728055]/20 blur-[140px]" />
            <div
              className="absolute inset-0 mix-blend-overlay"
              style={{
                opacity: footerTokens.effects.panelNoiseOpacity,
                backgroundImage: "url('/images/04ace053e2cc3324a9bd79a136ce79eb15125e2d.png')",
                backgroundSize: "424px 424px"
              }}
            />
          </div>

          <ViewportReveal
            className="relative flex h-full flex-col border-t border-[rgba(255,255,255,0.28)] px-6 py-10 sm:px-8 xl:px-[var(--footer-footer-px)] xl:py-[var(--footer-footer-py)]"
            delayMs={160}
          >
            <div className="grid flex-1 gap-10 sm:gap-12 lg:grid-cols-[minmax(0,1fr)_160px_160px_160px] xl:gap-14">
              <div className="max-w-[520px]">
                <Link href="/" className="inline-flex items-center">
                  <Image src="/aveyo-logo.svg" alt="Aveyo" width={110} height={24} className="h-6 w-auto" />
                </Link>

                <div className="mt-7 grid gap-5 text-[13px] leading-[1.65] text-white/88 sm:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] sm:gap-6 xl:text-[var(--footer-paragraph)]">
                  <div className="min-w-0">
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.22em] text-white/58">
                      Addresses:
                    </p>
                    <div className="space-y-4">
                      {footerAddresses.map((location) => (
                        <div key={location.state}>
                          <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.2em] text-white/58">
                            {location.state}
                          </p>
                          <a
                            href={buildMapsSearchHref(location.address)}
                            target="_blank"
                            rel="noreferrer"
                            className="block transition-colors hover:text-white"
                          >
                            {location.address}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.22em] text-white/58">
                      Contact:
                    </p>
                    <div className="flex flex-col">
                      {contactLinks.map((link) => (
                        <a key={link.name} href={link.href} className="transition-colors hover:text-white">
                          {link.name}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {footerColumns.map((column) => (
                <nav key={column.label} aria-label={column.label}>
                  <ul className="space-y-2.5 text-[13px] leading-[1.7] text-white/88 xl:text-[var(--footer-paragraph)]">
                    {column.links.map((link) => (
                      <li key={link.name}>
                        {renderFooterLink(link, "transition-colors hover:text-white")}
                      </li>
                    ))}
                  </ul>
                </nav>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-4 border-t border-white/36 pt-4 text-[11px] leading-[1.45] text-white/74 sm:flex-row sm:items-center sm:justify-between xl:text-[12px]">
              <p>© {new Date().getFullYear()} Aveyo Solar. All rights reserved.</p>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {legalLinks.map((link) => (
                  <span key={link.name}>
                    {renderFooterLink(link, "transition-colors hover:text-white")}
                  </span>
                ))}
              </div>
            </div>
          </ViewportReveal>
        </div>
      </div>
    </footer>
  );
}


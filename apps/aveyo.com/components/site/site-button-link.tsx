"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  PRICING_SECTION_HREF,
  buildPricingModalHref,
  buildPricingModalHrefFromCurrentLocation,
  isHomePath,
  isPricingSectionHref
} from "@/lib/pricing-navigation";
import { OPEN_AVA_WIDGET_HREF, openAvaWidget } from "@/lib/ava-widget";

type SiteButtonVariant = "dark" | "light" | "outline" | "ghost";
type SiteButtonSize = "sm" | "md";

function getVariantClasses(variant: SiteButtonVariant) {
  switch (variant) {
    case "light":
      return "bg-white bg-[color:var(--site-white)] text-[#212120] text-[color:var(--site-black)] hover:bg-white/90";
    case "outline":
      return "border border-white/30 bg-white/10 text-white hover:bg-white/20";
    case "ghost":
      return "border border-[#212120]/15 bg-transparent text-[#212120] text-[color:var(--site-black)] hover:bg-[#212120]/5";
    case "dark":
    default:
      return "bg-[#212120] bg-[color:var(--site-black)] text-white hover:opacity-90";
  }
}

function getSizeClasses(size: SiteButtonSize) {
  switch (size) {
    case "sm":
      return "rounded-full rounded-[var(--site-button-radius)] px-[var(--site-button-px)] py-[var(--site-button-py)] text-[length:var(--site-paragraph)]";
    case "md":
    default:
      return "rounded-full rounded-[var(--site-button-radius)] px-[var(--site-button-px)] py-[var(--site-button-py)] text-base text-[length:var(--site-button-text)]";
  }
}

function isExternalHref(href: string) {
  return (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  );
}

function shouldPreserveCurrentSearch(event: React.MouseEvent<HTMLAnchorElement>) {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    (!event.currentTarget.target || event.currentTarget.target === "_self")
  );
}

export interface SiteButtonLinkProps {
  href: string;
  children: React.ReactNode;
  variant?: SiteButtonVariant;
  size?: SiteButtonSize;
  className?: string;
  target?: string;
}

export function SiteButtonLink({
  href,
  children,
  variant = "dark",
  size = "md",
  className = "",
  target
}: SiteButtonLinkProps) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const composedClassName = [
    "inline-flex items-center justify-center gap-2 font-bold transition-colors",
    getVariantClasses(variant),
    getSizeClasses(size),
    className
  ]
    .filter(Boolean)
    .join(" ");

  if (href === OPEN_AVA_WIDGET_HREF) {
    return (
      <button
        type="button"
        className={composedClassName}
        onClick={() => openAvaWidget()}
      >
        {children}
      </button>
    );
  }

  if (isExternalHref(href)) {
    return (
      <a
        href={href}
        target={target}
        rel={target === "_blank" ? "noreferrer" : undefined}
        className={composedClassName}
      >
        {children}
      </a>
    );
  }

  if (isPricingSectionHref(href)) {
    const pricingHref = buildPricingModalHref(pathname);

    if (isHomePath(pathname)) {
      return (
        <Link href={PRICING_SECTION_HREF} className={composedClassName}>
          {children}
        </Link>
      );
    }

    return (
      <Link
        href={pricingHref}
        scroll={false}
        className={composedClassName}
        onClick={(event) => {
          if (!shouldPreserveCurrentSearch(event)) {
            return;
          }

          event.preventDefault();
          router.push(buildPricingModalHrefFromCurrentLocation(pathname), { scroll: false });
        }}
      >
        {children}
      </Link>
    );
  }

  return (
    <Link href={href} className={composedClassName}>
      {children}
    </Link>
  );
}

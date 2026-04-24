"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  PRICING_SECTION_HREF,
  buildPricingModalHref,
  isHomePath,
  isPricingSectionHref
} from "@/lib/pricing-navigation";

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
  const searchParams = useSearchParams();
  const composedClassName = [
    "inline-flex items-center justify-center gap-2 font-bold transition-colors",
    getVariantClasses(variant),
    getSizeClasses(size),
    className
  ]
    .filter(Boolean)
    .join(" ");

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
    if (isHomePath(pathname)) {
      return (
        <Link href={PRICING_SECTION_HREF} className={composedClassName}>
          {children}
        </Link>
      );
    }

    return (
      <Link
        href={buildPricingModalHref(pathname, searchParams)}
        scroll={false}
        className={composedClassName}
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

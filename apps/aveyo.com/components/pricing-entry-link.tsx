"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  PRICING_SECTION_HREF,
  buildPricingModalHref,
  isHomePath
} from "@/lib/pricing-navigation";

interface PricingEntryLinkProps {
  className?: string;
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}

export function PricingEntryLink({
  className = "",
  children,
  onClick
}: PricingEntryLinkProps) {
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();

  if (isHomePath(pathname)) {
    return (
      <Link href={PRICING_SECTION_HREF} className={className} onClick={onClick}>
        {children}
      </Link>
    );
  }

  return (
    <Link
      href={buildPricingModalHref(pathname, searchParams)}
      scroll={false}
      className={className}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  PRICING_SECTION_HREF,
  buildPricingModalHref,
  buildPricingModalHrefFromCurrentLocation,
  isHomePath
} from "@/lib/pricing-navigation";

interface PricingEntryLinkProps {
  className?: string;
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
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

export function PricingEntryLink({
  className = "",
  children,
  onClick
}: PricingEntryLinkProps) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();

  if (isHomePath(pathname)) {
    return (
      <Link href={PRICING_SECTION_HREF} className={className} onClick={onClick}>
        {children}
      </Link>
    );
  }

  return (
    <Link
      href={buildPricingModalHref(pathname)}
      scroll={false}
      className={className}
      onClick={(event) => {
        onClick?.(event);
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

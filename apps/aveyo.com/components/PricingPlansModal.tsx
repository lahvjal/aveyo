"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import PricingPlans from "@/components/PricingPlans";
import {
  PRICING_MODAL_QUERY_PARAM,
  buildPricingModalHref,
  getPricingOfferName,
  getPricingPageSlug,
  isHomePath,
  stripPricingModalParam
} from "@/lib/pricing-navigation";

const MODAL_Z_INDEX = 2_147_483_200;

function PricingPlansModalContent() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOpen =
    !isHomePath(pathname) && searchParams.get(PRICING_MODAL_QUERY_PARAM) === "1";

  const cleanQueryString = stripPricingModalParam(searchParams);
  const closeHref = cleanQueryString ? `${pathname}?${cleanQueryString}` : pathname;
  const returnToHref = buildPricingModalHref(pathname, cleanQueryString);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        router.replace(closeHref, { scroll: false });
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeHref, isOpen, router]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pricing plans"
      className="fixed inset-0 overflow-y-auto bg-black/60 backdrop-blur-sm"
      style={{ zIndex: MODAL_Z_INDEX }}
    >
      <div
        className="flex min-h-full w-full items-center justify-center px-2 py-2 sm:px-3 sm:py-3"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            router.replace(closeHref, { scroll: false });
          }
        }}
      >
        <button
          type="button"
          onClick={() => router.replace(closeHref, { scroll: false })}
          className="fixed right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-black shadow-[0_12px_40px_rgba(0,0,0,0.22)] transition-colors hover:bg-white"
          aria-label="Close pricing plans"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M6 6L18 18M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <div className="mx-auto w-full max-w-[1248px]">
          <PricingPlans
            currentQueryString={cleanQueryString}
            originPath={pathname}
            pageSlug={getPricingPageSlug(pathname)}
            offerName={getPricingOfferName(pathname)}
            returnToHref={returnToHref}
            sectionId="pricing-modal"
            presentation="modal"
          />
        </div>
      </div>
    </div>
  );
}

export function PricingPlansModal() {
  return (
    <Suspense fallback={null}>
      <PricingPlansModalContent />
    </Suspense>
  );
}

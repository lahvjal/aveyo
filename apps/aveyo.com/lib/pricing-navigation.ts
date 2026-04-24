export const PRICING_SECTION_HREF = "/#pricing";
export const PRICING_MODAL_QUERY_PARAM = "pricing";

type SearchParamsLike =
  | string
  | URLSearchParams
  | {
      toString(): string;
    }
  | null
  | undefined;

function normalizePathname(pathname: string | null | undefined) {
  const trimmed = typeof pathname === "string" ? pathname.trim() : "";
  if (!trimmed || trimmed === "/") {
    return "/";
  }

  const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return normalized.replace(/\/+$/, "") || "/";
}

function createSearchParams(value: SearchParamsLike) {
  if (!value) {
    return new URLSearchParams();
  }

  if (typeof value === "string") {
    return new URLSearchParams(value.replace(/^\?/, ""));
  }

  return new URLSearchParams(value.toString());
}

function toTitleCaseSegment(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function isHomePath(pathname: string | null | undefined) {
  return normalizePathname(pathname) === "/";
}

export function isPricingSectionHref(href: string | null | undefined) {
  return (href ?? "").trim() === PRICING_SECTION_HREF;
}

export function buildPricingModalHref(pathname: string | null | undefined, searchParams?: SearchParamsLike) {
  const normalizedPathname = normalizePathname(pathname);
  const nextSearchParams = createSearchParams(searchParams);
  nextSearchParams.set(PRICING_MODAL_QUERY_PARAM, "1");
  const queryString = nextSearchParams.toString();
  return queryString ? `${normalizedPathname}?${queryString}` : normalizedPathname;
}

export function buildPricingModalHrefFromCurrentLocation(pathname: string | null | undefined) {
  if (typeof window === "undefined") {
    return buildPricingModalHref(pathname);
  }

  return buildPricingModalHref(pathname, window.location.search);
}

export function stripPricingModalParam(searchParams?: SearchParamsLike) {
  const nextSearchParams = createSearchParams(searchParams);
  nextSearchParams.delete(PRICING_MODAL_QUERY_PARAM);
  return nextSearchParams.toString();
}

export function getPricingPageSlug(pathname: string | null | undefined) {
  const normalizedPathname = normalizePathname(pathname);
  if (normalizedPathname === "/") {
    return "home";
  }

  return normalizedPathname.replace(/^\/+/, "");
}

export function getPricingOfferName(pathname: string | null | undefined) {
  const pageSlug = getPricingPageSlug(pathname);
  if (pageSlug === "home") {
    return "Aveyo Homepage Plans";
  }

  const label = pageSlug
    .split("/")
    .map((segment) => toTitleCaseSegment(segment))
    .filter(Boolean)
    .join(" ");

  return label ? `Aveyo ${label} Plans` : "Aveyo Plans";
}

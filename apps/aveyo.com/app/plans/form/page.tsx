import type { Metadata } from "next";
import PlansLeadForm from "@/components/PlansLeadForm";
import {
  createInitialPlansLeadFormState,
  DEFAULT_PLANS_PAGE_SLUG,
  type SearchParamRecord
} from "@/lib/plans-lead";
import { sitePageStyleVars } from "@/lib/site-page-design-system";
import PlansFormExitButton from "./exit-button";

export const metadata: Metadata = {
  title: "Aveyo Plans Form | Step-By-Step Solar Quote",
  description:
    "Take the 6-step Aveyo plans form to compare solar options, share your home details, and request the right next step."
};

function readSearchParam(params: SearchParamRecord, key: string) {
  const value = params[key];

  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function normalizeReturnTo(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue.startsWith("/") || trimmedValue.startsWith("//")) {
    return "";
  }

  return trimmedValue;
}

export default async function PlansFormPage({
  searchParams
}: {
  searchParams: Promise<SearchParamRecord>;
}) {
  const resolvedSearchParams = await searchParams;
  const initialState = createInitialPlansLeadFormState(resolvedSearchParams);
  const fallbackExitHref =
    initialState.pageSlug && initialState.pageSlug !== DEFAULT_PLANS_PAGE_SLUG
      ? initialState.pageSlug === "home"
        ? "/#pricing"
        : `/${initialState.pageSlug}#pricing`
      : "/";
  const exitHref =
    normalizeReturnTo(readSearchParam(resolvedSearchParams, "returnTo")) || fallbackExitHref;

  return (
    <main
      className="min-h-screen bg-[#f4f6f6] bg-[color:var(--site-page-shell-bg)]"
      style={sitePageStyleVars}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-[1400px] flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="mb-4 flex justify-end">
          <PlansFormExitButton href={exitHref} />
        </div>

        <div className="flex-1">
          <PlansLeadForm initialState={initialState} />
        </div>
      </div>
    </main>
  );
}

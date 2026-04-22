import type { Metadata } from "next";
import StatePageTemplate from "@/components/state/state-page-template";
import {
  buildSearchParamString,
  type SearchParamRecord
} from "@/lib/plans-lead";
import { statePages } from "@/lib/state-page-data";

const data = statePages.utah;

export const metadata: Metadata = {
  title: data.metaTitle,
  description: data.metaDescription
};

export default async function UtahPage({
  searchParams
}: {
  searchParams: Promise<SearchParamRecord>;
}) {
  const currentQueryString = buildSearchParamString(await searchParams);

  return (
    <StatePageTemplate
      data={data}
      currentQueryString={currentQueryString}
    />
  );
}

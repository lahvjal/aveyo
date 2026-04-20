import type { Metadata } from "next";
import StatePageTemplate from "@/components/state/state-page-template";
import { statePages } from "@/lib/state-page-data";

const data = statePages.pennsylvania;

export const metadata: Metadata = {
  title: data.metaTitle,
  description: data.metaDescription
};

export default function PennsylvaniaPage() {
  return <StatePageTemplate data={data} />;
}

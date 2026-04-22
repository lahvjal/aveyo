import type { Metadata } from "next";
import NewsfeedResults from "@/components/NewsfeedResults";
import {
  SiteHero,
  SitePageShell,
  SiteSection
} from "@/components/site/page-kit";
import {
  DEFAULT_PUBLIC_MARKETING_NEWS_PAGE_SIZE,
  listPublicMarketingNews
} from "@/lib/news";

export const metadata: Metadata = {
  title: "Aveyo Newsfeed",
  description:
    "Read the latest Aveyo updates, announcements, leadership news, and solar education articles."
};

export default async function NewsfeedPage({
  searchParams
}: {
  searchParams: Promise<{ category?: string; page?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const page = Math.max(Number(resolvedSearchParams.page ?? "1") || 1, 1);
  const activeCategory = resolvedSearchParams.category ?? "all";
  const result = await listPublicMarketingNews({
    category: activeCategory,
    page,
    pageSize: DEFAULT_PUBLIC_MARKETING_NEWS_PAGE_SIZE
  });

  return (
    <SitePageShell
      cta={{
        eyebrow: "Stay In Touch",
        title: "Want More Aveyo Updates?\nTalk To Our Team Directly.",
        description: "If an article sparks a question, our team is ready to help you translate it into the right next step for your home.",
        actionLabel: "Contact Aveyo",
        actionHref: "/contact"
      }}
    >
      <SiteHero
        eyebrow="Newsfeed"
        title="News, Updates & Articles"
        description="The latest from Aveyo, including company updates, leadership news, product launches, policy explainers, and solar education."
        actions={[
          { href: "/contact#sales-form", label: "Talk To Sales", variant: "light" },
          { href: "/about", label: "About Aveyo", variant: "outline" }
        ]}
        backgroundSrc="/images/web_photos/Newsfeed_03_CEO-Lobby-Backdrop_ALT.jpg"
        backgroundAlt="Aveyo office lobby with illuminated brand logo, Barcelona chairs, and glass walls"
      />

      <SiteSection
        eyebrow="Browse"
        title="Filter By Topic"
        description="Choose a category to narrow the feed, or browse everything."
      >
        <NewsfeedResults initialResult={result} initialCategory={activeCategory} />
      </SiteSection>
    </SitePageShell>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import {
  SiteArticleCard,
  SiteHero,
  SitePageShell,
  SiteSection
} from "@/components/site/page-kit";
import { CardGradientBorder } from "@/components/ui/card-gradient-border";
import {
  DEFAULT_PUBLIC_MARKETING_NEWS_PAGE_SIZE,
  formatNewsDate,
  listPublicMarketingNews
} from "@/lib/news";

export const metadata: Metadata = {
  title: "Aveyo Newsfeed",
  description:
    "Read the latest Aveyo updates, announcements, leadership news, and solar education articles."
};

function buildNewsfeedHref(params: { category?: string; page?: number }) {
  const searchParams = new URLSearchParams();
  if (params.category && params.category.toLowerCase() !== "all") {
    searchParams.set("category", params.category);
  }
  if (params.page && params.page > 1) {
    searchParams.set("page", String(params.page));
  }

  const queryString = searchParams.toString();
  return queryString ? `/newsfeed?${queryString}` : "/newsfeed";
}

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
        <div className="flex flex-wrap gap-3">
          <Link
            href={buildNewsfeedHref({ page: 1 })}
            className={`rounded-full rounded-[var(--site-button-radius)] border px-[var(--site-button-px)] py-[var(--site-button-py)] text-[length:var(--site-paragraph)] font-bold uppercase tracking-[0.18em] transition-colors ${
              activeCategory === "all"
                ? "border-[#0A1628] border-[color:var(--site-black)] bg-[#0A1628] bg-[color:var(--site-black)] text-white"
                : "border-[#dbe2e8] border-[color:var(--site-border-soft)] bg-white text-[#212120] text-[color:var(--site-black)] hover:bg-[#f5f7f9]"
            }`}
          >
            All
          </Link>
          {result.categories.map((category) => (
            <Link
              key={category}
              href={buildNewsfeedHref({ category, page: 1 })}
              className={`rounded-full rounded-[var(--site-button-radius)] border px-[var(--site-button-px)] py-[var(--site-button-py)] text-[length:var(--site-paragraph)] font-bold uppercase tracking-[0.18em] transition-colors ${
                activeCategory === category
                  ? "border-[#0A1628] border-[color:var(--site-black)] bg-[#0A1628] bg-[color:var(--site-black)] text-white"
                  : "border-[#dbe2e8] border-[color:var(--site-border-soft)] bg-white text-[#212120] text-[color:var(--site-black)] hover:bg-[#f5f7f9]"
              }`}
            >
              {category}
            </Link>
          ))}
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {result.posts.map((post) => (
            <SiteArticleCard
              key={post.id}
              category={post.category}
              title={post.title}
              excerpt={post.excerpt}
              href={`/newsfeed/${post.slug}`}
              publishedLabel={formatNewsDate(post.publishedAt)}
            />
          ))}
        </div>

        {result.posts.length === 0 ? (
          <div className="relative mt-8 overflow-hidden rounded-[var(--site-radius-corner)] bg-white p-[var(--site-card-padding-compact)] text-[length:var(--site-body)] text-[#5f646b] text-[color:var(--site-text-muted)]">
            <CardGradientBorder className="rounded-[var(--site-radius-corner)]" />
            <div className="relative z-[2]">No articles match this category yet.</div>
          </div>
        ) : null}

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
          <div className="text-[length:var(--site-paragraph)] text-[#5f646b] text-[color:var(--site-text-muted)]">
            Showing page {result.page} of {Math.max(Math.ceil(result.total / result.pageSize), 1)}
          </div>
          <div className="flex flex-wrap gap-3">
            {page > 1 ? (
              <Link
                href={buildNewsfeedHref({ category: activeCategory, page: page - 1 })}
                className="rounded-full rounded-[var(--site-button-radius)] border border-[#dbe2e8] border-[color:var(--site-border-soft)] bg-white px-[var(--site-button-px)] py-[var(--site-button-py)] text-[length:var(--site-paragraph)] font-bold text-[#212120] text-[color:var(--site-black)] transition-colors hover:bg-[#f5f7f9]"
              >
                Previous
              </Link>
            ) : null}
            {result.hasMore ? (
              <Link
                href={buildNewsfeedHref({ category: activeCategory, page: page + 1 })}
                className="rounded-full rounded-[var(--site-button-radius)] bg-[#212120] bg-[color:var(--site-black)] px-[var(--site-button-px)] py-[var(--site-button-py)] text-[length:var(--site-paragraph)] font-bold text-white transition-opacity hover:opacity-90"
              >
                Next
              </Link>
            ) : null}
          </div>
        </div>
      </SiteSection>
    </SitePageShell>
  );
}

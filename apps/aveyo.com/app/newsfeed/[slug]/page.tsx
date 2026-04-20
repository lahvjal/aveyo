import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import MarkdownArticle from "@/components/site/markdown-article";
import { SiteHero, SitePageShell, SiteSection } from "@/components/site/page-kit";
import { CardGradientBorder } from "@/components/ui/card-gradient-border";
import { formatNewsDate, getPublicMarketingNewsPost } from "@/lib/news";

async function loadArticle(slug: string) {
  const post = await getPublicMarketingNewsPost(slug);
  if (!post) {
    notFound();
  }
  return post;
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublicMarketingNewsPost(slug);

  if (!post) {
    return {
      title: "Article Not Found | Aveyo News"
    };
  }

  return {
    title: post.seoTitle ?? `${post.title} | Aveyo News`,
    description: post.seoDescription ?? post.excerpt
  };
}

export default async function NewsArticlePage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await loadArticle(slug);

  return (
    <SitePageShell
      cta={{
        eyebrow: "Questions?",
        title: "Need Help Applying This To Your Home?\nTalk To Aveyo.",
        description: "Our advisors can help you turn what you just read into a practical next step for your own solar goals.",
        actionLabel: "Contact Aveyo",
        actionHref: "/contact"
      }}
    >
      <SiteHero
        eyebrow={post.category}
        title={post.title}
        description={post.excerpt}
        actions={[
          { href: "/newsfeed", label: "Back To Newsfeed", variant: "light" },
          { href: "/contact#sales-form", label: "Talk To Sales", variant: "outline" }
        ]}
        stats={[
          { value: formatNewsDate(post.publishedAt), label: "Published" },
          { value: post.category, label: "Category" },
          { value: "Aveyo", label: "Publisher" }
        ]}
        visual={
          post.heroImageUrl ? (
            <div className="relative overflow-hidden rounded-[var(--site-radius-corner)] bg-white/[0.06] shadow-[0_28px_80px_rgba(0,0,0,0.24)]">
              <CardGradientBorder className="rounded-[var(--site-radius-corner)]" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={post.heroImageUrl} alt="" className="h-full min-h-[320px] w-full object-cover" />
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-[var(--site-radius-corner)] bg-white/[0.06] p-[var(--site-card-padding-comfortable)] shadow-[0_28px_80px_rgba(0,0,0,0.24)] backdrop-blur-[12px]">
              <CardGradientBorder className="rounded-[var(--site-radius-corner)]" />
              <div className="relative z-[2]">
                <p className="text-sm text-[length:var(--site-paragraph)] font-bold uppercase tracking-[0.28em] text-white/60">
                  Article Summary
                </p>
                <p className="mt-5 text-[length:var(--site-h5)] leading-[1.4] text-white/82">{post.excerpt}</p>
              </div>
            </div>
          )
        }
      />

      <SiteSection>
        <div className="mx-auto grid max-w-[980px] gap-8">
          <div className="flex flex-wrap items-center gap-4 text-[length:var(--site-paragraph)] uppercase tracking-[0.18em] text-[#6b7280] text-[color:var(--site-text-muted-alt)]">
            <span>{post.category}</span>
            <span aria-hidden>•</span>
            <span>{formatNewsDate(post.publishedAt)}</span>
          </div>

          <MarkdownArticle content={post.bodyMarkdown} />

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/newsfeed"
              className="rounded-full rounded-[var(--site-button-radius)] border border-[#dbe2e8] border-[color:var(--site-border-soft)] bg-white px-[var(--site-button-px)] py-[var(--site-button-py)] text-[length:var(--site-paragraph)] font-bold text-[#212120] text-[color:var(--site-black)] transition-colors hover:bg-[#f5f7f9]"
            >
              Back To Newsfeed
            </Link>
            <Link
              href="/contact#sales-form"
              className="rounded-full rounded-[var(--site-button-radius)] bg-[#212120] bg-[color:var(--site-black)] px-[var(--site-button-px)] py-[var(--site-button-py)] text-[length:var(--site-paragraph)] font-bold text-white transition-opacity hover:opacity-90"
            >
              Talk To Aveyo
            </Link>
          </div>
        </div>
      </SiteSection>
    </SitePageShell>
  );
}

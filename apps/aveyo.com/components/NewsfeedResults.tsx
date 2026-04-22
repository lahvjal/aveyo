"use client";

import { useEffect, useState } from "react";
import { SiteArticleCard } from "@/components/site/page-kit";
import { CardGradientBorder } from "@/components/ui/card-gradient-border";
import type { PublicMarketingNewsListResult } from "@/lib/news";
import { getPublicApiBaseUrl } from "@/lib/site-config";

function formatNewsDate(value: string | null) {
  if (!value) {
    return "Draft";
  }

  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

function formatFilterLabel(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }

  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1).toLowerCase()}`;
}

async function fetchNewsPage({
  category,
  page,
  pageSize
}: {
  category: string;
  page: number;
  pageSize: number;
}) {
  const searchParams = new URLSearchParams();
  if (category.trim() && category.trim().toLowerCase() !== "all") {
    searchParams.set("category", category.trim());
  }
  if (page > 1) {
    searchParams.set("page", String(page));
  }
  searchParams.set("pageSize", String(pageSize));

  const queryString = searchParams.toString();
  const response = await fetch(
    `${getPublicApiBaseUrl()}/api/marketing/news/posts${queryString ? `?${queryString}` : ""}`
  );

  if (!response.ok) {
    throw new Error(`Unable to load marketing news (${response.status}).`);
  }

  return (await response.json()) as PublicMarketingNewsListResult;
}

export default function NewsfeedResults({
  initialResult,
  initialCategory
}: {
  initialResult: PublicMarketingNewsListResult;
  initialCategory: string;
}) {
  const [result, setResult] = useState(initialResult);
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setResult(initialResult);
    setActiveCategory(initialCategory);
    setIsLoading(false);
    setErrorMessage(null);
  }, [initialResult, initialCategory]);

  async function loadResult({
    category,
    page
  }: {
    category: string;
    page: number;
  }) {
    if (isLoading || page < 1 || (category === activeCategory && page === result.page)) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const nextResult = await fetchNewsPage({
        category,
        page,
        pageSize: result.pageSize
      });
      setResult(nextResult);
      setActiveCategory(category);
    } catch {
      setErrorMessage("Unable to load articles right now.");
    } finally {
      setIsLoading(false);
    }
  }

  function handlePageChange(nextPage: number) {
    void loadResult({ category: activeCategory, page: nextPage });
  }

  function handleCategoryChange(nextCategory: string) {
    if (isLoading || nextCategory === activeCategory) {
      return;
    }

    void loadResult({ category: nextCategory, page: 1 });
  }

  const totalPages = Math.max(Math.ceil(result.total / result.pageSize), 1);

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => handleCategoryChange("all")}
          disabled={isLoading}
          className={`rounded-full rounded-[var(--site-button-radius)] border px-[var(--site-button-px)] py-[var(--site-button-py)] text-[length:var(--site-paragraph)] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            activeCategory === "all"
              ? "border-[#0A1628] border-[color:var(--site-black)] bg-[#0A1628] bg-[color:var(--site-black)] text-white"
              : "border-[#dbe2e8] border-[color:var(--site-border-soft)] bg-white text-[#212120] text-[color:var(--site-black)] hover:bg-[#f5f7f9]"
          }`}
        >
          {formatFilterLabel("all")}
        </button>
        {result.categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => handleCategoryChange(category)}
            disabled={isLoading}
            className={`rounded-full rounded-[var(--site-button-radius)] border px-[var(--site-button-px)] py-[var(--site-button-py)] text-[length:var(--site-paragraph)] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              activeCategory === category
                ? "border-[#0A1628] border-[color:var(--site-black)] bg-[#0A1628] bg-[color:var(--site-black)] text-white"
                : "border-[#dbe2e8] border-[color:var(--site-border-soft)] bg-white text-[#212120] text-[color:var(--site-black)] hover:bg-[#f5f7f9]"
            }`}
          >
            {formatFilterLabel(category)}
          </button>
        ))}
      </div>

      {result.posts.length > 0 ? (
        <div
          className={`mt-10 grid gap-5 lg:grid-cols-2 xl:grid-cols-3 transition-opacity ${
            isLoading ? "opacity-70" : "opacity-100"
          }`}
          aria-busy={isLoading}
        >
          {result.posts.map((post) => (
            <SiteArticleCard
              key={post.id}
              category={post.category}
              title={post.title}
              href={`/newsfeed/${post.slug}`}
              publishedLabel={formatNewsDate(post.publishedAt)}
              imageSrc={post.heroImageUrl ?? undefined}
              imageAlt={post.title}
            />
          ))}
        </div>
      ) : (
        <div className="relative mt-8 overflow-hidden rounded-[var(--site-radius-corner)] bg-white p-[var(--site-card-padding-compact)] text-[length:var(--site-body)] text-[#5f646b] text-[color:var(--site-text-muted)]">
          <CardGradientBorder className="rounded-[var(--site-radius-corner)]" />
          <div className="relative z-[2]">No articles match this category yet.</div>
        </div>
      )}

      {errorMessage ? (
        <div className="mt-4 text-[length:var(--site-paragraph)] text-[#b42318]">
          {errorMessage}
        </div>
      ) : null}

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
        <div className="text-[length:var(--site-paragraph)] text-[#5f646b] text-[color:var(--site-text-muted)]">
          Showing page {result.page} of {totalPages}
        </div>
        <div className="flex flex-wrap gap-3">
          {result.page > 1 ? (
            <button
              type="button"
              onClick={() => handlePageChange(result.page - 1)}
              disabled={isLoading}
              className="rounded-full rounded-[var(--site-button-radius)] border border-[#dbe2e8] border-[color:var(--site-border-soft)] bg-white px-[var(--site-button-px)] py-[var(--site-button-py)] text-[length:var(--site-paragraph)] font-bold text-[#212120] text-[color:var(--site-black)] transition-colors hover:bg-[#f5f7f9] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Previous
            </button>
          ) : null}
          {result.hasMore ? (
            <button
              type="button"
              onClick={() => handlePageChange(result.page + 1)}
              disabled={isLoading}
              className="rounded-full rounded-[var(--site-button-radius)] bg-[#212120] bg-[color:var(--site-black)] px-[var(--site-button-px)] py-[var(--site-button-py)] text-[length:var(--site-paragraph)] font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Next
            </button>
          ) : null}
        </div>
      </div>
    </>
  );
}

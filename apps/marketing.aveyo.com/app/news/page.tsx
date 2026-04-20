"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MarketingShell } from "@/components/marketing-shell";
import { MARKETING_SECTION_TABS } from "@/lib/marketing-sections";
import {
  buildMarketingNewsPathname,
  listMarketingNews,
  type MarketingNewsSummary
} from "@/lib/news";
import { buildAveyoSiteUrl } from "@/lib/public-site";
import { useRequireAuth } from "@/lib/auth/use-require-auth";

function NewsCmsPageContent() {
  const session = useRequireAuth();
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<MarketingNewsSummary[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!session.authenticated || session.userType !== "employee") {
      return;
    }

    let cancelled = false;

    async function loadPosts() {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const payload = await listMarketingNews({
          includeUnpublished: true,
          pageSize: 24,
          query,
          category
        });

        if (cancelled) {
          return;
        }

        setPosts(payload.posts);
        setCategories(payload.categories);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setPosts([]);
        setCategories([]);
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load marketing news posts."
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadPosts();
    return () => {
      cancelled = true;
    };
  }, [category, query, session.authenticated, session.userType]);

  const statusMessage = useMemo(() => {
    if (searchParams.get("created") === "1") {
      return "Post created successfully.";
    }
    if (searchParams.get("saved") === "1") {
      return "Post saved successfully.";
    }
    if (searchParams.get("deleted") === "1") {
      return "Post deleted successfully.";
    }
    return "";
  }, [searchParams]);

  if (session.loading || !session.authenticated) {
    return <main className="loading-shell">Checking session...</main>;
  }

  if (session.userType !== "employee") {
    return (
      <MarketingShell
        session={session}
        currentPath="/news"
        title="News CMS"
        description="Employee-only content publishing workspace."
        sectionTabs={MARKETING_SECTION_TABS}
      >
        <div className="access-denied">Employee access is required to manage news content.</div>
      </MarketingShell>
    );
  }

  return (
    <MarketingShell
      session={session}
      currentPath="/news"
      title="News CMS"
      description="Create, edit, and publish public blog and news articles for aveyo.com."
      sectionTabs={MARKETING_SECTION_TABS}
    >
      {statusMessage ? <div className="notice success">{statusMessage}</div> : null}

      <div className="card">
        <div className="button-row">
          <Link href="/news/create" className="primary-button">
            Create post
          </Link>
          <a
            href={buildAveyoSiteUrl("/newsfeed")}
            target="_blank"
            rel="noreferrer"
            className="secondary-button"
          >
            Open public newsfeed
          </a>
        </div>
      </div>

      <div className="card">
        <div className="form-grid">
          <div className="field">
            <label htmlFor="news-query">Search</label>
            <input
              id="news-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, excerpt, or category"
            />
          </div>
          <div className="field">
            <label htmlFor="news-category">Category</label>
            <select
              id="news-category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="all">All categories</option>
              {categories.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </div>
        </div>

        {errorMessage ? <div className="notice warning">{errorMessage}</div> : null}

        {isLoading ? <p className="helper-text">Loading posts...</p> : null}

        <div className="events-grid">
          {posts.map((post) => (
            <article key={post.id} className="event-card">
              <div className="button-row" style={{ marginTop: 0 }}>
                <span className="secondary-button" aria-disabled="true">
                  {post.publishedAt ? "Published" : "Draft"}
                </span>
                <span>{post.category}</span>
                <span>Updated {new Date(post.updatedAt).toLocaleDateString()}</span>
              </div>
              <h3>{post.title}</h3>
              <div className="event-meta">
                <span>
                  <strong>Slug:</strong> /newsfeed/{post.slug}
                </span>
              </div>
              <p className="event-description">{post.excerpt}</p>
              <div className="button-row">
                <Link href={`/news/${post.id}`} className="secondary-button">
                  Edit post
                </Link>
                {post.publishedAt ? (
                  <a
                    href={buildAveyoSiteUrl(buildMarketingNewsPathname(post.slug))}
                    target="_blank"
                    rel="noreferrer"
                    className="secondary-button"
                  >
                    View live
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>

        {!isLoading && posts.length === 0 ? (
          <p className="helper-text">No posts match the current filters.</p>
        ) : null}
      </div>
    </MarketingShell>
  );
}

export default function NewsCmsPage() {
  return (
    <Suspense fallback={<main className="loading-shell">Loading news CMS...</main>}>
      <NewsCmsPageContent />
    </Suspense>
  );
}

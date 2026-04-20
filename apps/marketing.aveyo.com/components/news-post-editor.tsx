"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  SUGGESTED_NEWS_CATEGORIES,
  type MarketingNewsMutationInput,
  type MarketingNewsPost
} from "@/lib/news";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function toFormState(post?: MarketingNewsPost | null): MarketingNewsMutationInput {
  return {
    title: post?.title ?? "",
    slug: post?.slug ?? "",
    category: post?.category ?? "Company",
    excerpt: post?.excerpt ?? "",
    heroImageUrl: post?.heroImageUrl ?? "",
    bodyMarkdown: post?.bodyMarkdown ?? "",
    seoTitle: post?.seoTitle ?? "",
    seoDescription: post?.seoDescription ?? "",
    publish: Boolean(post?.publishedAt)
  };
}

interface NewsPostEditorProps {
  mode: "create" | "edit";
  initialPost?: MarketingNewsPost | null;
  isSaving: boolean;
  isDeleting?: boolean;
  canPublish: boolean;
  cancelHref: string;
  errorMessage?: string;
  liveHref?: string | null;
  onSubmit: (value: MarketingNewsMutationInput) => void;
  onDelete?: () => void;
}

export default function NewsPostEditor({
  mode,
  initialPost,
  isSaving,
  isDeleting = false,
  canPublish,
  cancelHref,
  errorMessage,
  liveHref,
  onSubmit,
  onDelete
}: NewsPostEditorProps) {
  const [formState, setFormState] = useState<MarketingNewsMutationInput>(() => toFormState(initialPost));
  const [slugTouched, setSlugTouched] = useState(Boolean(initialPost?.slug));

  useEffect(() => {
    setFormState(toFormState(initialPost));
    setSlugTouched(Boolean(initialPost?.slug));
  }, [initialPost]);

  const statusLabel = useMemo(() => {
    if (!initialPost) {
      return "New draft";
    }
    return initialPost.publishedAt ? "Published" : "Draft";
  }, [initialPost]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(formState);
  }

  return (
    <div className="card">
      <div className="button-row">
        <span className="secondary-button" aria-disabled="true">
          {statusLabel}
        </span>
        {initialPost?.updatedAt ? <span>Last updated {new Date(initialPost.updatedAt).toLocaleString()}</span> : null}
        {liveHref ? (
          <a href={liveHref} target="_blank" rel="noreferrer" className="secondary-button">
            View live article
          </a>
        ) : null}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field full">
            <label htmlFor="news-title">Post title</label>
            <input
              id="news-title"
              required
              value={formState.title}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  title: event.target.value,
                  slug: slugTouched ? current.slug : slugify(event.target.value)
                }))
              }
              placeholder="Big changes ahead for homeowners going solar"
            />
          </div>

          <div className="field">
            <label htmlFor="news-slug">Slug</label>
            <input
              id="news-slug"
              required
              value={formState.slug}
              onChange={(event) => {
                setSlugTouched(true);
                setFormState((current) => ({ ...current, slug: slugify(event.target.value) }));
              }}
              placeholder="big-changes-ahead"
            />
          </div>

          <div className="field">
            <label htmlFor="news-category">Category</label>
            <input
              id="news-category"
              list="news-category-options"
              required
              value={formState.category}
              onChange={(event) => setFormState((current) => ({ ...current, category: event.target.value }))}
              placeholder="Company"
            />
            <datalist id="news-category-options">
              {SUGGESTED_NEWS_CATEGORIES.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </div>

          <div className="field full">
            <label htmlFor="news-excerpt">Excerpt</label>
            <textarea
              id="news-excerpt"
              required
              value={formState.excerpt}
              onChange={(event) => setFormState((current) => ({ ...current, excerpt: event.target.value }))}
              placeholder="A short summary used on the newsfeed cards and article preview."
            />
          </div>

          <div className="field full">
            <label htmlFor="news-hero-image">Hero image URL</label>
            <input
              id="news-hero-image"
              value={formState.heroImageUrl}
              onChange={(event) =>
                setFormState((current) => ({ ...current, heroImageUrl: event.target.value }))
              }
              placeholder="https://..."
            />
          </div>

          <div className="field full">
            <label htmlFor="news-body">Body markdown</label>
            <textarea
              id="news-body"
              required
              value={formState.bodyMarkdown}
              onChange={(event) =>
                setFormState((current) => ({ ...current, bodyMarkdown: event.target.value }))
              }
              placeholder="# Article heading"
              className="news-body-field"
            />
          </div>

          <div className="field">
            <label htmlFor="news-seo-title">SEO title</label>
            <input
              id="news-seo-title"
              value={formState.seoTitle}
              onChange={(event) => setFormState((current) => ({ ...current, seoTitle: event.target.value }))}
              placeholder="Optional page title override"
            />
          </div>

          <div className="field">
            <label htmlFor="news-seo-description">SEO description</label>
            <input
              id="news-seo-description"
              value={formState.seoDescription}
              onChange={(event) =>
                setFormState((current) => ({ ...current, seoDescription: event.target.value }))
              }
              placeholder="Optional search description"
            />
          </div>
        </div>

        <p className="helper-text">
          Markdown supports headings, links, lists, and basic formatting. Leave the hero image URL blank if the
          article should render without a hero visual.
        </p>

        {canPublish ? (
          <label className="helper-text" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={Boolean(formState.publish)}
              onChange={(event) =>
                setFormState((current) => ({ ...current, publish: event.target.checked }))
              }
            />
            Publish this post
          </label>
        ) : (
          <p className="helper-text">Admins control publish and delete actions. You can still save draft edits.</p>
        )}

        {errorMessage ? <div className="notice warning">{errorMessage}</div> : null}

        <div className="button-row">
          <button type="submit" className="primary-button" disabled={isSaving || isDeleting}>
            {isSaving ? "Saving..." : mode === "create" ? "Create post" : "Save changes"}
          </button>
          <Link href={cancelHref} className="secondary-button">
            Cancel
          </Link>
          {onDelete ? (
            <button
              type="button"
              className="secondary-button"
              onClick={onDelete}
              disabled={isSaving || isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete post"}
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}

import { getPublicApiBaseUrl } from "@/lib/site-config";

export interface PublicMarketingNewsSummary {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  heroImageUrl: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicMarketingNewsPost extends PublicMarketingNewsSummary {
  bodyMarkdown: string;
  seoTitle: string | null;
  seoDescription: string | null;
}

export interface PublicMarketingNewsListResult {
  posts: PublicMarketingNewsSummary[];
  categories: string[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  scope: "published" | "all";
}

const NEWS_REVALIDATE_SECONDS = 60;
export const DEFAULT_PUBLIC_MARKETING_NEWS_PAGE_SIZE = 6;

async function fetchNewsJson<T>(path: string): Promise<T | null> {
  const response = await fetch(`${getPublicApiBaseUrl()}${path}`, {
    next: { revalidate: NEWS_REVALIDATE_SECONDS }
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Unable to load marketing news (${response.status}).`);
  }

  return (await response.json()) as T;
}

export async function listPublicMarketingNews(params: {
  category?: string | null;
  page?: number;
  pageSize?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params.category?.trim() && params.category.trim().toLowerCase() !== "all") {
    searchParams.set("category", params.category.trim());
  }
  if (params.page && params.page > 1) {
    searchParams.set("page", String(params.page));
  }
  if (params.pageSize && params.pageSize !== DEFAULT_PUBLIC_MARKETING_NEWS_PAGE_SIZE) {
    searchParams.set("pageSize", String(params.pageSize));
  }

  const queryString = searchParams.toString();
  const result = await fetchNewsJson<PublicMarketingNewsListResult>(
    queryString ? `/api/marketing/news/posts?${queryString}` : "/api/marketing/news/posts"
  );

  if (!result) {
    throw new Error("Unable to load marketing news.");
  }

  return result;
}

export async function getPublicMarketingNewsPost(slug: string) {
  const result = await fetchNewsJson<{ post: PublicMarketingNewsPost }>(
    `/api/marketing/news/posts/slug/${slug}`
  );

  return result?.post ?? null;
}

export function formatNewsDate(value: string | null) {
  if (!value) {
    return "Draft";
  }

  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

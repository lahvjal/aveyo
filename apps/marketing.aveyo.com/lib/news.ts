import { authApiRequest } from "@/lib/auth/session";

export interface MarketingNewsSummary {
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

export interface MarketingNewsPost extends MarketingNewsSummary {
  bodyMarkdown: string;
  seoTitle: string | null;
  seoDescription: string | null;
}

export interface MarketingNewsListResponse {
  posts: MarketingNewsSummary[];
  categories: string[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  scope: "published" | "all";
}

export interface MarketingNewsMutationInput {
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  heroImageUrl: string;
  bodyMarkdown: string;
  seoTitle: string;
  seoDescription: string;
  publish?: boolean;
}

export const SUGGESTED_NEWS_CATEGORIES = [
  "Company",
  "Leadership",
  "Product",
  "Policy",
  "Education",
  "Expansion",
  "Brand"
];

export function buildMarketingNewsPathname(slug: string) {
  return `/newsfeed/${slug}`;
}

export async function listMarketingNews(params: {
  query?: string;
  category?: string;
  page?: number;
  pageSize?: number;
  includeUnpublished?: boolean;
}) {
  const searchParams = new URLSearchParams();
  if (params.query?.trim()) {
    searchParams.set("query", params.query.trim());
  }
  if (params.category?.trim() && params.category.trim().toLowerCase() !== "all") {
    searchParams.set("category", params.category.trim());
  }
  if (params.page) {
    searchParams.set("page", String(params.page));
  }
  if (params.pageSize) {
    searchParams.set("pageSize", String(params.pageSize));
  }
  if (params.includeUnpublished) {
    searchParams.set("includeUnpublished", "1");
  }

  const queryString = searchParams.toString();
  const path = queryString ? `/api/marketing/news/posts?${queryString}` : "/api/marketing/news/posts";
  return authApiRequest<MarketingNewsListResponse>(path, { method: "GET" });
}

export async function getMarketingNewsPost(postId: string) {
  const payload = await authApiRequest<{ post: MarketingNewsPost }>(
    `/api/marketing/news/posts/${postId}`,
    {
      method: "GET"
    }
  );
  return payload.post;
}

export async function createMarketingNewsPost(input: MarketingNewsMutationInput) {
  const payload = await authApiRequest<{ post: MarketingNewsPost }>(
    "/api/marketing/news/posts",
    {
      method: "POST",
      body: JSON.stringify(input)
    }
  );
  return payload.post;
}

export async function updateMarketingNewsPost(postId: string, input: MarketingNewsMutationInput) {
  const payload = await authApiRequest<{ post: MarketingNewsPost }>(
    `/api/marketing/news/posts/${postId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input)
    }
  );
  return payload.post;
}

export async function deleteMarketingNewsPost(postId: string) {
  await authApiRequest<{ success: boolean }>(`/api/marketing/news/posts/${postId}`, {
    method: "DELETE"
  });
}

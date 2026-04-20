import type { AuthSessionResult } from "@/lib/auth/types";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

const NEWS_TABLE = "marketing_news_posts";
export const DEFAULT_MARKETING_NEWS_PAGE_SIZE = 6;
const MAX_MARKETING_NEWS_PAGE_SIZE = 50;

interface MarketingNewsRow {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  hero_image_url: string | null;
  body_markdown: string;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarketingNewsPost {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  heroImageUrl: string | null;
  bodyMarkdown: string;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type MarketingNewsSummary = Omit<
  MarketingNewsPost,
  "bodyMarkdown" | "seoTitle" | "seoDescription"
>;

export type MarketingNewsScope = "published" | "all";

export interface MarketingNewsListResult {
  posts: MarketingNewsSummary[];
  categories: string[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  scope: MarketingNewsScope;
}

export class MarketingNewsError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
    this.name = "MarketingNewsError";
  }
}

function trimString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalText(value: unknown) {
  const trimmed = trimString(value);
  return trimmed ? trimmed : null;
}

function normalizeRequiredText(value: unknown, fieldName: string) {
  const trimmed = trimString(value);
  if (!trimmed) {
    throw new MarketingNewsError(`${fieldName} is required.`);
  }
  return trimmed;
}

function toTitleCase(value: string) {
  return value
    .split(/[\s_-]+/g)
    .filter(Boolean)
    .map((segment) => `${segment[0]?.toUpperCase() ?? ""}${segment.slice(1).toLowerCase()}`)
    .join(" ");
}

export function normalizeNewsSlug(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return normalized;
}

export function normalizeNewsCategory(value: unknown) {
  const trimmed = trimString(value);
  return trimmed ? toTitleCase(trimmed) : "Company";
}

function normalizeHeroImageUrl(value: unknown) {
  const normalizedUrl = normalizeOptionalText(value);
  if (!normalizedUrl) {
    return null;
  }

  try {
    const parsed = new URL(normalizedUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("Only http(s) URLs are supported.");
    }
    return normalizedUrl;
  } catch {
    throw new MarketingNewsError("Hero image URL must be a valid http(s) URL.");
  }
}

function sanitizeSearchTerm(value: string | null | undefined) {
  return trimString(value)
    .replace(/[,]/g, " ")
    .replace(/\s+/g, " ");
}

function normalizePageNumber(value: number | undefined, fallback: number) {
  if (!Number.isFinite(value) || !value || value < 1) {
    return fallback;
  }

  return Math.floor(value);
}

function normalizePageSize(value: number | undefined, fallback: number) {
  if (!Number.isFinite(value) || !value || value < 1) {
    return fallback;
  }

  return Math.min(Math.floor(value), MAX_MARKETING_NEWS_PAGE_SIZE);
}

function mapMarketingNewsRow(row: MarketingNewsRow): MarketingNewsPost {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    category: row.category,
    excerpt: row.excerpt,
    heroImageUrl: row.hero_image_url,
    bodyMarkdown: row.body_markdown,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapMarketingNewsSummary(row: MarketingNewsRow): MarketingNewsSummary {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    category: row.category,
    excerpt: row.excerpt,
    heroImageUrl: row.hero_image_url,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function canManageMarketingNews(session: AuthSessionResult) {
  return session.authenticated && session.userType === "employee";
}

export function canPublishMarketingNews(session: AuthSessionResult) {
  return canManageMarketingNews(session) && session.access.isAdmin;
}

export function resolveMarketingNewsScope(
  session: AuthSessionResult,
  includeUnpublishedRequested: boolean
): MarketingNewsScope {
  if (includeUnpublishedRequested && canManageMarketingNews(session)) {
    return "all";
  }

  return "published";
}

export function assertEmployeeNewsAccess(session: AuthSessionResult) {
  if (!session.authenticated) {
    throw new MarketingNewsError("Authentication required.", 401);
  }
  if (session.userType !== "employee") {
    throw new MarketingNewsError("Employee access required.", 403);
  }
}

export function assertPublishNewsAccess(session: AuthSessionResult) {
  assertEmployeeNewsAccess(session);
  if (!session.access.isAdmin) {
    throw new MarketingNewsError("Admin access required.", 403);
  }
}

async function listMarketingNewsCategories(scope: MarketingNewsScope) {
  const supabaseServiceRoleClient = getSupabaseServiceRoleClient();
  let query = supabaseServiceRoleClient.from(NEWS_TABLE).select("category").order("category");

  if (scope === "published") {
    query = query.not("published_at", "is", null).lte("published_at", new Date().toISOString());
  }

  const { data, error } = await query;
  if (error) {
    throw new MarketingNewsError(`Unable to load categories: ${error.message}`, 500);
  }

  return Array.from(
    new Set(
      ((data ?? []) as Array<{ category: string | null }>)
        .map((entry) => entry.category?.trim())
        .filter((value): value is string => Boolean(value))
    )
  ).sort((left, right) => left.localeCompare(right));
}

export async function listMarketingNewsPosts(options: {
  category?: string | null;
  query?: string | null;
  page?: number;
  pageSize?: number;
  scope?: MarketingNewsScope;
}): Promise<MarketingNewsListResult> {
  const supabaseServiceRoleClient = getSupabaseServiceRoleClient();
  const scope = options.scope ?? "published";
  const page = normalizePageNumber(options.page, 1);
  const pageSize = normalizePageSize(options.pageSize, DEFAULT_MARKETING_NEWS_PAGE_SIZE);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const normalizedCategory = normalizeOptionalText(options.category);
  const normalizedQuery = sanitizeSearchTerm(options.query);

  let query = supabaseServiceRoleClient
    .from(NEWS_TABLE)
    .select(
      "id, title, slug, category, excerpt, hero_image_url, body_markdown, seo_title, seo_description, published_at, created_at, updated_at",
      { count: "exact" }
    );

  if (normalizedCategory && normalizedCategory.toLowerCase() !== "all") {
    query = query.eq("category", normalizeNewsCategory(normalizedCategory));
  }

  if (normalizedQuery) {
    const pattern = `%${normalizedQuery}%`;
    query = query.or(
      `title.ilike.${pattern},excerpt.ilike.${pattern},category.ilike.${pattern},slug.ilike.${pattern}`
    );
  }

  if (scope === "published") {
    query = query
      .not("published_at", "is", null)
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false });
  } else {
    query = query.order("updated_at", { ascending: false });
  }

  const { data, error, count } = await query.range(from, to);
  if (error) {
    throw new MarketingNewsError(`Unable to load posts: ${error.message}`, 500);
  }

  const categories = await listMarketingNewsCategories(scope);
  const rows = (data ?? []) as MarketingNewsRow[];
  const total = count ?? rows.length;

  return {
    posts: rows.map(mapMarketingNewsSummary),
    categories,
    page,
    pageSize,
    total,
    hasMore: from + rows.length < total,
    scope
  };
}

async function getMarketingNewsRowById(postId: string) {
  const supabaseServiceRoleClient = getSupabaseServiceRoleClient();
  const { data, error } = await supabaseServiceRoleClient
    .from(NEWS_TABLE)
    .select(
      "id, title, slug, category, excerpt, hero_image_url, body_markdown, seo_title, seo_description, published_at, created_at, updated_at"
    )
    .eq("id", postId)
    .maybeSingle();

  if (error) {
    throw new MarketingNewsError(`Unable to load post: ${error.message}`, 500);
  }

  return (data ?? null) as MarketingNewsRow | null;
}

export async function getMarketingNewsPostById(postId: string) {
  const row = await getMarketingNewsRowById(postId);
  return row ? mapMarketingNewsRow(row) : null;
}

export async function getMarketingNewsPostBySlug(
  slug: string,
  scope: MarketingNewsScope = "published"
) {
  const normalizedSlug = normalizeNewsSlug(slug);
  if (!normalizedSlug) {
    return null;
  }

  const supabaseServiceRoleClient = getSupabaseServiceRoleClient();
  let query = supabaseServiceRoleClient
    .from(NEWS_TABLE)
    .select(
      "id, title, slug, category, excerpt, hero_image_url, body_markdown, seo_title, seo_description, published_at, created_at, updated_at"
    )
    .eq("slug", normalizedSlug);

  if (scope === "published") {
    query = query.not("published_at", "is", null).lte("published_at", new Date().toISOString());
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    throw new MarketingNewsError(`Unable to load post: ${error.message}`, 500);
  }

  return data ? mapMarketingNewsRow(data as MarketingNewsRow) : null;
}

async function resolveUniqueMarketingNewsSlug(baseSlug: string, excludeId?: string) {
  const normalizedBaseSlug = normalizeNewsSlug(baseSlug) || "article";
  const supabaseServiceRoleClient = getSupabaseServiceRoleClient();
  let query = supabaseServiceRoleClient
    .from(NEWS_TABLE)
    .select("id, slug")
    .ilike("slug", `${normalizedBaseSlug}%`)
    .limit(200);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query;
  if (error) {
    throw new MarketingNewsError(`Unable to validate slug: ${error.message}`, 500);
  }

  const existingSlugs = new Set(
    ((data ?? []) as Array<{ slug: string | null }>)
      .map((row) => row.slug?.trim())
      .filter((value): value is string => Boolean(value))
  );

  if (!existingSlugs.has(normalizedBaseSlug)) {
    return normalizedBaseSlug;
  }

  let suffix = 2;
  while (existingSlugs.has(`${normalizedBaseSlug}-${suffix}`)) {
    suffix += 1;
  }

  return `${normalizedBaseSlug}-${suffix}`;
}

function parsePublishState(value: unknown) {
  if (typeof value === "undefined") {
    return undefined;
  }
  if (typeof value !== "boolean") {
    throw new MarketingNewsError("Publish must be a boolean value.");
  }
  return value;
}

function coerceMarketingNewsPayload(
  payload: unknown,
  options: { currentPublishedAt?: string | null; canPublish: boolean }
) {
  if (!payload || typeof payload !== "object") {
    throw new MarketingNewsError("Request body must be a JSON object.");
  }

  const record = payload as Record<string, unknown>;
  const title = normalizeRequiredText(record.title, "Title");
  const excerpt = normalizeRequiredText(record.excerpt, "Excerpt");
  const bodyMarkdown = normalizeRequiredText(
    record.bodyMarkdown ?? record.body_markdown,
    "Body markdown"
  );
  const requestedSlug = trimString(record.slug) || title;
  const normalizedSlug = normalizeNewsSlug(requestedSlug);
  if (!normalizedSlug) {
    throw new MarketingNewsError("Slug could not be generated from the provided input.");
  }

  const publishState = parsePublishState(record.publish);
  if (typeof publishState !== "undefined" && !options.canPublish) {
    throw new MarketingNewsError("Admin access required to publish or unpublish posts.", 403);
  }

  return {
    title,
    slug: normalizedSlug,
    category: normalizeNewsCategory(record.category),
    excerpt,
    heroImageUrl: normalizeHeroImageUrl(record.heroImageUrl ?? record.hero_image_url),
    bodyMarkdown,
    seoTitle: normalizeOptionalText(record.seoTitle ?? record.seo_title),
    seoDescription: normalizeOptionalText(record.seoDescription ?? record.seo_description),
    publishedAt:
      typeof publishState === "undefined"
        ? options.currentPublishedAt ?? null
        : publishState
          ? options.currentPublishedAt ?? new Date().toISOString()
          : null
  };
}

export async function createMarketingNewsPost(payload: unknown, session: AuthSessionResult) {
  assertEmployeeNewsAccess(session);

  const normalizedPayload = coerceMarketingNewsPayload(payload, {
    canPublish: canPublishMarketingNews(session)
  });
  const slug = await resolveUniqueMarketingNewsSlug(normalizedPayload.slug);
  const supabaseServiceRoleClient = getSupabaseServiceRoleClient();
  const { data, error } = await supabaseServiceRoleClient
    .from(NEWS_TABLE)
    .insert({
      title: normalizedPayload.title,
      slug,
      category: normalizedPayload.category,
      excerpt: normalizedPayload.excerpt,
      hero_image_url: normalizedPayload.heroImageUrl,
      body_markdown: normalizedPayload.bodyMarkdown,
      seo_title: normalizedPayload.seoTitle,
      seo_description: normalizedPayload.seoDescription,
      published_at: normalizedPayload.publishedAt
    })
    .select(
      "id, title, slug, category, excerpt, hero_image_url, body_markdown, seo_title, seo_description, published_at, created_at, updated_at"
    )
    .maybeSingle();

  if (error || !data) {
    throw new MarketingNewsError(
      `Unable to create post: ${error?.message ?? "Unknown database error."}`,
      500
    );
  }

  return mapMarketingNewsRow(data as MarketingNewsRow);
}

export async function updateMarketingNewsPost(
  postId: string,
  payload: unknown,
  session: AuthSessionResult
) {
  assertEmployeeNewsAccess(session);

  const currentPost = await getMarketingNewsRowById(postId);
  if (!currentPost) {
    throw new MarketingNewsError("Post not found.", 404);
  }

  const normalizedPayload = coerceMarketingNewsPayload(payload, {
    currentPublishedAt: currentPost.published_at,
    canPublish: canPublishMarketingNews(session)
  });
  const slug = await resolveUniqueMarketingNewsSlug(normalizedPayload.slug, postId);
  const supabaseServiceRoleClient = getSupabaseServiceRoleClient();
  const { data, error } = await supabaseServiceRoleClient
    .from(NEWS_TABLE)
    .update({
      title: normalizedPayload.title,
      slug,
      category: normalizedPayload.category,
      excerpt: normalizedPayload.excerpt,
      hero_image_url: normalizedPayload.heroImageUrl,
      body_markdown: normalizedPayload.bodyMarkdown,
      seo_title: normalizedPayload.seoTitle,
      seo_description: normalizedPayload.seoDescription,
      published_at: normalizedPayload.publishedAt
    })
    .eq("id", postId)
    .select(
      "id, title, slug, category, excerpt, hero_image_url, body_markdown, seo_title, seo_description, published_at, created_at, updated_at"
    )
    .maybeSingle();

  if (error || !data) {
    throw new MarketingNewsError(
      `Unable to update post: ${error?.message ?? "Unknown database error."}`,
      500
    );
  }

  return mapMarketingNewsRow(data as MarketingNewsRow);
}

export async function deleteMarketingNewsPost(postId: string, session: AuthSessionResult) {
  assertPublishNewsAccess(session);

  const currentPost = await getMarketingNewsRowById(postId);
  if (!currentPost) {
    throw new MarketingNewsError("Post not found.", 404);
  }

  const supabaseServiceRoleClient = getSupabaseServiceRoleClient();
  const { error } = await supabaseServiceRoleClient.from(NEWS_TABLE).delete().eq("id", postId);
  if (error) {
    throw new MarketingNewsError(`Unable to delete post: ${error.message}`, 500);
  }
}

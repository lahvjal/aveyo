import { listMarketingNewsPosts } from "@/lib/marketing/news";

export interface EmployeeNewsSummary {
  title: string;
  category: string;
  excerpt: string;
  slug: string;
  publishedAt: string | null;
}

export interface EmployeeNewsLookupResult {
  status: "ok" | "no_match" | "unavailable";
  query: string | null;
  posts: EmployeeNewsSummary[];
  note: string | null;
}

const NEWS_STOP_WORDS = new Set([
  "and",
  "announcements",
  "announcement",
  "any",
  "at",
  "aveyo",
  "company",
  "event",
  "events",
  "for",
  "going",
  "happening",
  "is",
  "latest",
  "new",
  "news",
  "on",
  "our",
  "show",
  "tell",
  "the",
  "this",
  "updates",
  "update",
  "what",
  "whats",
  "with"
]);

function normalizeQuestion(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractNewsQuery(question: string) {
  const searchTerms = normalizeQuestion(question)
    .split(" ")
    .filter((token) => token.length > 2 && !NEWS_STOP_WORDS.has(token))
    .slice(0, 6);

  return searchTerms.length > 0 ? searchTerms.join(" ") : null;
}

export async function lookupEmployeeNewsContext(
  question: string
): Promise<EmployeeNewsLookupResult> {
  try {
    const query = extractNewsQuery(question);
    const result = await listMarketingNewsPosts({
      page: 1,
      pageSize: 3,
      query,
      scope: "published"
    });

    const posts = result.posts.map((post) => ({
      title: post.title,
      category: post.category,
      excerpt: post.excerpt,
      slug: post.slug,
      publishedAt: post.publishedAt
    }));

    if (posts.length === 0) {
      return {
        status: "no_match",
        query,
        posts: [],
        note: query
          ? "No employee-visible news or event posts matched that topic."
          : "No employee-visible news or event posts are currently available."
      };
    }

    return {
      status: "ok",
      query,
      posts,
      note: null
    };
  } catch {
    return {
      status: "unavailable",
      query: null,
      posts: [],
      note: "Employee news is temporarily unavailable."
    };
  }
}

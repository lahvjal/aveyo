import { NextResponse } from "next/server";
import { getAuthSessionResult } from "@/lib/auth/session";
import {
  DEFAULT_MARKETING_NEWS_PAGE_SIZE,
  MarketingNewsError,
  createMarketingNewsPost,
  listMarketingNewsPosts,
  resolveMarketingNewsScope
} from "@/lib/marketing/news";

function toErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof MarketingNewsError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const session = await getAuthSessionResult(request);
    const url = new URL(request.url);
    const scope = resolveMarketingNewsScope(
      session,
      url.searchParams.get("includeUnpublished") === "1"
    );
    const page = Number(url.searchParams.get("page") ?? "1");
    const pageSize = Number(url.searchParams.get("pageSize") ?? DEFAULT_MARKETING_NEWS_PAGE_SIZE);
    const result = await listMarketingNewsPosts({
      category: url.searchParams.get("category"),
      query: url.searchParams.get("query"),
      page,
      pageSize,
      scope
    });

    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error, "Unable to load marketing news posts.");
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthSessionResult(request);
    const payload = await request.json().catch(() => null);
    const post = await createMarketingNewsPost(payload, session);
    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, "Unable to create marketing news post.");
  }
}

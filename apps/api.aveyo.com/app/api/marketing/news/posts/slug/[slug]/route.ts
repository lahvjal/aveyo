import { NextResponse } from "next/server";
import { MarketingNewsError, getMarketingNewsPostBySlug } from "@/lib/marketing/news";

function toErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof MarketingNewsError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const post = await getMarketingNewsPostBySlug(slug);

    if (!post) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }

    return NextResponse.json({ post });
  } catch (error) {
    return toErrorResponse(error, "Unable to load marketing news article.");
  }
}

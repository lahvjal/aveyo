import { NextResponse } from "next/server";
import { getAuthSessionResult } from "@/lib/auth/session";
import {
  MarketingNewsError,
  deleteMarketingNewsPost,
  getMarketingNewsPostById,
  updateMarketingNewsPost,
  assertEmployeeNewsAccess
} from "@/lib/marketing/news";

function toErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof MarketingNewsError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await getAuthSessionResult(request);
    assertEmployeeNewsAccess(session);
    const { postId } = await context.params;
    const post = await getMarketingNewsPostById(postId);

    if (!post) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }

    return NextResponse.json({ post });
  } catch (error) {
    return toErrorResponse(error, "Unable to load marketing news post.");
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await getAuthSessionResult(request);
    const payload = await request.json().catch(() => null);
    const { postId } = await context.params;
    const post = await updateMarketingNewsPost(postId, payload, session);
    return NextResponse.json({ post });
  } catch (error) {
    return toErrorResponse(error, "Unable to update marketing news post.");
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await getAuthSessionResult(request);
    const { postId } = await context.params;
    await deleteMarketingNewsPost(postId, session);
    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error, "Unable to delete marketing news post.");
  }
}

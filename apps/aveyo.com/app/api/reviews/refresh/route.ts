import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import {
  getPublicReviewVideos,
  YOUTUBE_REVIEW_VIDEOS_CACHE_TAG
} from "@/lib/review-videos";

export const runtime = "nodejs";

export async function POST() {
  try {
    revalidateTag(YOUTUBE_REVIEW_VIDEOS_CACHE_TAG);
    const videos = await getPublicReviewVideos();
    revalidatePath("/reviews");

    return NextResponse.json(
      { count: videos.length },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to check the Aveyo YouTube channel right now." },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}

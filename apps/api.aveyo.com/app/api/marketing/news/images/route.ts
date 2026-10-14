import { NextResponse } from "next/server";
import { getAuthSessionResult } from "@/lib/auth/session";
import { assertEmployeeNewsAccess, MarketingNewsError } from "@/lib/marketing/news";
import { uploadMarketingNewsImage } from "@/lib/marketing/news-images";

export async function POST(request: Request) {
  try {
    const session = await getAuthSessionResult(request);
    assertEmployeeNewsAccess(session);
    const payload = await request.formData().catch(() => {
      throw new MarketingNewsError("Image upload must be sent as multipart form data.");
    });
    const image = await uploadMarketingNewsImage(payload, session);
    return NextResponse.json({ image }, { status: 201 });
  } catch (error) {
    if (error instanceof MarketingNewsError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unable to upload this image. Please try again." }, { status: 500 });
  }
}

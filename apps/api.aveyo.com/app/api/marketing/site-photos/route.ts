import { NextResponse } from "next/server";
import {
  MarketingSitePhotoError,
  listMarketingSitePhotos,
  upsertMarketingSitePhoto
} from "@/lib/marketing/site-photos";
import { getAuthSessionResult } from "@/lib/auth/session";

function toErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof MarketingSitePhotoError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}

export async function GET() {
  try {
    const result = await listMarketingSitePhotos();
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error, "Unable to load marketing site photos.");
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthSessionResult(request);
    const payload = await request.formData();
    const photo = await upsertMarketingSitePhoto(payload, session);
    return NextResponse.json({ photo }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, "Unable to upload marketing site photo.");
  }
}

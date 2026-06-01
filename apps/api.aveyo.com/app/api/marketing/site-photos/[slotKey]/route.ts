import { NextResponse } from "next/server";
import {
  MarketingSitePhotoError,
  getMarketingSitePhoto,
  resetMarketingSitePhoto
} from "@/lib/marketing/site-photos";
import { getAuthSessionResult } from "@/lib/auth/session";

function toErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof MarketingSitePhotoError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ slotKey: string }> }
) {
  try {
    const { slotKey } = await context.params;
    const photo = await getMarketingSitePhoto(decodeURIComponent(slotKey));
    if (!photo) {
      return NextResponse.json({ error: "Site photo override not found." }, { status: 404 });
    }
    return NextResponse.json({ photo });
  } catch (error) {
    return toErrorResponse(error, "Unable to load marketing site photo.");
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ slotKey: string }> }
) {
  try {
    const session = await getAuthSessionResult(request);
    const { slotKey } = await context.params;
    const result = await resetMarketingSitePhoto(decodeURIComponent(slotKey), session);
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error, "Unable to reset marketing site photo.");
  }
}

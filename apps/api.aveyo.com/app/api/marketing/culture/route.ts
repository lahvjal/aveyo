import { NextResponse } from "next/server";
import { getAuthSessionResult } from "@/lib/auth/session";
import {
  MarketingCultureError,
  createCultureEvent,
  listCultureFeed
} from "@/lib/marketing/culture";

function toErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof MarketingCultureError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const session = await getAuthSessionResult(request);
    const culture = await listCultureFeed(session);
    return NextResponse.json(culture);
  } catch (error) {
    return toErrorResponse(error, "Unable to load culture content.");
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthSessionResult(request);
    const contentType = request.headers.get("content-type") ?? "";
    const payload = contentType.includes("multipart/form-data")
      ? await request.formData().catch(() => null)
      : await request.json().catch(() => null);
    const event = await createCultureEvent(payload, session);
    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, "Unable to create culture event.");
  }
}

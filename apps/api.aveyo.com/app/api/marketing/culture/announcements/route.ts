import { NextResponse } from "next/server";
import { getAuthSessionResult } from "@/lib/auth/session";
import {
  MarketingCultureError,
  createCultureAnnouncement
} from "@/lib/marketing/culture";

function toErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof MarketingCultureError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}

export async function POST(request: Request) {
  try {
    const session = await getAuthSessionResult(request);
    const payload = await request.json().catch(() => null);
    const announcement = await createCultureAnnouncement(payload, session);
    return NextResponse.json({ announcement }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, "Unable to create culture announcement.");
  }
}

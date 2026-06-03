import { NextResponse } from "next/server";
import { getAuthSessionResult } from "@/lib/auth/session";
import {
  deleteCultureEvent,
  MarketingCultureError,
  parseCultureEventRequestBody,
  updateCultureEvent
} from "@/lib/marketing/culture";

function toErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof MarketingCultureError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof Error && error.name === "MarketingCultureError") {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (error instanceof Error && error.message.trim()) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    const session = await getAuthSessionResult(request);
    const payload = await parseCultureEventRequestBody(request);
    const { eventId } = await context.params;
    const event = await updateCultureEvent(eventId, payload, session);
    return NextResponse.json({ event });
  } catch (error) {
    return toErrorResponse(error, "Unable to update culture event.");
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    const session = await getAuthSessionResult(request);
    const { eventId } = await context.params;
    await deleteCultureEvent(eventId, session);
    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error, "Unable to delete culture event.");
  }
}

import { NextResponse } from "next/server";
import { getAuthSessionResult } from "@/lib/auth/session";
import {
  MarketingCultureError,
  deleteCultureAnnouncement
} from "@/lib/marketing/culture";

function toErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof MarketingCultureError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ announcementId: string }> }
) {
  try {
    const session = await getAuthSessionResult(request);
    const { announcementId } = await context.params;
    await deleteCultureAnnouncement(announcementId, session);
    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error, "Unable to delete culture announcement.");
  }
}

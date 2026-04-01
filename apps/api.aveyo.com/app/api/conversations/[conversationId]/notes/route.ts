import { NextResponse } from "next/server";
import { requireAuthenticatedRequest } from "@/lib/auth/require-auth";
import {
  createConversationNoteResult,
  getConversationNotesResult,
  type CreateSupportNoteBody
} from "@/lib/notes/service";
import { ServiceError } from "@/lib/service-error";

export async function GET(
  request: Request,
  context: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await context.params;
  try {
    const auth = await requireAuthenticatedRequest(request);
    return NextResponse.json(await getConversationNotesResult(conversationId, auth.user.id));
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unable to load support notes." }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await context.params;
  try {
    const auth = await requireAuthenticatedRequest(request);
    const body = (await request.json().catch(() => ({}))) as CreateSupportNoteBody;
    return NextResponse.json(
      await createConversationNoteResult(conversationId, body, auth.user.id)
    );
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unable to create support note." }, { status: 500 });
  }
}

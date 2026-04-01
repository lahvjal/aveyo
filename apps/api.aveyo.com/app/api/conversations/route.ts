import { NextResponse } from "next/server";
import {
  createConversationResult,
  getConversationsResult,
  type CreateConversationBody
} from "@/lib/conversations/service";
import { requireAuthenticatedRequest } from "@/lib/auth/require-auth";
import { ServiceError } from "@/lib/service-error";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedRequest(request);
    const { searchParams } = new URL(request.url);
    const excludeImpersonation =
      searchParams.get("excludeImpersonation") === "1" ||
      searchParams.get("excludeImpersonation") === "true";
    return NextResponse.json(
      await getConversationsResult(auth.user.id, { excludeImpersonation })
    );
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unable to load conversations." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedRequest(request);
    const body = (await request.json().catch(() => ({}))) as CreateConversationBody;
    return NextResponse.json(await createConversationResult(auth.user.id, body));
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unable to create conversation." }, { status: 500 });
  }
}

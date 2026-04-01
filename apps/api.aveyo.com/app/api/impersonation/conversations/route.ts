import { NextResponse } from "next/server";
import { requireAuthenticatedRequest } from "@/lib/auth/require-auth";
import {
  createImpersonationConversationResult,
  type CreateImpersonationConversationBody
} from "@/lib/impersonation/service";
import { ServiceError } from "@/lib/service-error";

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedRequest(request);
    const body = (await request.json().catch(() => ({}))) as CreateImpersonationConversationBody;
    return NextResponse.json(await createImpersonationConversationResult(auth.user.id, body));
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: "Unable to create impersonation conversation." },
      { status: 500 }
    );
  }
}

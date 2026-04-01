import { NextResponse } from "next/server";
import { requireAuthenticatedRequest } from "@/lib/auth/require-auth";
import { getConversationCustomerDetailsResult } from "@/lib/conversations/service";
import { ServiceError } from "@/lib/service-error";

export async function GET(
  request: Request,
  context: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await context.params;

  try {
    const auth = await requireAuthenticatedRequest(request);
    return NextResponse.json(
      await getConversationCustomerDetailsResult(conversationId, auth.user.id)
    );
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: "Unable to load conversation customer details." },
      { status: 500 }
    );
  }
}

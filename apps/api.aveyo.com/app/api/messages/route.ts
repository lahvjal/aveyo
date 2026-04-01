import { NextResponse } from "next/server";
import { requireAuthenticatedRequest } from "@/lib/auth/require-auth";
import { createMessageResult, type MessageBody } from "@/lib/conversations/service";
import { ServiceError } from "@/lib/service-error";

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedRequest(request);
    const body = (await request.json()) as MessageBody;
    return NextResponse.json(await createMessageResult(body, auth.user.id));
  } catch (error) {
    if (error instanceof ServiceError) {
      console.error("Message append failed", { status: error.status, message: error.message });
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Unexpected message append failure", error);
    return NextResponse.json(
      { error: "Unable to append message." },
      { status: 500 }
    );
  }
}

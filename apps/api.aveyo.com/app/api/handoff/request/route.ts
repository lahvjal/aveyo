import { NextResponse } from "next/server";
import { requireAuthenticatedRequest } from "@/lib/auth/require-auth";
import {
  createHandoffRequestResult,
  type HandoffRequestBody
} from "@/lib/handoff/service";
import { ServiceError } from "@/lib/service-error";

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedRequest(request);
    const body = (await request.json()) as HandoffRequestBody;
    return NextResponse.json(await createHandoffRequestResult(body, auth.user.id));
  } catch (error) {
    if (error instanceof ServiceError) {
      console.error("Handoff request failed", { status: error.status, message: error.message });
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Unexpected handoff request failure", error);
    return NextResponse.json(
      { error: "Unable to request handoff." },
      { status: 500 }
    );
  }
}

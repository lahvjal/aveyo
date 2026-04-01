import { NextResponse } from "next/server";
import { requireAuthenticatedRequest } from "@/lib/auth/require-auth";
import { createHandoffClaimResult, type ClaimBody } from "@/lib/handoff/service";
import { ServiceError } from "@/lib/service-error";

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedRequest(request);
    const body = (await request.json()) as ClaimBody;
    return NextResponse.json(await createHandoffClaimResult(body, auth.user.id));
  } catch (error) {
    if (error instanceof ServiceError) {
      console.error("Handoff claim failed", { status: error.status, message: error.message });
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Unexpected handoff claim failure", error);
    return NextResponse.json(
      { error: "Unable to claim handoff." },
      { status: 500 }
    );
  }
}

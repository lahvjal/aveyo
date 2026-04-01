import { NextResponse } from "next/server";
import { requireAuthenticatedRequest } from "@/lib/auth/require-auth";
import { createHandoffResolveResult, type ResolveBody } from "@/lib/handoff/service";
import { ServiceError } from "@/lib/service-error";

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedRequest(request);
    const body = (await request.json()) as ResolveBody;
    return NextResponse.json(await createHandoffResolveResult(body, auth.user.id));
  } catch (error) {
    if (error instanceof ServiceError) {
      console.error("Handoff resolve failed", { status: error.status, message: error.message });
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Unexpected handoff resolve failure", error);
    return NextResponse.json(
      { error: "Unable to resolve handoff." },
      { status: 500 }
    );
  }
}

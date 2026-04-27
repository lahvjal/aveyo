import { NextResponse } from "next/server";
import { requireAuthenticatedRequest } from "@/lib/auth/require-auth";
import { runManagerCleanupSweepResult } from "@/lib/manager/service";
import { ServiceError } from "@/lib/service-error";

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedRequest(request);
    return NextResponse.json(await runManagerCleanupSweepResult(auth.user.id, auth.role));
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unable to run manager cleanup sweep." }, { status: 500 });
  }
}

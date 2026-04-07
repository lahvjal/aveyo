import { NextResponse } from "next/server";
import { requireAuthenticatedRequest } from "@/lib/auth/require-auth";
import { reassignManagerHandoffResult, type ManagerReassignBody } from "@/lib/manager/service";
import { ServiceError } from "@/lib/service-error";

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedRequest(request);
    const body = (await request.json().catch(() => ({}))) as ManagerReassignBody;
    return NextResponse.json(await reassignManagerHandoffResult(body, auth.user.id, auth.role));
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unable to reassign handoff." }, { status: 500 });
  }
}

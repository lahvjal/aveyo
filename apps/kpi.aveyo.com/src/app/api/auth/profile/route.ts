import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedContext } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedContext(request);
  if (auth.errorResponse || !auth.context) {
    return auth.errorResponse!;
  }

  return NextResponse.json({
    success: true,
    authorized: true,
    user: auth.context.user,
    role: auth.context.role,
    profile: auth.context.profile
  });
}

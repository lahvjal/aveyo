import { NextResponse } from "next/server";
import { clearAuthSessionCookies } from "@/lib/auth/session-cookies";

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true });
  clearAuthSessionCookies(response, request);
  return response;
}

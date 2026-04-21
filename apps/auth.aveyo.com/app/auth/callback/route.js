import { NextResponse } from "next/server";

const forwardedQueryParams = [
  "code",
  "token_hash",
  "type",
  "error",
  "error_description",
  "returnTo",
  "redirect_to",
  "mode"
];

export function GET(request) {
  const requestUrl = new URL(request.url);
  const redirectUrl = new URL("/login", requestUrl.origin);

  for (const param of forwardedQueryParams) {
    const value = requestUrl.searchParams.get(param);
    if (value) {
      redirectUrl.searchParams.set(param, value);
    }
  }

  return NextResponse.redirect(redirectUrl);
}

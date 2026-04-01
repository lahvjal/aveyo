import { NextRequest, NextResponse } from "next/server";

function decodeCookieValue(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseStructuredTokenCookie(rawValue: string) {
  const decoded = decodeCookieValue(rawValue);
  try {
    const parsed = JSON.parse(decoded) as unknown;
    if (Array.isArray(parsed)) {
      return {
        accessToken: typeof parsed[0] === "string" ? parsed[0] : undefined,
        refreshToken: typeof parsed[1] === "string" ? parsed[1] : undefined
      };
    }
    if (parsed && typeof parsed === "object") {
      const accessToken = (parsed as Record<string, unknown>).access_token;
      const refreshToken = (parsed as Record<string, unknown>).refresh_token;
      return {
        accessToken: typeof accessToken === "string" ? accessToken : undefined,
        refreshToken: typeof refreshToken === "string" ? refreshToken : undefined
      };
    }
  } catch {
    // ignore parse issues
  }
  return {
    accessToken: undefined,
    refreshToken: undefined
  };
}

export async function GET(request: NextRequest) {
  const cookies = request.cookies.getAll();

  const directAccessToken =
    request.cookies.get("ava-access-token")?.value ?? request.cookies.get("sb-access-token")?.value;
  const directRefreshToken =
    request.cookies.get("ava-refresh-token")?.value ?? request.cookies.get("sb-refresh-token")?.value;

  if (directAccessToken) {
    return NextResponse.json(
      {
        accessToken: decodeCookieValue(directAccessToken),
        refreshToken: directRefreshToken ? decodeCookieValue(directRefreshToken) : null
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  for (const cookie of cookies) {
    if (!cookie.name.includes("auth-token")) {
      continue;
    }
    const parsed = parseStructuredTokenCookie(cookie.value);
    if (parsed.accessToken) {
      return NextResponse.json(
        {
          accessToken: parsed.accessToken,
          refreshToken: parsed.refreshToken ?? null
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }
  }

  return NextResponse.json(
    { error: "No Supabase session cookie available." },
    { status: 401, headers: { "Cache-Control": "no-store" } }
  );
}

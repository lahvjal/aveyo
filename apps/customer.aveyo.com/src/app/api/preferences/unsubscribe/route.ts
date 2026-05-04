import { NextResponse } from "next/server";
import { isEmailUnsubscribed, saveEmailUnsubscribe } from "@/lib/email-unsubscribe-store";

function getSearchEmail(request: Request): string {
  const url = new URL(request.url);
  return url.searchParams.get("email")?.trim() || "";
}

async function getBodyEmail(request: Request): Promise<{ email: string; reason: string }> {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const payload = (await request.json().catch(() => ({}))) as { email?: string; reason?: string };
    return {
      email: payload.email?.trim() || "",
      reason: payload.reason?.trim() || ""
    };
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return { email: "", reason: "" };
  }

  return {
    email: String(formData.get("email") || "").trim(),
    reason: String(formData.get("reason") || "").trim()
  };
}

export async function GET(request: Request) {
  try {
    const email = getSearchEmail(request);
    if (!email) {
      return NextResponse.json({ error: "Email query parameter is required." }, { status: 400 });
    }

    const unsubscribed = await isEmailUnsubscribed(email);
    return NextResponse.json({ email, unsubscribed });
  } catch (error) {
    console.error("[preferences/unsubscribe] GET failed", error);
    return NextResponse.json({ error: "Unable to check unsubscribe status." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const queryEmail = getSearchEmail(request);
    const body = await getBodyEmail(request);
    const email = queryEmail || body.email;

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const source = request.headers.get("x-unsubscribe-source") || "web";
    const userAgent = request.headers.get("user-agent");

    const result = await saveEmailUnsubscribe({
      email,
      source,
      reason: body.reason || undefined,
      userAgent
    });

    return NextResponse.json({
      success: true,
      email: result.email,
      message: "You have been unsubscribed from future marketing emails."
    });
  } catch (error) {
    console.error("[preferences/unsubscribe] POST failed", error);
    const message =
      error instanceof Error
        ? error.message
        : "Unable to process unsubscribe request right now.";
    const status = message.includes("valid email") ? 400 : 500;
    return NextResponse.json(
      {
        error: message
      },
      { status }
    );
  }
}

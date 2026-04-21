import { NextResponse } from "next/server";
import { beginHostedLogin } from "@/lib/auth/login-start";
import { ServiceError } from "@/lib/service-error";

export const dynamic = "force-dynamic";

interface LoginStartSubmission {
  email?: unknown;
  returnTo?: unknown;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as LoginStartSubmission | null;
    if (!body) {
      throw new ServiceError(400, "Invalid login payload.");
    }

    const result = await beginHostedLogin(request, body);
    return NextResponse.json({
      success: true,
      nextStep: result.nextStep
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }

    console.error("Login start failed", error);
    return NextResponse.json(
      { success: false, error: "Unable to continue sign-in right now." },
      { status: 500 }
    );
  }
}

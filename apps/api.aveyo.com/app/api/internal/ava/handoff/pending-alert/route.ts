import { NextResponse } from "next/server";
import { runPendingHandoffAlertSweep } from "@/lib/handoff/pending-alert";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getCronSecret() {
  return process.env.CRON_SECRET?.trim() || process.env.AVA_AUTOMATION_CRON_SECRET?.trim() || null;
}

function authorizeRequest(request: Request) {
  const secret = getCronSecret();
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured." },
      { status: 503 }
    );
  }

  const authorization = request.headers.get("authorization")?.trim();
  if (authorization !== `Bearer ${secret}`) {
    return NextResponse.json(
      { error: "Invalid cron secret." },
      { status: 401 }
    );
  }

  return null;
}

async function handleSweep(request: Request) {
  const authFailure = authorizeRequest(request);
  if (authFailure) {
    return authFailure;
  }

  try {
    const result = await runPendingHandoffAlertSweep();
    if (result.skippedNoWebhook) {
      return NextResponse.json(result, { status: 503 });
    }
    return NextResponse.json(result, {
      status: result.alerted > 0 ? 200 : 202,
    });
  } catch (error) {
    console.error("Pending handoff GChat alert sweep failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to run pending handoff alert sweep.",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return handleSweep(request);
}

export async function POST(request: Request) {
  return handleSweep(request);
}

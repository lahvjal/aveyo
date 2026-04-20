import { NextResponse } from "next/server";
import { runAvaReplyJobSweep } from "@/lib/conversations/service";
import { runAvaSessionAutomationSweep } from "@/lib/automation/session-automation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getCronSecret() {
  return process.env.CRON_SECRET?.trim() || process.env.AVA_AUTOMATION_CRON_SECRET?.trim() || null;
}

function authorizeAutomationRequest(request: Request) {
  const secret = getCronSecret();
  if (!secret) {
    return NextResponse.json(
      {
        error: "CRON_SECRET is not configured for Ava automation."
      },
      {
        status: 503
      }
    );
  }

  const authorization = request.headers.get("authorization")?.trim();
  if (authorization !== `Bearer ${secret}`) {
    return NextResponse.json(
      {
        error: "Invalid Ava automation secret."
      },
      {
        status: 401
      }
    );
  }

  return null;
}

async function handleAutomationSweep(request: Request) {
  const authorizationFailure = authorizeAutomationRequest(request);
  if (authorizationFailure) {
    return authorizationFailure;
  }

  try {
    const [sessionAutomation, replyJobs] = await Promise.all([
      runAvaSessionAutomationSweep(),
      runAvaReplyJobSweep()
    ]);
    return NextResponse.json(
      {
        sessionAutomation,
        replyJobs
      },
      {
        status: sessionAutomation.acquiredLease || replyJobs.claimedJobs > 0 ? 200 : 202
      }
    );
  } catch (error) {
    console.error("Ava session automation sweep failed", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to run Ava automation sweep."
      },
      {
        status: 500
      }
    );
  }
}

export async function GET(request: Request) {
  return handleAutomationSweep(request);
}

export async function POST(request: Request) {
  return handleAutomationSweep(request);
}

import { NextResponse } from "next/server";
import { requireAuthenticatedRequest } from "@/lib/auth/require-auth";
import {
  getSupportPresenceResult,
  heartbeatSupportPresenceResult,
  setSupportPresenceOfflineResult,
  setSupportPresenceOnlineResult
} from "@/lib/presence/service";
import { ServiceError } from "@/lib/service-error";

interface PresenceActionBody {
  action?: "online" | "offline" | "heartbeat";
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedRequest(request);
    return NextResponse.json(await getSupportPresenceResult(auth.user.id, auth.role));
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unable to load support presence." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedRequest(request);
    const body = (await request.json().catch(() => ({}))) as PresenceActionBody;
    const action = body.action;

    if (action === "online") {
      return NextResponse.json(await setSupportPresenceOnlineResult(auth.user.id, auth.role));
    }
    if (action === "offline") {
      return NextResponse.json(await setSupportPresenceOfflineResult(auth.user.id, auth.role));
    }
    if (action === "heartbeat") {
      return NextResponse.json(await heartbeatSupportPresenceResult(auth.user.id, auth.role));
    }

    return NextResponse.json(
      { error: "action must be one of: online, offline, heartbeat." },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unable to update support presence." }, { status: 500 });
  }
}

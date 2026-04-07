import { NextResponse } from "next/server";
import { requireAuthenticatedRequest } from "@/lib/auth/require-auth";
import {
  getManagerConfigResult,
  updateManagerConfigResult,
  type ManagerConfigUpdateBody
} from "@/lib/manager/service";
import { ServiceError } from "@/lib/service-error";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedRequest(request);
    return NextResponse.json(await getManagerConfigResult(auth.user.id, auth.role));
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unable to load manager config." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedRequest(request);
    const body = (await request.json().catch(() => ({}))) as ManagerConfigUpdateBody;
    return NextResponse.json(await updateManagerConfigResult(body, auth.user.id, auth.role));
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unable to update manager config." }, { status: 500 });
  }
}

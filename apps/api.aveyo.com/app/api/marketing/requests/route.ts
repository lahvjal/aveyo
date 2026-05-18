import { NextResponse } from "next/server";
import { getAuthSessionResult } from "@/lib/auth/session";
import { AsanaError, createAsanaTask, findSectionGid } from "@/lib/marketing/asana";

export interface MarketingRequestPayload {
  title: string;
  departmentName: string;
  dueDate?: string;
  channel: string;
  details: string;
  requesterName: string;
  requesterEmail: string;
}

function buildTaskNotes(payload: MarketingRequestPayload): string {
  return [
    `Department: ${payload.departmentName}`,
    `Due date: ${payload.dueDate || "Not specified"}`,
    `Delivery channel: ${payload.channel}`,
    `Requester: ${payload.requesterName} (${payload.requesterEmail})`,
    "",
    "Request details:",
    payload.details
  ].join("\n");
}

function validatePayload(body: unknown): MarketingRequestPayload {
  if (!body || typeof body !== "object") {
    throw new AsanaError("Request body is required.", 400);
  }

  const raw = body as Record<string, unknown>;

  if (!raw.title || typeof raw.title !== "string" || !raw.title.trim()) {
    throw new AsanaError("title is required.", 400);
  }
  if (!raw.departmentName || typeof raw.departmentName !== "string") {
    throw new AsanaError("departmentName is required.", 400);
  }
  if (!raw.channel || typeof raw.channel !== "string") {
    throw new AsanaError("channel is required.", 400);
  }
  if (!raw.details || typeof raw.details !== "string" || !raw.details.trim()) {
    throw new AsanaError("details is required.", 400);
  }
  if (!raw.requesterName || typeof raw.requesterName !== "string") {
    throw new AsanaError("requesterName is required.", 400);
  }
  if (!raw.requesterEmail || typeof raw.requesterEmail !== "string") {
    throw new AsanaError("requesterEmail is required.", 400);
  }

  return {
    title: raw.title.trim(),
    departmentName: String(raw.departmentName).trim(),
    dueDate: raw.dueDate ? String(raw.dueDate).trim() : undefined,
    channel: String(raw.channel).trim(),
    details: raw.details.trim(),
    requesterName: String(raw.requesterName).trim(),
    requesterEmail: String(raw.requesterEmail).trim()
  };
}

export async function POST(request: Request) {
  try {
    const session = await getAuthSessionResult(request);

    if (!session.authenticated || !session.user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    if (session.userType !== "employee") {
      return NextResponse.json({ error: "Employee access required." }, { status: 403 });
    }

    const accessToken = process.env.ASANA_ACCESS_TOKEN?.trim();
    const projectGid = process.env.ASANA_MARKETING_PROJECT_GID?.trim();

    if (!accessToken || !projectGid) {
      return NextResponse.json(
        { error: "Asana is not configured on this server. Set ASANA_ACCESS_TOKEN and ASANA_MARKETING_PROJECT_GID." },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => null);
    const payload = validatePayload(body);

    const sectionGid = await findSectionGid(projectGid, "To Do", accessToken).catch(() => undefined);

    const task = await createAsanaTask({
      name: payload.title,
      notes: buildTaskNotes(payload),
      dueOn: payload.dueDate || undefined,
      projectGid,
      sectionGid,
      accessToken
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    if (error instanceof AsanaError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Unable to create Asana task." }, { status: 500 });
  }
}

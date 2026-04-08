import { NextResponse } from "next/server";
import { getAuthSessionResult } from "@/lib/auth/session";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

interface DepartmentRow {
  id: string;
  name: string;
  parent_id: string | null;
}

export async function GET(request: Request) {
  const session = await getAuthSessionResult(request);
  if (!session.authenticated || !session.user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (session.userType !== "employee") {
    return NextResponse.json({ error: "Employee access required." }, { status: 403 });
  }

  const supabaseServiceRoleClient = getSupabaseServiceRoleClient();
  const { data, error } = await supabaseServiceRoleClient
    .from("departments")
    .select("id, name, parent_id")
    .order("name", { ascending: true })
    .limit(5000);

  if (error) {
    return NextResponse.json(
      { error: `Unable to load department options: ${error.message}` },
      { status: 500 }
    );
  }

  const departments = ((data ?? []) as DepartmentRow[])
    .filter((row) => row?.id && row?.name)
    .map((row) => ({
      id: row.id,
      name: row.name,
      parentId: row.parent_id
    }));

  return NextResponse.json({ departments });
}

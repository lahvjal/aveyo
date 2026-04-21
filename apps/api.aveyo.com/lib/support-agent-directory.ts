import { getOnlineSupportAgentIds } from "@/lib/presence/service";
import { ServiceError } from "@/lib/service-error";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

interface DepartmentHierarchyRow {
  id: string;
  name: string | null;
  parent_id: string | null;
}

interface SupportAgentProfileRow {
  id: string;
  full_name: string | null;
  preferred_name: string | null;
  profile_photo_url: string | null;
  email: string | null;
  employment_status: string | null;
}

export interface SupportAgentDirectoryEntry {
  id: string;
  name: string;
  avatarUrl: string | null;
  status: "online" | "offline";
}

function isActiveEmployee(employmentStatus: string | null | undefined) {
  const normalized = employmentStatus?.trim().toLowerCase();
  return !normalized || normalized === "active";
}

function toDisplayName(profile: SupportAgentProfileRow) {
  const preferredName = profile.preferred_name?.trim();
  if (preferredName) {
    return preferredName;
  }

  const fullName = profile.full_name?.trim();
  if (fullName) {
    return fullName;
  }

  const email = profile.email?.trim();
  if (email) {
    return email.split("@")[0] || "Support Agent";
  }

  return "Support Agent";
}

async function getCustomerCareDepartmentIds() {
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("departments")
    .select("id, name, parent_id")
    .limit(5000);

  if (error) {
    throw new ServiceError(500, `Unable to load departments: ${error.message}`);
  }

  const departments = (data ?? []) as DepartmentHierarchyRow[];
  const customerCareRootIds = departments
    .filter((row) => row.name?.trim().toLowerCase() === "customer care")
    .map((row) => row.id);

  const customerCareDepartmentIds = new Set<string>(customerCareRootIds);
  if (customerCareRootIds.length === 0) {
    return customerCareDepartmentIds;
  }

  const childrenByParentId = new Map<string, DepartmentHierarchyRow[]>();
  for (const department of departments) {
    if (!department.parent_id) {
      continue;
    }

    const children = childrenByParentId.get(department.parent_id) ?? [];
    children.push(department);
    childrenByParentId.set(department.parent_id, children);
  }

  const stack = [...customerCareRootIds];
  while (stack.length > 0) {
    const currentId = stack.pop();
    if (!currentId) {
      continue;
    }

    const children = childrenByParentId.get(currentId) ?? [];
    for (const child of children) {
      if (customerCareDepartmentIds.has(child.id)) {
        continue;
      }
      customerCareDepartmentIds.add(child.id);
      stack.push(child.id);
    }
  }

  return customerCareDepartmentIds;
}

export async function listSupportAgentDirectory(options?: {
  excludeUserId?: string | null;
}): Promise<SupportAgentDirectoryEntry[]> {
  const supabase = getSupabaseServiceRoleClient();
  const customerCareDepartmentIds = await getCustomerCareDepartmentIds();

  const { data: adminLikeData, error: adminLikeError } = await supabase
    .from("profiles")
    .select("id, full_name, preferred_name, profile_photo_url, email, employment_status")
    .or("is_admin.eq.true,is_super_admin.eq.true");

  if (adminLikeError) {
    throw new ServiceError(500, `Unable to load admin support agents: ${adminLikeError.message}`);
  }

  let customerCareData: SupportAgentProfileRow[] = [];
  if (customerCareDepartmentIds.size > 0) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, preferred_name, profile_photo_url, email, employment_status")
      .in("department_id", Array.from(customerCareDepartmentIds));

    if (error) {
      throw new ServiceError(500, `Unable to load customer-care support agents: ${error.message}`);
    }

    customerCareData = (data ?? []) as SupportAgentProfileRow[];
  }

  const profileById = new Map<string, SupportAgentProfileRow>();
  for (const row of [...((adminLikeData ?? []) as SupportAgentProfileRow[]), ...customerCareData]) {
    if (!row.id || !isActiveEmployee(row.employment_status)) {
      continue;
    }
    if (options?.excludeUserId && row.id === options.excludeUserId) {
      continue;
    }
    profileById.set(row.id, row);
  }

  const onlineAgentIds = await getOnlineSupportAgentIds(Array.from(profileById.keys()));

  return Array.from(profileById.values())
    .map<SupportAgentDirectoryEntry>((profile) => ({
      id: profile.id,
      name: toDisplayName(profile),
      avatarUrl: profile.profile_photo_url?.trim() || null,
      status: onlineAgentIds.has(profile.id) ? "online" : "offline"
    }))
    .sort((left, right) => {
      if (left.status !== right.status) {
        return left.status === "online" ? -1 : 1;
      }
      return left.name.localeCompare(right.name);
    });
}

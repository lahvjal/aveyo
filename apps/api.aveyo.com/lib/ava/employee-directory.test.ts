import { beforeEach, describe, expect, it, vi } from "vitest";
import { lookupEmployeeDirectoryContext } from "@/lib/ava/employee-directory";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: vi.fn(),
  getSupabaseServiceRoleClient: vi.fn()
}));

const mockedGetSupabaseServiceRoleClient = vi.mocked(getSupabaseServiceRoleClient);

function mockDirectoryLookups(params: {
  profiles: Array<Record<string, unknown>>;
  departments: Array<Record<string, unknown>>;
}) {
  mockedGetSupabaseServiceRoleClient.mockReturnValue({
    from: (table: string) => ({
      select: () => ({
        limit: async () => ({
          data: table === "profiles" ? params.profiles : params.departments,
          error: null
        })
      })
    })
  } as never);
}

describe("lookupEmployeeDirectoryContext", () => {
  beforeEach(() => {
    mockedGetSupabaseServiceRoleClient.mockReset();
  });

  it("returns only safe org fields and flags restricted contact requests", async () => {
    mockDirectoryLookups({
      profiles: [
        {
          id: "employee-john",
          full_name: "John Doe",
          preferred_name: null,
          job_title: "Closer",
          department_id: "dept-sales",
          manager_id: "employee-jane",
          employment_status: "active"
        },
        {
          id: "employee-jane",
          full_name: "Jane Smith",
          preferred_name: null,
          job_title: "Sales Manager",
          department_id: "dept-sales",
          manager_id: "employee-avery",
          employment_status: "active"
        },
        {
          id: "employee-avery",
          full_name: "Avery Executive",
          preferred_name: null,
          job_title: "VP Sales",
          department_id: "dept-leadership",
          manager_id: null,
          employment_status: "active"
        }
      ],
      departments: [
        { id: "dept-sales", name: "Sales", parent_id: "dept-leadership" },
        { id: "dept-leadership", name: "Leadership", parent_id: null }
      ]
    });

    const result = await lookupEmployeeDirectoryContext({
      question: "What department is John Doe in, who does he report to, and what's his email?",
      viewerUserId: "employee-jane"
    });

    expect(result.status).toBe("ok");
    expect(result.restrictedContactRequest).toBe(true);
    expect(result.matches[0]).toMatchObject({
      name: "John Doe",
      title: "Closer",
      department: "Sales",
      manager: "Jane Smith",
      reportingChain: ["Jane Smith", "Avery Executive"]
    });
    expect(result.note).toContain("Private contact details");
    expect("email" in result.matches[0]!).toBe(false);
    expect("phone" in result.matches[0]!).toBe(false);
  });

  it("matches natural single-name employee lookups", async () => {
    mockDirectoryLookups({
      profiles: [
        {
          id: "employee-john",
          full_name: "John Doe",
          preferred_name: null,
          job_title: "Closer",
          department_id: "dept-sales",
          manager_id: "employee-jane",
          employment_status: "active"
        },
        {
          id: "employee-jane",
          full_name: "Jane Smith",
          preferred_name: null,
          job_title: "Sales Manager",
          department_id: "dept-sales",
          manager_id: null,
          employment_status: "active"
        }
      ],
      departments: [{ id: "dept-sales", name: "Sales", parent_id: null }]
    });

    const result = await lookupEmployeeDirectoryContext({
      question: "What does John do at Aveyo?",
      viewerUserId: "employee-jane"
    });

    expect(result.status).toBe("ok");
    expect(result.matches[0]).toMatchObject({
      name: "John Doe",
      title: "Closer",
      department: "Sales",
      manager: "Jane Smith"
    });
  });

  it("marks first-name-only matches as ambiguous when multiple employees fit", async () => {
    mockDirectoryLookups({
      profiles: [
        {
          id: "employee-dave-anderson",
          full_name: "Dave Anderson",
          preferred_name: null,
          job_title: "CEO",
          department_id: "dept-leadership",
          manager_id: null,
          employment_status: "active"
        },
        {
          id: "employee-dave-brown",
          full_name: "Dave Brown",
          preferred_name: null,
          job_title: "Marketing Director",
          department_id: "dept-marketing",
          manager_id: "employee-donny",
          employment_status: "active"
        },
        {
          id: "employee-donny",
          full_name: "Donny McGinnis",
          preferred_name: null,
          job_title: "CMO",
          department_id: "dept-marketing",
          manager_id: null,
          employment_status: "active"
        }
      ],
      departments: [
        { id: "dept-leadership", name: "Leadership", parent_id: null },
        { id: "dept-marketing", name: "Marketing", parent_id: null }
      ]
    });

    const result = await lookupEmployeeDirectoryContext({
      question: "how about Dave?",
      viewerUserId: "employee-donny"
    });

    expect(result.status).toBe("ambiguous");
    expect(result.matches).toHaveLength(2);
    expect(result.matches.map((match) => match.name)).toEqual(["Dave Anderson", "Dave Brown"]);
    expect(result.note).toContain("Multiple employees matched this name");
  });
});

import { describe, expect, it } from "vitest";
import { lookupEmployeeKpiSummary } from "@/lib/ava/employee-kpis";

describe("lookupEmployeeKpiSummary", () => {
  it("rejects KPI requests for employees without KPI permission", async () => {
    const result = await lookupEmployeeKpiSummary({
      question: "How are sales numbers looking this week?",
      policy: {
        isEmployee: true,
        canAccessDirectory: true,
        canAccessNews: true,
        kpiScope: "none",
        kpiDepartmentIds: [],
        kpiScopeLabel: null
      }
    });

    expect(result.status).toBe("restricted");
    expect(result.scope).toBe("none");
    expect(result.note).toContain("managers, admins, executives, and super admins");
  });
});

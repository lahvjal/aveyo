import type { Project } from "@/types";

function parseRawPayload(rawPayload: Project["podio_data"] extends { raw_payload?: infer T } ? T : unknown) {
  if (!rawPayload) {
    return {};
  }

  if (typeof rawPayload === "string") {
    try {
      return JSON.parse(rawPayload) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  if (typeof rawPayload === "object") {
    return rawPayload as Record<string, unknown>;
  }

  return {};
}

/**
 * Normalized milestone fields per dashboard section — single source for
 * stage UI, next milestone, and progress so all panels stay in sync.
 */
export function extractProjectSections(project: Project) {
  const milestoneData: Record<string, unknown> = {};

  if (typeof project.milestone === "object" && project.milestone) {
    Object.assign(milestoneData, project.milestone);
    const m = project.milestone as Record<string, unknown>;
    if (m["pre-approvals"]) {
      Object.assign(milestoneData, m["pre-approvals"] as object);
    }
    if (m.approvals) {
      Object.assign(milestoneData, m.approvals as object);
    }
    if (m.construction) {
      Object.assign(milestoneData, m.construction as object);
    }
    if (m.energization) {
      Object.assign(milestoneData, m.energization as object);
    }
  }

  const rawPayload = parseRawPayload(project.podio_data?.raw_payload);

  Object.assign(milestoneData, rawPayload, project.podio_data);

  if (rawPayload["pre-approvals"]) {
    Object.assign(milestoneData, rawPayload["pre-approvals"] as object);
  }
  if (rawPayload.approvals) {
    Object.assign(milestoneData, rawPayload.approvals as object);
  }
  if (rawPayload.construction) {
    Object.assign(milestoneData, rawPayload.construction as object);
  }
  if (rawPayload.energization) {
    Object.assign(milestoneData, rawPayload.energization as object);
  }

  return {
    "pre-approvals": {
      "site-survey-complete": milestoneData["site-survey-complete"] ?? milestoneData["site_survey_complete"],
      "site-survey-status": milestoneData["site-survey-status"] ?? milestoneData["site_survey_status"],
      "ntp-complete": milestoneData["ntp-complete"] ?? milestoneData["ntp_complete"],
      "engineering-complete": milestoneData["engineering-complete"] ?? milestoneData["engineering_complete"],
      "engineering-status": milestoneData["engineering-status"] ?? milestoneData["engineering_status"]
    },
    approvals: {
      "pre-install-review-complete":
        milestoneData["pre-install-review-complete"] ?? milestoneData["pre_install_review_complete"]
    },
    construction: {
      "install-appointment":
        milestoneData["install-appointment"] ??
        milestoneData["install_appointment"] ??
        milestoneData["estimated-install-date"] ??
        milestoneData["estimated_install_date"],
      "install-complete": milestoneData["install-complete"] ?? milestoneData["install_complete"],
      "ahj-inspection-complete":
        milestoneData["ahj-inspection-complete"] ?? milestoneData["ahj_inspection_complete"]
    },
    energization: {
      "pto-received": milestoneData["pto-received"] ?? milestoneData["pto_received"],
      "pto-status": milestoneData["pto-status"] ?? milestoneData["pto_status"],
      "energize-complete-date":
        milestoneData["energize-complete-date"] ?? milestoneData["energize_complete_date"],
      "engergize-status": milestoneData["engergize-status"] ?? milestoneData["engergize_status"],
      "system-active": milestoneData["system-active"] ?? milestoneData["system_active"]
    }
  };
}

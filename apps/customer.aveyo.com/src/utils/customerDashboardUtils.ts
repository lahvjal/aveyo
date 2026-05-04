import { Project } from "@/types";
import { getMilestoneDisplayName, milestoneDisplayNames, sectionDisplayNames, sectionOrder } from "@/utils/milestoneUtils";
import { extractProjectSections } from "@/utils/projectMilestoneSections";
import { calculateProjectStatus, isCompleted } from "@/utils/projectStatusUtils";

type DashboardSectionKey = "pre-approvals" | "approvals" | "construction" | "energization";

type SectionMilestoneInfo = {
  key: string;
  statusKey?: string;
};

const sectionMilestoneMap: Record<DashboardSectionKey, SectionMilestoneInfo[]> = {
  "pre-approvals": [
    { key: "site-survey-complete", statusKey: "site-survey-status" },
    { key: "ntp-complete" },
    { key: "engineering-complete", statusKey: "engineering-status" }
  ],
  approvals: [{ key: "pre-install-review-complete" }],
  construction: [
    { key: "install-appointment" },
    { key: "install-complete" },
    { key: "ahj-inspection-complete" }
  ],
  energization: [
    { key: "pto-received", statusKey: "pto-status" },
    { key: "energize-complete-date", statusKey: "engergize-status" },
    { key: "system-active", statusKey: undefined }
  ]
};

const milestoneDescriptions: Record<string, string> = {
  "site-survey-complete": "A technician visits your home to confirm measurements, access points, and the final site layout for your system.",
  "ntp-complete": "Financing and internal approvals are in place, so your project is officially cleared to move forward.",
  "engineering-complete": "Our engineering team finalizes your system design, panel layout, and structural documentation.",
  "pre-install-review-complete": "All approvals documents are signed and officially submitted to the city and utility companies.",
  "install-appointment": "Your installation date is confirmed and the crew is preparing for construction at your home.",
  "install-complete": "The solar equipment is installed and your project is moving into inspection and utility coordination.",
  "ahj-inspection-complete": "City and utility inspections are wrapping up so your system can move toward activation.",
  "pto-received": "All approvals documents are signed and officially submitted to the city and utility companies.",
  "energize-complete-date": "Your system is approved to turn on and begin producing clean energy for your home.",
  "system-active": "Your solar system is live, producing energy, and being monitored for performance.",
  "Project Complete": "Your solar installation is complete and your system is active.",
  "Permission To Operate Received from Utility Company": "All approvals documents are signed and officially submitted to the city and utility companies.",
  "System Active and Producing": "Your system is approved to turn on and begin producing clean energy for your home."
};

export function getProjectStatusSnapshot(project: Project) {
  const computedStatus = calculateProjectStatus(project);

  if (!project.calculatedStatus) {
    return computedStatus;
  }

  return {
    ...project.calculatedStatus,
    progressPercentage: Math.max(project.calculatedStatus.progressPercentage, computedStatus.progressPercentage)
  };
}

export function getCurrentSectionKey(project: Project): DashboardSectionKey | null {
  const currentStageName = getProjectStatusSnapshot(project).currentStage.name.toLowerCase();

  if (currentStageName.includes("pre-approvals")) {
    return "pre-approvals";
  }
  if (currentStageName.includes("construction")) {
    return "construction";
  }
  if (currentStageName.includes("activation") || currentStageName.includes("energization")) {
    return "energization";
  }
  if (currentStageName.includes("approvals")) {
    return "approvals";
  }

  return null;
}

export function getDashboardStageSections(project: Project) {
  const sections = extractProjectSections(project);
  const currentSectionKey = getCurrentSectionKey(project);
  const status = getProjectStatusSnapshot(project);
  const isProjectComplete =
    status.currentStage.name.toLowerCase() === "completed" || status.currentStage.status === "completed";

  const allMilestones = {
    preApprovals: sections["pre-approvals"],
    approvals: sections.approvals,
    construction: sections.construction,
    energization: sections.energization
  };

  return (sectionOrder as DashboardSectionKey[]).map((sectionKey) => {
    const sectionData = sections[sectionKey] as Record<string, any>;
    const milestones = sectionMilestoneMap[sectionKey].map(({ key, statusKey }) => {
      const completed = isCompleted(
        sectionData[key],
        statusKey ? sectionData[statusKey] : undefined,
        key,
        sectionKey,
        allMilestones
      );

      return {
        key,
        label: getMilestoneDisplayName(key),
        completed
      };
    });

    const completedCount = milestones.filter((milestone) => milestone.completed).length;
    let visualState: "completed" | "active" | "pending" = "pending";

    if (completedCount === milestones.length && milestones.length > 0) {
      visualState = "completed";
    } else if (!isProjectComplete && sectionKey === currentSectionKey) {
      visualState = "active";
    } else if (isProjectComplete && completedCount > 0) {
      visualState = "completed";
    }

    return {
      key: sectionKey,
      label: sectionDisplayNames[sectionKey],
      milestones,
      completedCount,
      totalMilestones: milestones.length,
      visualState
    };
  });
}

export function getNextMilestoneDescription(nextMilestone: string | undefined | null) {
  if (!nextMilestone) {
    return "Your solar project is moving forward and we will keep you updated at every major milestone.";
  }

  const milestoneKey = Object.entries(milestoneDisplayNames).find(
    ([, displayName]) => displayName === nextMilestone
  )?.[0];

  return (
    milestoneDescriptions[milestoneKey ?? nextMilestone] ??
    "Your solar project is moving forward and we will keep you updated at every major milestone."
  );
}

export type TimePeriod = "current_week" | "previous_week" | "mtd" | "ytd" | "next_week";

export type KPITrend = "up" | "down" | "neutral";

export type KPIStatus = "success" | "warning" | "danger" | "neutral";

export interface KPIValue {
  value: number | string;
  formatted: string;
  trend?: KPITrend;
  trendValue?: string;
  goal?: number;
  goalFormatted?: string;
  percentToGoal?: number;
  status?: KPIStatus;
  secondaryValue?: number | string;
  secondaryFormatted?: string;
  metadata?: {
    milestones?: Array<{
      stage: number;
      name: string;
      fullName: string;
      count: number;
    }>;
  };
}

export interface KPICalculationMeta {
  calculation: string;
  dataSources: {
    table: string;
    fields: string[];
  }[];
  formula: string;
  notes?: string;
}

export interface KPIDefinition {
  id: string;
  name: string;
  description?: string;
  format: "number" | "currency" | "percentage" | "days";
  availablePeriods: TimePeriod[];
  isHighlighted?: boolean;
  showGoal?: boolean;
  hidden?: boolean;
  calculationMeta?: KPICalculationMeta;
}

export interface KPISection {
  id: string;
  title: string;
  description?: string;
  kpis: KPIDefinition[];
}

// Dashboard sections based on docs/dashboard-layout.md
export const DASHBOARD_SECTIONS: KPISection[] = [
  {
    id: "sales_stats",
    title: "Sales Stats",
    description: "Sales performance, rep activity, and conversion metrics",
    kpis: [
      {
        id: "total_sales",
        name: "Total Sales",
        description: "Number of residential contracts sold",
        format: "number",
        availablePeriods: ["current_week", "previous_week", "mtd", "ytd"],
        showGoal: true,
        calculationMeta: {
          calculation: "Counts all signed contracts in the selected period, excluding cancelled projects and duplicates.",
          dataSources: [
            {
              table: "timeline",
              fields: ["contract-signed", "cancellation-reason", "project-dev-id"]
            },
            {
              table: "project-data",
              fields: ["project-status", "project-dev-id"]
            }
          ],
          formula: "COUNT(*) WHERE contract-signed IS NOT NULL AND project-status != 'Cancelled' AND cancellation-reason != 'Duplicate Project (Error)'",
          notes: "Filters out 161 duplicate projects and all cancelled projects."
        }
      },
      {
        id: "total_sales_goal",
        name: "Total Sales Goal",
        format: "number",
        availablePeriods: ["current_week", "previous_week", "mtd", "ytd"],
        hidden: true,
        calculationMeta: {
          calculation: "Target number of sales for the selected period, configured in the Goals page.",
          dataSources: [
            {
              table: "goals (Supabase)",
              fields: ["value", "kpi_id", "period"]
            }
          ],
          formula: "Static value from goals table",
          notes: "Editable via the Goals management page."
        }
      },
      {
        id: "aveyo_approved",
        name: "Aveyo Approved",
        description: "Sales that passed internal QA/validation",
        format: "number",
        availablePeriods: ["current_week", "previous_week", "mtd", "ytd"],
        calculationMeta: {
          calculation: "Counts distinct projects with an approved Scope of Work (SOW) timestamp, excluding cancelled projects.",
          dataSources: [
            {
              table: "customer-sow",
              fields: ["sow-approved-timestamp", "project-id"]
            },
            {
              table: "project-data",
              fields: ["project-status", "project-id"]
            }
          ],
          formula: "COUNT(DISTINCT project-id) WHERE sow-approved-timestamp IS NOT NULL AND project-status != 'Cancelled'",
          notes: "Uses simple project-id field (not project-dev-id) for joining."
        }
      },
      {
        id: "pull_through_rate",
        name: "Pull Through Rate",
        description: "Jobs with Install Complete / Total Jobs (for selected period)",
        format: "percentage",
        availablePeriods: ["current_week", "previous_week", "mtd", "ytd"],
        calculationMeta: {
          calculation: "Percentage of jobs sold during the selected period that have reached installation completion.",
          dataSources: [
            {
              table: "timeline",
              fields: ["contract-signed", "install-complete", "cancellation-reason", "project-dev-id"]
            },
            {
              table: "project-data",
              fields: ["project-status", "project-dev-id"]
            }
          ],
          formula: "(COUNT(jobs with install-complete WHERE contract-signed IN [period]) / Total Jobs sold in [period]) × 100",
          notes: "Period-specific metric. May be low for recent periods (jobs need time to complete). Shows count breakdown. Excludes cancelled projects and duplicates."
        }
      },
      {
        id: "battery_percentage",
        name: "% Jobs with Battery",
        description: "Percentage of sold jobs that include battery storage",
        format: "percentage",
        availablePeriods: ["current_week", "previous_week", "mtd", "ytd"],
        calculationMeta: {
          calculation: "Percentage of sales that included battery storage systems.",
          dataSources: [
            {
              table: "project-data",
              fields: ["battery-count", "battery-model", "project-dev-id"]
            },
            {
              table: "timeline",
              fields: ["contract-signed", "cancellation-reason", "project-dev-id"]
            }
          ],
          formula: "(COUNT(jobs WHERE battery-count > 0) / Total Sales) × 100",
          notes: "Shows battery attachment rate. 41% of all projects in database have batteries. Shows count breakdown (e.g., '42.5% (25 of 59 jobs)')."
        }
      },
      {
        id: "packet_approval_percentage",
        name: "% of Packet Approvals",
        description: "Percentage of sales that received packet approval",
        format: "percentage",
        availablePeriods: ["current_week", "previous_week", "mtd", "ytd"],
        calculationMeta: {
          calculation: "Percentage of sales from the period that have received packet approval.",
          dataSources: [
            {
              table: "timeline",
              fields: ["contract-signed", "packet-approval", "cancellation-reason", "project-dev-id"]
            },
            {
              table: "project-data",
              fields: ["project-status", "project-dev-id"]
            }
          ],
          formula: "(COUNT(sales with packet-approval) / Total Sales) × 100",
          notes: "Measures approval rate. Note: packet-approval field has 38% coverage in database. Shows count breakdown."
        }
      },
      {
        id: "reps_with_sale",
        name: "Reps with a Sale",
        description: "Number of unique sales reps (closers + setters) who closed deals",
        format: "number",
        availablePeriods: ["current_week", "previous_week", "mtd", "ytd"],
        calculationMeta: {
          calculation: "Count of unique sales reps (closers and setters combined) who participated in sales during the period.",
          dataSources: [
            {
              table: "timeline",
              fields: ["contract-signed", "cancellation-reason", "project-dev-id"]
            },
            {
              table: "project-data",
              fields: ["sales-rep-id", "setter-id", "sales-rep-name", "setter-name", "project-status", "project-dev-id"]
            }
          ],
          formula: "COUNT(DISTINCT sales-rep-id) + COUNT(DISTINCT setter-id) WHERE contract-signed IN [period]",
          notes: "Shows total rep count with breakdown (e.g., '25 (15 closers, 10 setters)'). Excludes cancelled projects."
        }
      },
      {
        id: "pull_through_rolling_6m",
        name: "Pull Through % (Rolling 6M)",
        description: "Percentage of jobs sold 61-180 days ago that reached install complete",
        format: "percentage",
        availablePeriods: ["current_week", "previous_week", "mtd", "ytd"],
        calculationMeta: {
          calculation: "Rolling 6-month pull-through rate: (Jobs with install-complete / Total jobs) for sales from 61-180 days ago.",
          dataSources: [
            {
              table: "timeline",
              fields: ["contract-signed", "install-complete", "cancellation-reason", "project-dev-id"]
            },
            {
              table: "project-data",
              fields: ["project-status", "project-dev-id"]
            }
          ],
          formula: "(COUNT(jobs with install-complete) / Total jobs) × 100 WHERE contract-signed BETWEEN 61-180 days ago",
          notes: "Fixed lookback window prevents 0% issue. Shows count breakdown (e.g., '65% (130 of 200 jobs)')."
        }
      },
      {
        id: "max_pull_through_rolling_6m",
        name: "Max Pull Through % (Rolling 6M)",
        description: "Percentage of jobs sold 61-180 days ago that are still active or complete",
        format: "percentage",
        availablePeriods: ["current_week", "previous_week", "mtd", "ytd"],
        calculationMeta: {
          calculation: "Maximum potential pull-through: (Active jobs / Total jobs) for sales from 61-180 days ago.",
          dataSources: [
            {
              table: "timeline",
              fields: ["contract-signed", "cancellation-reason", "project-dev-id"]
            },
            {
              table: "project-data",
              fields: ["project-status", "project-dev-id"]
            }
          ],
          formula: "(COUNT(Active jobs) / Total jobs) × 100 WHERE contract-signed BETWEEN 61-180 days ago",
          notes: "Shows maximum achievable pull-through if all active jobs complete. Shows count breakdown."
        }
      },
    ],
  },
  {
    id: "operations_stats",
    title: "Operations Stats",
    description: "Installation throughput, cycle times, and operational bottlenecks",
    kpis: [
      {
        id: "jobs_on_hold",
        name: "Jobs Placed ON HOLD",
        description: "Jobs paused due to outstanding requirements",
        format: "number",
        availablePeriods: ["current_week", "previous_week", "mtd", "ytd"],
        isHighlighted: true,
        calculationMeta: {
          calculation: "Counts all projects with 'On Hold' status, excluding duplicates.",
          dataSources: [
            {
              table: "project-data",
              fields: ["project-status", "project-dev-id"]
            },
            {
              table: "timeline",
              fields: ["cancellation-reason", "project-dev-id"]
            }
          ],
          formula: "COUNT(*) WHERE project-status = 'On Hold' AND cancellation-reason != 'Duplicate Project (Error)'",
          notes: "Currently 276 projects on hold. Highlighted to draw attention to bottlenecks."
        }
      },
      {
        id: "installs_complete",
        name: "Installs Complete",
        description: "Total installations completed",
        format: "number",
        availablePeriods: ["current_week", "previous_week", "mtd", "ytd"],
        showGoal: true,
        calculationMeta: {
          calculation: "Counts installations marked as complete within the period, filtering out duplicates.",
          dataSources: [
            {
              table: "timeline",
              fields: ["install-complete", "install-stage-status", "cancellation-reason"]
            }
          ],
          formula: "COUNT(*) WHERE install-complete IS NOT NULL AND install-stage-status = 'Complete' AND cancellation-reason != 'Duplicate Project (Error)'",
          notes: "Only counts installs with stage status 'Complete' (3,003 total records)."
        }
      },
      {
        id: "install_completion_goal",
        name: "Install Completion Goal",
        format: "number",
        availablePeriods: ["current_week", "previous_week", "mtd", "ytd"],
        hidden: true,
        calculationMeta: {
          calculation: "Target number of installations for the selected period.",
          dataSources: [
            {
              table: "goals (Supabase)",
              fields: ["value", "kpi_id", "period"]
            }
          ],
          formula: "Static value from goals table",
          notes: "Editable via the Goals management page."
        }
      },
      {
        id: "install_complete_no_pto",
        name: "Install Complete NO PTO",
        description: "Installs finished but awaiting Permission to Operate",
        format: "number",
        availablePeriods: ["current_week", "previous_week", "mtd", "ytd"],
        isHighlighted: true,
        calculationMeta: {
          calculation: "Counts completed installations that have not yet received Permission to Operate (PTO).",
          dataSources: [
            {
              table: "timeline",
              fields: ["install-complete", "pto-received", "install-stage-status", "cancellation-reason"]
            }
          ],
          formula: "COUNT(*) WHERE install-complete IS NOT NULL AND pto-received IS NULL AND install-stage-status = 'Complete'",
          notes: "Highlighted as a bottleneck indicator. Filtered by install-complete date within period."
        }
      },
      {
        id: "install_scheduled",
        name: "Install Scheduled",
        description: "Future installations on calendar",
        format: "number",
        availablePeriods: ["current_week", "previous_week", "next_week"],
        calculationMeta: {
          calculation: "Counts all installations scheduled within the selected period.",
          dataSources: [
            {
              table: "timeline",
              fields: ["install-appointment", "cancellation-reason"]
            }
          ],
          formula: "COUNT(*) WHERE install-appointment IS NOT NULL AND install-appointment IN [period] AND cancellation-reason != 'Duplicate Project (Error)'",
          notes: "Shows upcoming workload for installation teams."
        }
      },
      {
        id: "pto_received_count",
        name: "PTO Received",
        description: "Number of PTOs received in period",
        format: "number",
        availablePeriods: ["current_week", "previous_week", "mtd", "ytd"],
        calculationMeta: {
          calculation: "Counts projects that received Permission to Operate (PTO) within the selected period.",
          dataSources: [
            {
              table: "timeline",
              fields: ["pto-received", "cancellation-reason"]
            }
          ],
          formula: "COUNT(*) WHERE pto-received IS NOT NULL AND pto-received IN [period]",
          notes: "Shows projects that received final approval to energize their solar systems. Excludes cancelled and duplicate projects."
        }
      },
      {
        id: "active_install_not_started",
        name: "# of Active Jobs; Install Not Started",
        description: "Active jobs without an install appointment scheduled",
        format: "number",
        availablePeriods: ["current_week", "previous_week", "mtd", "ytd"],
        isHighlighted: true,
        calculationMeta: {
          calculation: "Current snapshot of active projects that do not have an install appointment scheduled. No period filter applied.",
          dataSources: [
            {
              table: "project-data",
              fields: ["project-status", "project-dev-id"]
            },
            {
              table: "timeline",
              fields: ["install-appointment", "cancellation-reason", "project-dev-id"]
            }
          ],
          formula: "COUNT(*) WHERE project-status = 'Active' AND install-appointment IS NULL",
          notes: "Highlighted as operational bottleneck indicator. Status: danger if ≥50, warning if ≥20."
        }
      },
    ],
  },
  {
    id: "cycle_times",
    title: "Cycle Times",
    description: "Speed of progression through the project pipeline",
    kpis: [
      {
        id: "avg_days_pp_to_install",
        name: "Avg Days PP → Install Start",
        description: "Time from Perfect Packet to install start",
        format: "days",
        availablePeriods: ["current_week", "previous_week", "mtd", "ytd"],
        showGoal: true,
        calculationMeta: {
          calculation: "Average number of days between Perfect Packet approval and installation appointment. Lower is better.",
          dataSources: [
            {
              table: "timeline",
              fields: ["packet-approval", "install-appointment", "cancellation-reason"]
            }
          ],
          formula: "AVG(DATEDIFF(install-appointment, packet-approval)) WHERE both dates are NOT NULL",
          notes: "TODO: Update to MEDIAN for more accurate representation. Only 37.7% of projects have packet-approval dates (2,285 records)."
        }
      },
      {
        id: "avg_days_install_to_m2",
        name: "Avg Days Install → M2 Approved",
        description: "Time from install appointment to M2 milestone",
        format: "days",
        availablePeriods: ["current_week", "previous_week", "mtd", "ytd"],
        showGoal: true,
        calculationMeta: {
          calculation: "Average number of days between installation appointment and M2 milestone approval. Lower is better.",
          dataSources: [
            {
              table: "timeline",
              fields: ["install-appointment", "cancellation-reason", "project-dev-id"]
            },
            {
              table: "project-data",
              fields: ["m2-approved", "project-dev-id"]
            }
          ],
          formula: "AVG(DATEDIFF(m2-approved, install-appointment)) WHERE both dates are NOT NULL",
          notes: "TODO: Update to MEDIAN. M2-approved coverage: 47.7% (2,893 records)."
        }
      },
      {
        id: "avg_days_pp_to_pto",
        name: "Avg Days PP → PTO",
        description: "Total time from PP submission to PTO",
        format: "days",
        availablePeriods: ["current_week", "previous_week", "mtd", "ytd"],
        showGoal: true,
        calculationMeta: {
          calculation: "Average total cycle time from Perfect Packet approval to Permission to Operate. Lower is better.",
          dataSources: [
            {
              table: "timeline",
              fields: ["packet-approval", "pto-received", "cancellation-reason"]
            }
          ],
          formula: "AVG(DATEDIFF(pto-received, packet-approval)) WHERE both dates are NOT NULL",
          notes: "TODO: Update to MEDIAN. Complete cycle time metric. PTO-received coverage: 44.8% (2,713 records)."
        }
      },
      {
        id: "avg_sale_to_glass",
        name: "Avg Days Sale → Glass on Roof",
        description: "Time from contract signing to panel installation",
        format: "days",
        availablePeriods: ["current_week", "previous_week", "mtd", "ytd"],
        calculationMeta: {
          calculation: "Average days from contract-signed to panel-install-complete. Lower is better.",
          dataSources: [
            {
              table: "timeline",
              fields: ["contract-signed", "panel-install-complete", "cancellation-reason", "project-dev-id"]
            },
            {
              table: "project-data",
              fields: ["project-status", "project-dev-id"]
            }
          ],
          formula: "AVG(DATEDIFF(panel-install-complete, contract-signed)) WHERE both dates are NOT NULL",
          notes: "Full pipeline metric from sale to physical installation completion. Excludes cancelled projects."
        }
      },
      {
        id: "avg_sale_to_pto",
        name: "Avg Days Sale → PTO",
        description: "Complete cycle time from contract to energization approval",
        format: "days",
        availablePeriods: ["current_week", "previous_week", "mtd", "ytd"],
        calculationMeta: {
          calculation: "Average days from contract-signed to pto-received. Lower is better.",
          dataSources: [
            {
              table: "timeline",
              fields: ["contract-signed", "pto-received", "cancellation-reason", "project-dev-id"]
            },
            {
              table: "project-data",
              fields: ["project-status", "project-dev-id"]
            }
          ],
          formula: "AVG(DATEDIFF(pto-received, contract-signed)) WHERE both dates are NOT NULL",
          notes: "End-to-end pipeline metric. Shows complete project lifecycle duration. Excludes cancelled projects."
        }
      },
    ],
  },
  {
    id: "residential_financials",
    title: "Residential Financials",
    description: "Financial state including cash flow and pending payments",
    kpis: [
      {
        id: "ar_m2_m3",
        name: "A/R (M2/M3 Submitted Not Received)",
        description: "Outstanding accounts receivable",
        format: "currency",
        availablePeriods: ["current_week", "previous_week", "mtd", "ytd"],
        calculationMeta: {
          calculation: "Sum of M2 (80% of contract) and M3 (20% of contract) amounts that have been submitted but not yet received, for active projects only. Displays total project count with M2 and M3 breakdown.",
          dataSources: [
            {
              table: "funding",
              fields: ["m2-submitted-date", "m2-received-date", "m3-submitted-date", "m3-received-date", "contract-price", "project-status-2", "project_ids"]
            },
            {
              table: "timeline",
              fields: ["cancellation-reason", "project-dev-id"]
            }
          ],
          formula: "Amount: SUM(contract-price * 0.8 WHERE m2-submitted-date NOT NULL AND m2-received-date IS NULL) + SUM(contract-price * 0.2 WHERE m3-submitted-date NOT NULL AND m3-received-date IS NULL) | Total Projects: COUNT(DISTINCT project_ids) | M2 Count: COUNT(DISTINCT project_ids WHERE m2-submitted-date NOT NULL AND m2-received-date IS NULL) | M3 Count: COUNT(DISTINCT project_ids WHERE m3-submitted-date NOT NULL AND m3-received-date IS NULL)",
          notes: "M2 = 80%, M3 = 20% of contract price. Data sourced from the funding table. Only includes active project statuses (Active, New Lender, Finance Hold, Pre-Approvals). Excludes Complete, Cancelled, On Hold, Pending Cancel, and duplicate projects. Display shows: Total projects (M2 count, M3 count) to provide breakdown of milestone types."
        }
      },
      {
        id: "revenue_received",
        name: "Revenue Received",
        description: "Payments received in period",
        format: "currency",
        availablePeriods: ["current_week", "previous_week", "mtd", "ytd"],
        calculationMeta: {
          calculation: "Total revenue received within the selected period from M1 (20%) and M2 (80%) milestone payments. Also displays total number of projects with payments received.",
          dataSources: [
            {
              table: "project-data",
              fields: ["m1-received-date", "m2-received-date", "contract-price", "project-dev-id"]
            },
            {
              table: "timeline",
              fields: ["cancellation-reason", "project-dev-id"]
            }
          ],
          formula: "Amount: SUM(contract-price * 0.2 WHERE m1-received-date IN [period]) + SUM(contract-price * 0.8 WHERE m2-received-date IN [period]) | Project Count: COUNT(DISTINCT project-dev-id WHERE (m1-received-date IN [period]) OR (m2-received-date IN [period]))",
          notes: "M1 = 20%, M2 = 80% of contract price. Excludes duplicate projects. Project count shows distinct projects that received any M1 or M2 payment in the period."
        }
      },
      {
        id: "install_m2_not_approved",
        name: "Install Complete M2 Not Approved",
        description: "Financial backlog - install done but M2 incomplete",
        format: "currency",
        availablePeriods: ["current_week", "previous_week", "mtd", "ytd"],
        isHighlighted: true,
        calculationMeta: {
          calculation: "Sum of M2 milestone amounts (80% of contract price) for completed installations that haven't received M2 approval.",
          dataSources: [
            {
              table: "timeline",
              fields: ["install-complete", "cancellation-reason", "project-dev-id"]
            },
            {
              table: "project-data",
              fields: ["contract-price", "m2-approved", "project-dev-id"]
            }
          ],
          formula: "SUM(contract-price * 0.8) WHERE install-complete IS NOT NULL AND m2-approved IS NULL",
          notes: "Highlighted to show financial bottleneck. Represents money ready to bill but paperwork incomplete."
        }
      },
      {
        id: "total_holdback",
        name: "Total Holdback Outstanding",
        description: "Money withheld until milestones pass",
        format: "currency",
        availablePeriods: ["current_week", "previous_week", "mtd", "ytd"],
        calculationMeta: {
          calculation: "Total funds held back by lenders pending milestone completion or inspection.",
          dataSources: [
            {
              table: "TBD",
              fields: ["holdback_amount"]
            }
          ],
          formula: "Pending data source clarification",
          notes: "⚠️ Data source not yet identified in database schema."
        }
      },
      {
        id: "total_dca",
        name: "Total DCA Outstanding",
        description: "Amount in Document Control Audit",
        format: "currency",
        availablePeriods: ["current_week", "previous_week", "mtd", "ytd"],
        isHighlighted: true,
        calculationMeta: {
          calculation: "Total funds held in Document Control Audit pending document verification.",
          dataSources: [
            {
              table: "TBD",
              fields: ["dca_amount"]
            }
          ],
          formula: "Pending data source clarification",
          notes: "⚠️ Data source not yet identified in database schema. Highlighted due to importance."
        }
      },
    ],
  },
  {
    id: "active_pipeline",
    title: "Active Pipeline",
    description: "Projects actively progressing toward PTO",
    kpis: [
      {
        id: "active_no_pto",
        name: "Active Pipeline (Active NO PTO)",
        description: "Active jobs that haven't achieved PTO",
        format: "number",
        availablePeriods: ["current_week", "previous_week", "mtd", "ytd"],
        calculationMeta: {
          calculation: "Counts all projects with active statuses that have not yet received Permission to Operate (PTO).",
          dataSources: [
            {
              table: "project-data",
              fields: ["project-status", "project-dev-id"]
            },
            {
              table: "timeline",
              fields: ["pto-received", "cancellation-reason", "project-dev-id"]
            }
          ],
          formula: "COUNT(*) WHERE project-status IN ('Active', 'Complete', 'Pre-Approvals', 'New Lender', 'Finance Hold') AND pto-received IS NULL",
          notes: "No time period filter - shows all active projects without PTO. Excludes duplicates and cancelled projects."
        }
      },
    ],
  },
  {
    id: "finance",
    title: "Finance",
    description: "Financial tracking for milestone payment milestones and receivables",
    kpis: [
      {
        id: "install_started_m2_not_received",
        name: "Install Started – M2 Not Received",
        description: "Amount owed for completed installs pending M2 payment",
        format: "currency",
        availablePeriods: ["current_week", "previous_week", "mtd", "ytd"],
        calculationMeta: {
          calculation: "Total value of projects with install complete but M2 payment not yet received. Shows snapshot of current receivables.",
          dataSources: [
            {
              table: "timeline",
              fields: ["install-complete", "project-dev-id", "cancellation-reason"]
            },
            {
              table: "funding",
              fields: ["contract-price", "m2-received-date", "project_ids"]
            },
            {
              table: "project-data",
              fields: ["project-status", "project-dev-id"]
            }
          ],
          formula: "SUM(contract-price × 0.8) WHERE install-complete IS NOT NULL AND m2-received-date IS NULL",
          notes: "M2 is 80% of contract price. Status indicator: danger if ≥$500k, warning if ≥$200k. Shows project count."
        }
      },
      {
        id: "pto_received_m3_not_received",
        name: "PTO Received – M3 Not Received",
        description: "Amount owed for PTO-complete projects pending M3 payment",
        format: "currency",
        availablePeriods: ["current_week", "previous_week", "mtd", "ytd"],
        calculationMeta: {
          calculation: "Total value of projects with PTO received but M3 payment not yet received. Shows snapshot of current receivables.",
          dataSources: [
            {
              table: "timeline",
              fields: ["pto-received", "project-dev-id", "cancellation-reason"]
            },
            {
              table: "funding",
              fields: ["contract-price", "m3-received-date", "project_ids"]
            },
            {
              table: "project-data",
              fields: ["project-status", "project-dev-id"]
            }
          ],
          formula: "SUM(contract-price × 0.2) WHERE pto-received IS NOT NULL AND m3-received-date IS NULL",
          notes: "M3 is 20% of contract price. Status indicator: danger if ≥$300k, warning if ≥$100k. Shows project count."
        }
      },
    ],
  },
  {
    id: "commercial",
    title: "Commercial Division",
    description: "Commercial KPIs based on KW capacity",
    kpis: [
      {
        id: "total_kw_scheduled",
        name: "Total KW Scheduled",
        description: "KW capacity scheduled",
        format: "number",
        availablePeriods: ["current_week", "previous_week", "next_week"],
        showGoal: true,
        calculationMeta: {
          calculation: "Sum of system sizes (in KW) for installations scheduled but not yet completed in the period.",
          dataSources: [
            {
              table: "timeline",
              fields: ["install-appointment", "install-complete", "cancellation-reason", "project-dev-id"]
            },
            {
              table: "project-data",
              fields: ["system-size", "project-dev-id"]
            }
          ],
          formula: "SUM(system-size) WHERE install-appointment IN [period] AND install-complete IS NULL",
          notes: "Measures planned installation capacity. Excludes duplicates."
        }
      },
      {
        id: "kw_scheduled_goal",
        name: "KW Scheduled Goal",
        format: "number",
        availablePeriods: ["current_week", "previous_week", "next_week"],
        hidden: true,
        calculationMeta: {
          calculation: "Target KW capacity to schedule for the period.",
          dataSources: [
            {
              table: "goals (Supabase)",
              fields: ["value", "kpi_id", "period"]
            }
          ],
          formula: "Static value from goals table",
          notes: "Editable via the Goals management page."
        }
      },
      {
        id: "total_kw_installed",
        name: "Total KW Installed",
        description: "KW capacity actually installed",
        format: "number",
        availablePeriods: ["current_week", "previous_week", "mtd", "ytd"],
        showGoal: true,
        calculationMeta: {
          calculation: "Sum of system sizes (in KW) for installations completed within the period.",
          dataSources: [
            {
              table: "timeline",
              fields: ["install-complete", "cancellation-reason", "project-dev-id"]
            },
            {
              table: "project-data",
              fields: ["system-size", "project-dev-id"]
            }
          ],
          formula: "SUM(system-size) WHERE install-complete IN [period] AND cancellation-reason != 'Duplicate Project (Error)'",
          notes: "Measures actual installation capacity delivered. System-size has 100% coverage."
        }
      },
      {
        id: "kw_installed_goal",
        name: "KW Installed Goal",
        format: "number",
        availablePeriods: ["current_week", "previous_week", "mtd", "ytd"],
        hidden: true,
        calculationMeta: {
          calculation: "Target KW capacity to install for the period.",
          dataSources: [
            {
              table: "goals (Supabase)",
              fields: ["value", "kpi_id", "period"]
            }
          ],
          formula: "Static value from goals table",
          notes: "Editable via the Goals management page."
        }
      },
      {
        id: "ar_commercial",
        name: "A/R (Commercial)",
        description: "Outstanding commercial receivables",
        format: "currency",
        availablePeriods: ["current_week", "previous_week", "mtd", "ytd"],
        hidden: true,
        calculationMeta: {
          calculation: "Outstanding accounts receivable for commercial projects (same calculation as residential A/R).",
          dataSources: [
            {
              table: "accounting (pending)",
              fields: ["M2_Submitted_Date", "M2_Received_Date", "M3_Submitted_Date", "M3_Received_Date"]
            },
            {
              table: "project-data",
              fields: ["contract-price", "project-id"]
            }
          ],
          formula: "SUM(M2 + M3) WHERE submitted NOT received (filtered by commercial flag)",
          notes: "⚠️ Commercial filter not yet implemented. Currently shows same as residential A/R."
        }
      },
      {
        id: "revenue_received_commercial",
        name: "Revenue Received (Commercial)",
        description: "Commercial revenue collected",
        format: "currency",
        availablePeriods: ["current_week", "previous_week", "mtd", "ytd"],
        calculationMeta: {
          calculation: "Total revenue received for commercial projects in the period.",
          dataSources: [
            {
              table: "accounting (pending)",
              fields: ["revenue_received", "received_date"]
            }
          ],
          formula: "SUM(revenue_received) WHERE received_date IN [period] (filtered by commercial flag)",
          notes: "⚠️ Commercial filter not yet implemented. Currently shows same as residential revenue."
        }
      },
    ],
  },
];


import { KPIValue, TimePeriod } from "@/types/kpi";

// Placeholder data for all KPIs across different time periods
// This will be replaced with real database queries in Phase 2

type KPIDataMap = Record<string, Record<TimePeriod, KPIValue | null>>;

export const placeholderData: KPIDataMap = {
  // Sales & Approval Pipeline
  total_sales: {
    current_week: {
      value: 47,
      formatted: "47",
      trend: "up",
      trendValue: "+12%",
      goal: 50,
      goalFormatted: "50",
      percentToGoal: 94,
      status: "success",
    },
    previous_week: null,
    mtd: {
      value: 189,
      formatted: "189",
      trend: "up",
      trendValue: "+8%",
      goal: 200,
      goalFormatted: "200",
      percentToGoal: 94.5,
      status: "success",
    },
    ytd: {
      value: 2847,
      formatted: "2,847",
      trend: "up",
      trendValue: "+15%",
      goal: 3000,
      goalFormatted: "3,000",
      percentToGoal: 94.9,
      status: "success",
    },
    next_week: null,
  },
  total_sales_goal: {
    current_week: { value: 50, formatted: "50" },
    previous_week: { value: 50, formatted: "50" },
    mtd: { value: 200, formatted: "200" },
    ytd: { value: 3000, formatted: "3,000" },
    next_week: null,
  },
  aveyo_approved: {
    current_week: {
      value: 42,
      formatted: "42",
      trend: "up",
      trendValue: "+10%",
      status: "success",
    },
    previous_week: {
      value: 38,
      formatted: "38",
      trend: "neutral",
      trendValue: "0%",
    },
    mtd: {
      value: 168,
      formatted: "168",
      trend: "up",
      trendValue: "+7%",
    },
    ytd: {
      value: 2561,
      formatted: "2,561",
      trend: "up",
      trendValue: "+14%",
    },
    next_week: null,
  },
  pull_through_rate: {
    current_week: {
      value: 89.4,
      formatted: "89.4%",
      trend: "up",
      trendValue: "+2.1%",
      status: "success",
    },
    previous_week: null,
    mtd: {
      value: 88.9,
      formatted: "88.9%",
      trend: "neutral",
      trendValue: "-0.2%",
    },
    ytd: null,
    next_week: null,
  },

  // Install Operations
  jobs_on_hold: {
    current_week: {
      value: 23,
      formatted: "23",
      trend: "down",
      trendValue: "-4",
      status: "warning",
    },
    previous_week: {
      value: 27,
      formatted: "27",
      trend: "up",
      trendValue: "+3",
      status: "warning",
    },
    mtd: null,
    ytd: null,
    next_week: null,
  },
  installs_complete: {
    current_week: {
      value: 34,
      formatted: "34",
      trend: "up",
      trendValue: "+6",
      goal: 40,
      goalFormatted: "40",
      percentToGoal: 85,
      status: "success",
    },
    previous_week: {
      value: 28,
      formatted: "28",
      trend: "down",
      trendValue: "-2",
      goal: 40,
      percentToGoal: 70,
      status: "warning",
    },
    mtd: {
      value: 142,
      formatted: "142",
      goal: 160,
      percentToGoal: 88.75,
      status: "success",
    },
    ytd: {
      value: 1876,
      formatted: "1,876",
      goal: 2000,
      percentToGoal: 93.8,
      status: "success",
    },
    next_week: null,
  },
  install_completion_goal: {
    current_week: { value: 40, formatted: "40" },
    previous_week: { value: 40, formatted: "40" },
    mtd: { value: 160, formatted: "160" },
    ytd: { value: 2000, formatted: "2,000" },
    next_week: null,
  },
  install_complete_no_pto: {
    current_week: {
      value: 67,
      formatted: "67",
      trend: "up",
      trendValue: "+8",
      status: "warning",
    },
    previous_week: {
      value: 59,
      formatted: "59",
      trend: "up",
      trendValue: "+5",
      status: "warning",
    },
    mtd: {
      value: 67,
      formatted: "67",
      status: "warning",
    },
    ytd: {
      value: 67,
      formatted: "67",
      status: "warning",
    },
    next_week: null,
  },
  install_scheduled: {
    current_week: {
      value: 38,
      formatted: "38",
      trend: "neutral",
      trendValue: "0",
    },
    previous_week: null,
    mtd: null,
    ytd: null,
    next_week: {
      value: 42,
      formatted: "42",
      trend: "up",
      trendValue: "+4",
    },
  },

  // Cycle Times
  avg_days_pp_to_install: {
    current_week: {
      value: 19.2,
      formatted: "19.2 days",
      trend: "down",
      trendValue: "-1.8",
      goal: 21,
      goalFormatted: "21 days",
      status: "success",
    },
    previous_week: {
      value: 21.0,
      formatted: "21.0 days",
      trend: "neutral",
      trendValue: "0",
      goal: 21,
      status: "neutral",
    },
    mtd: {
      value: 20.1,
      formatted: "20.1 days",
      goal: 21,
      status: "success",
    },
    ytd: null,
    next_week: null,
  },
  avg_days_install_to_m2: {
    current_week: null,
    previous_week: {
      value: 6.8,
      formatted: "6.8 days",
      trend: "down",
      trendValue: "-0.5",
      goal: 7,
      status: "success",
    },
    mtd: null,
    ytd: {
      value: 7.2,
      formatted: "7.2 days",
      goal: 7,
      status: "warning",
    },
    next_week: null,
  },
  avg_days_pp_to_pto: {
    current_week: null,
    previous_week: {
      value: 43.5,
      formatted: "43.5 days",
      trend: "down",
      trendValue: "-2.1",
      goal: 45,
      status: "success",
    },
    mtd: {
      value: 44.2,
      formatted: "44.2 days",
      goal: 45,
      status: "success",
    },
    ytd: {
      value: 46.8,
      formatted: "46.8 days",
      goal: 45,
      status: "warning",
    },
    next_week: null,
  },

  // Residential Financials
  ar_m2_m3: {
    current_week: {
      value: 847500,
      formatted: "$847,500",
      trend: "down",
      trendValue: "-$52K",
      status: "neutral",
    },
    previous_week: {
      value: 899500,
      formatted: "$899,500",
      trend: "up",
      trendValue: "+$23K",
    },
    mtd: {
      value: 847500,
      formatted: "$847,500",
    },
    ytd: null,
    next_week: null,
  },
  revenue_received: {
    current_week: {
      value: 425000,
      formatted: "$425,000",
      trend: "up",
      trendValue: "+$45K",
      status: "success",
    },
    previous_week: {
      value: 380000,
      formatted: "$380,000",
      trend: "down",
      trendValue: "-$12K",
    },
    mtd: {
      value: 1650000,
      formatted: "$1,650,000",
      trend: "up",
      trendValue: "+$120K",
    },
    ytd: {
      value: 18750000,
      formatted: "$18,750,000",
      trend: "up",
      trendValue: "+12%",
      status: "success",
    },
    next_week: null,
  },
  install_m2_not_approved: {
    current_week: null,
    previous_week: null,
    mtd: null,
    ytd: {
      value: 234500,
      formatted: "$234,500",
      trend: "up",
      trendValue: "+$18K",
      status: "warning",
    },
    next_week: null,
  },
  total_holdback: {
    current_week: {
      value: 1250000,
      formatted: "$1,250,000",
      status: "neutral",
    },
    previous_week: {
      value: 1250000,
      formatted: "$1,250,000",
    },
    mtd: {
      value: 1250000,
      formatted: "$1,250,000",
    },
    ytd: {
      value: 1250000,
      formatted: "$1,250,000",
    },
    next_week: null,
  },
  total_dca: {
    current_week: {
      value: 89000,
      formatted: "$89,000",
      trend: "down",
      trendValue: "-$12K",
      status: "warning",
    },
    previous_week: {
      value: 101000,
      formatted: "$101,000",
    },
    mtd: {
      value: 89000,
      formatted: "$89,000",
    },
    ytd: {
      value: 89000,
      formatted: "$89,000",
    },
    next_week: null,
  },

  // Active Pipeline
  active_no_pto: {
    current_week: {
      value: 312,
      formatted: "312",
      trend: "up",
      trendValue: "+18",
      status: "neutral",
    },
    previous_week: {
      value: 294,
      formatted: "294",
      trend: "up",
      trendValue: "+12",
    },
    mtd: null,
    ytd: null,
    next_week: null,
  },

  // Commercial Division
  total_kw_scheduled: {
    current_week: {
      value: 245,
      formatted: "245 kW",
      trend: "up",
      trendValue: "+32 kW",
      goal: 300,
      percentToGoal: 81.7,
      status: "success",
    },
    previous_week: null,
    mtd: null,
    ytd: null,
    next_week: {
      value: 320,
      formatted: "320 kW",
      trend: "up",
      trendValue: "+75 kW",
    },
  },
  kw_scheduled_goal: {
    current_week: null,
    previous_week: { value: 300, formatted: "300 kW" },
    mtd: null,
    ytd: null,
    next_week: null,
  },
  total_kw_installed: {
    current_week: {
      value: 198,
      formatted: "198 kW",
      trend: "up",
      trendValue: "+45 kW",
      goal: 250,
      percentToGoal: 79.2,
      status: "success",
    },
    previous_week: {
      value: 153,
      formatted: "153 kW",
      trend: "down",
      trendValue: "-12 kW",
    },
    mtd: {
      value: 756,
      formatted: "756 kW",
      goal: 1000,
      percentToGoal: 75.6,
    },
    ytd: {
      value: 8450,
      formatted: "8,450 kW",
      goal: 10000,
      percentToGoal: 84.5,
      status: "success",
    },
    next_week: null,
  },
  kw_installed_goal: {
    current_week: { value: 250, formatted: "250 kW" },
    previous_week: { value: 250, formatted: "250 kW" },
    mtd: { value: 1000, formatted: "1,000 kW" },
    ytd: { value: 10000, formatted: "10,000 kW" },
    next_week: null,
  },
  ar_commercial: {
    current_week: {
      value: 425000,
      formatted: "$425,000",
      trend: "down",
      trendValue: "-$35K",
      status: "neutral",
    },
    previous_week: null,
    mtd: null,
    ytd: null,
    next_week: null,
  },
  revenue_received_commercial: {
    current_week: null,
    previous_week: null,
    mtd: {
      value: 1125000,
      formatted: "$1,125,000",
      trend: "up",
      trendValue: "+$85K",
      status: "success",
    },
    ytd: null,
    next_week: null,
  },
};

export function getKPIData(kpiId: string, period: TimePeriod): KPIValue | null {
  return placeholderData[kpiId]?.[period] ?? null;
}


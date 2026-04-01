"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Save, Loader2, Check, AlertCircle } from "lucide-react";
import Link from "next/link";
import { authApiRequest } from "@/lib/auth/session";

interface Goals {
  [kpiId: string]: {
    [period: string]: number;
  };
}

const KPI_DEFINITIONS = [
  {
    id: "total_sales",
    name: "Total Sales",
    periods: ["current_week", "previous_week", "mtd", "ytd"],
  },
  {
    id: "installs_complete",
    name: "Installs Complete",
    periods: ["current_week", "previous_week", "mtd", "ytd"],
  },
  {
    id: "avg_days_pp_to_install",
    name: "Avg Days PP → Install",
    periods: ["current_week", "previous_week", "mtd"],
  },
  {
    id: "avg_days_install_to_m2",
    name: "Avg Days Install → M2",
    periods: ["previous_week", "ytd"],
  },
  {
    id: "avg_days_pp_to_pto",
    name: "Avg Days PP → PTO",
    periods: ["previous_week", "mtd", "ytd"],
  },
  {
    id: "total_kw_scheduled",
    name: "Total KW Scheduled",
    periods: ["current_week", "next_week"],
  },
  {
    id: "total_kw_installed",
    name: "Total KW Installed",
    periods: ["current_week", "previous_week", "mtd", "ytd"],
  },
];

const PERIOD_LABELS: Record<string, string> = {
  current_week: "Current Week",
  previous_week: "Previous Week",
  mtd: "Month to Date",
  ytd: "Year to Date",
  next_week: "Next Week",
};

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goals>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const data = await authApiRequest<any>("/api/goals");
      
      if (data.success) {
        console.log("Loaded goals from Supabase:", data.goals);
        setGoals(data.goals);
      } else {
        console.error("Failed to load goals:", data.error);
        setMessage({ type: "error", text: "Failed to load goals from database" });
      }
    } catch (error) {
      console.error("Error fetching goals:", error);
      setMessage({ type: "error", text: "Error connecting to database" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoalChange = (kpiId: string, period: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    
    setGoals((prev) => ({
      ...prev,
      [kpiId]: {
        ...prev[kpiId],
        [period]: numValue,
      },
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    setSaving(true);
    setMessage(null);

    try {
      const data = await authApiRequest<any>("/api/goals", {
        method: "POST",
        body: JSON.stringify({ goals }),
      });

      if (data.success) {
        setMessage({ type: "success", text: "Goals updated successfully! Dashboard will refresh automatically." });
        // Refresh goals to show updated values
        await fetchGoals();
        
        // Notify the dashboard to refetch KPI data
        // Custom event for same tab
        window.dispatchEvent(new CustomEvent('goals-updated'));
        
        // LocalStorage for cross-tab communication
        localStorage.setItem('goals-updated', Date.now().toString());
        
        console.log('✅ Goals saved, cache cleared, events dispatched');
      } else {
        setMessage({ type: "error", text: data.error || "Failed to update goals" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred while saving goals" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="px-6 pt-6 max-w-[1200px] mx-auto">
      <Link
        href="/settings"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Settings
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          KPI Goals Management
        </h1>
        <p className="text-slate-600">
          Set target goals for each KPI across different time periods
        </p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`rounded-lg p-4 mb-6 flex items-center gap-3 ${
            message.type === "success"
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          }`}
        >
          {message.type === "success" ? (
            <Check className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600" />
          )}
          <span
            className={
              message.type === "success" ? "text-green-800" : "text-red-800"
            }
          >
            {message.text}
          </span>
        </div>
      )}

      {/* Goals Form */}
      <form onSubmit={handleSave}>
        <div className="space-y-6 mb-6">
          {KPI_DEFINITIONS.map((kpi) => (
            <div
              key={kpi.id}
              className="bg-white rounded-card border border-slate-200 p-6"
            >
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                {kpi.name}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {kpi.periods.map((period) => (
                  <div key={period}>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {PERIOD_LABELS[period]}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={goals[kpi.id]?.[period] ?? ""}
                      onChange={(e) =>
                        handleGoalChange(kpi.id, period, e.target.value)
                      }
                      placeholder="0"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Save Button */}
        <div className="sticky bottom-6 bg-white rounded-card border border-slate-200 p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">
              Changes will be saved to Supabase database
            </p>
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Save Goals
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      <div className="h-20"></div>
    </div>
  );
}

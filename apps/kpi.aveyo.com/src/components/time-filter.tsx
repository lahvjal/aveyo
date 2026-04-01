"use client";

import { cn } from "@/lib/utils";
import { TimePeriod } from "@/types/kpi";
import { Calendar } from "lucide-react";

interface TimeFilterProps {
  selected: TimePeriod;
  onChange: (period: TimePeriod) => void;
}

const PERIOD_OPTIONS: { value: TimePeriod; label: string }[] = [
  { value: "current_week", label: "Current Week" },
  { value: "previous_week", label: "Previous Week" },
  { value: "mtd", label: "MTD" },
  { value: "ytd", label: "YTD" },
  { value: "next_week", label: "Next Week" },
];

export function TimeFilter({ selected, onChange }: TimeFilterProps) {
  return (
    <div className="flex items-center gap-4 rounded-card bg-white p-2 shadow-sm border border-slate-200">
      <div className="flex items-center gap-2 pl-3 text-slate-500">
        <Calendar className="h-4 w-4" />
        <span className="text-sm font-medium">Period:</span>
      </div>
      <div className="flex gap-1">
        {PERIOD_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200",
              selected === option.value
                ? "bg-primary-500 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}


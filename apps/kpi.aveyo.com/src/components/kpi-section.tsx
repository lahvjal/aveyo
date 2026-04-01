"use client";

import { cn } from "@/lib/utils";
import { KPISection as KPISectionType, TimePeriod, KPIValue } from "@/types/kpi";
import { KPICard } from "./kpi-card";
import { getKPIValue } from "@/hooks/use-kpi-data";

interface KPIDataState {
  [kpiId: string]: {
    [period: string]: KPIValue;
  };
}

interface KPISectionProps {
  section: KPISectionType;
  period: TimePeriod;
  kpiData: KPIDataState;
  className?: string;
}

export function KPISection({ section, period, kpiData, className }: KPISectionProps) {
  // Determine grid columns based on number of KPIs (excluding hidden ones)
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
    5: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
    6: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
  };

  const numKpis = section.kpis.filter(kpi => !kpi.hidden).length;
  const gridClass = gridCols[numKpis as keyof typeof gridCols] || gridCols[4];

  return (
    <section className={cn("animate-fade-in", className)}>
      {/* Section Header */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
        {section.description && (
          <p className="text-sm text-slate-500 mt-0.5">{section.description}</p>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className={cn("grid gap-4", gridClass)}>
        {section.kpis
          .filter(kpi => !kpi.hidden) // Filter out hidden KPIs
          .map((kpi, index) => {
            // Get real data from API or show placeholder
            const data = getKPIValue(kpiData, kpi.id, period);
            
            // Only show KPI if it's available for this period or if we have data
            if (!kpi.availablePeriods.includes(period) && !data) {
              return null;
            }
            
            return (
              <div
                key={kpi.id}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <KPICard
                  kpiId={kpi.id}
                  title={kpi.name}
                  description={kpi.description}
                  data={data}
                  isHighlighted={kpi.isHighlighted}
                  showGoal={kpi.showGoal}
                  calculationMeta={kpi.calculationMeta}
                />
              </div>
            );
          })}
      </div>
    </section>
  );
}


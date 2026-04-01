"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { TimeFilter } from "@/components/time-filter";
import { KPISection } from "@/components/kpi-section";
import { TimePeriod, type KPISection as KPISectionType } from "@/types/kpi";
import { RefreshCw, AlertCircle, Loader2 } from "lucide-react";
import { useKPIData } from "@/hooks/use-kpi-data";
import { getDashboardSectionsWithFallback } from "@/lib/dashboard-helpers";
import { authApiRequest } from "@/lib/auth/session";

export default function Dashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("current_week");
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dashboardSections, setDashboardSections] = useState<KPISectionType[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  
  // Fetch dashboard sections on mount
  useEffect(() => {
    async function fetchSections() {
      try {
        const sections = await getDashboardSectionsWithFallback();
        setDashboardSections(sections);
      } catch (error) {
        console.error('Error fetching dashboard sections:', error);
      } finally {
        setSectionsLoading(false);
      }
    }
    fetchSections();
  }, []);
  
  // Fetch KPI data from API (only when sections are loaded)
  const { data: kpiData, loading, error, refetch } = useKPIData(
    dashboardSections, 
    selectedPeriod,
    { enabled: !sectionsLoading && dashboardSections.length > 0 }
  );
  
  // Handle manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Clear server-side cache first
      await authApiRequest('/api/cache', { method: 'DELETE' });
      
      // Refetch dashboard sections (in case new KPIs were added)
      const sections = await getDashboardSectionsWithFallback();
      setDashboardSections(sections);
      
      // Then refetch KPI data with client-side cache busting
      await refetch();
      setLastUpdated(new Date());
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Listen for goal updates and refetch data
  useEffect(() => {
    const handleGoalsUpdated = () => {
      console.log('🔄 Goals updated event received, refetching KPI data...');
      refetch();
      setLastUpdated(new Date());
    };
    
    // Listen for custom event (same tab)
    window.addEventListener('goals-updated', handleGoalsUpdated);
    
    // Listen for storage event (cross-tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'goals-updated') {
        console.log('🔄 Goals updated in another tab, refetching KPI data...');
        refetch();
        setLastUpdated(new Date());
        // Clean up the flag
        localStorage.removeItem('goals-updated');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('goals-updated', handleGoalsUpdated);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [refetch]);

  return (
    <AppShell>
    <div className="min-h-screen bg-slate-50">

      {/* Page Header */}
      <div className="px-6 pt-6 max-w-[1600px] mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">
            Executive Dashboard
          </h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>
              Last updated: {lastUpdated.toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Sticky Time Filter & Refresh Button */}
      <div className="sticky top-0 z-20 px-6 pb-6 bg-transparent">
        <div className="max-w-[1600px] mx-auto flex items-center justify-center gap-4">
          <TimeFilter selected={selectedPeriod} onChange={setSelectedPeriod} />
          
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-6 pb-6 max-w-[1600px] mx-auto">
        {/* Loading State */}
        {(sectionsLoading || loading) && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400 mb-4" />
            <p className="text-slate-600">
              {sectionsLoading ? 'Loading dashboard...' : 'Loading KPI data...'}
            </p>
          </div>
        )}
        
        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 mb-1">Error Loading Data</h3>
                <p className="text-sm text-red-700 mb-3">{error}</p>
                <button
                  onClick={refetch}
                  className="text-sm font-medium text-red-600 hover:text-red-800 underline"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Dashboard Sections */}
        {!sectionsLoading && !loading && !error && dashboardSections.length > 0 && (
          <div className="space-y-8">
            {dashboardSections.map((section) => (
              <KPISection
                key={section.id}
                section={section}
                period={selectedPeriod}
                kpiData={kpiData}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-slate-200 text-center text-sm text-slate-400">
          <p>Aveyo KPI Dashboard &bull; Data cached for 15 minutes &bull; Use Refresh button for latest data</p>
        </footer>
      </main>
    </div>
    </AppShell>
  );
}


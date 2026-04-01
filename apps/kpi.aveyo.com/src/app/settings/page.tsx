"use client";

import { useState, useEffect } from "react";
import { authApiRequest } from "@/lib/auth/session";
import { Target, Database, TrendingUp, ArrowRight, Loader2, FileText } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  const [stats, setStats] = useState<{
    totalKPIs: number;
    originalKPIs: number;
    customKPIs: number;
    goalsSet: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const kpisPromise = authApiRequest<any>("/api/kpis");
      const goalsPromise = authApiRequest<any>("/api/goals");

      const [kpisData, goalsData] = await Promise.all([kpisPromise, goalsPromise]);

      let goalsCount = 0;
      if (goalsData.success && goalsData.goals) {
        // Count how many goals are set (non-zero values)
        Object.values(goalsData.goals).forEach((kpiGoals: any) => {
          Object.values(kpiGoals).forEach((value: any) => {
            if (typeof value === 'number' && value > 0) goalsCount++;
          });
        });
      }

      setStats({
        totalKPIs: kpisData.kpis?.total || 0,
        originalKPIs: kpisData.kpis?.builtIn?.length || 0,
        customKPIs: kpisData.kpis?.custom?.length || 0,
        goalsSet: goalsCount,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      // Set default stats on error
      setStats({
        totalKPIs: 0,
        originalKPIs: 0,
        customKPIs: 0,
        goalsSet: 0,
      });
    } finally {
      setLoading(false);
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
    <div className="max-w-[1400px] mx-auto px-6 py-12">
      {/* Welcome Section */}
      <div className="mb-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-3">
          Settings
        </h1>
        <p className="text-lg text-slate-600">
          Manage your KPIs, set goals, and configure the dashboard
        </p>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-4 gap-6 mb-12">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <Database className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-slate-600">Total KPIs</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{stats.totalKPIs}</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <Database className="h-5 w-5 text-slate-600" />
              <span className="text-sm font-medium text-slate-600">Original KPIs</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{stats.originalKPIs}</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-slate-600">Custom KPIs</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{stats.customKPIs}</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <Target className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-slate-600">Goals Set</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{stats.goalsSet}</div>
          </div>
        </div>
      )}

      {/* Action Cards */}
      <div className="grid grid-cols-3 gap-6 mb-12">
        {/* Goals Management Card */}
        <Link
          href="/settings/goals"
          className="group bg-white rounded-lg shadow-sm border border-slate-200 p-8 hover:shadow-md hover:border-slate-300 transition-all"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
              <Target className="h-6 w-6 text-green-600" />
            </div>
            <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Goals Management</h3>
          <p className="text-slate-600 mb-4">
            Set target goals for each KPI across different time periods to track performance
            and progress
          </p>
          <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
            Manage Goals
            <ArrowRight className="h-4 w-4" />
          </div>
        </Link>

        {/* KPI Management Card */}
        <Link
          href="/settings/kpis"
          className="group bg-white rounded-lg shadow-sm border border-slate-200 p-8 hover:shadow-md hover:border-slate-300 transition-all"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <Database className="h-6 w-6 text-blue-600" />
            </div>
            <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">KPI & Section Management</h3>
          <p className="text-slate-600 mb-4">
            Manage KPI formulas, reorder sections and KPIs, and configure dashboard layout with drag-and-drop
          </p>
          <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
            Manage KPIs & Sections
            <ArrowRight className="h-4 w-4" />
          </div>
        </Link>

        {/* Documentation Card */}
        <Link
          href="/settings/documentation"
          className="group bg-white rounded-lg shadow-sm border border-slate-200 p-8 hover:shadow-md hover:border-slate-300 transition-all"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="h-12 w-12 rounded-lg bg-emerald-100 flex items-center justify-center">
              <FileText className="h-6 w-6 text-emerald-600" />
            </div>
            <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">KPI Documentation</h3>
          <p className="text-slate-600 mb-4">
            View complete metric dictionary, formulas, data sources, and period definitions
          </p>
          <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
            View Documentation
            <ArrowRight className="h-4 w-4" />
          </div>
        </Link>
      </div>

      {/* Quick Links */}
      <div className="bg-slate-100 rounded-lg p-6">
        <h3 className="text-sm font-medium text-slate-700 mb-3">Quick Links</h3>
        <div className="flex gap-4">
          <Link
            href="/"
            className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
          >
            View Dashboard →
          </Link>
          <Link
            href="/settings/kpis"
            className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
          >
            Create Custom KPI →
          </Link>
          <Link
            href="/settings/goals"
            className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
          >
            Set Goals →
          </Link>
          <Link
            href="/settings/documentation"
            className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
          >
            View Metric Documentation →
          </Link>
        </div>
      </div>
    </div>
  );
}

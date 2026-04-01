"use client";

import { ArrowLeft, Database } from "lucide-react";
import Link from "next/link";
import UnifiedKPIManager from "@/components/unified-kpi-manager";

export default function KPIsManagementPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Settings
          </Link>
          
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center">
              <Database className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">KPI Management</h1>
              <p className="text-slate-600 mt-1">
                Manage sections, KPIs, and their display order. Drag to reorder or move KPIs between sections.
              </p>
            </div>
          </div>
        </div>

        {/* Unified Manager */}
        <UnifiedKPIManager />
      </div>
    </div>
  );
}

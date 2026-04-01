"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Database, FileText, Clock, Eye, EyeOff } from "lucide-react";
import { createAuthHeaders } from "@/lib/auth-headers";

interface KPIDetails {
  kpi_id: string;
  name: string;
  description: string | null;
  format: 'number' | 'currency' | 'percentage' | 'days';
  formula_type: 'sql' | 'expression';
  formula: string;
  field_mappings: Record<string, any>;
  available_periods: string[];
  section_id: string;
  is_original: boolean;
  is_hidden: boolean;
  show_goal: boolean;
  secondary_formula: string | null;
  secondary_format: 'count' | 'breakdown' | 'text' | null;
  created_at: string;
  updated_at: string;
}

interface KPIDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  kpiId: string;
  kpiData?: KPIDetails | null; // Optional: pass pre-loaded data to avoid fetching
}

const SECTION_NAMES: Record<string, string> = {
  sales_stats: 'Sales Stats',
  operations_stats: 'Operations Stats',
  finance: 'Finance',
  cycle_times: 'Cycle Times',
  residential_financials: 'Residential Financials',
  active_pipeline: 'Active Pipeline',
  commercial: 'Commercial Division'
};

const PERIOD_NAMES: Record<string, string> = {
  current_week: 'Current Week',
  previous_week: 'Previous Week',
  mtd: 'Month to Date',
  ytd: 'Year to Date',
  next_week: 'Next Week'
};

const FORMAT_NAMES: Record<string, string> = {
  number: 'Number',
  currency: 'Currency (USD)',
  percentage: 'Percentage',
  days: 'Days'
};

export default function KPIDetailsModal({
  isOpen,
  onClose,
  kpiId,
  kpiData
}: KPIDetailsModalProps) {
  const [kpiDetails, setKpiDetails] = useState<KPIDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && kpiId) {
      // If kpiData is provided, use it directly
      if (kpiData) {
        setKpiDetails(kpiData);
        setLoading(false);
        setError(null);
      } else {
        // Otherwise fetch from API
        fetchKPIDetails();
      }
    }
  }, [isOpen, kpiId, kpiData]);

  const fetchKPIDetails = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const headers = await createAuthHeaders();
      const response = await fetch('/api/kpis', { headers });
      if (!response.ok) {
        throw new Error('Failed to fetch KPI details');
      }
      
      const data = await response.json();
      
      // Find the KPI in the response
      const allKPIs = [...(data.kpis.original || []), ...(data.kpis.custom || [])];
      const kpi = allKPIs.find((k: any) => k.kpi_id === kpiId);
      
      if (!kpi) {
        throw new Error('KPI not found');
      }
      
      setKpiDetails(kpi);
    } catch (err: any) {
      console.error('Error fetching KPI details:', err);
      setError(err.message || 'Failed to load KPI details');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-900">KPI Details</h2>
            <p className="text-sm text-slate-600 mt-1">View configuration and formula</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : error ? (
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <X className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-900">Error Loading KPI</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          ) : kpiDetails ? (
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    KPI ID
                  </label>
                  <p className="text-sm font-mono text-slate-900 mt-1">{kpiDetails.kpi_id}</p>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Name
                  </label>
                  <p className="text-base font-semibold text-slate-900 mt-1">{kpiDetails.name}</p>
                </div>
                
                {kpiDetails.description && (
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Description
                    </label>
                    <p className="text-sm text-slate-700 mt-1">{kpiDetails.description}</p>
                  </div>
                )}
              </div>

              {/* Configuration */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="h-4 w-4 text-blue-600" />
                    <label className="text-xs font-medium text-blue-900 uppercase tracking-wide">
                      Section
                    </label>
                  </div>
                  <p className="text-sm font-medium text-blue-800">
                    {SECTION_NAMES[kpiDetails.section_id] || kpiDetails.section_id}
                  </p>
                </div>
                
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-purple-600" />
                    <label className="text-xs font-medium text-purple-900 uppercase tracking-wide">
                      Format
                    </label>
                  </div>
                  <p className="text-sm font-medium text-purple-800">
                    {FORMAT_NAMES[kpiDetails.format]}
                  </p>
                </div>
              </div>

              {/* Properties */}
              <div className="flex flex-wrap gap-2">
                {kpiDetails.is_original && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    <Database className="h-3 w-3" />
                    Original KPI
                  </span>
                )}
                {kpiDetails.is_hidden && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                    <EyeOff className="h-3 w-3" />
                    Hidden
                  </span>
                )}
                {kpiDetails.show_goal && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    <Eye className="h-3 w-3" />
                    Shows Goal
                  </span>
                )}
              </div>

              {/* Available Periods */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-slate-600" />
                  <label className="text-sm font-semibold text-slate-700">
                    Available Time Periods
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {kpiDetails.available_periods.map((period) => (
                    <span
                      key={period}
                      className="px-3 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700"
                    >
                      {PERIOD_NAMES[period] || period}
                    </span>
                  ))}
                </div>
              </div>

              {/* Formula */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-slate-700">
                    {kpiDetails.formula_type === 'sql' ? 'SQL Formula' : 'Expression Formula'}
                  </label>
                  <span className="px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700">
                    {kpiDetails.formula_type.toUpperCase()}
                  </span>
                </div>
                <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm text-slate-100 font-mono whitespace-pre-wrap">
                    {kpiDetails.formula}
                  </pre>
                </div>
              </div>

              {/* Secondary Formula */}
              {kpiDetails.secondary_formula && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-semibold text-slate-700">
                      Secondary Formula
                    </label>
                    {kpiDetails.secondary_format && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700">
                        {kpiDetails.secondary_format.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-sm text-slate-100 font-mono whitespace-pre-wrap">
                      {kpiDetails.secondary_formula}
                    </pre>
                  </div>
                </div>
              )}

              {/* Field Mappings */}
              {kpiDetails.field_mappings && Object.keys(kpiDetails.field_mappings).length > 0 && (
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-3 block">
                    Field Mappings
                  </label>
                  <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                    {Object.entries(kpiDetails.field_mappings).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-3">
                        <span className="text-xs font-mono text-slate-600 min-w-[120px]">
                          {key}
                        </span>
                        <span className="text-xs text-slate-400">→</span>
                        <span className="text-xs font-mono text-slate-900">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="border-t border-slate-200 pt-4 text-xs text-slate-500 space-y-1">
                <p>Created: {new Date(kpiDetails.created_at).toLocaleString()}</p>
                <p>Last Updated: {new Date(kpiDetails.updated_at).toLocaleString()}</p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

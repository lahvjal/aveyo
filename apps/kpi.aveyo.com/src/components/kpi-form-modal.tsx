"use client";

import { useState, useEffect } from "react";
import { X, Save, Loader2, Play, FileText, Database, AlertTriangle } from "lucide-react";
import FormulaEditor from "./formula-editor";
import FieldReferencePanel from "./field-reference-panel";
import { createAuthHeaders } from "@/lib/auth-headers";

interface KPIFormData {
  kpi_id: string;
  name: string;
  description: string;
  format: 'number' | 'currency' | 'percentage' | 'days';
  formula_type: 'sql' | 'expression';
  formula: string;
  field_mappings: Record<string, any>;
  available_periods: string[];
  section_id: string;
  is_original?: boolean;
  is_hidden?: boolean;
  secondary_formula?: string;
  secondary_format?: 'count' | 'breakdown' | 'text';
}

interface KPIFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (kpi: KPIFormData) => Promise<void>;
  editingKPI?: KPIFormData | null;
}

// Formula templates
const FORMULA_TEMPLATES = {
  sql: [
    {
      name: "Count Metric",
      description: "Count records matching criteria",
      formula: `SELECT COUNT(*) as value\nFROM @timeline t\nWHERE t.@contract-signed IS NOT NULL\n  AND {{dateFilter}}`
    },
    {
      name: "Average Days",
      description: "Calculate average days between two dates",
      formula: `SELECT AVG(DATEDIFF(t.@end-date, t.@start-date)) as value\nFROM @timeline t\nWHERE t.@start-date IS NOT NULL\n  AND t.@end-date IS NOT NULL\n  AND {{dateFilter}}`
    },
    {
      name: "Percentage Calculation",
      description: "Calculate percentage with numerator/denominator",
      formula: `SELECT \n  (COUNT(CASE WHEN condition THEN 1 END) * 100.0 / COUNT(*)) as value\nFROM @timeline t\nWHERE {{dateFilter}}`
    },
    {
      name: "Sum with Join",
      description: "Sum values from joined tables",
      formula: `SELECT SUM(pd.@contract-price) as value\nFROM @timeline t\nJOIN @project-data pd ON t.\`project-dev-id\` = pd.\`project-dev-id\`\nWHERE t.@contract-signed IS NOT NULL\n  AND {{dateFilter}}`
    }
  ],
  expression: [
    {
      name: "Simple Ratio",
      description: "Divide one metric by another",
      formula: `(@numerator / @denominator) * 100`
    },
    {
      name: "Sum Multiple Metrics",
      description: "Add multiple KPI values together",
      formula: `@metric1 + @metric2 + @metric3`
    },
    {
      name: "Weighted Average",
      description: "Calculate weighted average",
      formula: `(@value1 * @weight1 + @value2 * @weight2) / (@weight1 + @weight2)`
    }
  ]
};

const SECTIONS = [
  { id: 'sales_stats', name: 'Sales Stats' },
  { id: 'operations_stats', name: 'Operations Stats' },
  { id: 'finance', name: 'Finance' },
  { id: 'cycle_times', name: 'Cycle Times' },
  { id: 'residential_financials', name: 'Residential Financials' },
  { id: 'active_pipeline', name: 'Active Pipeline' },
  { id: 'commercial', name: 'Commercial Division' }
];

const PERIODS = [
  { id: 'current_week', name: 'Current Week' },
  { id: 'previous_week', name: 'Previous Week' },
  { id: 'mtd', name: 'Month to Date' },
  { id: 'ytd', name: 'Year to Date' },
  { id: 'next_week', name: 'Next Week' }
];

export default function KPIFormModal({
  isOpen,
  onClose,
  onSave,
  editingKPI
}: KPIFormModalProps) {
  const [formData, setFormData] = useState<KPIFormData>({
    kpi_id: '',
    name: '',
    description: '',
    format: 'number',
    formula_type: 'sql',
    formula: '',
    field_mappings: {},
    available_periods: ['current_week', 'previous_week', 'mtd', 'ytd'],
    section_id: 'sales_stats',
    is_original: false,
    is_hidden: false,
    secondary_formula: '',
    secondary_format: undefined
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testPeriod, setTestPeriod] = useState<string>('current_week');
  const [showTemplates, setShowTemplates] = useState(false);
  const [showFieldReference, setShowFieldReference] = useState(false);

  // Load editing KPI data
  useEffect(() => {
    if (editingKPI) {
      setFormData(editingKPI);
    } else {
      // Reset form for new KPI
      setFormData({
        kpi_id: '',
        name: '',
        description: '',
        format: 'number',
        formula_type: 'sql',
        formula: '',
        field_mappings: {},
        available_periods: ['current_week', 'previous_week', 'mtd', 'ytd'],
        section_id: 'sales_stats',
        is_original: false,
        is_hidden: false,
        secondary_formula: '',
        secondary_format: undefined
      });
    }
    setTestResult(null);
    setShowTemplates(false);
  }, [editingKPI, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving KPI:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleTestFormula = async () => {
    setTesting(true);
    setTestResult(null);
    
    try {
      const headers = await createAuthHeaders({
        'Content-Type': 'application/json'
      });

      // Test the formula using the test endpoint
      const response = await fetch('/api/kpi/test', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          formula: formData.formula,
          formula_type: formData.formula_type,
          format: formData.format,
          field_mappings: formData.field_mappings,
          period: testPeriod,
          secondary_formula: formData.secondary_formula
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setTestResult({
          success: true,
          result: data.result,
          message: data.message
        });
      } else {
        setTestResult({
          success: false,
          error: data.error || 'Formula test failed',
          details: data.details
        });
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        error: 'Failed to test formula',
        details: error.message
      });
    } finally {
      setTesting(false);
    }
  };

  const handleTemplateSelect = (template: any) => {
    setFormData(prev => ({ ...prev, formula: template.formula }));
    setShowTemplates(false);
  };

  const togglePeriod = (periodId: string) => {
    setFormData(prev => {
      const periods = prev.available_periods.includes(periodId)
        ? prev.available_periods.filter(p => p !== periodId)
        : [...prev.available_periods, periodId];
      return { ...prev, available_periods: periods };
    });
  };

  if (!isOpen) return null;

  const templates = formData.formula_type === 'sql' 
    ? FORMULA_TEMPLATES.sql 
    : FORMULA_TEMPLATES.expression;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            {editingKPI ? 'Edit KPI' : 'Create New KPI'}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFieldReference(!showFieldReference)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                showFieldReference 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Toggle field reference panel"
            >
              <Database className="h-4 w-4" />
              <span className="text-sm font-medium">Fields</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Warning for Original KPIs */}
          {editingKPI?.is_original && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Warning: Editing Original KPI
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  This is an original KPI used throughout the dashboard. Changes will affect the dashboard immediately.
                </p>
              </div>
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                KPI ID *
              </label>
              <input
                type="text"
                value={formData.kpi_id}
                onChange={(e) => setFormData(prev => ({ ...prev, kpi_id: e.target.value }))}
                placeholder="e.g., my_custom_metric"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={!!editingKPI}
              />
              <p className="mt-1 text-xs text-slate-500">
                Unique identifier (lowercase, underscores only)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Display Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., My Custom Metric"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Description
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of what this metric measures"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Format *
              </label>
              <select
                value={formData.format}
                onChange={(e) => setFormData(prev => ({ ...prev, format: e.target.value as any }))}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="number">Number</option>
                <option value="currency">Currency</option>
                <option value="percentage">Percentage</option>
                <option value="days">Days</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Section *
              </label>
              <select
                value={formData.section_id}
                onChange={(e) => setFormData(prev => ({ ...prev, section_id: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SECTIONS.map(section => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Formula Type *
              </label>
              <select
                value={formData.formula_type}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  formula_type: e.target.value as 'sql' | 'expression',
                  formula: '' // Clear formula when switching types
                }))}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="sql">SQL Query</option>
                <option value="expression">Expression</option>
              </select>
            </div>
          </div>

          {/* Available Periods */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Available Periods *
            </label>
            <div className="flex flex-wrap gap-2">
              {PERIODS.map(period => (
                <button
                  key={period.id}
                  type="button"
                  onClick={() => togglePeriod(period.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    formData.available_periods.includes(period.id)
                      ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                      : 'bg-slate-100 text-slate-600 border-2 border-transparent hover:border-slate-300'
                  }`}
                >
                  {period.name}
                </button>
              ))}
            </div>
          </div>

          {/* Visibility Toggle */}
          <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <input
              type="checkbox"
              id="is_hidden"
              checked={formData.is_hidden || false}
              onChange={(e) => setFormData(prev => ({ ...prev, is_hidden: e.target.checked }))}
              className="mt-1 h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <div className="flex-1">
              <label htmlFor="is_hidden" className="text-sm font-medium text-slate-700 cursor-pointer">
                Hide from dashboard
              </label>
              <p className="text-xs text-slate-500 mt-1">
                Hidden KPIs are available for use in formulas but won&apos;t appear on the main dashboard.
                Useful for component KPIs that are only used in calculations.
              </p>
            </div>
          </div>

          {/* Formula Templates */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">
                Formula *
              </label>
              <button
                type="button"
                onClick={() => setShowTemplates(!showTemplates)}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700"
              >
                <FileText className="h-4 w-4" />
                {showTemplates ? 'Hide' : 'Show'} Templates
              </button>
            </div>

            {/* Template Gallery */}
            {showTemplates && (
              <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-sm font-medium text-slate-700 mb-3">
                  Formula Templates
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {templates.map((template, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleTemplateSelect(template)}
                      className="text-left p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <div className="text-sm font-medium text-slate-900 mb-1">
                        {template.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {template.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <FormulaEditor
              value={formData.formula}
              onChange={(value) => setFormData(prev => ({ ...prev, formula: value }))}
              formulaType={formData.formula_type}
            />
          </div>

          {/* Secondary Formula (Optional) */}
          {formData.formula_type === 'sql' && (
            <div className="border-t border-slate-200 pt-6">
              <div className="mb-2">
                <label className="block text-sm font-medium text-slate-700">
                  Secondary Formula (Optional)
                </label>
                <p className="text-xs text-slate-500 mt-1">
                  Optional secondary value to display (e.g., project count, breakdown). Only for SQL formulas.
                </p>
              </div>
              
              <div className="mb-4">
                <select
                  value={formData.secondary_format || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    secondary_format: e.target.value as any || undefined 
                  }))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No secondary value</option>
                  <option value="count">Count</option>
                  <option value="breakdown">Breakdown</option>
                  <option value="text">Text</option>
                </select>
              </div>

              {formData.secondary_format && (
                <FormulaEditor
                  value={formData.secondary_formula || ''}
                  onChange={(value) => setFormData(prev => ({ ...prev, secondary_formula: value }))}
                  formulaType="sql"
                  placeholder="SELECT COUNT(*) as value FROM ..."
                />
              )}
            </div>
          )}

          {/* Test Formula Section */}
          <div className="border-t border-slate-200 pt-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Test Formula
                </label>
                <div className="flex gap-2">
                  <select
                    value={testPeriod}
                    onChange={(e) => setTestPeriod(e.target.value)}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {PERIODS.map(period => (
                      <option key={period.id} value={period.id}>
                        {period.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleTestFormula}
                    disabled={testing || !formData.formula}
                    className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {testing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        Test
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Test Results */}
            {testResult && (
              <div className={`p-4 rounded-lg ${
                testResult.success 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                {testResult.success ? (
                  <div>
                    <div className="text-sm font-medium text-green-800 mb-2">
                      ✓ Test Successful
                    </div>
                    <div className="text-2xl font-bold text-green-900 mb-1">
                      {testResult.result?.formatted || testResult.result?.value}
                    </div>
                    {testResult.result?.secondary && (
                      <div className="text-sm text-green-700 mt-2">
                        {testResult.result.secondaryFormatted || testResult.result.secondary}
                      </div>
                    )}
                    {testResult.result?.trend && (
                      <div className="text-xs text-green-700 mt-1">
                        Trend: {testResult.result.trend} {testResult.result.trendValue}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="text-sm font-medium text-red-800 mb-1">
                      ✗ Test Failed
                    </div>
                    <div className="text-sm text-red-700 mb-1">
                      {testResult.error || 'Unknown error'}
                    </div>
                    {testResult.details && (
                      <div className="text-xs text-red-600 mt-2 font-mono bg-red-100 p-2 rounded max-h-32 overflow-y-auto">
                        {testResult.details}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:text-slate-900 border border-slate-300 rounded-lg hover:border-slate-400 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !formData.kpi_id || !formData.name || !formData.formula}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {editingKPI ? 'Update KPI' : 'Create KPI'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Field Reference Panel */}
      <FieldReferencePanel
        isOpen={showFieldReference}
        onClose={() => setShowFieldReference(false)}
      />
    </div>
  );
}

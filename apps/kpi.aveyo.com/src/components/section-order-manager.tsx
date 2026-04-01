"use client";

import { useState, useEffect } from "react";
import { createAuthHeaders } from "@/lib/auth-headers";
import { 
  GripVertical, Save, RotateCcw, Eye, EyeOff, 
  Loader2, CheckCircle, AlertCircle 
} from "lucide-react";

interface Section {
  section_id: string;
  display_order: number;
  is_active: boolean;
}

interface SectionOrderManagerProps {
  onSave?: () => void;
}

const SECTION_NAMES: Record<string, string> = {
  'sales_stats': 'Sales Stats',
  'operations_stats': 'Operations Stats',
  'cycle_times': 'Cycle Times',
  'residential_financials': 'Residential Financials',
  'active_pipeline': 'Active Pipeline',
  'finance': 'Finance',
  'commercial': 'Commercial Division'
};

export default function SectionOrderManager({ onSave }: SectionOrderManagerProps) {
  const [sections, setSections] = useState<Section[]>([]);
  const [originalSections, setOriginalSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    try {
      const headers = await createAuthHeaders();
      const response = await fetch('/api/sections', { headers });
      const data = await response.json();

      if (data.success) {
        const sorted = data.sections.sort((a: Section, b: Section) => a.display_order - b.display_order);
        setSections(sorted);
        setOriginalSections(JSON.parse(JSON.stringify(sorted)));
      }
    } catch (error) {
      console.error('Error fetching sections:', error);
      showNotification('error', 'Failed to load sections');
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === index) return;

    const newSections = [...sections];
    const draggedItem = newSections[draggedIndex];
    
    // Remove from old position
    newSections.splice(draggedIndex, 1);
    // Insert at new position
    newSections.splice(index, 0, draggedItem);
    
    // Update display orders
    newSections.forEach((section, idx) => {
      section.display_order = idx + 1;
    });
    
    setSections(newSections);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const toggleSectionVisibility = (index: number) => {
    const newSections = [...sections];
    newSections[index].is_active = !newSections[index].is_active;
    setSections(newSections);
  };

  const handleSave = async () => {
    setSaving(true);
    
    try {
      const headers = await createAuthHeaders({
        'Content-Type': 'application/json'
      });
      
      const response = await fetch('/api/sections', {
        method: 'POST',
        headers,
        body: JSON.stringify({ sections })
      });

      const data = await response.json();

      if (data.success) {
        setOriginalSections(JSON.parse(JSON.stringify(sections)));
        showNotification('success', 'Section order saved successfully!');
        onSave?.();
      } else {
        showNotification('error', data.error || 'Failed to save section order');
      }
    } catch (error) {
      console.error('Error saving sections:', error);
      showNotification('error', 'Failed to save section order');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSections(JSON.parse(JSON.stringify(originalSections)));
    showNotification('success', 'Changes reset');
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const hasChanges = JSON.stringify(sections) !== JSON.stringify(originalSections);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          Dashboard Section Order
        </h3>
        <p className="text-sm text-slate-600">
          Drag and drop to reorder sections on the dashboard. Toggle visibility to show/hide sections.
        </p>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
          notification.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
          )}
          <span className="text-sm">{notification.message}</span>
        </div>
      )}

      {/* Section List */}
      <div className="space-y-2 mb-6">
        {sections.map((section, index) => (
          <div
            key={section.section_id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`
              flex items-center gap-3 p-4 bg-slate-50 rounded-lg border-2 transition-all cursor-move
              ${draggedIndex === index ? 'border-blue-400 bg-blue-50 opacity-50' : 'border-slate-200 hover:border-slate-300'}
              ${!section.is_active ? 'opacity-60' : ''}
            `}
          >
            {/* Drag Handle */}
            <GripVertical className="h-5 w-5 text-slate-400 flex-shrink-0" />

            {/* Order Number */}
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-slate-700">{index + 1}</span>
            </div>

            {/* Section Name */}
            <div className="flex-1">
              <div className="font-medium text-slate-900">
                {SECTION_NAMES[section.section_id] || section.section_id}
              </div>
              <div className="text-xs text-slate-500">
                {section.section_id}
              </div>
            </div>

            {/* Visibility Toggle */}
            <button
              onClick={() => toggleSectionVisibility(index)}
              className={`p-2 rounded-lg transition-colors ${
                section.is_active 
                  ? 'text-green-600 hover:bg-green-50' 
                  : 'text-slate-400 hover:bg-slate-100'
              }`}
              title={section.is_active ? 'Hide section' : 'Show section'}
            >
              {section.is_active ? (
                <Eye className="h-5 w-5" />
              ) : (
                <EyeOff className="h-5 w-5" />
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Order
            </>
          )}
        </button>

        <button
          onClick={handleReset}
          disabled={!hasChanges || saving}
          className="flex items-center gap-2 px-4 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </button>
      </div>

      {/* Help Text */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          💡 <strong>Tip:</strong> Changes take effect immediately on the dashboard after saving.
          Hidden sections won&apos;t appear on the main dashboard but can be re-enabled anytime.
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { createAuthHeaders } from "@/lib/auth-headers";
import { 
  GripVertical, Plus, Edit, Trash2, Save, RotateCcw,
  Eye, EyeOff, ChevronDown, ChevronRight, Loader2,
  CheckCircle, AlertCircle, Database, Code
} from "lucide-react";
import KPIFormModal from "./kpi-form-modal";

interface KPI {
  id: string;
  kpi_id: string;
  name: string;
  description?: string;
  format: string;
  section_id: string;
  is_original: boolean;
  is_hidden: boolean;
  show_goal: boolean;
  display_order: number;
  formula_type?: 'sql' | 'expression';
  formula?: string;
  field_mappings?: Record<string, any>;
  available_periods?: string[];
  secondary_formula?: string;
  secondary_format?: 'count' | 'breakdown' | 'text';
}

interface Section {
  section_id: string;
  section_name: string;
  display_order: number;
  is_active: boolean;
  kpis: KPI[];
}

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

const SECTION_NAMES: Record<string, string> = {
  'sales_stats': 'Sales Stats',
  'operations_stats': 'Operations Stats',
  'cycle_times': 'Cycle Times',
  'residential_financials': 'Residential Financials',
  'active_pipeline': 'Active Pipeline',
  'finance': 'Finance',
  'commercial': 'Commercial Division'
};

export default function UnifiedKPIManager() {
  const [sections, setSections] = useState<Section[]>([]);
  const [originalSections, setOriginalSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [draggedItem, setDraggedItem] = useState<{ type: 'section' | 'kpi'; id: string; sectionId?: string } | null>(null);
  const [dropTarget, setDropTarget] = useState<{ type: 'section' | 'kpi'; sectionId: string; index: number } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingKPI, setEditingKPI] = useState<KPIFormData | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const headers = await createAuthHeaders();

      // Fetch sections and KPIs with auth header
      const sectionsResponse = await fetch('/api/sections', { headers });
      const sectionsData = await sectionsResponse.json();

      const kpisResponse = await fetch('/api/kpis', { headers });
      const kpisData = await kpisResponse.json();

      // Combine into grouped structure
      const allKPIs = [...(kpisData.kpis.original || []), ...(kpisData.kpis.custom || [])];
      
      const groupedSections: Section[] = sectionsData.sections.map((sec: any) => ({
        section_id: sec.section_id,
        section_name: SECTION_NAMES[sec.section_id] || sec.section_id,
        display_order: sec.display_order,
        is_active: sec.is_active,
        kpis: allKPIs
          .filter((kpi: any) => kpi.section_id === sec.section_id)
          .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
          .map((kpi: any) => ({
            id: kpi.id,
            kpi_id: kpi.id,
            name: kpi.name,
            description: kpi.description,
            format: kpi.format,
            section_id: kpi.section_id,
            is_original: kpi.is_original,
            is_hidden: kpi.is_hidden,
            show_goal: kpi.show_goal || false,
            display_order: kpi.display_order || 0,
            formula_type: kpi.formula_type,
            formula: kpi.formula,
            field_mappings: kpi.field_mappings,
            available_periods: kpi.available_periods,
            secondary_formula: kpi.secondary_formula,
            secondary_format: kpi.secondary_format
          }))
      })).sort((a: Section, b: Section) => a.display_order - b.display_order);

      setSections(groupedSections);
      setOriginalSections(JSON.parse(JSON.stringify(groupedSections)));
      
      // Expand all sections by default
      setExpandedSections(new Set(groupedSections.map(s => s.section_id)));

    } catch (error) {
      console.error('Error fetching data:', error);
      showNotification('error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const handleDragStart = (type: 'section' | 'kpi', id: string, sectionId?: string) => {
    setDraggedItem({ type, id, sectionId });
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDropTarget(null);
  };

  const handleDragOverSection = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.type !== 'section') return;

    const sourceIndex = sections.findIndex(s => s.section_id === draggedItem.id);
    if (sourceIndex === targetIndex) return;

    setDropTarget({ type: 'section', sectionId: sections[targetIndex].section_id, index: targetIndex });

    const newSections = [...sections];
    const [movedSection] = newSections.splice(sourceIndex, 1);
    newSections.splice(targetIndex, 0, movedSection);

    // Update display orders
    newSections.forEach((section, idx) => {
      section.display_order = idx + 1;
    });

    setSections(newSections);
  };

  const handleDragOverKPI = (e: React.DragEvent, targetSectionId: string, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedItem || draggedItem.type !== 'kpi') return;

    setDropTarget({ type: 'kpi', sectionId: targetSectionId, index: targetIndex });

    const sourceSectionIndex = sections.findIndex(s => s.section_id === draggedItem.sectionId);
    const targetSectionIndex = sections.findIndex(s => s.section_id === targetSectionId);
    
    if (sourceSectionIndex === -1 || targetSectionIndex === -1) return;

    const newSections = [...sections];
    const sourceSection = newSections[sourceSectionIndex];
    const targetSection = newSections[targetSectionIndex];

    const sourceKPIIndex = sourceSection.kpis.findIndex(k => k.kpi_id === draggedItem.id);
    if (sourceKPIIndex === -1) return;

    const [movedKPI] = sourceSection.kpis.splice(sourceKPIIndex, 1);
    
    // Update section_id if moving between sections
    if (sourceSectionIndex !== targetSectionIndex) {
      movedKPI.section_id = targetSectionId;
    }

    targetSection.kpis.splice(targetIndex, 0, movedKPI);

    // Update display orders for both sections
    sourceSection.kpis.forEach((kpi, idx) => {
      kpi.display_order = idx + 1;
    });
    targetSection.kpis.forEach((kpi, idx) => {
      kpi.display_order = idx + 1;
    });

    setSections(newSections);
  };

  const toggleSectionVisibility = (sectionId: string) => {
    setSections(prev => prev.map(section => 
      section.section_id === sectionId 
        ? { ...section, is_active: !section.is_active }
        : section
    ));
  };

  const toggleKPIVisibility = (sectionId: string, kpiId: string) => {
    setSections(prev => prev.map(section => 
      section.section_id === sectionId 
        ? {
            ...section,
            kpis: section.kpis.map(kpi =>
              kpi.kpi_id === kpiId ? { ...kpi, is_hidden: !kpi.is_hidden } : kpi
            )
          }
        : section
    ));
  };

  const handleAddKPI = (sectionId: string) => {
    setSelectedSection(sectionId);
    setEditingKPI(null);
    setShowModal(true);
  };

  const handleEditKPI = (kpi: KPI) => {
    setEditingKPI({
      kpi_id: kpi.kpi_id,
      name: kpi.name,
      description: kpi.description || '',
      format: kpi.format as any,
      formula_type: kpi.formula_type || 'sql',
      formula: kpi.formula || '',
      field_mappings: kpi.field_mappings || {},
      available_periods: kpi.available_periods || [],
      section_id: kpi.section_id,
      is_original: kpi.is_original,
      is_hidden: kpi.is_hidden,
      secondary_formula: kpi.secondary_formula,
      secondary_format: kpi.secondary_format
    });
    setShowModal(true);
  };

  const handleDeleteKPI = async (kpiId: string) => {
    if (!confirm('Are you sure you want to delete this KPI?')) return;

    try {
      const headers = await createAuthHeaders();
      const response = await fetch(`/api/kpis?kpi_id=${kpiId}`, {
        method: 'DELETE',
        headers
      });

      if (response.ok) {
        showNotification('success', 'KPI deleted successfully');
        await fetchData();
      } else {
        const data = await response.json();
        showNotification('error', data.error || 'Failed to delete KPI');
      }
    } catch (error) {
      console.error('Error deleting KPI:', error);
      showNotification('error', 'Failed to delete KPI');
    }
  };

  const handleSaveKPI = async (kpiData: KPIFormData) => {
    try {
      const headers = await createAuthHeaders({
        'Content-Type': 'application/json'
      });
      const isEditing = editingKPI !== null;
      
      // If adding new KPI, use selectedSection if available
      if (!isEditing && selectedSection) {
        kpiData.section_id = selectedSection;
      }

      const response = await fetch('/api/kpis', {
        method: isEditing ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify(kpiData)
      });

      if (response.ok) {
        showNotification('success', `KPI ${isEditing ? 'updated' : 'created'} successfully`);
        setShowModal(false);
        setEditingKPI(null);
        setSelectedSection(null);
        await fetchData();
      } else {
        const data = await response.json();
        showNotification('error', data.error || `Failed to ${isEditing ? 'update' : 'create'} KPI`);
      }
    } catch (error) {
      console.error('Error saving KPI:', error);
      showNotification('error', `Failed to ${editingKPI ? 'update' : 'create'} KPI`);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const headers = await createAuthHeaders({
        'Content-Type': 'application/json'
      });

      // Prepare updates
      const sectionUpdates = sections.map(section => ({
        section_id: section.section_id,
        display_order: section.display_order,
        is_active: section.is_active
      }));

      const kpiUpdates = sections.flatMap(section =>
        section.kpis.map(kpi => ({
          kpi_id: kpi.kpi_id,
          section_id: kpi.section_id,
          display_order: kpi.display_order
        }))
      );

      const response = await fetch('/api/kpis/reorder', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sections: sectionUpdates,
          kpis: kpiUpdates
        })
      });

      if (response.ok) {
        showNotification('success', 'Changes saved successfully!');
        setOriginalSections(JSON.parse(JSON.stringify(sections)));
      } else {
        const data = await response.json();
        showNotification('error', data.error || 'Failed to save changes');
      }
    } catch (error) {
      console.error('Error saving:', error);
      showNotification('error', 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all changes?')) {
      setSections(JSON.parse(JSON.stringify(originalSections)));
      showNotification('success', 'Changes reset');
    }
  };

  const hasChanges = JSON.stringify(sections) !== JSON.stringify(originalSections);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600" />
          )}
          <span className={notification.type === 'success' ? 'text-green-800' : 'text-red-800'}>
            {notification.message}
          </span>
        </div>
      )}

      {/* Header Actions */}
      <div className={`flex items-center justify-end gap-3 p-4 rounded-lg border transition-all ${
        hasChanges 
          ? 'bg-blue-50 border-blue-200' 
          : 'bg-slate-50 border-slate-200'
      }`}>
        {hasChanges ? (
          <span className="text-sm text-blue-800 font-medium">You have unsaved changes</span>
        ) : (
          <span className="text-sm text-slate-500 font-medium">No changes to save</span>
        )}
        <button
          onClick={handleReset}
          disabled={!hasChanges}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
            hasChanges
              ? 'text-slate-700 bg-white border-slate-300 hover:bg-slate-50'
              : 'text-slate-400 bg-slate-100 border-slate-200 cursor-not-allowed'
          }`}
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            hasChanges && !saving
              ? 'text-white bg-blue-600 hover:bg-blue-700'
              : 'text-slate-400 bg-slate-200 cursor-not-allowed'
          }`}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Changes
            </>
          )}
        </button>
      </div>

      {/* Sections List */}
      <div className="space-y-3">
        {sections.map((section, sectionIndex) => (
          <div
            key={section.section_id}
            className={`rounded-lg bg-white overflow-hidden transition-all relative ${
              draggedItem?.type === 'section' && draggedItem.id === section.section_id
                ? 'border-2 border-blue-500 shadow-lg shadow-blue-200 ring-2 ring-blue-300 ring-offset-2'
                : dropTarget?.type === 'section' && dropTarget.index === sectionIndex
                  ? 'border-2 border-dashed border-green-400 bg-green-50'
                : 'border border-slate-200 hover:shadow-md'
            }`}
            onDragOver={(e) => handleDragOverSection(e, sectionIndex)}
          >
            {/* Section Header */}
            <div className="flex items-center gap-3 p-4 bg-slate-50 border-b border-slate-200">
              <div 
                className="cursor-move hover:bg-slate-200 rounded p-1 -m-1 transition-colors"
                draggable
                onDragStart={(e) => {
                  e.stopPropagation();
                  handleDragStart('section', section.section_id);
                }}
                onDragEnd={handleDragEnd}
              >
                <GripVertical className="h-5 w-5 text-slate-400 hover:text-slate-600" />
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSection(section.section_id);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className="flex items-center gap-2 flex-1 text-left"
              >
                {expandedSections.has(section.section_id) ? (
                  <ChevronDown className="h-5 w-5 text-slate-500" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-slate-500" />
                )}
                <span className="font-semibold text-slate-900">{section.section_name}</span>
                <span className="text-sm text-slate-500">({section.kpis.length} KPIs)</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSectionVisibility(section.section_id);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className="p-2 hover:bg-slate-200 rounded transition-colors"
                title={section.is_active ? 'Hide section' : 'Show section'}
              >
                {section.is_active ? (
                  <Eye className="h-4 w-4 text-slate-600" />
                ) : (
                  <EyeOff className="h-4 w-4 text-slate-400" />
                )}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddKPI(section.section_id);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add KPI
              </button>
            </div>

            {/* KPIs List */}
            {expandedSections.has(section.section_id) && (
              <div className="p-4 grid grid-cols-3 gap-3">
                {section.kpis.length === 0 ? (
                  <div className="col-span-3 text-center py-8 text-slate-500 text-sm">
                    No KPIs in this section. Click &quot;Add KPI&quot; to create one.
                  </div>
                ) : (
                  section.kpis.map((kpi, kpiIndex) => (
                    <div
                      key={kpi.kpi_id}
                      className={`flex flex-col p-3 rounded-lg transition-all relative ${
                        draggedItem?.type === 'kpi' && draggedItem.id === kpi.kpi_id 
                          ? 'border-2 border-blue-500 shadow-lg shadow-blue-200 bg-blue-50 ring-2 ring-blue-300 ring-offset-2 z-50' 
                          : dropTarget?.type === 'kpi' && dropTarget.sectionId === section.section_id && dropTarget.index === kpiIndex
                            ? 'border-2 border-dashed border-green-400 bg-green-50 shadow-md'
                          : kpi.is_hidden 
                            ? 'bg-slate-100 border border-slate-300 opacity-60 grayscale' 
                            : 'bg-white border border-slate-200 hover:border-blue-300 hover:shadow-sm'
                      }`}
                      onDragOver={(e) => handleDragOverKPI(e, section.section_id, kpiIndex)}
                    >
                      {/* Header with drag handle and badges */}
                      <div className="flex items-start gap-2 mb-2">
                        <div 
                          className="cursor-move pt-0.5 hover:bg-slate-100 rounded p-0.5 -m-0.5 transition-colors"
                          draggable
                          onDragStart={(e) => {
                            e.stopPropagation();
                            handleDragStart('kpi', kpi.kpi_id, section.section_id);
                          }}
                          onDragEnd={handleDragEnd}
                        >
                          <GripVertical className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium truncate ${kpi.is_hidden ? 'text-slate-500' : 'text-slate-900'}`}>{kpi.name}</div>
                          <div className="flex items-center gap-1 mt-1">
                            {kpi.is_original && (
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                                Original
                              </span>
                            )}
                            {!kpi.is_original && (
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                                Custom
                              </span>
                            )}
                            {kpi.is_hidden && (
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-200 text-slate-700">
                                Hidden
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      {kpi.description && (
                        <p className={`text-sm line-clamp-2 mb-2 ${kpi.is_hidden ? 'text-slate-400' : 'text-slate-500'}`}>{kpi.description}</p>
                      )}

                      {/* Meta info */}
                      <div className={`flex items-center gap-3 mb-3 text-xs ${kpi.is_hidden ? 'text-slate-400' : 'text-slate-500'}`}>
                        <span className="flex items-center gap-1">
                          {kpi.formula_type === 'sql' ? <Database className="h-3 w-3" /> : <Code className="h-3 w-3" />}
                          {kpi.formula_type?.toUpperCase()}
                        </span>
                        <span>{kpi.format}</span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 mt-auto pt-2 border-t border-slate-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleKPIVisibility(section.section_id, kpi.kpi_id);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          className="flex-1 p-2 hover:bg-slate-100 rounded transition-colors"
                          title={kpi.is_hidden ? 'Show KPI' : 'Hide KPI'}
                        >
                          {kpi.is_hidden ? (
                            <EyeOff className="h-4 w-4 text-slate-400 mx-auto" />
                          ) : (
                            <Eye className="h-4 w-4 text-slate-600 mx-auto" />
                          )}
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditKPI(kpi);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          className="flex-1 p-2 hover:bg-blue-50 rounded transition-colors"
                          title="Edit KPI"
                        >
                          <Edit className="h-4 w-4 text-blue-600 mx-auto" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteKPI(kpi.kpi_id);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          className="flex-1 p-2 hover:bg-red-50 rounded transition-colors"
                          title="Delete KPI"
                        >
                          <Trash2 className="h-4 w-4 text-red-600 mx-auto" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* KPI Form Modal */}
      <KPIFormModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingKPI(null);
          setSelectedSection(null);
        }}
        onSave={handleSaveKPI}
        editingKPI={editingKPI}
      />
    </div>
  );
}

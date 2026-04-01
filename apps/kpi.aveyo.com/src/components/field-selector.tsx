"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Database, X } from "lucide-react";
import { createAuthHeaders } from "@/lib/auth-headers";

export interface DatabaseField {
  field: string;
  type: string;
  nullable: boolean;
  table: string;
}

interface FieldSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (field: DatabaseField) => void;
  position: { top: number; left: number };
  searchQuery?: string;
}

export default function FieldSelector({
  isOpen,
  onClose,
  onSelect,
  position,
  searchQuery = ""
}: FieldSelectorProps) {
  const [fields, setFields] = useState<Record<string, DatabaseField[]>>({});
  const [filteredFields, setFilteredFields] = useState<DatabaseField[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch database schema on mount
  useEffect(() => {
    fetchSchema();
  }, []);

  // Filter fields based on search query
  useEffect(() => {
    if (!fields || Object.keys(fields).length === 0) return;

    const allFields = Object.values(fields).flat();
    
    if (!searchQuery || searchQuery.trim() === '') {
      setFilteredFields(allFields);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = allFields.filter(f =>
        f.field.toLowerCase().includes(query) ||
        f.table.toLowerCase().includes(query)
      );
      setFilteredFields(filtered);
    }
    
    setSelectedIndex(0);
  }, [searchQuery, fields]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredFields.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredFields[selectedIndex]) {
          onSelect(filteredFields[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredFields, onSelect, onClose]);

  const fetchSchema = async () => {
    try {
      setLoading(true);
      const headers = await createAuthHeaders();
      const response = await fetch('/api/db-schema', { headers });
      const data = await response.json();
      
      if (data.success) {
        setFields(data.schema);
      } else {
        console.error('Failed to fetch database schema:', data.error);
      }
    } catch (error) {
      console.error('Error fetching schema:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type: string): string => {
    if (type.includes('int') || type.includes('double') || type.includes('decimal')) {
      return 'bg-blue-100 text-blue-700';
    }
    if (type.includes('date') || type.includes('time')) {
      return 'bg-purple-100 text-purple-700';
    }
    if (type.includes('text') || type.includes('varchar') || type.includes('char')) {
      return 'bg-green-100 text-green-700';
    }
    return 'bg-gray-100 text-gray-700';
  };

  const getTypeLabel = (type: string): string => {
    if (type.includes('int')) return 'number';
    if (type.includes('double') || type.includes('decimal')) return 'decimal';
    if (type.includes('datetime')) return 'datetime';
    if (type.includes('date')) return 'date';
    if (type.includes('text')) return 'text';
    if (type.includes('varchar')) return 'string';
    return 'other';
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Dropdown */}
      <div
        ref={dropdownRef}
        className="fixed z-50 bg-white border border-slate-300 rounded-lg shadow-xl max-h-96 overflow-y-auto"
        style={{
          top: position.top,
          left: position.left,
          width: '400px'
        }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-semibold text-slate-700">
                Database Fields
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <div className="pl-10 pr-3 py-2 text-sm text-slate-600 bg-slate-50 rounded">
              {searchQuery || 'Type to search fields...'}
            </div>
          </div>
        </div>

        {/* Field List */}
        <div className="p-2">
          {loading ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              Loading fields...
            </div>
          ) : filteredFields.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              No fields found matching &quot;{searchQuery}&quot;
            </div>
          ) : (
            <div className="space-y-1">
              {filteredFields.map((field, index) => (
                <button
                  key={`${field.table}.${field.field}`}
                  onClick={() => onSelect(field)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    index === selectedIndex
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-500">
                          {field.table}
                        </span>
                        <span className="text-sm font-mono text-slate-900 truncate">
                          {field.field}
                        </span>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getTypeColor(field.type)}`}>
                      {getTypeLabel(field.type)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-3 py-2">
          <div className="text-xs text-slate-500">
            {filteredFields.length} field{filteredFields.length !== 1 ? 's' : ''} available
            {searchQuery && ` matching "${searchQuery}"`}
          </div>
        </div>
      </div>
    </>
  );
}

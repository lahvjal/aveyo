"use client";

import { useState, useEffect } from "react";
import { Database, ChevronDown, ChevronRight, Copy, Check, Loader2, X } from "lucide-react";
import { createAuthHeaders } from "@/lib/auth-headers";

export interface DatabaseField {
  field: string;
  type: string;
  nullable: boolean;
  table: string;
}

interface FieldReferencePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FieldReferencePanel({ isOpen, onClose }: FieldReferencePanelProps) {
  const [schema, setSchema] = useState<Record<string, DatabaseField[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchSchema();
    }
  }, [isOpen]);

  const fetchSchema = async () => {
    setLoading(true);
    try {
      const headers = await createAuthHeaders();
      const response = await fetch('/api/db-schema', { headers });
      const data = await response.json();
      
      if (data.success) {
        setSchema(data.schema);
        // Expand all tables by default
        setExpandedTables(new Set(Object.keys(data.schema)));
      }
    } catch (error) {
      console.error('Error fetching schema:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTable = (tableName: string) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName);
    } else {
      newExpanded.add(tableName);
    }
    setExpandedTables(newExpanded);
  };

  const copyFieldToken = (field: DatabaseField) => {
    const token = `@${field.table}.${field.field}`;
    navigator.clipboard.writeText(token);
    setCopiedField(token);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getTypeColor = (type: string): string => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('int') || lowerType.includes('decimal') || lowerType.includes('float') || lowerType.includes('double')) {
      return 'text-blue-600 bg-blue-50';
    }
    if (lowerType.includes('varchar') || lowerType.includes('text') || lowerType.includes('char')) {
      return 'text-green-600 bg-green-50';
    }
    if (lowerType.includes('date') || lowerType.includes('time')) {
      return 'text-purple-600 bg-purple-50';
    }
    if (lowerType.includes('bool')) {
      return 'text-orange-600 bg-orange-50';
    }
    return 'text-slate-600 bg-slate-50';
  };

  const getTypeLabel = (type: string): string => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('int')) return 'INT';
    if (lowerType.includes('decimal') || lowerType.includes('float') || lowerType.includes('double')) return 'NUM';
    if (lowerType.includes('varchar') || lowerType.includes('text')) return 'TEXT';
    if (lowerType.includes('date')) return 'DATE';
    if (lowerType.includes('time')) return 'TIME';
    if (lowerType.includes('bool')) return 'BOOL';
    return type.toUpperCase().slice(0, 4);
  };

  const filterFields = (): Record<string, DatabaseField[]> => {
    if (!searchQuery.trim()) return schema;
    
    const query = searchQuery.toLowerCase();
    const filtered: Record<string, DatabaseField[]> = {};
    
    Object.entries(schema).forEach(([tableName, fields]) => {
      const matchingFields = fields.filter(field =>
        field.field.toLowerCase().includes(query) ||
        tableName.toLowerCase().includes(query) ||
        field.type.toLowerCase().includes(query)
      );
      
      if (matchingFields.length > 0) {
        filtered[tableName] = matchingFields;
      }
    });
    
    return filtered;
  };

  if (!isOpen) return null;

  const filteredSchema = filterFields();
  const hasResults = Object.keys(filteredSchema).length > 0;

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-slate-600" />
          <h3 className="font-semibold text-slate-900">Field Reference</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-100 rounded transition-colors"
          title="Close panel"
        >
          <X className="h-5 w-5 text-slate-500" />
        </button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-slate-200">
        <input
          type="text"
          placeholder="Search fields..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : !hasResults ? (
          <div className="text-center py-8">
            <Database className="h-12 w-12 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">
              {searchQuery ? 'No fields match your search' : 'No fields available'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {Object.entries(filteredSchema).map(([tableName, fields]) => (
              <div key={tableName} className="border border-slate-200 rounded-lg overflow-hidden">
                {/* Table Header */}
                <button
                  onClick={() => toggleTable(tableName)}
                  className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {expandedTables.has(tableName) ? (
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-500" />
                    )}
                    <span className="font-medium text-slate-900 text-sm">{tableName}</span>
                    <span className="text-xs text-slate-500">({fields.length})</span>
                  </div>
                </button>

                {/* Fields List */}
                {expandedTables.has(tableName) && (
                  <div className="divide-y divide-slate-100">
                    {fields.map((field) => {
                      const token = `@${field.table}.${field.field}`;
                      const isCopied = copiedField === token;
                      
                      return (
                        <div
                          key={field.field}
                          className="p-3 hover:bg-slate-50 transition-colors group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-sm text-slate-900 truncate">
                                  {field.field}
                                </span>
                                {field.nullable && (
                                  <span className="text-xs text-slate-400">nullable</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded ${getTypeColor(field.type)}`}>
                                  {getTypeLabel(field.type)}
                                </span>
                                <span className="text-xs text-slate-500 font-mono truncate">
                                  {field.type}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => copyFieldToken(field)}
                              className="flex-shrink-0 p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                              title="Copy field token"
                            >
                              {isCopied ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                          <div className="mt-1.5 px-2 py-1 bg-slate-100 rounded text-xs font-mono text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            {token}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <div className="text-xs text-slate-600 space-y-1">
          <p className="font-medium">Usage:</p>
          <p>• Click field names to copy token</p>
          <p>• Use tokens in formulas like: @table.field</p>
          <p>• Tokens auto-complete with @ in editor</p>
        </div>
      </div>
    </div>
  );
}

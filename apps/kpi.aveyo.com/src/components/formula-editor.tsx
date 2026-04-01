"use client";

import { useState, useRef, useEffect } from "react";
import FieldSelector, { DatabaseField } from "./field-selector";
import { AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";
import { validateFormula } from "@/lib/formula-validator";
import type { ValidationResult } from "@/lib/formula-validator";

interface FormulaEditorProps {
  value: string;
  onChange: (value: string) => void;
  formulaType: 'sql' | 'expression';
  placeholder?: string;
  className?: string;
}

export default function FormulaEditor({
  value,
  onChange,
  formulaType,
  placeholder,
  className = ""
}: FormulaEditorProps) {
  const [showFieldSelector, setShowFieldSelector] = useState(false);
  const [selectorPosition, setSelectorPosition] = useState({ top: 0, left: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Validate formula on change
  useEffect(() => {
    if (value.trim()) {
      const result = validateFormula(value, formulaType);
      setValidation(result);
    } else {
      setValidation(null);
    }
  }, [value, formulaType]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);

    // Check if @ was just typed
    if (e.key === '@') {
      // Get cursor position in viewport
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setSelectorPosition({
          top: rect.bottom + 5,
          left: rect.left
        });
        setSearchQuery("");
        setShowFieldSelector(true);
        setCursorPosition(cursorPos + 1);
      }
    }

    // Update search query if field selector is open
    if (showFieldSelector) {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowFieldSelector(false);
        setSearchQuery("");
      } else if (e.key === ' ' || e.key === 'Enter' || e.key === 'Tab') {
        // Close selector on space, enter, or tab if no selection made
        setShowFieldSelector(false);
        setSearchQuery("");
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    onChange(newValue);

    // Update search query if field selector is open
    if (showFieldSelector) {
      const textBeforeCursor = newValue.substring(0, cursorPos);
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');
      
      if (lastAtIndex !== -1) {
        const searchText = textBeforeCursor.substring(lastAtIndex + 1);
        // Only update if search text doesn't contain spaces or special chars
        if (!searchText.match(/[\s,()[\]{}]/)) {
          setSearchQuery(searchText);
        } else {
          setShowFieldSelector(false);
          setSearchQuery("");
        }
      } else {
        setShowFieldSelector(false);
        setSearchQuery("");
      }
    }
  };

  const handleFieldSelect = (field: DatabaseField) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    const textAfterCursor = value.substring(cursorPos);
    
    // Find the last @ symbol
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      // Replace everything from @ to cursor with the field reference
      const beforeAt = value.substring(0, lastAtIndex);
      const fieldReference = `@${field.table}.\`${field.field}\``;
      const newValue = beforeAt + fieldReference + textAfterCursor;
      
      onChange(newValue);
      
      // Set cursor position after inserted field
      setTimeout(() => {
        const newCursorPos = lastAtIndex + fieldReference.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
      }, 0);
    }
    
    setShowFieldSelector(false);
    setSearchQuery("");
  };

  const getPlaceholderText = () => {
    if (placeholder) return placeholder;
    
    if (formulaType === 'sql') {
      return `SELECT COUNT(*) as value\nFROM @timeline t\nJOIN @project-data pd ON t.\`project-dev-id\` = pd.\`project-dev-id\`\nWHERE t.@contract-signed IS NOT NULL\n  AND {{dateFilter}}`;
    } else {
      return `(@numerator / @denominator) * 100`;
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={getPlaceholderText()}
        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm resize-vertical min-h-[200px]"
        spellCheck={false}
      />

      {/* Validation Status */}
      {validation && (
        <div className="mt-2 space-y-2">
          {/* Errors */}
          {validation.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-red-800 mb-1">
                    Validation Errors
                  </div>
                  <ul className="text-sm text-red-700 space-y-1">
                    {validation.errors.map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Warnings */}
          {validation.warnings.length > 0 && validation.errors.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-yellow-800 mb-1">
                    Warnings
                  </div>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {validation.warnings.map((warning, i) => (
                      <li key={i}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Success */}
          {validation.isValid && validation.errors.length === 0 && validation.warnings.length === 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-800">
                  Formula is valid! Found {validation.parsedFields.length} field reference{validation.parsedFields.length !== 1 ? 's' : ''}.
                </span>
              </div>
            </div>
          )}

          {/* Parsed Fields */}
          {validation.parsedFields.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {validation.parsedFields.map((field, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-mono"
                >
                  @{field}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Helper Text */}
      <div className="mt-2 text-xs text-slate-500">
        Type <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono">@</kbd> to insert a database field
        {formulaType === 'sql' && (
          <> • Use <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono">{'{{dateFilter}}'}</kbd> for period filtering</>
        )}
      </div>

      {/* Field Selector Popup */}
      <FieldSelector
        isOpen={showFieldSelector}
        onClose={() => {
          setShowFieldSelector(false);
          setSearchQuery("");
        }}
        onSelect={handleFieldSelect}
        position={selectorPosition}
        searchQuery={searchQuery}
      />
    </div>
  );
}

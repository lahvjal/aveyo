"use client";

import { useState, useRef, useEffect } from "react";
import type { MouseEvent, ReactNode } from "react";
import { Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TooltipProps {
  content: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function Tooltip({ content, children, className }: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Handle click outside to close modal
  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setIsOpen(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded-full"
        aria-label="Show calculation details"
      >
        {children || (
          <Info className="h-4 w-4 text-slate-400 hover:text-slate-600 transition-colors" />
        )}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in-0 duration-200"
          onClick={handleBackdropClick}
        >
          <div
            ref={modalRef}
            className={cn(
              "relative bg-slate-900 text-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto",
              "animate-in zoom-in-95 slide-in-from-bottom-4 duration-200",
              className
            )}
          >
            {/* Close button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Content */}
            <div className="p-6 pr-12">
              {content}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface KPITooltipContentProps {
  calculation: string;
  dataSources: {
    table: string;
    fields: string[];
  }[];
  formula: string;
  notes?: string;
}

export function KPITooltipContent({ calculation, dataSources, formula, notes }: KPITooltipContentProps) {
  return (
    <div className="space-y-5">
      {/* Title */}
      <div>
        <h3 className="text-xl font-bold text-white mb-1">KPI Calculation Details</h3>
        <p className="text-slate-400 text-sm">How this metric is calculated</p>
      </div>

      {/* Calculation */}
      <div>
        <h4 className="font-semibold mb-2 text-white text-base flex items-center gap-2">
          <span className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs">1</span>
          Calculation
        </h4>
        <p className="text-slate-300 text-sm leading-relaxed ml-8">{calculation}</p>
      </div>

      {/* Data Sources */}
      <div>
        <h4 className="font-semibold mb-2 text-white text-base flex items-center gap-2">
          <span className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs">2</span>
          Data Sources
        </h4>
        <div className="space-y-2 ml-8">
          {dataSources.map((source, idx) => (
            <div key={idx} className="text-sm bg-slate-800 rounded-lg p-3">
              <div className="text-blue-400 font-mono font-semibold mb-2">
                {source.table}
              </div>
              <div className="space-y-1 text-slate-300">
                {source.fields.map((field, fieldIdx) => (
                  <div key={fieldIdx} className="font-mono text-xs flex items-center gap-2">
                    <span className="text-slate-500">•</span>
                    <span>{field}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Formula */}
      <div>
        <h4 className="font-semibold mb-2 text-white text-base flex items-center gap-2">
          <span className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs">3</span>
          Formula
        </h4>
        <div className="ml-8 bg-slate-800 rounded-lg p-3">
          <code className="text-sm text-slate-300 font-mono whitespace-pre-wrap break-words block">
            {formula}
          </code>
        </div>
      </div>

      {/* Notes */}
      {notes && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <h4 className="font-semibold mb-2 text-yellow-400 text-base flex items-center gap-2">
            <Info className="h-5 w-5" />
            Important Notes
          </h4>
          <p className="text-slate-300 text-sm leading-relaxed">{notes}</p>
        </div>
      )}
    </div>
  );
}

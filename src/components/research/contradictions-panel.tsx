"use client";

import { AlertTriangle, Scale } from "lucide-react";
import { ResearchContradiction } from "@/hooks/use-research";

export function ContradictionsPanel({ contradictions }: { contradictions: ResearchContradiction[] }) {
  if (!contradictions?.length) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        <h3 className="text-sm font-medium text-stone-600 uppercase tracking-wider">Evidence Conflicts</h3>
      </div>
      <div className="space-y-3">
        {contradictions.map((c, i) => (
          <div key={c.id || i} className="p-4 rounded-xl bg-amber-50/50 border border-amber-200">
            <div className="flex items-start gap-3">
              <Scale className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-2.5 rounded-lg bg-white border border-amber-100">
                    <p className="text-xs text-stone-500 mb-1">Source A</p>
                    <p className="text-sm text-stone-800">{c.claimA}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-amber-100">
                    <p className="text-xs text-stone-500 mb-1">Source B</p>
                    <p className="text-sm text-stone-800">{c.claimB}</p>
                  </div>
                </div>
                <p className="text-sm text-stone-600 italic">{c.explanation}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
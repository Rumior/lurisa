"use client";

import { User, Sparkles, Target, AlertCircle } from "lucide-react";

export function PersonalInterpretation({
  interpretation,
  recommendation,
}: {
  interpretation?: string;
  recommendation?: string;
}) {
  if (!interpretation) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-rose-500" />
        <h3 className="text-sm font-medium text-stone-600 uppercase tracking-wider">What This Means for You</h3>
      </div>
      <div className="p-5 rounded-xl bg-rose-50/30 border border-rose-200">
        <div className="flex items-start gap-3">
          <User className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-3 flex-1">
            <p className="text-sm text-stone-800 leading-relaxed">{interpretation}</p>
            {recommendation && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-white border border-rose-100">
                <Target className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-rose-600 uppercase tracking-wider mb-1">Recommendation</p>
                  <p className="text-sm text-stone-800">{recommendation}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
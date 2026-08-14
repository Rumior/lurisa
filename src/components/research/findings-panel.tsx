"use client";

import { Lightbulb, Bookmark } from "lucide-react";
import { ResearchFinding } from "@/hooks/use-research";

export function FindingsPanel({ findings }: { findings: ResearchFinding[] }) {
  if (!findings?.length) return null;

  const grouped = findings.reduce((acc, f) => {
    if (!acc[f.category]) acc[f.category] = [];
    acc[f.category].push(f);
    return acc;
  }, {} as Record<string, ResearchFinding[]>);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-stone-600 uppercase tracking-wider">Key Findings</h3>
      <div className="space-y-6">
        {Object.entries(grouped).map(([category, items], groupIdx) => (
          <div key={category} className="space-y-3">
            <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              {groupIdx + 1 < 10 ? `0${groupIdx + 1}` : groupIdx + 1} â€” {category}
            </h4>
            <div className="space-y-2">
              {items.map((finding, i) => (
                <div key={finding.id || i} className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-stone-800 leading-relaxed">{finding.finding}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-stone-500">
                          Confidence: {Math.round(finding.confidence * 100)}%
                        </span>
                        {finding.personalRelevance && (
                          <span className="inline-flex items-center gap-1 text-xs text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                            <Bookmark className="w-3 h-3" />
                            Relevant to you
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
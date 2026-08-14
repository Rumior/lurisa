"use client";

import { ExternalLink, Shield, BookOpen, Newspaper, FileText, Globe } from "lucide-react";
import { ResearchSource } from "@/hooks/use-research";

const SOURCE_TYPE_CONFIG = {
  PRIMARY: { label: "Primary", icon: Shield, color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
  SECONDARY: { label: "Secondary", icon: Newspaper, color: "text-blue-600 bg-blue-50 border-blue-100" },
  TERTIARY: { label: "Tertiary", icon: Globe, color: "text-stone-600 bg-stone-50 border-stone-200" },
};

function SourceTypeBadge({ type }: { type: string }) {
  const config = SOURCE_TYPE_CONFIG[type as keyof typeof SOURCE_TYPE_CONFIG] || SOURCE_TYPE_CONFIG.TERTIARY;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${config.color}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function CredibilityBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-stone-200 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${score * 100}%` }} />
      </div>
      <span className="text-xs text-stone-500">{Math.round(score * 100)}%</span>
    </div>
  );
}

export function SourceList({ sources }: { sources: ResearchSource[] }) {
  if (!sources?.length) return null;

  const byType = sources.reduce((acc, s) => {
    acc[s.sourceType] = (acc[s.sourceType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-stone-600 uppercase tracking-wider">Sources & Evidence</h3>
        <span className="text-xs text-stone-500">{sources.length} total</span>
      </div>

      <div className="flex gap-2 flex-wrap">
        {Object.entries(byType).map(([type, count]) => (
          <div key={type} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-50 border border-stone-200">
            <span className="text-xs font-medium text-stone-700">{type}</span>
            <span className="text-xs text-stone-400">{count}</span>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {sources.map((source) => (
          <div key={source.id} className="p-3 rounded-xl border border-stone-200 bg-white hover:border-stone-300 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-medium text-stone-800 truncate">{source.title}</h4>
                <p className="text-xs text-stone-500 mt-0.5 truncate">{source.publisher || new URL(source.url).hostname}</p>
              </div>
              <SourceTypeBadge type={source.sourceType} />
            </div>
            <div className="flex items-center justify-between mt-2">
              <CredibilityBar score={source.credibilityScore} />
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-800 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Open
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
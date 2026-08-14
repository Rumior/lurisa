"use client";

import { Clock, BookOpen, CheckCircle, Loader2, AlertCircle, ArrowRight } from "lucide-react";
import { ResearchSession } from "@/hooks/use-research";

const STATUS_CONFIG = {
  PLANNING: { label: "Planning", color: "text-stone-500 bg-stone-100", icon: Clock },
  SEARCHING: { label: "Researching", color: "text-amber-600 bg-amber-50", icon: Loader2 },
  ANALYZING: { label: "Analyzing", color: "text-blue-600 bg-blue-50", icon: Loader2 },
  SYNTHESIZING: { label: "Synthesizing", color: "text-violet-600 bg-violet-50", icon: Loader2 },
  COMPLETED: { label: "Complete", color: "text-emerald-600 bg-emerald-50", icon: CheckCircle },
  FAILED: { label: "Failed", color: "text-red-600 bg-red-50", icon: AlertCircle },
};

const DEPTH_LABELS = {
  QUICK: "Quick Research",
  DEEP: "Deep Research",
  REPORT: "Research Report",
};

export function ResearchCard({
  session,
  onClick,
}: {
  session: ResearchSession;
  onClick: () => void;
}) {
  const status = STATUS_CONFIG[session.status] || STATUS_CONFIG.PLANNING;
  const StatusIcon = status.icon;
  const isActive = session.status !== "COMPLETED" && session.status !== "FAILED";

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-5 rounded-2xl border border-stone-200 bg-white hover:border-stone-300 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-stone-800 truncate group-hover:text-stone-900">
            {session.objective || session.query}
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            {DEPTH_LABELS[session.depth]} Â· {new Date(session.createdAt).toLocaleDateString()}
          </p>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
          <StatusIcon className={`w-3.5 h-3.5 ${isActive ? "animate-spin" : ""}`} />
          {status.label}
        </span>
      </div>
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-4 text-xs text-stone-500">
          {session.sources && (
            <span className="flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" />
              {session.sources.length} sources
            </span>
          )}
          {session.findings && (
            <span>{session.findings.length} findings</span>
          )}
        </div>
        <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-stone-600 transition-colors" />
      </div>
    </button>
  );
}
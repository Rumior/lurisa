"use client";

import { ArrowLeft, Clock, BookOpen, CheckCircle, Loader2, AlertCircle, Sparkles } from "lucide-react";
import { ResearchSession, useResearchSession, useResearchStatus } from "@/hooks/use-research";
import { ResearchProgressTracker } from "./research-progress";
import { SourceList } from "./source-list";
import { FindingsPanel } from "./findings-panel";
import { ContradictionsPanel } from "./contradictions-panel";
import { PersonalInterpretation } from "./personal-interpretation";

const STATUS_CONFIG = {
  PLANNING: { label: "Planning", color: "text-stone-500", icon: Clock },
  SEARCHING: { label: "Researching", color: "text-amber-600", icon: Loader2 },
  ANALYZING: { label: "Analyzing", color: "text-blue-600", icon: Loader2 },
  SYNTHESIZING: { label: "Synthesizing", color: "text-violet-600", icon: Loader2 },
  COMPLETED: { label: "Research Complete", color: "text-emerald-600", icon: CheckCircle },
  FAILED: { label: "Research Failed", color: "text-red-600", icon: AlertCircle },
};

export function ResearchDetail({
  sessionId,
  onBack,
}: {
  sessionId: string;
  onBack: () => void;
}) {
  const { session, loading: sessionLoading } = useResearchSession(sessionId);
  const { status: liveStatus } = useResearchStatus(
    session?.status !== "COMPLETED" && session?.status !== "FAILED" ? sessionId : null
  );

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-stone-400 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-16">
        <p className="text-stone-500">Research session not found.</p>
        <button
          onClick={onBack}
          className="mt-4 inline-flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to research
        </button>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[session.status] || STATUS_CONFIG.PLANNING;
  const StatusIcon = statusConfig.icon;
  const isComplete = session.status === "COMPLETED";

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-800 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to research
        </button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-stone-900">
              {session.objective || session.query}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${statusConfig.color}`}>
                <StatusIcon className={`w-4 h-4 ${!isComplete ? "animate-spin" : ""}`} />
                {statusConfig.label}
              </span>
              <span className="text-sm text-stone-400">Â·</span>
              <span className="text-sm text-stone-500">{session.depth} Research</span>
            </div>
          </div>
        </div>

        {session.objective && (
          <div className="mt-4 p-3 rounded-lg bg-stone-50 border border-stone-200">
            <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Research Objective</p>
            <p className="text-sm text-stone-700">{session.objective}</p>
          </div>
        )}

        <div className="flex items-center gap-6 mt-4 text-sm text-stone-500">
          <span>Started: {new Date(session.createdAt).toLocaleString()}</span>
          {session.completedAt && (
            <span>Completed: {new Date(session.completedAt).toLocaleString()}</span>
          )}
          {liveStatus?.progress && (
            <>
              <span className="flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" />
                {liveStatus.progress.sources} sources
              </span>
              <span>{liveStatus.progress.findings} findings</span>
            </>
          )}
        </div>
      </div>

      {/* Progress (if active) */}
      {!isComplete && session.status !== "FAILED" && (
        <div className="p-5 rounded-2xl border border-stone-200 bg-white">
          <ResearchProgressTracker status={session.status} />
        </div>
      )}

      {/* Sources */}
      {session.sources && session.sources.length > 0 && (
        <div className="p-5 rounded-2xl border border-stone-200 bg-white">
          <SourceList sources={session.sources} />
        </div>
      )}

      {/* Findings */}
      {session.findings && session.findings.length > 0 && (
        <div className="p-5 rounded-2xl border border-stone-200 bg-white">
          <FindingsPanel findings={session.findings} />
        </div>
      )}

      {/* Contradictions */}
      {session.contradictions && session.contradictions.length > 0 && (
        <div className="p-5 rounded-2xl border border-stone-200 bg-white">
          <ContradictionsPanel contradictions={session.contradictions} />
        </div>
      )}

      {/* Personal Interpretation */}
      {isComplete && (
        <div className="p-5 rounded-2xl border border-rose-200 bg-white">
          <PersonalInterpretation
            interpretation={session.personalInterpretation}
            recommendation={session.recommendation}
          />
        </div>
      )}

      {/* Save to Lurisa CTA */}
      {isComplete && (
        <div className="p-5 rounded-2xl border border-stone-200 bg-stone-50 text-center">
          <Sparkles className="w-5 h-5 text-rose-400 mx-auto mb-2" />
          <h3 className="text-sm font-medium text-stone-700">Connect these findings to your life?</h3>
          <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
            Lurisa can save key insights from this research to your memories, goals, and projects.
          </p>
          <button className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors">
            Save to Lurisa
          </button>
        </div>
      )}
    </div>
  );
}
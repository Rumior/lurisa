# build-research-frontend.ps1
# Creates the Research section frontend for Lurisa

$projectRoot = "C:\Users\HP\Desktop\lurisa"
$ErrorActionPreference = "Continue"

function Write-ProjectFile($relativePath, $content) {
    $fullPath = Join-Path $projectRoot $relativePath
    try {
        $dir = Split-Path $fullPath -Parent
        if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
        $utf8 = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText($fullPath, $content, $utf8)
        Write-Host "  OK: $relativePath" -ForegroundColor Green
    } catch {
        Write-Host "  FAIL: $relativePath -> $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "=== BUILDING LURISA RESEARCH FRONTEND ===" -ForegroundColor Cyan

# ============================================================================
# 1. API Hook
# ============================================================================
Write-ProjectFile "src\hooks\use-research.ts" @'
"use client";

import { useState, useEffect, useCallback } from 'react';

export interface ResearchSession {
  id: string;
  query: string;
  objective?: string;
  depth: 'QUICK' | 'DEEP' | 'REPORT';
  status: 'PLANNING' | 'SEARCHING' | 'ANALYZING' | 'SYNTHESIZING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  completedAt?: string;
  recommendation?: string;
  personalInterpretation?: string;
  sources?: ResearchSource[];
  findings?: ResearchFinding[];
  contradictions?: ResearchContradiction[];
}

export interface ResearchSource {
  id: string;
  title: string;
  url: string;
  publisher?: string;
  author?: string;
  sourceType: 'PRIMARY' | 'SECONDARY' | 'TERTIARY';
  credibilityScore: number;
  relevanceScore: number;
  content?: string;
}

export interface ResearchFinding {
  id: string;
  category: string;
  finding: string;
  confidence: number;
  sourceIds: string[];
  personalRelevance?: string;
}

export interface ResearchContradiction {
  id: string;
  claimA: string;
  claimB: string;
  sourceAId: string;
  sourceBId: string;
  explanation: string;
}

export interface ResearchProgress {
  id: string;
  status: string;
  objective?: string;
  depth: string;
  progress: {
    sources: number;
    findings: number;
    contradictions: number;
  };
  completedAt?: string;
}

export function useResearchSessions() {
  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/research');
      if (!res.ok) throw new Error('Failed to fetch research sessions');
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return { sessions, loading, error, refetch: fetchSessions };
}

export function useResearchSession(sessionId: string | null) {
  const [session, setSession] = useState<ResearchSession | null>(null);
  const [loading, setLoading] = useState(!!sessionId);
  const [error, setError] = useState<string | null>(null);

  const fetchSession = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/research/${sessionId}`);
      if (!res.ok) throw new Error('Failed to fetch session');
      const data = await res.json();
      setSession(data.session);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  return { session, loading, error, refetch: fetchSession };
}

export function useResearchStatus(sessionId: string | null, pollInterval = 3000) {
  const [status, setStatus] = useState<ResearchProgress | null>(null);
  const [loading, setLoading] = useState(!!sessionId);

  useEffect(() => {
    if (!sessionId) return;
    
    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/research/${sessionId}/status`);
        if (!res.ok) return;
        const data = await res.json();
        setStatus(data);
        setLoading(false);
      } catch {
        // silent fail on polling
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, pollInterval);
    return () => clearInterval(interval);
  }, [sessionId, pollInterval]);

  return { status, loading };
}
'@

# ============================================================================
# 2. Research Progress Tracker
# ============================================================================
Write-ProjectFile "src\components\research\research-progress.tsx" @'
"use client";

import { CheckCircle, Circle, Loader2, AlertCircle } from "lucide-react";

interface ProgressStep {
  label: string;
  status: "complete" | "active" | "pending";
}

const RESEARCH_STEPS: Record<string, ProgressStep[]> = {
  PLANNING: [
    { label: "Understanding the research question", status: "complete" },
    { label: "Developing research strategy", status: "complete" },
    { label: "Searching primary sources", status: "active" },
    { label: "Searching market research", status: "pending" },
    { label: "Reviewing academic literature", status: "pending" },
    { label: "Cross-checking findings", status: "pending" },
    { label: "Writing synthesis", status: "pending" },
    { label: "Final verification", status: "pending" },
  ],
  SEARCHING: [
    { label: "Understanding the research question", status: "complete" },
    { label: "Developing research strategy", status: "complete" },
    { label: "Searching primary sources", status: "complete" },
    { label: "Searching market research", status: "active" },
    { label: "Reviewing academic literature", status: "pending" },
    { label: "Cross-checking findings", status: "pending" },
    { label: "Writing synthesis", status: "pending" },
    { label: "Final verification", status: "pending" },
  ],
  ANALYZING: [
    { label: "Understanding the research question", status: "complete" },
    { label: "Developing research strategy", status: "complete" },
    { label: "Searching primary sources", status: "complete" },
    { label: "Searching market research", status: "complete" },
    { label: "Reviewing academic literature", status: "complete" },
    { label: "Cross-checking findings", status: "active" },
    { label: "Writing synthesis", status: "pending" },
    { label: "Final verification", status: "pending" },
  ],
  SYNTHESIZING: [
    { label: "Understanding the research question", status: "complete" },
    { label: "Developing research strategy", status: "complete" },
    { label: "Searching primary sources", status: "complete" },
    { label: "Searching market research", status: "complete" },
    { label: "Reviewing academic literature", status: "complete" },
    { label: "Cross-checking findings", status: "complete" },
    { label: "Writing synthesis", status: "active" },
    { label: "Final verification", status: "pending" },
  ],
  COMPLETED: [
    { label: "Understanding the research question", status: "complete" },
    { label: "Developing research strategy", status: "complete" },
    { label: "Searching primary sources", status: "complete" },
    { label: "Searching market research", status: "complete" },
    { label: "Reviewing academic literature", status: "complete" },
    { label: "Cross-checking findings", status: "complete" },
    { label: "Writing synthesis", status: "complete" },
    { label: "Final verification", status: "complete" },
  ],
  FAILED: [
    { label: "Research failed", status: "active" },
  ],
};

export function ResearchProgressTracker({ status }: { status: string }) {
  const steps = RESEARCH_STEPS[status] || RESEARCH_STEPS.PLANNING;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-stone-600 uppercase tracking-wider">Research Progress</h3>
      <div className="space-y-2">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            {step.status === "complete" && <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />}
            {step.status === "active" && <Loader2 className="w-4 h-4 text-amber-500 animate-spin shrink-0" />}
            {step.status === "pending" && <Circle className="w-4 h-4 text-stone-300 shrink-0" />}
            <span className={`text-sm ${step.status === "complete" ? "text-stone-500" : step.status === "active" ? "text-stone-800 font-medium" : "text-stone-400"}`}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
'@

# ============================================================================
# 3. Source List Component
# ============================================================================
Write-ProjectFile "src\components\research\source-list.tsx" @'
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
'@

# ============================================================================
# 4. Findings Panel
# ============================================================================
Write-ProjectFile "src\components\research\findings-panel.tsx" @'
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
              {groupIdx + 1 < 10 ? `0${groupIdx + 1}` : groupIdx + 1} — {category}
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
'@

# ============================================================================
# 5. Contradictions Panel
# ============================================================================
Write-ProjectFile "src\components\research\contradictions-panel.tsx" @'
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
'@

# ============================================================================
# 6. Personal Interpretation Panel
# ============================================================================
Write-ProjectFile "src\components\research\personal-interpretation.tsx" @'
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
'@

# ============================================================================
# 7. Research Card (for list view)
# ============================================================================
Write-ProjectFile "src\components\research\research-card.tsx" @'
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
            {DEPTH_LABELS[session.depth]} · {new Date(session.createdAt).toLocaleDateString()}
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
'@

# ============================================================================
# 8. Research Detail View
# ============================================================================
Write-ProjectFile "src\components\research\research-detail.tsx" @'
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
              <span className="text-sm text-stone-400">·</span>
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
'@

# ============================================================================
# 9. Main Research Page
# ============================================================================
Write-ProjectFile "src\app\(dashboard)\research\page.tsx" @'
"use client";

import { useState } from "react";
import { BookOpen, Search, Loader2 } from "lucide-react";
import { useResearchSessions } from "@/hooks/use-research";
import { ResearchCard } from "@/components/research/research-card";
import { ResearchDetail } from "@/components/research/research-detail";

export default function ResearchPage() {
  const { sessions, loading, error } = useResearchSessions();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const activeSessions = sessions.filter((s) => s.status !== "COMPLETED" && s.status !== "FAILED");
  const completedSessions = sessions.filter((s) => s.status === "COMPLETED" || s.status === "FAILED");

  if (selectedSessionId) {
    return (
      <div className="p-6 md:p-8">
        <ResearchDetail
          sessionId={selectedSessionId}
          onBack={() => setSelectedSessionId(null)}
        />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="w-6 h-6 text-stone-700" />
          <h1 className="text-2xl font-semibold text-stone-900">Research</h1>
        </div>
        <p className="text-sm text-stone-500">
          Deep research that Lurisa conducts for you. Ask Lurisa to research anything in chat.
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-stone-400 animate-spin" />
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-8">
          {/* Active Research */}
          {activeSessions.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Active Research
              </h2>
              <div className="space-y-3">
                {activeSessions.map((session) => (
                  <ResearchCard
                    key={session.id}
                    session={session}
                    onClick={() => setSelectedSessionId(session.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Divider */}
          {activeSessions.length > 0 && completedSessions.length > 0 && (
            <div className="border-t border-stone-200" />
          )}

          {/* Previous Research */}
          {completedSessions.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Previous Research
              </h2>
              <div className="space-y-3">
                {completedSessions.map((session) => (
                  <ResearchCard
                    key={session.id}
                    session={session}
                    onClick={() => setSelectedSessionId(session.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {sessions.length === 0 && (
            <div className="text-center py-16">
              <Search className="w-8 h-8 text-stone-300 mx-auto mb-3" />
              <h3 className="text-sm font-medium text-stone-600">No research yet</h3>
              <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
                Ask Lurisa to research something in chat. For example: "Research the best countries for entrepreneurs"
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
'@

# ============================================================================
# 10. Component index
# ============================================================================
Write-ProjectFile "src\components\research\index.ts" @'
export { ResearchCard } from "./research-card";
export { ResearchDetail } from "./research-detail";
export { ResearchProgressTracker } from "./research-progress";
export { SourceList } from "./source-list";
export { FindingsPanel } from "./findings-panel";
export { ContradictionsPanel } from "./contradictions-panel";
export { PersonalInterpretation } from "./personal-interpretation";
'@

Write-Host ""
Write-Host "=== FRONTEND FILES CREATED ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next: Add 'Research' to your dashboard navigation." -ForegroundColor Yellow
Write-Host ""
Write-Host "Find your dashboard sidebar/nav component (likely in:" -ForegroundColor White
Write-Host "  src/components/dashboard/dashboard-shell.tsx" -ForegroundColor DarkGray
Write-Host "  or src/app/(dashboard)/layout.tsx" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Add this link alongside your other nav items:" -ForegroundColor White
Write-Host ""
Write-Host '  { label: "Research", href: "/research", icon: BookOpen }' -ForegroundColor Green
Write-Host ""
Write-Host "Then run: npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "The research page will be at: http://localhost:3000/research" -ForegroundColor White
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
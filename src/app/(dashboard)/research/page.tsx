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
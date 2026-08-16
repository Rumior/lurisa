"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, Clock, Shield, Newspaper, AlertTriangle, CheckCircle, HelpCircle, Bookmark, Microscope, ExternalLink, Sparkles, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface UpdateDetailProps {
  updateId: string;
  onBack: () => void;
}

interface FullUpdate {
  id: string;
  headline: string;
  summary: string;
  eventType: string;
  topics: string[];
  whatHappened: string;
  whatItMeans: string;
  whatIsUncertain?: string;
  whyItMattersToYou?: string;
  freshness: string;
  sourceCount: number;
  confidence: string;
  isDeveloping: boolean;
  contentType: string;
  sources: Array<{
    publisher?: string;
    url?: string;
    sourceType?: string;
    title?: string;
    author?: string;
    publicationDate?: string;
  }>;
  timeline?: any[];
  saved?: boolean;
}

export function UpdateDetail({ updateId, onBack }: UpdateDetailProps) {
  const [update, setUpdate] = useState<FullUpdate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [researching, setResearching] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/global-updates/${updateId}`)
      .then((res) => { if (!res.ok) throw new Error("Failed to load update"); return res.json(); })
      .then((data) => { if (!cancelled) { setUpdate(data); setSaved(data.saved || false); setLoading(false); } })
      .catch((err) => { if (!cancelled) { setError(err.message || "Failed to load update details"); setLoading(false); } });
    return () => { cancelled = true; };
  }, [updateId]);

  const handleSave = useCallback(async () => {
    if (saved) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/global-updates/${updateId}/save`, { method: "POST", headers: { "Content-Type": "application/json" } });
      if (res.ok) setSaved(true);
    } catch { } finally { setSaving(false); }
  }, [updateId, saved]);

  const handleResearch = useCallback(async () => {
    setResearching(true);
    try {
      const res = await fetch(`/api/global-updates/${updateId}/research`, { method: "POST", headers: { "Content-Type": "application/json" } });
      if (res.ok) {
        const data = await res.json();
        if (data.researchSessionId) window.location.href = `/research?session=${data.researchSessionId}`;
      }
    } catch { } finally { setResearching(false); }
  }, [updateId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onBack(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onBack]);

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto animate-fade-in">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="sm" onClick={onBack}><ChevronLeft className="w-4 h-4 mr-1" />Back</Button>
        </div>
        <Skeleton className="h-8 w-3/4 mb-4" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-5/6 mb-6" />
        <Skeleton className="h-32 w-full mb-4" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error || !update) {
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto">
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-4"><ChevronLeft className="w-4 h-4 mr-1" />Back</Button>
        <Card className="border-terracotta-200 dark:border-terracotta-800 bg-terracotta-50 dark:bg-terracotta-900/20">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-8 h-8 text-terracotta-500 mx-auto mb-2" aria-hidden="true" />
            <p className="text-sm text-charcoal-700 dark:text-parchment-200">{error || "Update not found"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isSponsored = update.contentType === "SPONSORED";
  const timeline = update.timeline || [];

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-charcoal-500 dark:text-parchment-400">
          <ChevronLeft className="w-4 h-4 mr-1" />Back to feed
        </Button>
        {isSponsored && (
          <Badge variant="outline" className="border-amber-400 text-amber-700 dark:border-amber-600 dark:text-amber-400 text-[10px]">
            <Sparkles className="w-3 h-3 mr-1" aria-hidden="true" />Sponsored
          </Badge>
        )}
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="secondary" className="text-[10px] uppercase tracking-wider font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-800 dark:text-indigo-300">
            {update.topics[0] || update.eventType}
          </Badge>
          {update.isDeveloping && (
            <Badge variant="outline" className="text-[10px] border-terracotta-300 text-terracotta-600 dark:border-terracotta-700 dark:text-terracotta-300">
              <AlertTriangle className="w-3 h-3 mr-1" aria-hidden="true" />Developing
            </Badge>
          )}
        </div>
        <h1 className="text-xl md:text-2xl font-semibold text-charcoal-900 dark:text-parchment-100 leading-tight mb-3">{update.headline}</h1>
        <div className="flex items-center gap-3 text-[11px] text-charcoal-300 dark:text-parchment-500">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" aria-hidden="true" />{update.freshness}</span>
          <span className="flex items-center gap-1"><Newspaper className="w-3 h-3" aria-hidden="true" />{update.sourceCount} sources</span>
          <span className={`flex items-center gap-1 font-medium ${
            update.confidence === "High"
              ? "text-sage-600 dark:text-sage-300"
              : update.confidence === "Medium"
              ? "text-amber-600 dark:text-amber-400"
              : "text-terracotta-500"
          }`}><Shield className="w-3 h-3" aria-hidden="true" />{update.confidence} confidence</span>
        </div>
      </div>

      <Card className="mb-6 border-parchment-700/20 dark:border-indigo-800/30 bg-parchment-100 dark:bg-indigo-900">
        <CardContent className="p-5">
          <p className="text-sm text-charcoal-700 dark:text-parchment-200 leading-relaxed font-medium">{update.summary}</p>
        </CardContent>
      </Card>

      <section className="mb-6">
        <h2 className="text-xs font-semibold text-charcoal-300 dark:text-parchment-400 uppercase tracking-widest mb-3">What happened</h2>
        <div className="text-sm text-charcoal-600 dark:text-parchment-300 leading-relaxed whitespace-pre-line">{update.whatHappened || update.summary}</div>
      </section>

      <section className="mb-6">
        <h2 className="text-xs font-semibold text-charcoal-300 dark:text-parchment-400 uppercase tracking-widest mb-3">What it means</h2>
        <div className="text-sm text-charcoal-600 dark:text-parchment-300 leading-relaxed whitespace-pre-line">{update.whatItMeans || "Lurisa is analyzing what this development means for the broader context."}</div>
      </section>

      {update.whyItMattersToYou && (
        <section className="mb-6">
          <Card className="border-sage-200 dark:border-sage-800 bg-sage-50 dark:bg-sage-900/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-sage-700 dark:text-sage-300 uppercase tracking-widest flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />Why it may matter to you
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-charcoal-700 dark:text-parchment-200 leading-relaxed">{update.whyItMattersToYou}</p>
            </CardContent>
          </Card>
        </section>
      )}

      {update.whatIsUncertain && (
        <section className="mb-6">
          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-widest flex items-center gap-2">
                <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />What is still uncertain
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-charcoal-700 dark:text-parchment-200 leading-relaxed">{update.whatIsUncertain}</p>
            </CardContent>
          </Card>
        </section>
      )}

      {timeline.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-charcoal-300 dark:text-parchment-400 uppercase tracking-widest mb-3">Timeline</h2>
          <div className="space-y-3">
            {timeline.map((item, idx) => (
              <div key={idx} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-indigo-400 dark:bg-indigo-500" />
                  {idx < timeline.length - 1 && <div className="w-px flex-1 bg-parchment-700/30 dark:bg-indigo-800/30 mt-1" />}
                </div>
                <div className="pb-3">
                  <p className="text-[11px] text-charcoal-300 dark:text-parchment-500 mb-0.5">{item.date || item.time}</p>
                  <p className="text-xs text-charcoal-700 dark:text-parchment-200">{item.event}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mb-8">
        <h2 className="text-xs font-semibold text-charcoal-300 dark:text-parchment-400 uppercase tracking-widest mb-3">Sources</h2>
        <div className="space-y-2">
          {update.sources?.map((source, idx) => (
            <a key={idx} href={source.url} target="_blank" rel="noopener noreferrer"
              className="flex items-start gap-3 p-3 rounded-lg border border-parchment-700/20 dark:border-indigo-800/30 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors group bg-parchment-100 dark:bg-indigo-900"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-charcoal-800 dark:text-parchment-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors truncate">{source.title || source.publisher || "Source"}</p>
                <p className="text-[11px] text-charcoal-300 dark:text-parchment-500 mt-0.5">
                  {source.publisher}
                  {source.author ? ` · ${source.author}` : ""}
                  {source.sourceType ? ` · ${source.sourceType}` : ""}
                </p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-charcoal-300 dark:text-parchment-500 shrink-0 mt-0.5" aria-hidden="true" />
            </a>
          ))}
          {(!update.sources || update.sources.length === 0) && (
            <p className="text-xs text-charcoal-300 dark:text-parchment-500 italic">Source details are being verified.</p>
          )}
        </div>
      </section>

      <div className="flex flex-col sm:flex-row gap-3 sticky bottom-6 z-10">
        <Button onClick={handleResearch} disabled={researching}
          className="flex-1 bg-indigo-500 hover:bg-indigo-700 text-white dark:bg-indigo-300 dark:hover:bg-indigo-200 dark:text-indigo-900">
          <Microscope className="w-4 h-4 mr-2" aria-hidden="true" />
          {researching ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Creating research...</> : "Research this further"}
        </Button>
        <Button onClick={handleSave} disabled={saving || saved} variant="outline"
          className="flex-1 border-sage-300 text-sage-700 hover:bg-sage-50 dark:border-sage-700 dark:text-sage-300 dark:hover:bg-sage-900/20">
          <Bookmark className={`w-4 h-4 mr-2 ${saved ? "fill-current" : ""}`} aria-hidden="true" />
          {saved ? "Saved to Lurisa" : saving ? "Saving..." : "Save to Lurisa"}
        </Button>
      </div>
    </div>
  );
}
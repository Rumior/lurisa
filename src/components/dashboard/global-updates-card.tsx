"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Globe, Lightbulb, ArrowRight, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardUpdate {
  id: string;
  headline: string;
  summary: string;
  eventType: string;
  topics: string[];
  freshness: string;
  sourceCount: number;
  confidence: string;
  isDeveloping: boolean;
}

export function GlobalUpdatesCard() {
  const [updates, setUpdates] = useState<DashboardUpdate[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/global-updates/dashboard")
      .then((res) => res.json())
      .then((data) => {
        setUpdates(data.updates || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("[GlobalUpdatesCard] Fetch error:", err);
        setUpdates([]);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <Card className="border-parchment-700/20 dark:border-indigo-800/30 journal-shadow flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-semibold text-charcoal-300 dark:text-parchment-300 uppercase tracking-widest">Global Updates</CardTitle>
            <Globe className="w-3.5 h-3.5 text-charcoal-300 dark:text-parchment-400" />
          </div>
        </CardHeader>
        <CardContent className="flex-1 space-y-3">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-4/6" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (!updates || updates.length === 0) {
    return (
      <Card className="border-parchment-700/20 dark:border-indigo-800/30 journal-shadow flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-semibold text-charcoal-300 dark:text-parchment-300 uppercase tracking-widest">Global Updates</CardTitle>
            <Globe className="w-3.5 h-3.5 text-charcoal-300 dark:text-parchment-400" />
          </div>
          <CardDescription className="text-xs text-charcoal-300 dark:text-parchment-400 mt-1">Personalized trends from the world</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-center text-center py-6">
          <Globe className="w-8 h-8 text-parchment-700 dark:text-indigo-700 mb-2" />
          <p className="text-sm text-charcoal-300 dark:text-parchment-400">Nothing significant yet.</p>
          <p className="text-xs text-charcoal-300/70 dark:text-parchment-400/70 mt-0.5">Check back soon for updates.</p>
        </CardContent>
        <CardFooter className="pt-0 pb-5">
          <Link href="/global-updates" className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-500 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200 transition-colors group">
            Explore updates<ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="border-parchment-700/20 dark:border-indigo-800/30 journal-shadow flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-semibold text-charcoal-300 dark:text-parchment-300 uppercase tracking-widest">Global Updates</CardTitle>
          <Globe className="w-3.5 h-3.5 text-charcoal-300 dark:text-parchment-400" />
        </div>
        <CardDescription className="text-xs text-charcoal-300 dark:text-parchment-400 mt-1">Personalized trends from the world</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="space-y-3">
          {updates.map((update) => (
            <Link key={update.id} href={`/global-updates?open=${update.id}`} className="block group">
              <div className="flex items-start gap-2">
                <Lightbulb className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-semibold text-charcoal-500 dark:text-parchment-300 uppercase tracking-wide">{update.topics[0] || update.eventType}</span>
                    {update.isDeveloping && (
                      <span className="text-[10px] font-bold text-terracotta-500 uppercase tracking-wider">Developing</span>
                    )}
                  </div>
                  <p className="text-xs text-charcoal-700 dark:text-parchment-100 leading-relaxed group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                    {update.headline}
                  </p>
                  <p className="text-[11px] text-charcoal-300 dark:text-parchment-400 mt-0.5 leading-relaxed line-clamp-2">
                    {update.summary}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-charcoal-300/70 dark:text-parchment-400/70">{update.freshness}</span>
                    <span className="text-[10px] text-charcoal-300/70 dark:text-parchment-400/70">·</span>
                    <span className="text-[10px] text-charcoal-300/70 dark:text-parchment-400/70">{update.sourceCount} sources</span>
                    <span className="text-[10px] text-charcoal-300/70 dark:text-parchment-400/70">·</span>
                    <span className={`text-[10px] font-medium ${
                      update.confidence === 'High' ? 'text-sage-600 dark:text-sage-300' :
                      update.confidence === 'Medium' ? 'text-amber-600 dark:text-amber-400' :
                      'text-terracotta-500'
                    }`}>{update.confidence} confidence</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
      <CardFooter className="pt-0 pb-5">
        <Link href="/global-updates" className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-500 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200 transition-colors group">
          Explore updates<ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </CardFooter>
    </Card>
  );
}
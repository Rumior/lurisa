"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Lightbulb, GitBranch, TrendingUp } from "lucide-react";

interface Pattern {
  pattern: string;
  frequency: number;
  category: string;
  confidence: number;
  examples: string[];
  suggestion: string;
}

interface CrossInsight {
  type: string;
  description: string;
  memoryIds: string[];
  confidence: number;
}

export function InsightsDashboard() {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [crossInsights, setCrossInsights] = useState<CrossInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInsights();
  }, []);

  async function fetchInsights() {
    try {
      const res = await fetch("/api/insights/patterns");
      if (res.ok) {
        const data = await res.json();
        setPatterns(data.patterns || []);
        setCrossInsights(data.crossInsights || []);
      }
    } catch (error) {
      console.error("Failed to fetch insights:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-serif text-indigo-500 dark:text-indigo-300">Insights</h1>
        <p className="text-charcoal-500 dark:text-parchment-300 mt-1">Patterns and connections lurisa has noticed</p>
      </div>

      {patterns.length === 0 && crossInsights.length === 0 && (
        <Card className="border-parchment-700/30">
          <CardContent className="py-12 text-center">
            <Lightbulb className="mx-auto h-8 w-8 text-charcoal-300 mb-3" />
            <p className="text-charcoal-500">Not enough data yet. Keep chatting and insights will appear here.</p>
          </CardContent>
        </Card>
      )}

      {patterns.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-charcoal-700 dark:text-parchment-100 flex items-center">
            <TrendingUp className="mr-2 h-5 w-5 text-indigo-500" />
            Detected Patterns
          </h2>
          <div className="grid gap-4">
            {patterns.map((p, i) => (
              <Card key={i} className="border-parchment-700/30">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-medium text-charcoal-700 dark:text-parchment-100">
                      {p.pattern}
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs">{p.frequency}×</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-charcoal-500 dark:text-parchment-300 mb-3">{p.suggestion}</p>
                  {p.examples.length > 0 && (
                    <div className="space-y-1">
                      {p.examples.map((ex, j) => (
                        <p key={j} className="text-xs text-charcoal-400 dark:text-charcoal-100 italic">"{ex}"</p>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {crossInsights.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-charcoal-700 dark:text-parchment-100 flex items-center">
            <GitBranch className="mr-2 h-5 w-5 text-indigo-500" />
            Cross-Memory Connections
          </h2>
          <div className="grid gap-4">
            {crossInsights.map((c, i) => (
              <Card key={i} className="border-parchment-700/30">
                <CardContent className="py-4">
                  <p className="text-sm text-charcoal-700 dark:text-parchment-100">{c.description}</p>
                  <p className="text-xs text-charcoal-400 mt-1">Confidence: {Math.round(c.confidence * 100)}%</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
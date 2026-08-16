"use client";

import { useCallback } from "react";
import { Clock, Shield, Newspaper, Sparkles, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FeedUpdate } from "@/hooks/use-global-updates";

interface UpdateCardProps {
  update: FeedUpdate;
  onClick: () => void;
}

export function UpdateCard({ update, onClick }: UpdateCardProps) {
  const isSponsored = update.contentType === "SPONSORED";
  const isRecommended = update.contentType === "RECOMMENDED";

  const handleMouseEnter = useCallback(() => {
    if (typeof window !== "undefined" && "fetch" in window) {
      fetch(`/api/global-updates/${update.id}`, { priority: "low" } as any).catch(() => {});
    }
  }, [update.id]);

  return (
    <Card
      className={`group cursor-pointer transition-all duration-200 hover:shadow-md border ${
        isSponsored
          ? "border-amber-300/50 dark:border-amber-700/50 bg-amber-50/30 dark:bg-amber-900/10"
          : "border-parchment-700/20 dark:border-indigo-800/30 bg-parchment-100 dark:bg-indigo-900"
      }`}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      role="article"
      aria-label={`${update.headline}. ${update.confidence} confidence. ${update.freshness}`}
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className={`text-[10px] uppercase tracking-wider font-semibold ${
              update.eventType === "AFRICA"
                ? "bg-sage-100 text-sage-700 dark:bg-sage-900 dark:text-sage-300"
                : update.eventType === "TECHNOLOGY"
                ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-800 dark:text-indigo-300"
                : update.eventType === "BUSINESS" || update.eventType === "MARKET"
                ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                : "bg-parchment-500/30 text-charcoal-500 dark:bg-indigo-800 dark:text-parchment-300"
            }`}>
              {update.topics[0] || update.eventType}
            </Badge>
            {update.isDeveloping && (
              <Badge variant="outline" className="text-[10px] border-terracotta-300 text-terracotta-600 dark:border-terracotta-700 dark:text-terracotta-300">
                <AlertTriangle className="w-3 h-3 mr-1" aria-hidden="true" /> Developing
              </Badge>
            )}
            {isSponsored && (
              <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-700 dark:border-amber-600 dark:text-amber-400">
                <Sparkles className="w-3 h-3 mr-1" aria-hidden="true" /> Sponsored
              </Badge>
            )}
            {isRecommended && (
              <Badge variant="outline" className="text-[10px] border-sage-300 text-sage-600 dark:border-sage-700 dark:text-sage-300">
                <Sparkles className="w-3 h-3 mr-1" aria-hidden="true" /> Recommended
              </Badge>
            )}
          </div>
        </div>

        <h3 className="text-sm font-semibold text-charcoal-900 dark:text-parchment-100 leading-snug mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
          {update.headline}
        </h3>

        <p className="text-xs text-charcoal-500 dark:text-parchment-400 leading-relaxed line-clamp-3 mb-3">
          {update.summary}
        </p>

        {update.whyItMattersToYou && (
          <div className="mb-3 p-2.5 rounded-lg bg-sage-50 dark:bg-sage-900/20 border border-sage-200 dark:border-sage-800">
            <p className="text-[11px] font-medium text-sage-700 dark:text-sage-300 mb-0.5">Why this may matter to you</p>
            <p className="text-[11px] text-charcoal-600 dark:text-parchment-400 leading-relaxed">{update.whyItMattersToYou}</p>
          </div>
        )}

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
      </CardContent>
    </Card>
  );
}
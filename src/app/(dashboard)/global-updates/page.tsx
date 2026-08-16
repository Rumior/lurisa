"use client";

import { useState, useEffect } from "react";
import { Globe, TrendingUp, MapPin, Cpu, Briefcase, Heart, Settings, Loader2 } from "lucide-react";
import { useGlobalUpdates } from "@/hooks/use-global-updates";
import { UpdateCard } from "@/components/global-updates/update-card";
import { UpdateDetail } from "@/components/global-updates/update-detail";
import { EmptyState } from "@/components/global-updates/empty-state";
import { InterestManager } from "@/components/global-updates/interest-manager";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const TABS = [
  { id: "for-you", label: "For You", icon: Globe },
  { id: "trending", label: "Trending", icon: TrendingUp },
  { id: "africa", label: "Africa", icon: MapPin },
  { id: "technology", label: "Technology", icon: Cpu },
  { id: "business", label: "Business", icon: Briefcase },
  { id: "interests", label: "Your Interests", icon: Heart },
];

export default function GlobalUpdatesPage() {
  const [activeTab, setActiveTab] = useState("for-you");
  const [selectedUpdateId, setSelectedUpdateId] = useState<string | null>(null);
  const [showInterestManager, setShowInterestManager] = useState(false);
  const { updates, loading, error, hasMore, page, setPage, trackOpen } = useGlobalUpdates(activeTab);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const openId = params.get("open");
    if (openId) {
      setSelectedUpdateId(openId);
      trackOpen(openId);
      window.history.replaceState({}, "", "/global-updates");
    }
  }, [trackOpen]);

  if (selectedUpdateId) {
    return <UpdateDetail updateId={selectedUpdateId} onBack={() => setSelectedUpdateId(null)} />;
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Globe className="w-6 h-6 text-indigo-500 dark:text-indigo-300" />
            <h1 className="text-2xl font-semibold text-charcoal-900 dark:text-parchment-100">Global Updates</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowInterestManager(true)}
            className="text-charcoal-300 dark:text-parchment-400 hover:text-indigo-600 dark:hover:text-indigo-300" title="Manage your interests">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-sm text-charcoal-300 dark:text-parchment-400">The world, filtered for what matters to you.</p>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-indigo-500 text-white dark:bg-indigo-300 dark:text-indigo-900"
                  : "text-charcoal-300 dark:text-parchment-400 hover:bg-parchment-500/30 dark:hover:bg-indigo-800/50"
              }`}
              aria-pressed={isActive}>
              <Icon className="w-3.5 h-3.5" aria-hidden="true" />{tab.label}
            </button>
          );
        })}
      </div>

      {loading && page === 1 && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl bg-parchment-500/20 dark:bg-indigo-800/30" />
          ))}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-terracotta-50 border border-terracotta-200 text-sm text-terracotta-700 dark:bg-terracotta-900/20 dark:border-terracotta-800 dark:text-terracotta-300">
          {error}
        </div>
      )}

      {!loading && !error && updates.length === 0 && <EmptyState tab={activeTab} />}

      {!loading && !error && updates.length > 0 && (
        <div className="space-y-4">
          {updates.map((update, index) => {
            const showSponsoredSlot = (index + 1) % 4 === 0 && index !== updates.length - 1;
            return (
              <div key={update.id}>
                <UpdateCard update={update} onClick={() => { setSelectedUpdateId(update.id); trackOpen(update.id); }} />
                {showSponsoredSlot && (
                  <div className="py-2">
                    <div className="flex items-center gap-2 px-1">
                      <div className="h-px flex-1 bg-parchment-700/20 dark:bg-indigo-800/30" />
                      <span className="text-[10px] uppercase tracking-widest text-charcoal-300 dark:text-parchment-500 font-medium">Sponsored</span>
                      <div className="h-px flex-1 bg-parchment-700/20 dark:bg-indigo-800/30" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={() => setPage(page + 1)} disabled={loading}
                className="text-xs border-parchment-700/30 dark:border-indigo-700/50 text-charcoal-500 dark:text-parchment-400">
                {loading ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Loading...</> : "Load more updates"}
              </Button>
            </div>
          )}
        </div>
      )}

      <InterestManager open={showInterestManager} onClose={() => setShowInterestManager(false)} />
    </div>
  );
}
"use client";

import { useState, useEffect, useCallback } from "react";

export interface FeedUpdate {
  id: string;
  headline: string;
  summary: string;
  eventType: string;
  topics: string[];
  whatHappened?: string;
  whatItMeans?: string;
  whyItMattersToYou?: string;
  whatIsUncertain?: string;
  freshness: string;
  sourceCount: number;
  confidence: string;
  isDeveloping: boolean;
  contentType: string;
  sources?: Array<{
    publisher?: string;
    url?: string;
    sourceType?: string;
    title?: string;
    author?: string;
    publicationDate?: string;
  }>;
}

interface UseGlobalUpdatesReturn {
  updates: FeedUpdate[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;
  setPage: (p: number) => void;
  refresh: () => void;
  trackOpen: (id: string) => void;
  trackSave: (id: string) => void;
  trackResearch: (id: string) => void;
}

export function useGlobalUpdates(tab: string, pageSize = 10): UseGlobalUpdatesReturn {
  const [updates, setUpdates] = useState<FeedUpdate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const fetchFeed = useCallback(
    async (pageNum: number, append = false) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/global-updates/feed?tab=${tab}&page=${pageNum}&pageSize=${pageSize}`);
        if (!res.ok) throw new Error("Failed to load updates");
        const data = await res.json();
        const newUpdates = data.updates || [];
        setUpdates((prev) => (append ? [...prev, ...newUpdates] : newUpdates));
        setHasMore(data.hasMore ?? false);
      } catch (err: any) {
        setError(err.message || "Unable to load updates right now. Please try again shortly.");
      } finally {
        setLoading(false);
      }
    },
    [tab, pageSize]
  );

  useEffect(() => {
    setPage(1);
    fetchFeed(1, false);
  }, [tab, fetchFeed]);

  useEffect(() => {
    if (page > 1) fetchFeed(page, true);
  }, [page, fetchFeed]);

  const refresh = useCallback(() => {
    setPage(1);
    fetchFeed(1, false);
  }, [fetchFeed]);

  const trackEvent = useCallback(async (event: string, eventId: string) => {
    try {
      await fetch("/api/global-updates/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event, eventId }),
      });
    } catch { }
  }, []);

  const trackOpen = useCallback((id: string) => trackEvent("open", id), [trackEvent]);
  const trackSave = useCallback((id: string) => trackEvent("save", id), [trackEvent]);
  const trackResearch = useCallback((id: string) => trackEvent("research", id), [trackEvent]);

  return { updates, loading, error, hasMore, page, setPage, refresh, trackOpen, trackSave, trackResearch };
}
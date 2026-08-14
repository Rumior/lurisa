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
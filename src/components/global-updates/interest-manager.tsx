"use client";

import { useState, useEffect } from "react";
import { X, Plus, Minus, EyeOff, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Interest {
  id: string;
  topic: string;
  weight: number;
  isFollowed: boolean;
  isHidden: boolean;
}

interface InterestManagerProps {
  open: boolean;
  onClose: () => void;
}

export function InterestManager({ open, onClose }: InterestManagerProps) {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTopic, setNewTopic] = useState("");

  useEffect(() => {
    if (!open) return;
    fetch("/api/global-updates/interests")
      .then((res) => res.json())
      .then((data) => setInterests(data.interests || []));
  }, [open]);

  const mutate = async (topic: string, action: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/global-updates/interests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, action }),
      });
      if (res.ok) {
        const data = await res.json();
        setInterests(data.interests || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const addTopic = async () => {
    if (!newTopic.trim()) return;
    await mutate(newTopic.trim(), "follow");
    setNewTopic("");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-parchment-100 dark:bg-indigo-900 rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col border border-parchment-700/20 dark:border-indigo-800/30">
        <div className="flex items-center justify-between p-4 border-b border-parchment-700/20 dark:border-indigo-800/30">
          <h2 className="text-sm font-semibold text-charcoal-900 dark:text-parchment-100">Your Interests</h2>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          <div className="flex gap-2 mb-4">
            <Input placeholder="Add a topic..." value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTopic()}
              className="text-xs h-8 bg-parchment-100 dark:bg-indigo-900 border-parchment-700/30 dark:border-indigo-700/50" />
            <Button size="sm" onClick={addTopic} disabled={loading}
              className="h-8 px-2 bg-indigo-500 hover:bg-indigo-700 text-white dark:bg-indigo-300 dark:hover:bg-indigo-200 dark:text-indigo-900">
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="space-y-2">
            {interests.map((interest) => (
              <div key={interest.id} className="flex items-center justify-between p-2 rounded-lg border border-parchment-700/20 dark:border-indigo-800/30 bg-parchment-100 dark:bg-indigo-900">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="secondary" className="text-[10px] shrink-0 bg-parchment-500/30 text-charcoal-600 dark:bg-indigo-800 dark:text-parchment-300">{interest.topic}</Badge>
                  <span className="text-[10px] text-charcoal-300 dark:text-parchment-500 truncate">
                    {interest.isFollowed ? "Following" : interest.isHidden ? "Hidden" : "Reduced"}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
                    onClick={() => mutate(interest.topic, interest.isFollowed ? "unfollow" : "follow")}
                    disabled={loading} title={interest.isFollowed ? "Unfollow" : "Follow"}>
                    {interest.isFollowed ? <Minus className="w-3 h-3" /> : <Heart className="w-3 h-3" />}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
                    onClick={() => mutate(interest.topic, interest.isHidden ? "unhide" : "hide")}
                    disabled={loading} title={interest.isHidden ? "Unhide" : "Hide"}>
                    <EyeOff className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
            {interests.length === 0 && (
              <p className="text-xs text-charcoal-300 dark:text-parchment-500 text-center py-4">No interests yet. Add topics that matter to you.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
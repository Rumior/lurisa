"use client";

import { ReactNode } from "react";
import { Globe, Search, MapPin, Cpu, Briefcase, Heart } from "lucide-react";

interface EmptyStateProps {
  tab: string;
}

export function EmptyState({ tab }: EmptyStateProps) {
  const configs: Record<string, { icon: ReactNode; title: string; message: string }> = {
    "for-you": {
      icon: <Globe className="w-8 h-8 text-parchment-700 dark:text-indigo-700" />,
      title: "Nothing significant yet",
      message: "Nothing significant has changed in your selected interests yet. Lurisa is continuously monitoring — check back soon.",
    },
    trending: {
      icon: <Search className="w-8 h-8 text-parchment-700 dark:text-indigo-700" />,
      title: "No trending updates",
      message: "Major developments are being verified. Trending stories appear once they meet Lurisa's significance threshold.",
    },
    africa: {
      icon: <MapPin className="w-8 h-8 text-parchment-700 dark:text-indigo-700" />,
      title: "No African updates right now",
      message: "Lurisa is monitoring African markets, policy, and culture. Updates will appear as significant events are verified.",
    },
    technology: {
      icon: <Cpu className="w-8 h-8 text-parchment-700 dark:text-indigo-700" />,
      title: "No technology updates",
      message: "Significant technology developments are being tracked. Check back as the landscape evolves.",
    },
    business: {
      icon: <Briefcase className="w-8 h-8 text-parchment-700 dark:text-indigo-700" />,
      title: "No business updates",
      message: "Market and business developments are being verified. Updates appear once corroborated by credible sources.",
    },
    interests: {
      icon: <Heart className="w-8 h-8 text-parchment-700 dark:text-indigo-700" />,
      title: "No updates for your interests",
      message: "You have not followed any topics yet, or no significant events match your interests. Explore and follow topics that matter to you.",
    },
  };

  const config = configs[tab] || configs["for-you"];

  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4 animate-fade-in">
      <div className="mb-3">{config.icon}</div>
      <h3 className="text-sm font-medium text-charcoal-700 dark:text-parchment-200 mb-1">{config.title}</h3>
      <p className="text-xs text-charcoal-300 dark:text-parchment-500 max-w-sm leading-relaxed">{config.message}</p>
    </div>
  );
}
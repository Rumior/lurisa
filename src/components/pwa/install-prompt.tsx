"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsVisible(false);
    setDeferredPrompt(null);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 bg-parchment-100 dark:bg-indigo-900 border border-parchment-700/30 rounded-lg shadow-lg p-4 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium text-charcoal-700 dark:text-parchment-100">Install lurisa</h3>
          <p className="text-sm text-charcoal-500 mt-1">Add to your home screen for quick access.</p>
        </div>
        <button onClick={() => setIsVisible(false)} className="text-charcoal-300 hover:text-charcoal-500">
          <X size={16} />
        </button>
      </div>
      <Button onClick={handleInstall} className="mt-3 w-full" size="sm">
        <Download size={16} className="mr-2" />
        Install
      </Button>
    </div>
  );
}
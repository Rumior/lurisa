'use client';

import { useEffect, useRef } from 'react';
import { ChatInterface } from '@/components/dashboard/chat-interface';

export default function ChatPage() {
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.innerWidth >= 1024) return;

    const el = chatRef.current;
    if (!el) return;

    const resize = () => {
      const vv = window.visualViewport;
      const h = vv ? vv.height : window.innerHeight;
      el.style.height = `${h - 64}px`;
    };

    resize();
    window.visualViewport?.addEventListener('resize', resize);
    return () => window.visualViewport?.removeEventListener('resize', resize);
  }, []);

  return (
    <>
      <div
        ref={chatRef}
        className="lg:hidden fixed top-16 left-0 right-0 z-20 h-[calc(100dvh-4rem)] flex flex-col bg-parchment-300 dark:bg-parchment-900"
      >
        <ChatInterface />
      </div>
      <div className="hidden lg:block h-[calc(100vh-4rem)]">
        <ChatInterface />
      </div>
    </>
  );
}

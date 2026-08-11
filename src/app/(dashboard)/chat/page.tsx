'use client';

import { useEffect, useRef } from 'react';
import { ChatInterface } from '@/components/dashboard/chat-interface';

export default function ChatPage() {
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.innerWidth >= 1024) return;

    const el = chatRef.current;
    if (!el) return;

    const setHeight = () => {
      const vv = window.visualViewport;
      const visible = vv ? vv.height : window.innerHeight;
      el.style.height = `${visible - 64}px`;
    };

    setHeight();
    window.visualViewport?.addEventListener('resize', setHeight);

    return () => {
      window.visualViewport?.removeEventListener('resize', setHeight);
    };
  }, []);

  return (
    <>
      {/* MOBILE: Completely separate fixed container for chat */}
      <div
        ref={chatRef}
        className="lg:hidden fixed top-16 left-0 right-0 flex flex-col bg-parchment-300 dark:bg-parchment-900"
      >
        <ChatInterface />
      </div>

      {/* DESKTOP: Normal flow */}
      <div className="hidden lg:block h-[calc(100vh-8rem)]">
        <ChatInterface />
      </div>
    </>
  );
}

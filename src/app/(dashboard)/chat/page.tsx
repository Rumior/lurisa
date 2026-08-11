'use client';

import { useEffect } from 'react';
import { ChatInterface } from '@/components/dashboard/chat-interface';

export default function ChatPage() {
  useEffect(() => {
    // On mobile: lock body scroll so the browser CANNOT scroll the page
    // This keeps the header completely frozen at the top
    const isMobile = window.innerWidth < 1024;
    if (!isMobile) return;

    const html = document.documentElement;
    const body = document.body;
    const origHtml = html.style.overflow;
    const origBody = body.style.overflow;

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';

    return () => {
      html.style.overflow = origHtml;
      body.style.overflow = origBody;
    };
  }, []);

  return (
    <>
      {/* MOBILE: Completely detached fixed layer below header */}
      <div className="lg:hidden fixed top-16 left-0 right-0 bottom-0 flex flex-col bg-parchment-300 dark:bg-parchment-900">
        <ChatInterface />
      </div>

      {/* DESKTOP: Normal flow inside main */}
      <div className="hidden lg:block h-[calc(100vh-8rem)]">
        <ChatInterface />
      </div>
    </>
  );
}

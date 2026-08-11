'use client';

import { useEffect } from 'react';
import { ChatInterface } from '@/components/dashboard/chat-interface';

export default function ChatPage() {
  useEffect(() => {
    // Only on mobile: lock body scroll so only messages scroll
    const isMobile = window.innerWidth < 1024;
    if (!isMobile) return;

    const html = document.documentElement;
    const body = document.body;
    const originalHtmlOverflow = html.style.overflow;
    const originalBodyOverflow = body.style.overflow;
    const originalBodyHeight = body.style.height;

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.height = '100%';

    return () => {
      html.style.overflow = originalHtmlOverflow;
      body.style.overflow = originalBodyOverflow;
      body.style.height = originalBodyHeight;
    };
  }, []);

  return (
    <>
      {/* Mobile: fixed container fills viewport below header */}
      <div className="lg:hidden fixed top-16 left-0 right-0 bottom-0 flex flex-col">
        <ChatInterface />
      </div>
      
      {/* Desktop: normal flow */}
      <div className="hidden lg:block h-[calc(100vh-8rem)]">
        <ChatInterface />
      </div>
    </>
  );
}

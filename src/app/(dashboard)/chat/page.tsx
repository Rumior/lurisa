'use client';

import { useEffect, useRef } from 'react';
import { ChatInterface } from '@/components/dashboard/chat-interface';

export default function ChatPage() {
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.innerWidth >= 1024) return;

    const el = chatRef.current;
    if (!el) return;

    const html = document.documentElement;
    const body = document.body;

    const orig = {
      htmlOverflow: html.style.overflow,
      htmlHeight: html.style.height,
      bodyOverflow: body.style.overflow,
      bodyHeight: body.style.height,
    };

    // dvh shrinks with keyboard so body never exceeds visible area
    html.style.overflow = 'hidden';
    html.style.height = '100dvh';
    body.style.overflow = 'hidden';
    body.style.height = '100dvh';

    const resize = () => {
      const vv = window.visualViewport;
      const h = vv ? vv.height : window.innerHeight;
      el.style.height = `${Math.max(h - 64, 0)}px`;
      window.scrollTo(0, 0);
    };

    // Nuclear: prevent ALL touchmove outside the message list
    const preventScroll = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-scroll-area]')) return;
      e.preventDefault();
    };

    resize();
    window.visualViewport?.addEventListener('resize', resize);
    window.visualViewport?.addEventListener('scroll', resize);
    document.addEventListener('touchmove', preventScroll, { passive: false });

    return () => {
      window.visualViewport?.removeEventListener('resize', resize);
      window.visualViewport?.removeEventListener('scroll', resize);
      document.removeEventListener('touchmove', preventScroll);

      html.style.overflow = orig.htmlOverflow;
      html.style.height = orig.htmlHeight;
      body.style.overflow = orig.bodyOverflow;
      body.style.height = orig.bodyHeight;
    };
  }, []);

  return (
    <>
      <div
        ref={chatRef}
        className="lg:hidden fixed top-16 left-0 right-0 z-20 flex flex-col bg-parchment-300 dark:bg-parchment-900"
      >
        <ChatInterface />
      </div>
      <div className="hidden lg:block h-[calc(100vh-4rem)]">
        <ChatInterface />
      </div>
    </>
  );
}

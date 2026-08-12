'use client';

import { useEffect, useRef } from 'react';
import { ChatInterface } from '@/components/chat/chat-interface';

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
      bodyOverflow: body.style.overflow,
    };

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';

    const resize = () => {
      const vv = window.visualViewport;
      const h = vv ? vv.height : window.innerHeight;
      el.style.height = `${Math.max(h - 64, 0)}px`;
      el.style.bottom = '';
      window.scrollTo(0, 0);
    };

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
      body.style.overflow = orig.bodyOverflow;
      el.style.height = '';
      el.style.bottom = '';
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

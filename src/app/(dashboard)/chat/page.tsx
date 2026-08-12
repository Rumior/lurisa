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
      htmlOverscroll: (html.style as any).overscrollBehavior,
      htmlHeight: html.style.height,
      htmlPosition: html.style.position,
      bodyOverflow: body.style.overflow,
      bodyOverscroll: (body.style as any).overscrollBehavior,
      bodyTouchAction: (body.style as any).touchAction,
      bodyHeight: body.style.height,
      bodyPosition: body.style.position,
    };

    html.style.position = 'fixed';
    html.style.inset = '0';
    html.style.overflow = 'hidden';
    html.style.height = '100%';
    (html.style as any).overscrollBehavior = 'none';

    body.style.position = 'fixed';
    body.style.inset = '0';
    body.style.overflow = 'hidden';
    body.style.height = '100%';
    (body.style as any).overscrollBehavior = 'none';
    (body.style as any).touchAction = 'none';

    const resize = () => {
      const vv = window.visualViewport;
      const h = vv ? vv.height : window.innerHeight;
      el.style.height = `${Math.max(h - 64, 0)}px`;
    };

    resize();
    window.visualViewport?.addEventListener('resize', resize);
    window.visualViewport?.addEventListener('scroll', resize);
    window.addEventListener('resize', resize);

    return () => {
      window.visualViewport?.removeEventListener('resize', resize);
      window.visualViewport?.removeEventListener('scroll', resize);
      window.removeEventListener('resize', resize);

      html.style.overflow = orig.htmlOverflow;
      (html.style as any).overscrollBehavior = orig.htmlOverscroll;
      html.style.height = orig.htmlHeight;
      html.style.position = orig.htmlPosition;
      html.style.inset = '';

      body.style.overflow = orig.bodyOverflow;
      (body.style as any).overscrollBehavior = orig.bodyOverscroll;
      (body.style as any).touchAction = orig.bodyTouchAction;
      body.style.height = orig.bodyHeight;
      body.style.position = orig.bodyPosition;
      body.style.inset = '';
    };
  }, []);

  return (
    <>
      <div
        ref={chatRef}
        className="lg:hidden fixed top-16 left-0 right-0 z-20 flex flex-col bg-parchment-300 dark:bg-parchment-900 overscroll-none"
      >
        <ChatInterface />
      </div>
      <div className="hidden lg:block h-[calc(100vh-4rem)]">
        <ChatInterface />
      </div>
    </>
  );
}

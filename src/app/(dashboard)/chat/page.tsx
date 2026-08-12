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

    // Save originals
    const orig = {
      htmlOverflow: html.style.overflow,
      htmlHeight: html.style.height,
      htmlPosition: html.style.position,
      bodyOverflow: body.style.overflow,
      bodyHeight: body.style.height,
      bodyPosition: body.style.position,
      bodyTouchAction: body.style.touchAction,
    };

    // Nuclear lock: freeze the layout viewport to the visual viewport
    html.style.position = 'fixed';
    html.style.inset = '0';
    html.style.overflow = 'hidden';
    html.style.height = '100%';
    body.style.position = 'fixed';
    body.style.inset = '0';
    body.style.overflow = 'hidden';
    body.style.height = '100%';
    body.style.touchAction = 'none';

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
      html.style.height = orig.htmlHeight;
      html.style.position = orig.htmlPosition;
      html.style.inset = '';
      body.style.overflow = orig.bodyOverflow;
      body.style.height = orig.bodyHeight;
      body.style.position = orig.bodyPosition;
      body.style.inset = '';
      body.style.touchAction = orig.bodyTouchAction;
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

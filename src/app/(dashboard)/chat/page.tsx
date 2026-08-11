'use client';

import { useEffect, useRef } from 'react';
import { ChatInterface } from '@/components/dashboard/chat-interface';

export default function ChatPage() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.innerWidth >= 1024) return;

    const el = ref.current;
    if (!el) return;

    const setHeight = () => {
      const vv = window.visualViewport;
      const h = vv ? vv.height : window.innerHeight;
      el.style.height = `${h - 64}px`;
    };

    setHeight();
    requestAnimationFrame(setHeight);
    window.visualViewport?.addEventListener('resize', setHeight);

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    return () => {
      window.visualViewport?.removeEventListener('resize', setHeight);
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <>
      <div 
        ref={ref}
        className="lg:hidden fixed top-16 left-0 right-0 flex flex-col bg-parchment-300 dark:bg-parchment-900"
      >
        <ChatInterface />
      </div>
      <div className="hidden lg:block h-[calc(100vh-8rem)]">
        <ChatInterface />
      </div>
    </>
  );
}

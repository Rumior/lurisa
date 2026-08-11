'use client';

import { useEffect } from 'react';
import { ChatInterface } from '@/components/dashboard/chat-interface';

export default function ChatPage() {
  useEffect(() => {
    const setHeight = () => {
      const vv = window.visualViewport;
      const h = vv ? vv.height : window.innerHeight;
      document.documentElement.style.setProperty('--chat-visible-height', `${h - 64}px`);
    };

    setHeight();
    window.visualViewport?.addEventListener('resize', setHeight);
    return () => window.visualViewport?.removeEventListener('resize', setHeight);
  }, []);

  return (
    <>
      <div className="lg:hidden" style={{ position: 'fixed', top: 64, left: 0, right: 0, height: 'var(--chat-visible-height)', display: 'flex', flexDirection: 'column' }}>
        <ChatInterface />
      </div>
      <div className="hidden lg:block h-[calc(100vh-8rem)]">
        <ChatInterface />
      </div>
    </>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { ChatInterface } from '@/components/dashboard/chat-interface';

export default function ChatPage() {
  const [height, setHeight] = useState('calc(100vh - 64px)');

  useEffect(() => {
    const update = () => {
      const vv = window.visualViewport;
      const h = vv ? vv.height : window.innerHeight;
      setHeight(`${h - 64}px`);
    };
    
    update();
    window.visualViewport?.addEventListener('resize', update);
    return () => window.visualViewport?.removeEventListener('resize', update);
  }, []);

  return (
    <>
      {/* Mobile: fixed overlay that shrinks when keyboard opens */}
      <div 
        className="lg:hidden bg-parchment-300 dark:bg-parchment-900" 
        style={{ position: 'fixed', top: 64, left: 0, right: 0, height, zIndex: 10 }}
      >
        <ChatInterface />
      </div>
      
      {/* Desktop: normal flow inside main */}
      <div className="hidden lg:block h-full">
        <ChatInterface />
      </div>
    </>
  );
}

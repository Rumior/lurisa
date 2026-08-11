'use client';

import { ChatInterface } from '@/components/dashboard/chat-interface';
import { useEffect } from 'react';

export default function ChatPage() {
  useEffect(() => {
    const setVH = () => {
      const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      document.documentElement.style.setProperty('--vvh', `${vh}px`);
    };

    setVH();
    window.visualViewport?.addEventListener('resize', setVH);
    window.addEventListener('resize', setVH);
    
    return () => {
      window.visualViewport?.removeEventListener('resize', setVH);
      window.removeEventListener('resize', setVH);
    };
  }, []);

  return (
    <div className="chat-page-container">
      <ChatInterface />
    </div>
  );
}

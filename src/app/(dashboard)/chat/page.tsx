'use client';

import { useEffect } from 'react';
import { ChatInterface } from '@/components/dashboard/chat-interface';

export default function ChatPage() {
  // Nuclear autofocus: runs after every render
  useEffect(() => {
    const tryFocus = () => {
      const el = document.querySelector('textarea');
      if (el) el.focus();
    };
    tryFocus();
    const interval = setInterval(tryFocus, 500);
    return () => clearInterval(interval);
  }, []);

  return <ChatInterface />;
}
'use client';

import { ChatInterface } from '@/components/dashboard/chat-interface';

export default function ChatPage() {
  return (
    <div className="fixed top-16 left-0 right-0 h-[calc(100dvh-4rem)] lg:static lg:h-[calc(100vh-8rem)] flex flex-col z-10">
      <ChatInterface />
    </div>
  );
}

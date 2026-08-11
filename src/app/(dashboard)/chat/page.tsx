'use client';

import { ChatInterface } from '@/components/dashboard/chat-interface';

export default function ChatPage() {
  return (
    <div className="h-[calc(100dvh-4rem)] lg:h-[calc(100vh-2rem)] flex flex-col -mx-4 sm:-mx-6 lg:mx-0">
      <ChatInterface />
    </div>
  );
}

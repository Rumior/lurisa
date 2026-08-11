'use client';

import { ChatInterface } from '@/components/dashboard/chat-interface';

export default function ChatPage() {
  return (
    <div className="fixed top-16 left-0 right-0 bottom-0 lg:static lg:h-auto">
      <ChatInterface />
    </div>
  );
}

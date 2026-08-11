'use client';

import { ChatInterface } from '@/components/dashboard/chat-interface';

export default function ChatPage() {
  return (
    <div className="fixed inset-x-0 bottom-0 top-16 lg:static lg:h-full flex flex-col overflow-hidden">
      <ChatInterface />
    </div>
  );
}

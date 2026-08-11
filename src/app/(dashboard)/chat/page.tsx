'use client';

import { ChatInterface } from '@/components/dashboard/chat-interface';

export default function ChatPage() {
  return (
    <>
      {/* Mobile: fixed container that shrinks when keyboard opens */}
      <div className="lg:hidden fixed top-16 left-0 right-0 bottom-0 flex flex-col">
        <ChatInterface />
      </div>
      
      {/* Desktop: normal flow inside main */}
      <div className="hidden lg:block h-[calc(100vh-8rem)]">
        <ChatInterface />
      </div>
    </>
  );
}

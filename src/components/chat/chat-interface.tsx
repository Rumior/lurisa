'use client';

import { useState, useRef, useEffect } from 'react';
import { ChatMessageList } from './message-list';
import { ChatInput } from './chat-input';
import { TypingIndicator } from './typing-indicator';

interface Message {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: string;
}

interface ChatInterfaceProps {
  userId: string;
}

const SUGGESTIONS = [
  "What's been on your mind recently?",
  "Tell me about something you're looking forward to.",
  "What made today meaningful?",
  "How are you feeling right now?",
];

export function ChatInterface({ userId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  async function sendMessage(content: string) {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'USER',
      content,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const history = messages.slice(-10).map((m) => ({
        role: m.role.toLowerCase() as 'user' | 'assistant',
        content: m.content,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          conversationId,
          history,
        }),
      });

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error.message || 'Failed to get response');
      }

      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'ASSISTANT',
        content: data.response,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'ASSISTANT',
        content: "I'm having a little trouble right now. Could you try again in a moment?",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  }

  function onSuggestion(suggestion: string) {
    sendMessage(suggestion);
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-5rem)] lg:h-full max-w-3xl mx-auto">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="space-y-4">
            <div className="text-center space-y-2 py-8">
              <h2 className="text-xl font-serif text-indigo-500 dark:text-indigo-300">
                Good to see you
              </h2>
              <p className="text-charcoal-500 dark:text-parchment-300 text-sm">
                lurisa remembers what matters. Start a conversation.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => onSuggestion(suggestion)}
                  tabIndex={-1}
                  className="text-left px-4 py-3 rounded-lg border border-parchment-700/30 bg-parchment-100 hover:bg-parchment-500 hover:border-parchment-700 transition-colors text-sm text-charcoal-500 dark:text-parchment-300"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <ChatMessageList messages={messages} />
        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-parchment-700/30 bg-parchment-100/50 dark:bg-indigo-900/50 px-4 py-4">
        <ChatInput onSend={sendMessage} disabled={isTyping} />
      </div>
    </div>
  );
}


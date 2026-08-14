'use client';

import { useState, useRef, useEffect } from 'react';

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now() + '-' + Math.random().toString(36).slice(2, 11);
}
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
  userId?: string;
}

const SUGGESTIONS = [];

export function ChatInterface({ userId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.innerWidth >= 1024) return;

    const el = chatContainerRef.current;
    if (!el) return;

    const html = document.documentElement;
    const body = document.body;
    const origHtml = html.style.overflow;
    const origBody = body.style.overflow;

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';

    const resize = () => {
      const vv = window.visualViewport;
      const h = vv ? vv.height : window.innerHeight;
      el.style.height = `${Math.max(h - 64, 0)}px`;
      window.scrollTo(0, 0);
    };

    const preventScroll = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-scroll-area]')) return;
      e.preventDefault();
    };

    resize();
    window.visualViewport?.addEventListener('resize', resize);
    window.visualViewport?.addEventListener('scroll', resize);
    document.addEventListener('touchmove', preventScroll, { passive: false });

    return () => {
      window.visualViewport?.removeEventListener('resize', resize);
      window.visualViewport?.removeEventListener('scroll', resize);
      document.removeEventListener('touchmove', preventScroll);
      html.style.overflow = origHtml;
      body.style.overflow = origBody;
      el.style.height = '';
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    let active = true;

    async function init() {
      try {
        const savedId = localStorage.getItem('lurisa-conversation-id');
        if (savedId) {
          const res = await fetch(`/api/conversations/${savedId}`);
          const data = await res.json();
          if (!active) return;

          if (data.conversation?.messages?.length) {
            setConversationId(savedId);
            setMessages(data.conversation.messages.map((m: any) => ({
              id: m.id,
              role: m.role.toUpperCase() as 'USER' | 'ASSISTANT',
              content: m.content,
              createdAt: m.createdAt,
            })));
          } else {
            localStorage.removeItem('lurisa-conversation-id');
          }
        }
      } catch (err) {
        console.error('Failed to load conversation:', err);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    init();
    return () => { active = false; };
  }, []);

  // Proactive conversation starter polling
  useEffect(() => {
    let active = true;

    async function checkProactive() {
      try {
        const res = await fetch('/api/chat/proactive');
        const data = await res.json();
        if (!active || !data.message) return;

        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });

        setConversationId((prev) => {
          if (prev) return prev;
          if (data.conversationId) {
            localStorage.setItem('lurisa-conversation-id', data.conversationId);
            return data.conversationId;
          }
          return prev;
        });
      } catch (err) {
        // Silent fail
      }
    }

    checkProactive();
    const interval = setInterval(checkProactive, 5 * 60 * 1000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  async function sendMessage(content: string) {
    const userMessage: Message = {
      id: generateId(),
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
        }),
      });

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error.message || 'Failed to get response');
      }

      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
        localStorage.setItem('lurisa-conversation-id', data.conversationId);
      }

      const assistantMessage: Message = {
        id: generateId(),
        role: 'ASSISTANT',
        content: data.response,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: generateId(),
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

  // Prevent hydration mismatch: render nothing until client mount
  if (!mounted) {
    return (
    <div ref={chatContainerRef} className="flex flex-col h-full max-w-3xl mx-auto">
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-6 space-y-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto">
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-6 space-y-6">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
          </div>
        )}

        {messages.length === 0 && !isLoading && (
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

      <div className="flex-shrink-0 border-t border-parchment-700/30 bg-parchment-100/50 dark:bg-indigo-900/50 px-4 pt-4 pb-6">
        <ChatInput onSend={sendMessage} disabled={isTyping || isLoading} />
      </div>
    </div>
  );
}


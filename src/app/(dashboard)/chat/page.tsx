'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, Sparkles, Sunrise, Sunset } from 'lucide-react';
import { ChatInterface } from '@/components/dashboard/chat-interface';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (window.innerWidth >= 1024) return;
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const vv = window.visualViewport;
      const visible = vv ? vv.height : window.innerHeight;
      el.style.height = `${visible - 64}px`;
    };
    update();
    window.visualViewport?.addEventListener('resize', update);
    return () => window.visualViewport?.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const listRes = await fetch('/api/conversations');
        if (!listRes.ok) return;
        const listData = await listRes.json();
        const conversations = listData.conversations || [];
        if (conversations.length > 0) {
          const convRes = await fetch(`/api/conversations/${conversations[0].id}`);
          if (convRes.ok) {
            const convData = await convRes.json();
            const loaded = (convData.conversation.messages || []).map((m: any) => ({
              id: m.id,
              role: m.role.toLowerCase() as 'user' | 'assistant',
              content: m.content,
            }));
            setMessages(loaded);
            setCurrentConversationId(conversations[0].id);
            return;
          }
        }
        const res = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'New Chat' }),
        });
        if (res.ok) {
          const data = await res.json();
          setCurrentConversationId(data.conversation.id);
        }
      } catch (error) {
        console.error('Failed to load conversation:', error);
      }
    }
    load();
  }, []);

  async function handleSend() {
    if (!input.trim() || isLoading) return;
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    const history = messages.slice(-8).map((m) => ({
      role: m.role,
      content: m.content,
    }));
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          conversationId: currentConversationId,
          history,
        }),
      });
      if (!res.ok) throw new Error('Failed to get response');
      const data = await res.json();
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response || 'I hear you. Tell me more.',
      };
      setMessages((prev) => [...prev, assistantMessage]);
      if (data.conversationId && !currentConversationId) {
        setCurrentConversationId(data.conversationId);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'I apologize, but I encountered an issue. Could you try again?',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      {/* MOBILE: ONE fixed container. Header is separate in shell. */}
      <div
        ref={containerRef}
        className="lg:hidden fixed top-16 left-0 right-0 flex flex-col bg-parchment-300 dark:bg-parchment-900"
      >
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-2 min-h-0">
          <div className="flex items-center space-x-3 py-2 border-b border-parchment-700/20 mb-2">
            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-indigo-500" />
            </div>
            <div>
              <h2 className="font-serif text-sm font-medium text-indigo-500 dark:text-indigo-300">Chat with lurisa</h2>
              <p className="text-xs text-charcoal-500 dark:text-parchment-300">Share what is on your mind</p>
            </div>
          </div>

          <div className="space-y-3">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-indigo-500" />
                </div>
                <div>
                  <h3 className="font-serif text-indigo-500 dark:text-indigo-300 mb-1">Start a conversation</h3>
                  <p className="text-xs text-charcoal-500 dark:text-parchment-300">I am here to listen and remember.</p>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-indigo-500 text-parchment-100 rounded-br-md'
                      : 'bg-parchment-100 dark:bg-indigo-900 text-charcoal-700 dark:text-parchment-100 border border-parchment-700/20 rounded-bl-md'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-parchment-100 dark:bg-indigo-900 border border-parchment-700/20 rounded-2xl rounded-bl-md px-4 py-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-charcoal-300" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="shrink-0 flex items-end space-x-2 px-4 py-2 border-t border-parchment-700/20 bg-parchment-100 dark:bg-indigo-900">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="min-h-[40px] max-h-[80px] bg-transparent resize-none py-2 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 flex-1"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="h-10 w-10 shrink-0 p-0"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* DESKTOP */}
      <div className="hidden lg:block h-[calc(100vh-8rem)]">
        <ChatInterface />
      </div>
    </>
  );
}

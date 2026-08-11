'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, Sparkles, Sunrise, Sunset } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatInterfaceProps {
  mode?: 'chat' | 'morning' | 'evening';
}

export function ChatInterface({ mode = 'chat' }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMostRecentConversation();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  async function loadMostRecentConversation() {
    try {
      const listRes = await fetch('/api/conversations');
      if (!listRes.ok) return;
      const listData = await listRes.json();
      const conversations = listData.conversations || [];

      if (conversations.length > 0) {
        const mostRecent = conversations[0];
        const convRes = await fetch(`/api/conversations/${mostRecent.id}`);
        if (convRes.ok) {
          const convData = await convRes.json();
          const loaded = (convData.conversation.messages || []).map((m: any) => ({
            id: m.id,
            role: m.role.toLowerCase() as 'user' | 'assistant',
            content: m.content,
          }));
          setMessages(loaded);
          setCurrentConversationId(mostRecent.id);
          return;
        }
      }

      await createNewConversation();
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  }

  async function createNewConversation() {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat' }),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentConversationId(data.conversation.id);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  }

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
      console.error('Chat error:', error);
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

  const modeConfig = {
    chat: { icon: <Sparkles className="h-5 w-5" />, title: 'Chat with lurisa', subtitle: 'Share what is on your mind' },
    morning: { icon: <Sunrise className="h-5 w-5 text-amber-500" />, title: 'Morning Check-in', subtitle: 'How are you feeling today?' },
    evening: { icon: <Sunset className="h-5 w-5 text-terracotta-500" />, title: 'Evening Reflection', subtitle: 'What did today teach you?' },
  };

  const config = modeConfig[mode];

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto">
      {/* Header info - compact, no wasted space */}
      <div className="shrink-0 flex items-center space-x-3 px-4 py-2 border-b border-parchment-700/20">
        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
          {config.icon}
        </div>
        <div>
          <h2 className="font-serif text-sm font-medium text-indigo-500 dark:text-indigo-300">{config.title}</h2>
          <p className="text-xs text-charcoal-500 dark:text-parchment-300">{config.subtitle}</p>
        </div>
      </div>

      {/* Messages - scrollable, takes all remaining space */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3 min-h-0">
        {messages.length === 0 ? (
          <EmptyChatState mode={mode} onSuggestion={(text) => setInput(text)} />
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-indigo-500 text-parchment-100 rounded-br-md'
                    : 'bg-parchment-100 dark:bg-indigo-900 text-charcoal-700 dark:text-parchment-100 border border-parchment-700/20 rounded-bl-md'
                }`}
              >
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

      {/* Input - sits flush at the bottom, no gaps */}
      <div className="shrink-0 flex items-end space-x-2 px-4 py-2 border-t border-parchment-700/20 bg-parchment-100/50 dark:bg-indigo-900/50">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          className="min-h-[44px] max-h-[120px] bg-parchment-100 resize-none py-2.5"
          disabled={isLoading}
        />
        <Button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className="h-[44px] w-[44px] shrink-0 p-0"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

function EmptyChatState({ mode, onSuggestion }: { mode: string; onSuggestion: (text: string) => void }) {
  const suggestions: Record<string, string[]> = {
    chat: [],
    morning: ['I slept well, ready for the day', 'Feeling a bit anxious about today', 'Excited about my meeting later', 'Just taking it slow this morning'],
    evening: ['Today was productive', 'Had a difficult conversation', 'Learned something new', 'Grateful for small moments'],
  };

  return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-4">
      <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
        <Sparkles className="h-6 w-6 text-indigo-500" />
      </div>
      <div>
        <h3 className="font-serif text-indigo-500 dark:text-indigo-300 mb-1">Start a conversation</h3>
        <p className="text-xs text-charcoal-500 dark:text-parchment-300 max-w-sm">
          I am here to listen and remember.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2 max-w-md">
        {suggestions[mode]?.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onSuggestion(suggestion)}
            className="px-3 py-1.5 rounded-full bg-parchment-500/30 text-xs text-charcoal-500 hover:bg-parchment-500 transition-colors"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

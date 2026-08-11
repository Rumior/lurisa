import { useState, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled, placeholder }: ChatInputProps) {
  const [input, setInput] = useState('');

  // Auto-resize textarea
  useEffect(() => {
    const el = document.getElementById('lurisa-chat-input') as HTMLTextAreaElement | null;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    }
  }, [input]);

  function handleSubmit() {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput('');
    const el = document.getElementById('lurisa-chat-input') as HTMLTextAreaElement | null;
    if (el) el.style.height = 'auto';
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="flex items-end space-x-3">
      <div className="flex-1 relative">
        <textarea
          id="lurisa-chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? 'Loading...' : (placeholder || 'Type a message...')}
          readOnly={disabled}
          rows={1}
          className={`w-full min-h-[48px] max-h-[200px] resize-none rounded-md border border-input bg-parchment-100 dark:bg-indigo-900 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 pr-12 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          style={{ lineHeight: '1.5' }}
        />
        <span className="absolute right-3 bottom-3 text-xs text-charcoal-300 hidden sm:block">
          {input.length > 0 && `${input.length} chars`}
        </span>
      </div>
      <button
        onClick={handleSubmit}
        disabled={disabled || !input.trim()}
        className="h-12 w-12 shrink-0 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90"
      >
        {disabled ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
      </button>
    </div>
  );
}

import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: string;
}

interface ChatMessageListProps {
  messages: Message[];
}

export function ChatMessageList({ messages }: ChatMessageListProps) {
  return (
    <div className="space-y-6">
      {messages.map((message) => (
        <ChatMessage
          key={message.id}
          message={message}
        />
      ))}
    </div>
  );
}

function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'USER';

  return (
    <div className={cn(
      'flex w-full',
      isUser ? 'justify-end' : 'justify-start'
    )}>
      <div className="max-w-[85%] sm:max-w-[75%]">
        <div className={cn(
          'rounded-2xl px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'bg-sage-500 text-parchment-100 rounded-tr-sm'
            : 'bg-parchment-100 border border-parchment-700/30 text-charcoal-700 dark:bg-indigo-900 dark:text-parchment-100 dark:border-parchment-700/10 rounded-tl-sm'
        )}>
          <MessageContent content={message.content} />
          <span className={cn(
            'text-xs mt-2 block',
            isUser ? 'text-sage-100' : 'text-charcoal-300'
          )}>
            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  const lines = content.split('\n');

  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        if (line.startsWith('**') && line.endsWith('**')) {
          return <p key={i} className="font-semibold">{line.replace(/\*\*/g, '')}</p>;
        }
        if (line.startsWith('- ')) {
          return <p key={i} className="pl-4">{'\u2022'} {line.slice(2)}</p>;
        }
        if (line.trim() === '') {
          return <div key={i} className="h-2" />;
        }
        return <p key={i}>{line}</p>;
      })}
    </div>
  );
}
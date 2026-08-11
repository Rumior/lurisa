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
      {messages.map((message, index) => (
        <ChatMessage 
          key={message.id} 
          message={message} 
          isFirst={index === 0}
        />
      ))}
    </div>
  );
}

function ChatMessage({ message, isFirst }: { message: Message; isFirst: boolean }) {
  const isUser = message.role === 'USER';

  return (
    <div className={cn(
      'flex w-full',
      isUser ? 'justify-end' : 'justify-start'
    )}>
      <div className={cn(
        'flex max-w-[85%] sm:max-w-[75%]',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}>
        {/* Avatar */}
        <div className={cn(
          'flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium',
          isUser 
            ? 'bg-sage-500 text-parchment-100 ml-3' 
            : 'bg-indigo-500 text-parchment-100 mr-3'
        )}>
          {isUser ? 'You' : 'l'}
        </div>

        {/* Bubble */}
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
  // Simple markdown-like parsing for the chat
  const lines = content.split('\n');

  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        if (line.startsWith('**') && line.endsWith('**')) {
          return <p key={i} className="font-semibold">{line.replace(/\*\*/g, '')}</p>;
        }
        if (line.startsWith('- ')) {
          return <p key={i} className="pl-4">• {line.slice(2)}</p>;
        }
        if (line.trim() === '') {
          return <div key={i} className="h-2" />;
        }
        return <p key={i}>{line}</p>;
      })}
    </div>
  );
}

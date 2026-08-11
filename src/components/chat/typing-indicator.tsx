export function TypingIndicator() {
  return (
    <div className="flex w-full justify-start">
      <div className="flex flex-row">
        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-indigo-500 text-parchment-100 flex items-center justify-center text-xs font-medium mr-3">
          l
        </div>
        <div className="rounded-2xl rounded-tl-sm bg-parchment-100 border border-parchment-700/30 dark:bg-indigo-900 dark:border-parchment-700/10 px-4 py-3">
          <div className="flex space-x-1">
            <div className="h-2 w-2 rounded-full bg-charcoal-300 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="h-2 w-2 rounded-full bg-charcoal-300 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="h-2 w-2 rounded-full bg-charcoal-300 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

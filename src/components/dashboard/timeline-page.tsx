'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Clock, Milestone, Star, BookOpen } from 'lucide-react';

interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  eventType: string;
  eventDate: string;
}

export function TimelinePage() {
  const events: TimelineEvent[] = [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-serif text-indigo-500 dark:text-indigo-300">Your Timeline</h1>
        <p className="text-charcoal-500 dark:text-parchment-300 mt-1">The story of your life, as remembered by lurisa</p>
      </div>

      {events.length === 0 ? <EmptyTimelineState /> : (
        <div className="relative border-l-2 border-parchment-700/30 ml-4 space-y-8">
          {events.map((event) => <TimelineEventCard key={event.id} event={event} />)}
        </div>
      )}
    </div>
  );
}

function TimelineEventCard({ event }: { event: TimelineEvent }) {
  const icons: Record<string, React.ReactNode> = {
    MILESTONE: <Milestone className="h-4 w-4 text-amber-500" />,
    ACHIEVEMENT: <Star className="h-4 w-4 text-amber-500" />,
    LESSON: <BookOpen className="h-4 w-4 text-terracotta-500" />,
    STORY: <BookOpen className="h-4 w-4 text-sage-500" />,
  };

  return (
    <div className="relative pl-8">
      <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-parchment-100 border-2 border-indigo-500" />
      <Card className="border-parchment-700/30">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            {icons[event.eventType] || <Clock className="h-4 w-4 text-charcoal-300" />}
            <span className="text-xs text-charcoal-300">{new Date(event.eventDate).toLocaleDateString()}</span>
          </div>
          <h3 className="font-medium text-charcoal-700 dark:text-parchment-100">{event.title}</h3>
          {event.description && <p className="text-sm text-charcoal-500 mt-1">{event.description}</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyTimelineState() {
  return (
    <Card className="border-parchment-700/30 border-dashed">
      <CardContent className="p-12 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-terracotta-100 flex items-center justify-center mb-4"><Clock className="h-6 w-6 text-terracotta-500" /></div>
        <h3 className="font-serif text-indigo-500 dark:text-indigo-300 mb-2">Your timeline is waiting</h3>
        <p className="text-sm text-charcoal-500 dark:text-parchment-300 max-w-sm mx-auto">As you share stories and milestones with lurisa, they&apos;ll appear here — a living record of your journey.</p>
      </CardContent>
    </Card>
  );
}

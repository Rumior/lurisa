export type StarterType = 'morning' | 'evening' | 'goal' | 'curiosity' | 'reflection';

const STARTERS: Record<StarterType, string[]> = {
  morning: [
    "Good morning. What's one thing you're looking forward to today?",
    "Morning. What's on your mind as you start the day?",
    "Hey. Any goals for today?",
  ],
  evening: [
    "Evening. What was the best part of your day?",
    "As you wind down, what's one thing from today worth remembering?",
    "How did today go compared to what you expected?",
  ],
  goal: [
    "How's progress on the things you're working toward?",
    "What's one small step you could take today on something that matters to you?",
    "Is there anything you've been putting off that you want to make progress on?",
  ],
  curiosity: [
    "What's something you've been thinking about lately?",
    "If you could learn one new thing this week, what would it be?",
    "What's something you're curious about right now?",
  ],
  reflection: [
    "What's something you did recently that you're proud of?",
    "If you could give yourself advice right now, what would it be?",
    "What's one thing you want to do differently this week?",
  ],
};

export function pickStarter(type: StarterType): string {
  const pool = STARTERS[type];
  return pool[Math.floor(Math.random() * pool.length)];
}

export function pickStarterForContext(hour: number, hasGoals: boolean): string {
  if (hour >= 5 && hour < 12) return pickStarter('morning');
  if (hour >= 18 && hour < 23) return pickStarter('evening');
  if (hasGoals) return pickStarter('goal');
  return pickStarter('curiosity');
}
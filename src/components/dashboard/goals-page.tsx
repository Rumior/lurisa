'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Target, Plus, Calendar, CheckCircle2, Circle } from 'lucide-react';

interface Goal {
  id: string;
  title: string;
  description?: string;
  category: string;
  status: string;
  targetDate?: string;
}

export function GoalsPage() {
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-indigo-500 dark:text-indigo-300">Your Goals</h1>
          <p className="text-charcoal-500 dark:text-parchment-300 mt-1">What you&apos;re working toward</p>
        </div>
        <Button onClick={() => setShowNewGoal(!showNewGoal)}><Plus className="mr-2 h-4 w-4" />New Goal</Button>
      </div>

      {showNewGoal && (
        <Card className="border-sage-500/30">
          <CardContent className="p-6 space-y-4">
            <h3 className="font-medium text-charcoal-700 dark:text-parchment-100">Create a new goal</h3>
            <Input placeholder="Goal title" className="bg-parchment-100" />
            <Textarea placeholder="Description (optional)" className="bg-parchment-100" />
            <div className="flex space-x-3">
              <Input type="date" className="bg-parchment-100" />
              <Button className="shrink-0">Create Goal</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {goals.length === 0 ? <EmptyGoalsState /> : <div className="grid gap-4">{goals.map((goal) => <GoalCard key={goal.id} goal={goal} />)}</div>}
    </div>
  );
}

function GoalCard({ goal }: { goal: Goal }) {
  return (
    <Card className="border-parchment-700/30">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <button className="mt-1">
            {goal.status === 'COMPLETED' ? <CheckCircle2 className="h-5 w-5 text-sage-500" /> : <Circle className="h-5 w-5 text-charcoal-300" />}
          </button>
          <div className="flex-1">
            <h3 className="font-medium text-charcoal-700 dark:text-parchment-100">{goal.title}</h3>
            {goal.description && <p className="text-sm text-charcoal-500 mt-1">{goal.description}</p>}
            <div className="flex items-center space-x-3 mt-3">
              <Badge variant="secondary" className="text-xs">{goal.category}</Badge>
              {goal.targetDate && (
                <span className="text-xs text-charcoal-300 flex items-center">
                  <Calendar className="mr-1 h-3 w-3" />{new Date(goal.targetDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyGoalsState() {
  return (
    <Card className="border-parchment-700/30 border-dashed">
      <CardContent className="p-12 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center mb-4"><Target className="h-6 w-6 text-amber-500" /></div>
        <h3 className="font-serif text-indigo-500 dark:text-indigo-300 mb-2">No goals yet</h3>
        <p className="text-sm text-charcoal-500 dark:text-parchment-300 max-w-sm mx-auto">Tell lurisa what you&apos;re working toward. It will help you stay on track.</p>
      </CardContent>
    </Card>
  );
}

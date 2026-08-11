'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BookOpen, Heart, Shield, Sparkles, Brain, Clock } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-parchment-300">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-parchment-300/80 backdrop-blur-md border-b border-parchment-700/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center">
                <span className="text-parchment-100 font-serif text-lg">l</span>
              </div>
              <span className="text-xl font-serif text-indigo-500">lurisa</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login"><Button variant="ghost" size="sm">Sign In</Button></Link>
              <Link href="/register"><Button size="sm">Get Started</Button></Link>
            </div>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="animate-fade-in">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-indigo-500 leading-tight mb-6">
              A living intelligence<br />that grows with you
            </h1>
            <p className="text-lg sm:text-xl text-charcoal-500 max-w-2xl mx-auto mb-10 leading-relaxed">
              lurisa remembers what matters. Not conversations — meaning. Over days, months, and years, it becomes a second memory, helping you reflect, grow, and become who you want to be.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register"><Button size="lg" className="text-base px-8">Start Your Journey</Button></Link>
              <Link href="#philosophy"><Button variant="outline" size="lg" className="text-base px-8">Learn More</Button></Link>
            </div>
          </div>
        </div>
      </section>

      <section id="philosophy" className="py-20 px-4 bg-parchment-100/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-serif text-indigo-500 mb-4">Built on trust</h2>
            <p className="text-charcoal-500 max-w-xl mx-auto">Every design choice in lurisa traces back to one question: does this help understand you better so it can improve your life?</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <PhilosophyCard icon={<Brain className="h-6 w-6" />} title="Memory Before Intelligence" description="Most AI answers questions. lurisa remembers. Intelligence without memory feels generic. Memory creates continuity." />
            <PhilosophyCard icon={<Shield className="h-6 w-6" />} title="Trust Before Data" description="You own every memory. View, edit, delete, or export everything. No hidden profiles. No secret data." />
            <PhilosophyCard icon={<Heart className="h-6 w-6" />} title="Respect Above All" description="Never dramatic, never manipulative, never needy. lurisa is calm, patient, thoughtful, and honest." />
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-serif text-indigo-500 mb-4">What lurisa does</h2>
            <p className="text-charcoal-500 max-w-xl mx-auto">Not a dashboard. Not a todo list. A quiet companion for your life.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard icon={<BookOpen className="h-5 w-5 text-sage-500" />} title="Life Journal" description="Conversations become structured memories. Dreams, decisions, lessons, milestones — all preserved." color="sage" />
            <FeatureCard icon={<Sparkles className="h-5 w-5 text-amber-500" />} title="Meaningful Insights" description="Pattern recognition across months of conversation. Insights include reasoning — you always know why." color="amber" />
            <FeatureCard icon={<Clock className="h-5 w-5 text-terracotta-500" />} title="Thoughtful Follow-ups" description="Mentioned an interview? A proposal? lurisa follows up at the right moment — never nagging, always caring." color="terracotta" />
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-parchment-100/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif text-indigo-500 mb-4">Your daily rhythm</h2>
            <p className="text-charcoal-500">Morning encouragement. Evening reflection. No spam. No noise.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="rounded-xl border border-parchment-700/50 bg-parchment-100 p-6 journal-shadow">
              <div className="flex items-center space-x-2 mb-4">
                <div className="h-8 w-8 rounded-full bg-sage-100 flex items-center justify-center"><span className="text-sage-700 text-sm font-medium">AM</span></div>
                <h3 className="font-serif text-indigo-500">Morning Check-in</h3>
              </div>
              <p className="text-charcoal-500 text-sm leading-relaxed italic">&ldquo;Good morning. You mentioned today is important — your presentation is at 2pm. You&apos;ve prepared well. One deep breath before you begin.&rdquo;</p>
            </div>
            <div className="rounded-xl border border-parchment-700/50 bg-parchment-100 p-6 journal-shadow">
              <div className="flex items-center space-x-2 mb-4">
                <div className="h-8 w-8 rounded-full bg-terracotta-100 flex items-center justify-center"><span className="text-terracotta-700 text-sm font-medium">PM</span></div>
                <h3 className="font-serif text-indigo-500">Evening Reflection</h3>
              </div>
              <p className="text-charcoal-500 text-sm leading-relaxed italic">&ldquo;How did the presentation go? You seemed nervous this morning, but you&apos;ve handled harder moments before. What did you learn today?&rdquo;</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-serif text-indigo-500 mb-4">Ready to be remembered?</h2>
          <p className="text-charcoal-500 mb-8">Start with a single conversation. lurisa will do the rest.</p>
          <Link href="/register"><Button size="lg" className="text-base px-8">Create Your Account</Button></Link>
          <p className="mt-4 text-sm text-charcoal-300">Free to start. Your data belongs to you.</p>
        </div>
      </section>

      <footer className="border-t border-parchment-700/30 py-12 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <div className="h-6 w-6 rounded-full bg-indigo-500 flex items-center justify-center"><span className="text-parchment-100 font-serif text-xs">l</span></div>
            <span className="text-indigo-500 font-serif">lurisa</span>
          </div>
          <div className="flex items-center space-x-6 text-sm text-charcoal-500">
            <Link href="/privacy" className="hover:text-indigo-500 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-indigo-500 transition-colors">Terms</Link>
            <span>Built with care</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PhilosophyCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-xl border border-parchment-700/30 bg-parchment-100 p-6 journal-shadow hover:journal-shadow-lg transition-shadow">
      <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-500 mb-4">{icon}</div>
      <h3 className="font-serif text-indigo-500 text-lg mb-2">{title}</h3>
      <p className="text-charcoal-500 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function FeatureCard({ icon, title, description, color }: { icon: React.ReactNode; title: string; description: string; color: 'sage' | 'amber' | 'terracotta'; }) {
  const bgColors = { sage: 'bg-sage-100', amber: 'bg-amber-100', terracotta: 'bg-terracotta-100' };
  return (
    <div className="rounded-xl border border-parchment-700/30 bg-parchment-100 p-6 journal-shadow hover:journal-shadow-lg transition-all hover:-translate-y-0.5">
      <div className={`h-10 w-10 rounded-lg ${bgColors[color]} flex items-center justify-center mb-4`}>{icon}</div>
      <h3 className="font-medium text-charcoal-700 mb-2">{title}</h3>
      <p className="text-charcoal-500 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Search, Brain, Filter, Pencil, Trash2, Link2, Sparkles } from 'lucide-react';

interface Memory {
  id: string;
  statement: string;
  category: string;
  type: string;
  confidence: number;
  importance: number;
  status: string;
  createdAt: string;
  reinforcementCount: number;
}

const categories = ['ALL', 'IDENTITY', 'RELATIONSHIPS', 'GOALS', 'CAREER', 'HEALTH', 'LESSONS', 'STORIES', 'DREAMS', 'VALUES'];

export function MemoriesPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => { fetchMemories(); }, []);

  async function fetchMemories() {
    try {
      const response = await fetch('/api/memories');
      if (response.ok) {
        const data = await response.json();
        setMemories(data.memories || []);
      }
    } catch (error) { console.error('Failed to fetch memories:', error); }
    finally { setLoading(false); }
  }

  async function handleVectorSearch() {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const response = await fetch(`/api/memories/search?q=${encodeURIComponent(searchQuery)}&category=${selectedCategory}`);
      if (response.ok) {
        const data = await response.json();
        const mapped = data.results.map((r: any) => ({
          id: r.memoryId, statement: r.statement, category: r.category, type: r.type,
          confidence: 0.9, importance: r.importance, status: 'ACTIVE',
          createdAt: new Date().toISOString(), reinforcementCount: 0,
        }));
        setMemories(mapped);
      }
    } catch (error) { console.error('Search failed:', error); }
    finally { setIsSearching(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this memory?')) return;
    try {
      await fetch(`/api/memories/${id}`, { method: 'DELETE' });
      setMemories(prev => prev.filter(m => m.id !== id));
    } catch (error) { console.error('Delete failed:', error); }
  }

  const filteredMemories = searchQuery && !isSearching
    ? memories.filter(m => m.statement.toLowerCase().includes(searchQuery.toLowerCase()))
    : memories;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-indigo-500 dark:text-indigo-300">Your Memories</h1>
          <p className="text-charcoal-500 dark:text-parchment-300 mt-1">Everything lurisa has learned about you</p>
        </div>
        <div className="h-10 w-10 rounded-lg bg-sage-100 flex items-center justify-center">
          <Brain className="h-5 w-5 text-sage-500" />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-300" />
          <Input placeholder="Search memories (semantic search)..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleVectorSearch()} className="pl-10 bg-parchment-100" />
        </div>
        <Button onClick={handleVectorSearch} disabled={isSearching} variant="outline">
          {isSearching ? <Sparkles className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Semantic Search
        </Button>
      </div>

      <div className="flex items-center space-x-2 overflow-x-auto pb-2">
        <Filter className="h-4 w-4 text-charcoal-300 flex-shrink-0" />
        {categories.map((cat) => (
          <button key={cat} onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${selectedCategory === cat ? 'bg-indigo-500 text-parchment-100' : 'bg-parchment-500 text-charcoal-500 hover:bg-parchment-700'}`}>
            {cat === 'ALL' ? 'All' : cat.charAt(0) + cat.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : filteredMemories.length === 0 ? (
        <EmptyMemoriesState />
      ) : (
        <div className="space-y-3">
          {filteredMemories.map((memory) => (
            <MemoryCard key={memory.id} memory={memory} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

function MemoryCard({ memory, onDelete }: { memory: Memory; onDelete: (id: string) => void }) {
  const [showLinks, setShowLinks] = useState(false);
  const [links, setLinks] = useState<any[]>([]);

  async function loadLinks() {
    if (links.length > 0) { setShowLinks(!showLinks); return; }
    try {
      const res = await fetch(`/api/memories/${memory.id}/links`);
      if (res.ok) { const data = await res.json(); setLinks(data.links || []); setShowLinks(true); }
    } catch (e) { console.error(e); }
  }

  const typeColors: Record<string, string> = {
    PERMANENT: 'bg-indigo-100 text-indigo-700', LONG_TERM: 'bg-sage-100 text-sage-700',
    TEMPORARY: 'bg-amber-100 text-amber-700', EMOTIONAL: 'bg-terracotta-100 text-terracotta-700',
    STORY: 'bg-parchment-500 text-charcoal-500',
  };

  return (
    <Card className="border-parchment-700/30 hover:journal-shadow transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <Badge variant="outline" className="text-xs">{memory.category}</Badge>
              <span className={`text-xs px-2 py-0.5 rounded-full ${typeColors[memory.type] || 'bg-parchment-500 text-charcoal-500'}`}>
                {memory.type.toLowerCase().replace('_', ' ')}
              </span>
              {memory.reinforcementCount > 0 && <span className="text-xs text-sage-500">+{memory.reinforcementCount}</span>}
            </div>
            <p className="text-charcoal-700 dark:text-parchment-100 text-sm leading-relaxed">{memory.statement}</p>
            <div className="flex items-center space-x-4 mt-3 text-xs text-charcoal-300">
              <span>Confidence: {Math.round(memory.confidence * 100)}%</span>
              <span>Importance: {Math.round(memory.importance * 100)}%</span>
              <span>{new Date(memory.createdAt).toLocaleDateString()}</span>
            </div>
            {showLinks && links.length > 0 && (
              <div className="mt-3 pt-3 border-t border-parchment-700/20">
                <p className="text-xs text-charcoal-500 mb-2 flex items-center"><Link2 className="mr-1 h-3 w-3" /> Linked memories:</p>
                <div className="space-y-1">
                  {links.map((link: any) => (
                    <p key={link.memory.id} className="text-xs text-charcoal-400 pl-4 border-l-2 border-parchment-500">{link.memory.statement}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-1 ml-4">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={loadLinks}><Link2 className="h-4 w-4 text-charcoal-300" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-4 w-4 text-charcoal-300" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(memory.id)}><Trash2 className="h-4 w-4 text-charcoal-300" /></Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyMemoriesState() {
  return (
    <Card className="border-parchment-700/30 border-dashed">
      <CardContent className="p-12 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-sage-100 flex items-center justify-center mb-4">
          <Brain className="h-6 w-6 text-sage-500" />
        </div>
        <h3 className="font-serif text-indigo-500 dark:text-indigo-300 mb-2">No memories yet</h3>
        <p className="text-sm text-charcoal-500 dark:text-parchment-300 max-w-sm mx-auto mb-6">Start chatting with lurisa. Every conversation helps it learn what matters to you.</p>
        <Link href="/chat"><Link href="/chat"><Button>Start a Conversation</Button></Link></Link>
      </CardContent>
    </Card>
  );
}

// Shared TypeScript types for lurisa

export interface User {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  consentGiven: boolean;
  memoryPaused: boolean;
  dataRetentionDays: number;
}

export interface Memory {
  id: string;
  userId: string;
  category: string;
  type: string;
  statement: string;
  confidence: number;
  importance: number;
  status: string;
  sourceConversationId?: string;
  reinforcementCount: number;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title?: string;
  summary?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  userId: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  createdAt: string;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  category: string;
  status: string;
  targetDate?: string;
  completedAt?: string;
  importance: number;
}

export interface TimelineEvent {
  id: string;
  userId: string;
  title: string;
  description?: string;
  eventType: string;
  eventDate: string;
  memoryId?: string;
  importance: number;
}

export interface Device {
  id: string;
  userId: string;
  name?: string;
  fingerprint: string;
  trusted: boolean;
  trustedAt?: string;
  lastSeenAt: string;
  lastIpAddress?: string;
  userAgent?: string;
}

// Global Updates Engine — Shared Types
import { EventStatus, EventType, SourceType, ContentType } from '@prisma/client';

export enum ConfidenceLevel {
  VERY_LOW = 'VERY_LOW',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH',
}

export interface SourceMetadata {
  sourceId: string;
  title: string;
  publisher?: string;
  author?: string;
  url: string;
  publicationDate?: Date;
  retrievedAt: Date;
  sourceType: SourceType;
  country?: string;
  topic?: string;
  credibility: number;
  content?: string;
  rawClaims?: string;
}

export interface RawArticle {
  id: string;
  url: string;
  title: string;
  content: string;
  publishedAt?: Date;
  publisher: string;
  author?: string;
  sourceType: SourceType;
  country?: string;
  topic?: string;
}

export interface ExtractedEvent {
  headline: string;
  summary: string;
  eventType: EventType;
  topics: string[];
  entities: string[];
  locations: string[];
  whatHappened: string;
  whatItMeans: string;
  whatIsUncertain?: string;
  importanceScore: number;
  confidenceScore: number;
  sources: SourceMetadata[];
  contradictions: EventContradiction[];
}

export interface EventContradiction {
  claimA: string;
  claimB: string;
  sourceAId: string;
  sourceBId: string;
  explanation: string;
}

export interface UserRelevanceContext {
  userId: string;
  interests: string[];
  goals: string[];
  projects: string[];
  recentResearch: string[];
  // Personal Model fields (privacy boundary)
 geographicPreferences?: string[];
  professionalInterests?: string;
  currentGoalsSummary?: string;
  recurringConcerns?: string;
  lifePhase?: string;
  decisionMaking?: string;
  communicationStyle?: string;
  importantRelationships?: string;
  preferredInteraction?: string;
  // Permitted conversation signals
  recentConversationTopics?: string[];
}

export interface PersonalisedUpdate {
  eventId: string;
  headline: string;
  summary: string;
  eventType: EventType;
  topics: string[];
  whatHappened: string;
  whatItMeans: string;
  whyItMattersToYou?: string;
  whatIsUncertain?: string;
  confidence: ConfidenceLevel;
  freshness: string;
  sourceCount: number;
  sources: SourceMetadata[];
  isDeveloping: boolean;
  contentType: ContentType;
}

export interface RankingFactors {
  globalSignificance: number;
  freshness: number;
  sourceConfidence: number;
  userRelevance: number;
  topicAffinity: number;
  goalRelevance: number;
  novelty: number;
  duplicatePenalty: number;
  lowQualityPenalty: number;
}

export interface FeedOptions {
  tab: 'for-you' | 'trending' | 'africa' | 'technology' | 'business' | 'interests';
  page?: number;
  pageSize?: number;
}



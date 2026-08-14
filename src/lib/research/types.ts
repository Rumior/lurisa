export type ResearchDepth = 'QUICK' | 'DEEP' | 'REPORT';
export type ResearchStatus = 'PLANNING' | 'SEARCHING' | 'ANALYZING' | 'SYNTHESIZING' | 'COMPLETED' | 'FAILED';

export interface ResearchPlan {
  objective: string;
  depth: ResearchDepth;
  questions: ResearchQuestion[];
  requiredEvidence: string[];
  estimatedTimeSeconds: number;
}

export interface ResearchQuestion {
  question: string;
  priority: number;
  category: string;
}

export interface ResearchSource {
  id?: string;
  title: string;
  url: string;
  publisher?: string;
  author?: string;
  publishedDate?: string;
  sourceType: 'PRIMARY' | 'SECONDARY' | 'TERTIARY';
  credibilityScore: number;
  relevanceScore: number;
  content?: string;
  claims: ResearchClaim[];
}

export interface ResearchClaim {
  id?: string;
  claim: string;
  evidence: string;
  confidence: number;
  sourceUrl: string;
  supportingSources?: string[];
  contradictingSources?: string[];
}

export interface ResearchContradiction {
  id?: string;
  claimA: string;
  claimB: string;
  sourceA: string;
  sourceB: string;
  explanation: string;
}

export interface ResearchFinding {
  id?: string;
  category: string;
  finding: string;
  confidence: number;
  sourceIds: string[];
  personalRelevance?: string;
}

export interface ResearchResult {
  summary: string;
  findings: ResearchFinding[];
  contradictions: ResearchContradiction[];
  sources: ResearchSource[];
  recommendation?: string;
  personalInterpretation?: string;
}

export interface ResearchSessionRecord {
  id: string;
  userId: string;
  query: string;
  objective?: string;
  depth: ResearchDepth;
  status: ResearchStatus;
  personalInterpretation?: string;
  recommendation?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}
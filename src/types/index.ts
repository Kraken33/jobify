export type SeniorityLevel = 'junior' | 'mid' | 'senior' | 'lead';
export type WorkMode = 'remote' | 'hybrid' | 'office' | 'any';

export interface CandidateProfile {
  id?: string;
  targetRole: string;
  seniority: SeniorityLevel;
  skills: string[];
  workMode: WorkMode;
  preferredLocation?: string;
  minSalary?: number;
  salaryCurrency?: string;
  experienceSummary: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SalaryRange {
  min?: number;
  max?: number;
  currency: string;
  type?: string;
}

export interface JobListing {
  id: string;
  provider: 'justjoin' | 'linkedin' | 'custom';
  title: string;
  company: string;
  companyLogoUrl?: string;
  city?: string;
  isRemote: boolean;
  workplaceType?: string;
  seniority: SeniorityLevel | 'all';
  requiredSkills: string[];
  salaryRange?: SalaryRange;
  url: string;
  publishedAt?: string;
  description?: string;
}

export interface ProviderCursor {
  publishedAtCursor: string | null;
}

export interface ProviderResult {
  listings: JobListing[];
  nextCursor: ProviderCursor | null;
  fallback?: boolean;
}

export interface SearchCriteria {
  keywords?: string[];
  skills?: string[];
  seniority?: SeniorityLevel;
  workMode?: WorkMode;
  location?: string;
  limit?: number;
  publishedAtCursor?: string | null;
  seenJobIds?: string[];
  apifyToken?: string | null;
}

export interface SearchSession {
  id: string;
  profileId?: string;
  name: string;
  provider: string;
  skills: string[];
  seniority: SeniorityLevel;
  workMode: WorkMode;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScanCheckpoint {
  sessionId: string;
  providerId: string;
  providerFingerprint: string;
  publishedAtCursor: string | null;
  seenJobIds: string[];
  lastScanAt: string;
}

export interface MatchEvaluation {
  score: number; // 0 to 100
  verdict: 'Strong Match' | 'Moderate Match' | 'Low Match' | 'Mismatch';
  pros: string[];
  gaps: string[];
  summary: string;
}

export interface MatchResult {
  id: string;
  sessionId?: string;
  job: JobListing;
  evaluation: MatchEvaluation;
  createdAt: string;
}

export interface JobProvider {
  name: string;
  id: string;
  searchJobs(criteria: SearchCriteria): Promise<ProviderResult>;
}


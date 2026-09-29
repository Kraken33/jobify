export type SeniorityLevel = 'junior' | 'mid' | 'senior' | 'lead';
export type WorkMode = 'remote' | 'hybrid' | 'office' | 'any';

export type SpokenLanguageLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'Native';

export interface SpokenLanguage {
  language: string;
  level: SpokenLanguageLevel;
}

export interface CandidateProfile {
  id?: string;
  targetRole: string;
  seniority: SeniorityLevel;
  skills: string[];
  workMode: WorkMode;
  preferredLocation?: string;
  minSalary?: number;
  salaryCurrency?: string;
  spokenLanguages?: SpokenLanguage[];
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
  provider: 'justjoin' | 'arbeitsagentur' | 'linkedin' | 'custom';
  title: string;
  company: string;
  companyLogoUrl?: string;
  city?: string;
  isRemote: boolean;
  workplaceType?: string;
  seniority: SeniorityLevel | 'all';
  requiredSkills: string[];
  spokenLanguages?: SpokenLanguage[];
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
  /** Human-readable diagnostic when the provider had to relax a search filter. */
  notice?: string;
}

export interface SearchCriteria {
  keywords?: string[];
  skills?: string[];
  seniority?: SeniorityLevel;
  workMode?: WorkMode;
  location?: string;
  spokenLanguages?: SpokenLanguage[];
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
  spokenLanguages?: SpokenLanguage[];
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
  status?: 'active' | 'dismissed' | 'applied';
}

export interface JobProvider {
  name: string;
  id: string;
  searchJobs(criteria: SearchCriteria): Promise<ProviderResult>;
  getJobCount?(criteria: SearchCriteria): Promise<number | null>;
}


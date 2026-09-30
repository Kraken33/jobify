import { BaseJobProvider } from './JobProvider';
import {
  JobListing,
  ProviderResult,
  SalaryRange,
  SearchCriteria,
  SeniorityLevel,
  SpokenLanguage,
  SpokenLanguageLevel,
  WorkMode,
} from '@/types';
import { FALLBACK_JOB_POOL } from './fallbackPool';
import { loggedFetch } from '../logger';

/** Synchronous Apify actor endpoint: run the actor and return dataset items in one call. */
export const APIFY_ACTOR_ENDPOINT =
  'https://api.apify.com/v2/acts/trev0n~justjoinit-scraper/run-sync-get-dataset-items';

const APIFY_REQUEST_TIMEOUT_MS = 45_000;

/** Actor caps results at 100 offers per request. */
const APIFY_MAX_ITEMS = 100;

/** Number of fallback listings generated per virtual page (kept in sync with the generator). */
const FALLBACK_PAGE_SIZE = 3;

/** Shape of a dataset item produced by the `trev0n/justjoinit-scraper` actor. */
export interface ApifyJustJoinItem {
  id?: string | number;
  slug?: string;
  jobTitle?: string;
  title?: string;
  company?: string;
  companyName?: string;
  companyLogo?: string;
  companyLogoThumbUrl?: string;
  city?: string;
  street?: string;
  salary?: unknown;
  experience?: string;
  experienceLevel?: string;
  workplace?: string;
  workplaceType?: string;
  workingTime?: string;
  requiredSkills?: (string | { name?: string })[];
  skills?: (string | { name?: string })[];
  niceToHave?: (string | { name?: string })[];
  published?: string;
  publishedAt?: string;
  expires?: string;
  description?: string;
  body?: string;
  jobUrl?: string;
  url?: string;
}

interface JustJoinRawOffer {
  id?: string | number;
  slug?: string;
  title?: string;
  companyName?: string;
  company_name?: string;
  companyLogoThumbUrl?: string;
  company_logo_thumb_url?: string;
  city?: string;
  workplaceType?: string;
  workplace_type?: string;
  experienceLevel?: string;
  experience_level?: string;
  requiredSkills?: string[] | { name?: string }[];
  skills?: string[] | { name?: string }[];
  employmentTypes?: {
    salary?: {
      from?: number;
      to?: number;
      currency?: string;
      type?: string;
    };
    type?: string;
  }[];
  employment_types?: {
    salary?: {
      from?: number;
      to?: number;
      currency?: string;
    };
  }[];
  publishedAt?: string;
  published_at?: string;
  body?: string;
}

export class JustJoinProvider extends BaseJobProvider {
  id = 'justjoin';
  name = 'JustJoin.it';

  async searchJobs(criteria: SearchCriteria): Promise<ProviderResult> {
    const token = criteria.apifyToken?.trim();

    if (!token) {
      // BYOK: the public JustJoin endpoint is Cloudflare-protected, so without a
      // client-provided Apify token we serve the deterministic fallback pool.
      console.warn('JustJoin ingestion: no Apify token provided, serving deterministic fallback listings.');
      return this.getSampleFallbackListings(criteria, this.resolveFallbackPage(criteria));
    }

    try {
      return await this.fetchApifyOffers(criteria, token);
    } catch (error) {
      // Invalid token, depleted compute units (401/402), timeouts and network
      // failures all degrade to the fallback pool instead of crashing the scan.
      console.warn(
        'Apify JustJoin scraper warning:',
        error instanceof Error ? error.message : 'unknown error'
      );
      return this.getSampleFallbackListings(criteria, this.resolveFallbackPage(criteria));
    }
  }

  override async getJobCount(criteria: SearchCriteria): Promise<number | null> {
    const token = criteria.apifyToken?.trim();
    if (!token) {
      return FALLBACK_JOB_POOL.length;
    }
    try {
      const result = await this.fetchApifyOffers({ ...criteria, limit: 100 }, token);
      return result.listings.length;
    } catch {
      return FALLBACK_JOB_POOL.length;
    }
  }

  /**
   * Runs the `trev0n/justjoinit-scraper` actor synchronously and maps dataset
   * items into canonical job listings. Throws on transport/quota errors so the
   * caller can degrade gracefully to the deterministic fallback pool.
   */
  private async fetchApifyOffers(criteria: SearchCriteria, token: string): Promise<ProviderResult> {
    const searchUrl = this.buildSearchUrl(criteria);
    const endpoint = `${APIFY_ACTOR_ENDPOINT}?targetUrl=${encodeURIComponent(searchUrl)}&token=${encodeURIComponent(token)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), APIFY_REQUEST_TIMEOUT_MS);

    let payload: unknown;
    try {
      const response = await loggedFetch(endpoint, {
        method: 'POST',
        providerId: 'justjoin',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(this.buildApifyInput(criteria)),
        signal: controller.signal,
        // The token is request-scoped: never cache or reuse this response.
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Apify actor responded with status ${response.status}`);
      }

      payload = await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Apify actor run timed out after ${APIFY_REQUEST_TIMEOUT_MS}ms`);
      }
      // Re-throw sanitized so the token never reaches the logs.
      throw new Error(error instanceof Error ? error.message : 'Apify actor request failed');
    } finally {
      clearTimeout(timeoutId);
    }

    const rawItems: ApifyJustJoinItem[] = Array.isArray(payload)
      ? (payload as ApifyJustJoinItem[])
      : [];

    return this.normalizeApifyDataset(rawItems, criteria);
  }

  /**
   * Constructs the canonical JustJoin.it search URL from criteria.
   * e.g. https://justjoin.it/all-locations/all?keyword=TypeScript&experience-level=senior&workplace-type=remote
   */
  public buildSearchUrl(criteria: SearchCriteria): string {
    const location = this.mapLocationToApify(criteria.location);
    const basePath = `https://justjoin.it/${location}/all`;
    const params = new URLSearchParams();

    const keyword = criteria.targetRole || criteria.keywords?.[0];
    if (keyword && keyword.trim()) {
      params.set('keyword', keyword.trim());
    }

    if (criteria.seniority) {
      params.set('experience-level', criteria.seniority);
    }

    const workplaceType = this.mapWorkModeToApify(criteria.workMode);
    if (workplaceType) {
      params.set('workplace-type', workplaceType);
    }

    const queryString = params.toString();
    return queryString ? `${basePath}?${queryString}` : basePath;
  }

  /** Serializes search criteria into the actor's input schema. */
  public buildApifyInput(criteria: SearchCriteria): Record<string, unknown> {
    const requestedLimit = criteria.limit && criteria.limit > 0 ? criteria.limit : 25;
    const searchUrl = this.buildSearchUrl(criteria);

    const input: Record<string, unknown> = {
      startUrls: [searchUrl],
      limit: Math.min(requestedLimit, APIFY_MAX_ITEMS),
      // Fast overview scrape; full detail extraction requires a proxy and is slow.
      extractFullDetails: false,
    };

    const keyword = criteria.targetRole || criteria.keywords?.[0];
    if (keyword && keyword.trim()) {
      input.keyword = keyword.trim();
    }

    if (criteria.seniority) {
      input.experience = criteria.seniority;
      input.experienceLevel = [criteria.seniority];
    }

    const workplaceType = this.mapWorkModeToApify(criteria.workMode);
    if (workplaceType) {
      input.workplaceType = [workplaceType];
    }

    if (criteria.spokenLanguages && criteria.spokenLanguages.length > 0) {
      const langCodeMap: Record<string, string> = {
        English: 'en',
        Polish: 'pl',
        German: 'de',
        Spanish: 'es',
        French: 'fr',
      };
      const codes = criteria.spokenLanguages
        .map((l) => langCodeMap[l.language])
        .filter((code): code is string => Boolean(code));
      if (codes.length > 0) {
        input.languages = Array.from(new Set(codes));
      }
    }

    return input;
  }

  /** Maps a free-text location from the candidate profile to a JustJoin city slug. */
  private mapLocationToApify(location?: string): string {
    const fallback = 'all-locations';
    if (!location) return fallback;

    const city = location
      .replace(/[łŁ]/g, 'l')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .split(/[/,|]/)
      .map((part) => part.trim())
      .find((part) => part && !/^(remote|any|all|poland|polska|hybrid|office)$/.test(part));

    if (!city) return fallback;

    const slug = city.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return slug || fallback;
  }

  private mapWorkModeToApify(workMode?: WorkMode): string | null {
    if (workMode === 'remote') return 'remote';
    if (workMode === 'hybrid') return 'hybrid';
    if (workMode === 'office') return 'office';
    return null;
  }

  /**
   * Maps raw Apify dataset items into the canonical `JobListing` domain model,
   * deduplicating by id, sorting newest-first, and applying cursor pagination.
   */
  public normalizeApifyDataset(
    rawItems: ApifyJustJoinItem[],
    criteria: SearchCriteria = {}
  ): ProviderResult {
    const listings: JobListing[] = [];
    const seenIds = new Set<string>();

    for (const raw of rawItems) {
      const listing = this.normalizeApifyItem(raw);
      if (seenIds.has(listing.id)) continue;
      seenIds.add(listing.id);
      listings.push(listing);
    }

    listings.sort((a, b) => {
      const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return bTime - aTime;
    });

    let filtered = listings;
    if (criteria.publishedAtCursor) {
      const cursorTime = new Date(criteria.publishedAtCursor).getTime();
      if (!Number.isNaN(cursorTime)) {
        filtered = listings.filter((listing) => {
          if (!listing.publishedAt) return false;
          return new Date(listing.publishedAt).getTime() > cursorTime;
        });
      }
    }

    const newestPublishedAt =
      filtered[0]?.publishedAt ?? (criteria.publishedAtCursor ? criteria.publishedAtCursor : null);

    return {
      listings: filtered,
      nextCursor: newestPublishedAt ? { publishedAtCursor: newestPublishedAt } : null,
      fallback: false,
    };
  }

  /** Normalizes a single `trev0n/justjoinit-scraper` dataset item. */
  public normalizeApifyItem(raw: ApifyJustJoinItem): JobListing {
    const url = raw.jobUrl || raw.url || '';
    const offerId = this.extractOfferId(raw, url);
    const title = raw.jobTitle || raw.title || 'Software Engineer';
    const company = raw.company || raw.companyName || 'Tech Employer';

    const workplaceType = this.mapApifyWorkplace(raw.workplace || raw.workplaceType || '');
    const isRemote = workplaceType === 'remote';

    const experience = String(raw.experience || raw.experienceLevel || 'mid').toLowerCase();
    const seniority = this.mapExperienceToSeniority(experience);

    const rawRecord = raw as unknown as Record<string, unknown>;
    const skillSource = this.extractAllRawSkills(rawRecord);
    const skills = this.extractSkillTags(skillSource);
    const descriptionText = raw.description || raw.body || '';
    const spokenLanguages = this.extractSpokenLanguages(skillSource, descriptionText);

    return {
      id: `justjoin_${offerId}`,
      provider: 'justjoin',
      title,
      company,
      companyLogoUrl: raw.companyLogo || raw.companyLogoThumbUrl,
      city: raw.city || (isRemote ? 'Remote' : 'Poland'),
      isRemote,
      workplaceType,
      seniority,
      requiredSkills: skills.length > 0 ? skills : ['TypeScript', 'JavaScript'],
      spokenLanguages,
      salaryRange: this.parseApifySalary(raw.salary),
      url: url || `https://justjoin.it/offers/${offerId}`,
      publishedAt: this.parseDate(raw.published || raw.publishedAt),
      description:
        descriptionText || `${title} at ${company}. Requires skills in ${skills.join(', ')}.`,
    };
  }

  /** Parses the actor's salary field, which may be an object, string, or array of either. */
  private parseApifySalary(salary: unknown): SalaryRange | undefined {
    if (salary === null || salary === undefined) return undefined;

    if (Array.isArray(salary)) {
      for (const entry of salary) {
        const parsed = this.parseApifySalary(entry);
        if (parsed) return parsed;
      }
      return undefined;
    }

    if (typeof salary === 'string') {
      return this.parseSalaryString(salary);
    }

    if (typeof salary !== 'object') return undefined;

    const record = salary as Record<string, unknown>;
    const min = this.toNumber(record.min ?? record.from ?? record.minAmount);
    const max = this.toNumber(record.max ?? record.to ?? record.maxAmount);

    if (min === undefined && max === undefined) {
      const display = record.display ?? record.raw ?? record.text;
      return typeof display === 'string' ? this.parseSalaryString(display) : undefined;
    }

    const currency = typeof record.currency === 'string' ? record.currency : 'PLN';
    const contractType = record.type ?? record.contractType;

    return {
      min,
      max,
      currency: currency.toUpperCase(),
      type: typeof contractType === 'string' ? contractType : undefined,
    };
  }

  /** Parses human-readable salary strings such as "20 000 - 26 000 PLN (B2B)". */
  private parseSalaryString(value: string): SalaryRange | undefined {
    const cleaned = value.replace(/\u00a0/g, ' ');

    const amounts = (cleaned.match(/\d[\d\s.,]*/g) || [])
      .map((part) => this.toNumber(part))
      .filter((amount): amount is number => amount !== undefined && amount >= 100);

    if (amounts.length === 0) return undefined;

    const currencyMatch = cleaned.match(/PLN|EUR|USD|GBP|CHF|SEK|NOK|DKK/i);
    const typeMatch = cleaned.match(/B2B|UoP|UOP|permanent|mandate/i);

    return {
      min: Math.min(...amounts),
      max: amounts.length > 1 ? Math.max(...amounts) : undefined,
      currency: (currencyMatch?.[0] || 'PLN').toUpperCase(),
      type: typeMatch?.[0],
    };
  }

  /** Coerces numbers and formatted numeric strings (e.g. "20 000") into integers. */
  private toNumber(value: unknown): number | undefined {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? Math.round(value) : undefined;
    }
    if (typeof value !== 'string') return undefined;

    const normalized = value
      .replace(/\u00a0/g, ' ')
      .replace(/\s/g, '')
      .replace(/,\d{1,2}$/, '')
      .replace(/[^\d.]/g, '');

    if (!normalized) return undefined;

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? Math.round(parsed) : undefined;
  }

  private extractOfferId(raw: ApifyJustJoinItem, url: string): string {
    if (raw.slug) return String(raw.slug);
    if (raw.id !== undefined && raw.id !== null && String(raw.id).trim()) {
      return String(raw.id);
    }
    if (url) {
      const lastSegment = url.split('?')[0].split('/').filter(Boolean).pop();
      if (lastSegment) return lastSegment;
    }
    return Math.random().toString(36).substring(7);
  }

  private mapApifyWorkplace(value: string): string {
    const workplace = value.toLowerCase().trim();
    if (!workplace) return 'remote';
    if (workplace.includes('hybrid') || workplace.includes('partly')) return 'hybrid';
    if (workplace.includes('office') || workplace.includes('stationary')) return 'office';
    if (workplace.includes('remote')) return 'remote';
    return workplace;
  }

  private mapExperienceToSeniority(experience: string): SeniorityLevel {
    if (
      experience.includes('lead') ||
      experience.includes('head') ||
      experience.includes('staff') ||
      experience.includes('principal') ||
      experience.includes('expert')
    ) {
      return 'lead';
    }
    if (experience.includes('senior')) return 'senior';
    if (
      experience.includes('junior') ||
      experience.includes('intern') ||
      experience.includes('trainee')
    ) {
      return 'junior';
    }
    return 'mid';
  }

  private parseDate(value?: unknown): string | undefined {
    if (typeof value !== 'string' || !value.trim()) return undefined;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
  }

  /**
   * Derives the fallback page from the scan offset. Fallback listings are served
   * in fixed-size pages so successive scans without a live actor return fresh
   * (non-overlapping) demo listings instead of the same static set.
   */
  private resolveFallbackPage(criteria: SearchCriteria): number {
    const offset = criteria.seenJobIds?.length ?? 0;
    return Math.max(1, Math.floor(offset / FALLBACK_PAGE_SIZE) + 1);
  }

  /** Merges all available raw tech stack lists into a single unified array. */
  private extractAllRawSkills(raw: Record<string, unknown>): (string | { name?: string })[] {
    const lists = [
      raw.requiredSkills,
      raw.required_skills,
      raw.skills,
      raw.niceToHave,
      raw.nice_to_have,
      raw.techStack,
      raw.tech_stack,
      raw.skills_tags,
      raw.tags,
    ];

    const merged: (string | { name?: string })[] = [];
    for (const list of lists) {
      if (Array.isArray(list)) {
        merged.push(...(list as (string | { name?: string })[]));
      }
    }
    return merged;
  }

  public normalizeOffer(raw: JustJoinRawOffer): JobListing {
    const offerId = String(raw.slug || raw.id || Math.random().toString(36).substring(7));
    const company = raw.companyName || raw.company_name || 'Tech Employer';
    const title = raw.title || 'Software Engineer';
    const wpType = raw.workplaceType || raw.workplace_type || 'remote';
    const isRemote = wpType === 'remote' || wpType === 'partly_remote';

    // Extract skills from unified tech stack sources
    const rawRecord = raw as unknown as Record<string, unknown>;
    const skillSource = this.extractAllRawSkills(rawRecord);
    const skills = this.extractSkillTags(skillSource);

    // Extract seniority
    const exp = (raw.experienceLevel || raw.experience_level || 'mid').toLowerCase();
    const seniority: SeniorityLevel = exp.includes('senior')
      ? 'senior'
      : exp.includes('junior')
      ? 'junior'
      : exp.includes('lead') || exp.includes('head')
      ? 'lead'
      : 'mid';

    // Extract salary
    const empTypes = raw.employmentTypes || raw.employment_types || [];
    let salaryMin: number | undefined;
    let salaryMax: number | undefined;
    let salaryCurrency = 'PLN';

    for (const emp of empTypes) {
      if (emp.salary) {
        salaryMin = emp.salary.from || salaryMin;
        salaryMax = emp.salary.to || salaryMax;
        salaryCurrency = emp.salary.currency || salaryCurrency;
        break;
      }
    }

    const slug = raw.slug || offerId;
    const url = slug.startsWith('http') ? slug : `https://justjoin.it/offers/${slug}`;
    const spokenLanguages = this.extractSpokenLanguages(skillSource, raw.body);

    return {
      id: `justjoin_${offerId}`,
      provider: 'justjoin',
      title,
      company,
      companyLogoUrl: raw.companyLogoThumbUrl || raw.company_logo_thumb_url,
      city: raw.city || (isRemote ? 'Remote' : 'Poland'),
      isRemote,
      workplaceType: wpType,
      seniority,
      requiredSkills: skills.length > 0 ? skills : ['TypeScript', 'JavaScript'],
      spokenLanguages,
      salaryRange:
        salaryMin || salaryMax
          ? {
              min: salaryMin,
              max: salaryMax,
              currency: salaryCurrency.toUpperCase(),
            }
          : undefined,
      url,
      publishedAt: raw.publishedAt || raw.published_at || new Date().toISOString(),
      description: raw.body || `${title} at ${company}. Requires skills in ${skills.join(', ')}.`,
    };
  }

  public extractSpokenLanguages(
    skillSource: (string | { name?: string })[] = [],
    description?: string
  ): SpokenLanguage[] | undefined {
    const foundMap = new Map<string, SpokenLanguageLevel>();

    const langNames: Record<string, string> = {
      english: 'English',
      angielski: 'English',
      angielskiego: 'English',
      angielsku: 'English',
      en: 'English',
      polish: 'Polish',
      polski: 'Polish',
      polskiego: 'Polish',
      polsku: 'Polish',
      pl: 'Polish',
      german: 'German',
      deutsch: 'German',
      niemiecki: 'German',
      niemieckiego: 'German',
      niemiecku: 'German',
      de: 'German',
      spanish: 'Spanish',
      hiszpanski: 'Spanish',
      hiszpański: 'Spanish',
      es: 'Spanish',
      french: 'French',
      francais: 'French',
      français: 'French',
      fr: 'French',
    };

    const levelKeywords: Record<string, SpokenLanguageLevel> = {
      native: 'Native',
      ojczysty: 'Native',
      c2: 'C2',
      c1: 'C1',
      fluent: 'C1',
      biegly: 'C1',
      biegły: 'C1',
      biegla: 'C1',
      biegła: 'C1',
      b2: 'B2',
      communicative: 'B2',
      komunikatywny: 'B2',
      komunikatywna: 'B2',
      komunikatywnosc: 'B2',
      komunikatywność: 'B2',
      b1: 'B1',
      a2: 'A2',
      a1: 'A1',
    };

    const extractFromText = (text: string) => {
      const lower = text.toLowerCase().trim();
      for (const [key, canonicalName] of Object.entries(langNames)) {
        let isMatch = false;
        if (key.length <= 2) {
          const pattern = new RegExp(`\\b${key}\\b`, 'i');
          isMatch = pattern.test(lower);
        } else {
          isMatch = lower.includes(key);
        }

        if (isMatch) {
          let level: SpokenLanguageLevel = 'B2';
          for (const [lvlKey, lvlValue] of Object.entries(levelKeywords)) {
            const pattern = new RegExp(`\\b${lvlKey}\\b`, 'i');
            if (pattern.test(lower)) {
              level = lvlValue;
              break;
            }
          }
          if (!foundMap.has(canonicalName)) {
            foundMap.set(canonicalName, level);
          } else if (foundMap.get(canonicalName) === 'B2' && level !== 'B2') {
            foundMap.set(canonicalName, level);
          }
        }
      }
    };

    for (const item of skillSource) {
      if (typeof item === 'string') {
        extractFromText(item);
      } else if (item && typeof item === 'object') {
        const rec = item as Record<string, unknown>;
        const parts = [rec.name, rec.title, rec.level, rec.value, rec.description]
          .filter((v): v is string | number => v !== undefined && v !== null && String(v).trim().length > 0)
          .map((v) => String(v));
        if (parts.length > 0) {
          extractFromText(parts.join(' '));
        }
      }
    }

    if (description) {
      extractFromText(description);
    }

    if (foundMap.size === 0) return undefined;

    return Array.from(foundMap.entries()).map(([language, level]) => ({
      language,
      level,
    }));
  }

  private mapSkillToCategory(skill: string): string | null {
    const s = skill.toLowerCase();
    if (s.includes('react') || s.includes('vue') || s.includes('front') || s.includes('js') || s.includes('script')) {
      return 'javascript';
    }
    if (s.includes('node') || s.includes('backend') || s.includes('full')) {
      return 'javascript';
    }
    if (s.includes('python') || s.includes('django') || s.includes('ai') || s.includes('data')) {
      return 'python';
    }
    if (s.includes('java') || s.includes('spring')) {
      return 'java';
    }
    if (s.includes('devops') || s.includes('aws') || s.includes('docker') || s.includes('cloud')) {
      return 'devops';
    }
    return null;
  }

  public getSampleFallbackListings(criteria: SearchCriteria, page: number = 1): ProviderResult {
    const userRole = criteria.targetRole || criteria.keywords?.[0] || criteria.skills?.[0] || 'Full Stack Developer';
    const now = Date.now();

    const pageSize = criteria.limit && criteria.limit > 0 ? Math.min(criteria.limit, 50) : FALLBACK_PAGE_SIZE;
    const totalItems = FALLBACK_JOB_POOL.length;
    const effectivePage = Math.max(1, page);
    const startIndex = ((effectivePage - 1) * pageSize) % totalItems;

    const pageItems: typeof FALLBACK_JOB_POOL = [];
    for (let i = 0; i < pageSize; i++) {
      const idx = (startIndex + i) % totalItems;
      pageItems.push(FALLBACK_JOB_POOL[idx]);
    }

    const baseTimestamp = now - (effectivePage - 1) * 3600 * 1000 * 24;

    const listings: JobListing[] = pageItems.map((item, idx) => {
      const itemTimestamp = new Date(baseTimestamp - idx * 60000).toISOString();
      return {
        id: `justjoin_demo_p${effectivePage}_${item.id}_${idx}`,
        provider: 'justjoin',
        title: item.titleTemplate(userRole),
        company: item.company,
        city: item.city,
        isRemote: item.isRemote,
        workplaceType: item.workplaceType,
        seniority: item.seniority,
        requiredSkills: item.requiredSkills,
        spokenLanguages: item.spokenLanguages,
        salaryRange: item.salaryRange,
        url: `https://justjoin.it/offers/${item.slug}`,
        publishedAt: itemTimestamp,
        description: item.description,
      };
    });

    const newestPublishedAt = listings[0]?.publishedAt || new Date(baseTimestamp).toISOString();

    return {
      listings,
      nextCursor: { publishedAtCursor: newestPublishedAt },
      fallback: true,
    };
  }
}

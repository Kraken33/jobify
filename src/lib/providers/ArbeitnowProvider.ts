import { BaseJobProvider } from './JobProvider';
import {
  JobListing,
  ProviderResult,
  SearchCriteria,
  SeniorityLevel,
  SpokenLanguage,
  SpokenLanguageLevel,
} from '@/types';
import {
  ARBEITNOW_FALLBACK_JOB_POOL,
  ARBEITNOW_FALLBACK_PAGE_SIZE,
} from './arbeitnowFallbackPool';
import { loggedFetch } from '../logger';

export const ARBEITNOW_API_ENDPOINT = 'https://www.arbeitnow.com/api/job-board-api';
const ARBEITNOW_REQUEST_TIMEOUT_MS = 15_000;

export interface ArbeitnowJobItem {
  slug?: string;
  company_name?: string;
  title?: string;
  description?: string;
  remote?: boolean;
  url?: string;
  tags?: string[];
  job_types?: string[];
  location?: string;
  created_at?: number; // UNIX epoch timestamp in seconds
}

export interface ArbeitnowApiResponse {
  data?: ArbeitnowJobItem[];
  links?: {
    first?: string;
    last?: string;
    prev?: string | null;
    next?: string | null;
  };
  meta?: {
    current_page?: number;
    from?: number;
    to?: number;
    per_page?: number;
    total?: number;
  };
}

export class ArbeitnowProvider extends BaseJobProvider {
  id = 'arbeitnow';
  name = 'Arbeitnow';

  async searchJobs(criteria: SearchCriteria): Promise<ProviderResult> {
    try {
      return await this.fetchLiveJobs(criteria);
    } catch (error) {
      console.warn(
        'Arbeitnow job search warning:',
        error instanceof Error ? error.message : 'unknown error'
      );
      return this.getSampleFallbackListings(criteria, this.resolveFallbackPage(criteria));
    }
  }

  override async getJobCount(criteria: SearchCriteria = {}): Promise<number | null> {
    try {
      if (this.hasSearchTerms(criteria)) {
        const html = await this.fetchWebSearchPage(criteria, 1);
        const count = this.parseTotalCountFromHtml(html);
        if (count !== null) return count;
      }

      const payload = await this.fetchApiPage(1);
      if (typeof payload?.meta?.total === 'number') {
        return payload.meta.total;
      }
      return ARBEITNOW_FALLBACK_JOB_POOL.length;
    } catch {
      return ARBEITNOW_FALLBACK_JOB_POOL.length;
    }
  }

  private hasSearchTerms(criteria: SearchCriteria): boolean {
    return Boolean(
      (criteria.targetRole && criteria.targetRole.trim().length > 0) ||
        (criteria.keywords && criteria.keywords.length > 0) ||
        (criteria.spokenLanguages && criteria.spokenLanguages.length > 0) ||
        Boolean(criteria.providerHints?.arbeitnow?.endpoint)
    );
  }

  /** Maps endpoint paths to their implicit Arbeitnow tag (when one exists). */
  private static readonly ENDPOINT_TAG_MAP: Record<string, string> = {
    'english-speaking-jobs': 'english speaking',
    'visa-sponsorship-jobs': 'visa sponsorship',
  };

  public buildSearchUrl(criteria: SearchCriteria, page: number = 1): string {
    const params = new URLSearchParams();

    const searchTerm = (criteria.targetRole || criteria.keywords?.join(' ') || '').trim();

    if (searchTerm) {
      params.set('search', searchTerm);
    }

    const endpointPath = criteria.providerHints?.arbeitnow?.endpoint;

    // Build tags: start from spoken-language criteria, then inject the
    // endpoint's implicit tag (if any) so path and tag are always paired.
    const tagsSet = new Set<string>();

    if (criteria.spokenLanguages && criteria.spokenLanguages.length > 0) {
      for (const lang of criteria.spokenLanguages) {
        const name = lang.language?.toLowerCase();
        if (name === 'english' || name?.startsWith('en')) {
          tagsSet.add('english speaking');
        } else if (name === 'german' || name?.startsWith('de')) {
          tagsSet.add('german speaking');
        }
      }
    }

    if (endpointPath) {
      const implicitTag = ArbeitnowProvider.ENDPOINT_TAG_MAP[endpointPath];
      if (implicitTag) {
        tagsSet.add(implicitTag);
      }
    }

    if (tagsSet.size > 0) {
      params.set('tags', JSON.stringify(Array.from(tagsSet)));
    }

    params.set('sort_by', 'newest');
    params.set('date_posted', 'all');
    params.set('page', String(page));

    // Use provider-specific endpoint path when supplied, otherwise generic root
    const basePath = endpointPath
      ? `https://www.arbeitnow.com/${endpointPath}`
      : 'https://www.arbeitnow.com';

    return `${basePath}?${params.toString()}`;
  }

  public async fetchWebSearchPage(
    criteria: SearchCriteria,
    page: number = 1
  ): Promise<string> {
    const url = this.buildSearchUrl(criteria, page);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ARBEITNOW_REQUEST_TIMEOUT_MS);

    try {
      const response = await loggedFetch(url, {
        method: 'GET',
        providerId: 'arbeitnow',
        headers: {
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        signal: controller.signal,
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Arbeitnow web search responded with status ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Arbeitnow web search request timed out after ${ARBEITNOW_REQUEST_TIMEOUT_MS}ms`);
      }
      throw new Error(
        error instanceof Error ? error.message : 'Arbeitnow web search request failed'
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  public parseTotalCountFromHtml(html: string): number | null {
    // 1. Try parsing embedded script data object (let data = {...})
    const dataMatch = html.match(/(?:let|var|const)\s+data\s*=\s*(\{[\s\S]*?\});/);
    if (dataMatch) {
      try {
        const data = JSON.parse(dataMatch[1]);
        if (typeof data?.total === 'number') {
          return data.total;
        }
        if (typeof data?.last_page === 'number' && typeof data?.per_page === 'number') {
          return data.last_page * data.per_page;
        }
      } catch {
        // Fall back if script data JSON parsing fails
      }
    }

    // 2. Fallback to DOM regex matching (guarded against page-count text like "Showing 1 of 12 pages")
    const isShowingPages = /Showing\s+(?:page\s+)?\d+\s+of\s+\d+\s+pages/i.test(html);
    if (!isShowingPages) {
      const totalMatch =
        html.match(/(\d[\d,]*)\s+(?:Jobs|jobs|Vacancies|vacancies)/i) ||
        html.match(/Showing\s+\d+[\s\S]*?of\s+(\d[\d,]*)(?!\s+pages)/i) ||
        html.match(/(\d[\d,]*)\s+results/i);

      if (totalMatch) {
        const parsed = parseInt(totalMatch[1].replace(/,/g, ''), 10);
        if (!Number.isNaN(parsed)) return parsed;
      }
    }

    return null;
  }

  public parseWebSearchHtml(html: string, criteria: SearchCriteria = {}): JobListing[] {
    const chunks = html.split(/<div class="[^"]*flex-shrink-0 h-16 w-16/).slice(1);
    const listings: JobListing[] = [];
    const seenIds = new Set<string>();

    for (const chunk of chunks) {
      const linkMatch = chunk.match(
        /<a[^>]+href="([^"]+)"[^>]*data-job-item-link="true"[^>]*title="([^"]+)"/i
      );
      if (!linkMatch) continue;

      const fullUrl = linkMatch[1].startsWith('http')
        ? linkMatch[1]
        : `https://www.arbeitnow.com${linkMatch[1]}`;
      const title = linkMatch[2].replace(/&amp;/g, '&').trim();

      const slugMatch = fullUrl.match(/\/jobs\/companies\/[^/]+\/([^/]+)/);
      const slug = slugMatch ? slugMatch[1] : `${title.toLowerCase().replace(/\s+/g, '-')}`;

      const compMatch =
        chunk.match(/alt="([^"]+) Jobs"/i) || chunk.match(/title="Jobs from ([^"]+)"/i);
      const company = compMatch ? compMatch[1].replace(/&amp;/g, '&').trim() : 'Unknown Company';

      const locMatch = chunk.match(/<span class="text-gray-600">\s*([\s\S]*?)\s*<\/span>/i);
      const location = locMatch ? locMatch[1].replace(/&amp;/g, '&').trim() : '';

      const tagMatches = [
        ...chunk.matchAll(/data-key="([^"]+)"/g),
      ].map((m) => m[1].trim());
      const tags = Array.from(new Set(tagMatches));

      const isRemote =
        chunk.toLowerCase().includes('remote') ||
        tags.some((t) => t.toLowerCase().includes('remote'));

      const city = location || (isRemote ? 'Remote' : 'Germany');

      const id = `arbeitnow_${slug}`;
      if (seenIds.has(id)) continue;
      seenIds.add(id);

      const requiredSkills = this.extractSkills(tags, chunk, criteria);
      const spokenLanguages = this.extractSpokenLanguages(tags, chunk);

      const listing: JobListing = {
        id,
        provider: 'arbeitnow',
        title,
        company,
        city,
        isRemote,
        workplaceType: isRemote ? 'remote' : 'hybrid',
        seniority: this.mapTextToSeniority(`${title} ${tags.join(' ')}`),
        requiredSkills,
        spokenLanguages: spokenLanguages.length > 0 ? spokenLanguages : undefined,
        url: fullUrl,
        publishedAt: new Date().toISOString(),
        description: `${title} at ${company} in ${city}. Tags: ${tags.join(', ')}`,
      };

      listings.push(listing);
    }

    return listings;
  }

  private async fetchLiveJobs(criteria: SearchCriteria): Promise<ProviderResult> {
    if (this.hasSearchTerms(criteria)) {
      try {
        let startPage = 1;
        if (criteria.publishedAtCursor?.startsWith('page:')) {
          const parsedPage = parseInt(criteria.publishedAtCursor.replace('page:', ''), 10);
          if (!Number.isNaN(parsedPage) && parsedPage >= 1) {
            startPage = parsedPage;
          }
        } else if (criteria.seenJobIds && criteria.seenJobIds.length > 0) {
          startPage = Math.max(1, Math.floor(criteria.seenJobIds.length / 30) + 1);
        }

        const targetLimit = Math.max(1, Math.min(100, criteria.limit || 20));
        const seenSet = new Set(criteria.seenJobIds || []);
        const collectedListings: JobListing[] = [];
        let currentPage = startPage;
        const maxPagesToFetch = startPage + 3;

        while (collectedListings.length < targetLimit && currentPage <= maxPagesToFetch) {
          const html = await this.fetchWebSearchPage(criteria, currentPage);
          const pageListings = this.parseWebSearchHtml(html, criteria);
          if (!pageListings || pageListings.length === 0) {
            break;
          }

          for (const listing of pageListings) {
            if (!seenSet.has(listing.id)) {
              seenSet.add(listing.id);
              collectedListings.push(listing);
              if (collectedListings.length >= targetLimit) {
                break;
              }
            }
          }

          currentPage++;
        }

        if (collectedListings.length > 0) {
          return {
            listings: collectedListings,
            nextCursor: { publishedAtCursor: `page:${currentPage}` },
            fallback: false,
          };
        }
      } catch (webError) {
        console.warn(
          'Arbeitnow web search attempt failed, trying REST API fallback:',
          webError instanceof Error ? webError.message : 'unknown error'
        );
      }
    }

    const payload = await this.fetchApiPage(1);
    return this.normalizeApiResponse(payload, criteria);
  }

  public async fetchApiPage(page: number = 1): Promise<ArbeitnowApiResponse> {
    const endpoint = `${ARBEITNOW_API_ENDPOINT}?page=${page}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ARBEITNOW_REQUEST_TIMEOUT_MS);

    try {
      const response = await loggedFetch(endpoint, {
        method: 'GET',
        providerId: 'arbeitnow',
        headers: {
          Accept: 'application/json',
        },
        signal: controller.signal,
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Arbeitnow API responded with status ${response.status}`);
      }

      return (await response.json()) as ArbeitnowApiResponse;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Arbeitnow API request timed out after ${ARBEITNOW_REQUEST_TIMEOUT_MS}ms`);
      }
      throw new Error(
        error instanceof Error ? error.message : 'Arbeitnow API request failed'
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  public normalizeApiResponse(
    payload: ArbeitnowApiResponse | null | undefined,
    criteria: SearchCriteria = {}
  ): ProviderResult {
    const rawItems = Array.isArray(payload?.data) ? payload.data : [];

    const listings: JobListing[] = [];
    const seenIds = new Set<string>();

    for (const raw of rawItems) {
      const listing = this.normalizeJobItem(raw, criteria);
      if (seenIds.has(listing.id)) continue;
      seenIds.add(listing.id);

      listings.push(listing);
    }

    // Sort newest-first based on publishedAt
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

    const newestPublishedAt = filtered[0]?.publishedAt ?? null;

    return {
      listings: filtered,
      nextCursor: newestPublishedAt ? { publishedAtCursor: newestPublishedAt } : null,
      fallback: false,
    };
  }

  public normalizeJobItem(raw: ArbeitnowJobItem, criteria: SearchCriteria = {}): JobListing {
    const title = (raw.title || 'Software Engineer').trim();
    const company = (raw.company_name || 'Unknown Company').trim();
    const slug = (raw.slug || `${title}-${company}`).trim();
    const isRemote = Boolean(raw.remote);

    const location = (raw.location || '').trim();
    const city = location || (isRemote ? 'Remote' : 'Germany');

    const createdTime = raw.created_at ? raw.created_at * 1000 : Date.now();
    const publishedAt = new Date(createdTime).toISOString();

    const tags = Array.isArray(raw.tags) ? raw.tags : [];
    const jobTypes = Array.isArray(raw.job_types) ? raw.job_types : [];
    const requiredSkills = this.extractSkills(tags, raw.description, criteria);

    const spokenLanguages = this.extractSpokenLanguages(tags, raw.description);

    return {
      id: `arbeitnow_${slug}`,
      provider: 'arbeitnow',
      title,
      company,
      city,
      isRemote,
      workplaceType: isRemote ? 'remote' : 'hybrid',
      seniority: this.mapTextToSeniority(`${title} ${tags.join(' ')}`),
      requiredSkills,
      spokenLanguages: spokenLanguages.length > 0 ? spokenLanguages : undefined,
      url: raw.url || `https://www.arbeitnow.com/view/${slug}`,
      publishedAt,
      description: raw.description || `${title} position at ${company}`,
    };
  }

  public extractSpokenLanguages(tags: string[], description?: string): SpokenLanguage[] {
    const languagesMap = new Map<string, SpokenLanguageLevel>();
    const cleanText = `${tags.join(' ')} ${(description || '').replace(/<[^>]*>/g, ' ')}`;

    const addLanguage = (lang: string, level: SpokenLanguageLevel) => {
      const canonicalLang = this.canonicalizeLanguageName(lang);
      if (!canonicalLang) return;

      const existing = languagesMap.get(canonicalLang);
      if (!existing || this.compareCefrLevels(level, existing) > 0) {
        languagesMap.set(canonicalLang, level);
      }
    };

    // Check tags first
    for (const tag of tags) {
      const lowerTag = tag.toLowerCase().trim();
      if (lowerTag.includes('german') || lowerTag.includes('deutsch')) {
        addLanguage('German', 'B2');
      } else if (lowerTag.includes('english')) {
        addLanguage('English', 'B2');
      }
    }

    // Regex matchers for English and German in description
    if (/english\s+(?:required|fluent|c1|c2|b2|speaking)/i.test(cleanText)) {
      addLanguage('English', /c1|c2|fluent|native/i.test(cleanText) ? 'C1' : 'B2');
    } else if (/\benglish\b/i.test(cleanText) && !languagesMap.has('English')) {
      addLanguage('English', 'B2');
    }

    if (/(?:german|deutsch)\s+(?:required|fließend|c1|c2|b2|b1|gut|verhandlungssicher)/i.test(cleanText)) {
      if (/c1|c2|verhandlungssicher|fließend|native/i.test(cleanText)) {
        addLanguage('German', 'C1');
      } else if (/b1/i.test(cleanText)) {
        addLanguage('German', 'B1');
      } else {
        addLanguage('German', 'B2');
      }
    } else if (/(?:gute|deutschkenntnisse|sehr gute deutsch)/i.test(cleanText)) {
      addLanguage('German', 'B2');
    }

    return Array.from(languagesMap.entries()).map(([language, level]) => ({
      language,
      level,
    }));
  }

  private canonicalizeLanguageName(raw: string): string | null {
    const lower = raw.toLowerCase().trim();
    if (lower.startsWith('en') || lower.includes('english')) return 'English';
    if (lower.startsWith('de') || lower.includes('german') || lower.includes('deutsch')) return 'German';
    if (lower.startsWith('fr') || lower.includes('french') || lower.includes('französisch')) return 'French';
    if (lower.startsWith('es') || lower.includes('spanish') || lower.includes('spanisch')) return 'Spanish';
    return null;
  }

  private compareCefrLevels(a: SpokenLanguageLevel, b: SpokenLanguageLevel): number {
    const order: Record<SpokenLanguageLevel, number> = {
      A1: 1,
      A2: 2,
      B1: 3,
      B2: 4,
      C1: 5,
      C2: 6,
      Native: 7,
    };
    return (order[a] || 0) - (order[b] || 0);
  }

  private extractSkills(tags: string[], description?: string, criteria: SearchCriteria = {}): string[] {
    const skillsSet = new Set<string>();

    for (const tag of tags) {
      if (tag && tag.trim()) {
        skillsSet.add(tag.trim());
      }
    }

    const searchSkills = criteria.skills || [];
    const text = `${tags.join(' ')} ${description || ''}`.toLowerCase();

    for (const skill of searchSkills) {
      const trimmed = skill.trim();
      if (trimmed && text.includes(trimmed.toLowerCase())) {
        skillsSet.add(trimmed);
      }
    }

    return Array.from(skillsSet);
  }

  private matchesCriteria(listing: JobListing, criteria: SearchCriteria): boolean {
    if (criteria.workMode === 'remote' && !listing.isRemote) {
      return false;
    }

    const searchTerms: string[] = [];
    if (criteria.targetRole && criteria.targetRole.trim()) {
      searchTerms.push(criteria.targetRole.trim());
    }
    if (criteria.keywords && criteria.keywords.length > 0) {
      searchTerms.push(...criteria.keywords.filter(Boolean));
    }

    if (searchTerms.length > 0) {
      const haystack = `${listing.title} ${listing.company} ${listing.description || ''} ${listing.requiredSkills.join(' ')}`.toLowerCase();
      const hasKeywordMatch = searchTerms.some((kw) => kw && haystack.includes(kw.toLowerCase().trim()));
      if (!hasKeywordMatch) return false;
    }

    return true;
  }

  private mapTextToSeniority(text: string): SeniorityLevel {
    const value = text.toLowerCase();
    if (/lead|head|principal|staff|architect/.test(value)) return 'lead';
    if (/senior/.test(value)) return 'senior';
    if (/junior|intern|trainee|entry/.test(value)) return 'junior';
    return 'mid';
  }

  private resolveFallbackPage(criteria: SearchCriteria): number {
    const offset = criteria.seenJobIds?.length ?? 0;
    return Math.max(1, Math.floor(offset / ARBEITNOW_FALLBACK_PAGE_SIZE) + 1);
  }

  public getSampleFallbackListings(criteria: SearchCriteria, page: number = 1): ProviderResult {
    const userRole = criteria.targetRole || criteria.keywords?.[0] || criteria.skills?.[0] || 'Software Engineer';
    const now = Date.now();

    const pageSize = ARBEITNOW_FALLBACK_PAGE_SIZE;
    const totalItems = ARBEITNOW_FALLBACK_JOB_POOL.length;
    const effectivePage = Math.max(1, page);
    const startIndex = ((effectivePage - 1) * pageSize) % totalItems;
    const pageItems = ARBEITNOW_FALLBACK_JOB_POOL.slice(startIndex, startIndex + pageSize);

    const baseTimestamp = now - (effectivePage - 1) * 3600 * 1000 * 24;

    const listings: JobListing[] = pageItems.map((item, idx) => {
      const itemTimestamp = new Date(baseTimestamp - idx * 60000).toISOString();
      return {
        id: `arbeitnow_demo_p${effectivePage}_${item.id}`,
        provider: 'arbeitnow',
        title: item.titleTemplate(userRole),
        company: item.company,
        city: item.location,
        isRemote: item.isRemote,
        workplaceType: item.workplaceType,
        seniority: item.seniority,
        requiredSkills: item.requiredSkills,
        spokenLanguages: item.spokenLanguages,
        url: item.url,
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

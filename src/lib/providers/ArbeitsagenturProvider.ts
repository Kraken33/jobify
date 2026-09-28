import { BaseJobProvider } from './JobProvider';
import {
  JobListing,
  ProviderResult,
  SalaryRange,
  SearchCriteria,
  SeniorityLevel,
} from '@/types';
import {
  ARBEITSAGENTUR_FALLBACK_JOB_POOL,
  ARBEITSAGENTUR_FALLBACK_PAGE_SIZE,
} from './arbeitsagenturFallbackPool';

/** Public job search service of the Bundesagentur für Arbeit (arbeitsagentur.de). */
export const ARBEITSAGENTUR_JOBS_ENDPOINT =
  'https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs';

/** Public client key published by the Bundesagentur für Arbeit for the job search API. */
export const ARBEITSAGENTUR_API_KEY = 'jobboerse-jobsuche';

/** Detail portal used when a listing does not expose an external application URL. */
export const ARBEITSAGENTUR_DETAIL_URL_BASE = 'https://www.arbeitsagentur.de/jobsuche/jobdetail';

const ARBEITSAGENTUR_REQUEST_TIMEOUT_MS = 20_000;

/** The service accepts up to 100 items per page; Jobify scans stay well below that. */
const ARBEITSAGENTUR_MAX_PAGE_SIZE = 25;

/** Values that describe a work mode rather than a place the `wo` parameter can resolve. */
const GENERIC_LOCATION_VALUES = /^(remote|any|all|all-locations|hybrid|office|homeoffice|deutschland|germany|dach)$/;

/** Shape of a single entry in the service's `ergebnisliste`. */
export interface ArbeitsagenturJobItem {
  stellenangebotsart?: string;
  stellenangebotsTitel?: string;
  hauptberuf?: string;
  alleBerufe?: string[];
  firma?: string;
  referenznummer?: string;
  chiffrenummer?: string;
  stellenlokationen?: ArbeitsagenturLocation[];
  homeofficemoeglich?: boolean;
  homeofficetyp?: string;
  gehaltsspanneVon?: number;
  gehaltsspanneBis?: number;
  verguetungsangabe?: string;
  vertragsdauer?: string;
  arbeitszeitVollzeit?: boolean;
  externeURL?: string;
  aenderungsdatum?: string;
  datumErsteVeroeffentlichung?: string;
  veroeffentlichungszeitraum?: { von?: string; bis?: string };
}

export interface ArbeitsagenturLocation {
  adresse?: {
    plz?: string;
    ort?: string;
    region?: string;
    land?: string;
  };
  breite?: number;
  laenge?: number;
}

/** Shape of the job search response envelope. */
export interface ArbeitsagenturSearchResponse {
  ergebnisliste?: ArbeitsagenturJobItem[];
  maxErgebnisse?: number;
  page?: number;
  size?: number;
}

export class ArbeitsagenturProvider extends BaseJobProvider {
  id = 'arbeitsagentur';
  name = 'Bundesagentur für Arbeit';

  async searchJobs(criteria: SearchCriteria): Promise<ProviderResult> {
    try {
      return await this.fetchLiveJobs(criteria);
    } catch (error) {
      // The public service needs no credentials, so any HTTP error, timeout or
      // network failure degrades to the deterministic pool instead of failing
      // the whole scan.
      console.warn(
        'Arbeitsagentur job search warning:',
        error instanceof Error ? error.message : 'unknown error'
      );
      return this.getSampleFallbackListings(criteria, this.resolveFallbackPage(criteria));
    }
  }

  /**
   * Serializes search criteria into the service's query parameters.
   * `options.ignoreLocation` drops `wo`, which is used to broaden a search whose
   * requested location the service cannot resolve.
   */
  public buildSearchUrl(
    criteria: SearchCriteria = {},
    options: { ignoreLocation?: boolean } = {}
  ): string {
    const params = new URLSearchParams();

    const keyword = this.resolveSearchKeyword(criteria);
    if (keyword) {
      params.set('was', keyword);
    }

    const location = options.ignoreLocation
      ? undefined
      : this.resolveSearchLocation(criteria.location);
    if (location) {
      params.set('wo', location);
    }

    // The service only exposes a boolean home office filter, so `remote` is the
    // single work mode that can be expressed server-side. `hybrid` and `office`
    // are left to the client-side hard-constraint pre-filter.
    if (criteria.workMode === 'remote') {
      params.set('homeofficemoeglich', 'true');
    }

    // Live scans always read the newest postings and use the published-date
    // cursor as the incremental frontier (mirroring JustJoinProvider).
    // Multi-page offsets are only used by the deterministic fallback pool.
    params.set('page', '1');
    params.set('size', String(this.resolvePageSize(criteria.limit)));

    return `${ARBEITSAGENTUR_JOBS_ENDPOINT}?${params.toString()}`;
  }

  private resolveSearchKeyword(criteria: SearchCriteria): string | undefined {
    const keyword = criteria.keywords?.find((entry) => entry && entry.trim());
    if (keyword) return keyword.trim();

    const skill = criteria.skills?.find((entry) => entry && entry.trim());
    return skill ? skill.trim() : undefined;
  }

  /** Picks the first concrete place name from a free-text location preference. */
  private resolveSearchLocation(location?: string): string | undefined {
    if (!location) return undefined;

    const candidate = location
      .split(/[/,|]/)
      .map((part) => part.trim())
      .find((part) => part && !GENERIC_LOCATION_VALUES.test(part.toLowerCase()));

    return candidate || undefined;
  }

  private resolvePageSize(limit?: number): number {
    if (!limit || limit <= 0) return ARBEITSAGENTUR_MAX_PAGE_SIZE;
    return Math.min(Math.round(limit), ARBEITSAGENTUR_MAX_PAGE_SIZE);
  }

  /**
   * Fetches live postings, broadening the search once when the requested
   * location cannot be resolved by the service.
   *
   * Throws on transport/HTTP errors so the caller can degrade gracefully to the
   * deterministic fallback pool.
   */
  private async fetchLiveJobs(criteria: SearchCriteria): Promise<ProviderResult> {
    const requestedLocation = this.resolveSearchLocation(criteria.location);

    const primary = await this.requestLivePage(criteria, false);

    // This board only lists jobs located in Germany, and a location outside its
    // market is answered with HTTP 200 and a near-empty envelope rather than an
    // error. Widen the search once without `wo` so the scan returns live postings
    // instead of dead-ending on an unsatisfiable location.
    if (primary.hasUsableListing || !requestedLocation) return primary.result;

    const broadened = await this.requestLivePage(criteria, true);
    if (!broadened.hasUsableListing) return broadened.result;

    return {
      ...broadened.result,
      notice: `No postings matched "${requestedLocation}" on this board, so the location filter was skipped.`,
    };
  }

  /**
   * Requests one page of the public search endpoint and reports whether the page
   * held anything usable for the request. The check deliberately inspects the raw
   * page and never the cursor-filtered view, so an incremental scan whose frontier
   * already consumed the page is not mistaken for a failed query.
   */
  private async requestLivePage(
    criteria: SearchCriteria,
    ignoreLocation: boolean
  ): Promise<{ result: ProviderResult; hasUsableListing: boolean }> {
    const payload = await this.fetchSearchEnvelope(criteria, ignoreLocation);

    return {
      result: this.normalizeSearchResponse(payload, criteria),
      hasUsableListing: this.pageHasUsableListing(payload, criteria),
    };
  }

  /**
   * True when the returned page contains at least one posting this request can
   * use. Remote tracks additionally require a home office posting, because the
   * service enforces `homeofficemoeglich` only loosely and can answer a
   * home-office query with on-site postings.
   */
  private pageHasUsableListing(
    payload: ArbeitsagenturSearchResponse | null | undefined,
    criteria: SearchCriteria
  ): boolean {
    const rawItems = Array.isArray(payload?.ergebnisliste) ? payload.ergebnisliste : [];
    if (rawItems.length === 0) return false;
    if (criteria.workMode !== 'remote') return true;

    return rawItems.some((raw) => Boolean(raw.homeofficemoeglich));
  }

  /**
   * Calls the public job search endpoint server-side. Throws on transport and
   * HTTP errors so the caller can degrade gracefully to the fallback pool.
   */
  private async fetchSearchEnvelope(
    criteria: SearchCriteria,
    ignoreLocation: boolean
  ): Promise<ArbeitsagenturSearchResponse> {
    const endpoint = this.buildSearchUrl(criteria, { ignoreLocation });
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ARBEITSAGENTUR_REQUEST_TIMEOUT_MS);

    let payload: unknown;
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          // Public client key: no user registration or token required.
          'X-API-Key': ARBEITSAGENTUR_API_KEY,
          Accept: 'application/json',
        },
        signal: controller.signal,
        // Listings change continuously: never serve a cached response.
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Arbeitsagentur job search responded with status ${response.status}`);
      }

      payload = await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(
          `Arbeitsagentur job search timed out after ${ARBEITSAGENTUR_REQUEST_TIMEOUT_MS}ms`
        );
      }
      throw new Error(
        error instanceof Error ? error.message : 'Arbeitsagentur job search request failed'
      );
    } finally {
      clearTimeout(timeoutId);
    }

    return (payload ?? {}) as ArbeitsagenturSearchResponse;
  }

  /**
   * Maps a search response into the canonical `JobListing` domain model,
   * deduplicating by id, sorting newest-first and applying cursor pagination.
   */
  public normalizeSearchResponse(
    payload: ArbeitsagenturSearchResponse | null | undefined,
    criteria: SearchCriteria = {}
  ): ProviderResult {
    const rawItems = Array.isArray(payload?.ergebnisliste) ? payload.ergebnisliste : [];

    const listings: JobListing[] = [];
    const seenIds = new Set<string>();

    for (const raw of rawItems) {
      const listing = this.normalizeJobItem(raw, criteria);
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

    const newestPublishedAt = filtered[0]?.publishedAt ?? null;

    return {
      listings: filtered,
      nextCursor: newestPublishedAt ? { publishedAtCursor: newestPublishedAt } : null,
      fallback: false,
    };
  }

  /** Normalizes a single Arbeitsagentur job entry into a canonical listing. */
  public normalizeJobItem(raw: ArbeitsagenturJobItem, criteria: SearchCriteria = {}): JobListing {
    const title = raw.stellenangebotsTitel || raw.hauptberuf || 'Software Engineer';
    const company = raw.firma || 'Unbekannt';
    const reference = (raw.referenznummer || '').trim();
    const itemSlug = this.buildItemSlug(raw, title, company);

    const city = raw.stellenlokationen?.find((location) => location?.adresse?.ort)?.adresse?.ort;
    const isRemote = Boolean(raw.homeofficemoeglich);
    const workplaceType = this.mapWorkplaceType(raw);

    return {
      id: `arbeitsagentur_${itemSlug}`,
      provider: 'arbeitsagentur',
      title,
      company,
      city: city || (isRemote ? 'Homeoffice' : 'Deutschland'),
      isRemote,
      workplaceType,
      seniority: this.mapTextToSeniority(`${title} ${raw.hauptberuf || ''}`),
      requiredSkills: this.extractRequiredSkills(raw, criteria),
      salaryRange: this.parseSalaryRange(raw),
      url:
        raw.externeURL?.trim() ||
        `${ARBEITSAGENTUR_DETAIL_URL_BASE}/${encodeURIComponent(reference || itemSlug)}`,
      publishedAt: this.parseDate(
        raw.aenderungsdatum ||
          raw.datumErsteVeroeffentlichung ||
          raw.veroeffentlichungszeitraum?.von
      ),
      description: this.buildDescription(raw, title, company, city, isRemote, reference),
    };
  }

  /** Maps the home office flags onto the canonical work mode vocabulary. */
  private mapWorkplaceType(raw: ArbeitsagenturJobItem): string {
    if (!raw.homeofficemoeglich) return 'office';
    return raw.homeofficetyp === 'NACH_VEREINBARUNG' ? 'hybrid' : 'remote';
  }

  /**
   * The service does not expose a skill list, so the posted occupation(s) and any
   * target-track skill that actually appears in the posting text are surfaced for
   * the AI matcher.
   */
  private extractRequiredSkills(raw: ArbeitsagenturJobItem, criteria: SearchCriteria): string[] {
    const skills: string[] = [];

    for (const occupation of raw.alleBerufe || []) {
      const label = String(occupation).trim();
      if (label && !skills.includes(label)) skills.push(label);
    }

    const haystack = `${raw.stellenangebotsTitel || ''} ${raw.hauptberuf || ''} ${(
      raw.alleBerufe || []
    ).join(' ')}`.toLowerCase();

    for (const skill of criteria.skills || []) {
      const label = skill.trim();
      if (label && !skills.includes(label) && haystack.includes(label.toLowerCase())) {
        skills.push(label);
      }
    }

    return skills;
  }

  /** Parses the annual/one-off salary range when the employer published one. */
  private parseSalaryRange(raw: ArbeitsagenturJobItem): SalaryRange | undefined {
    const min = this.toNumber(raw.gehaltsspanneVon);
    const max = this.toNumber(raw.gehaltsspanneBis);

    if (min === undefined && max === undefined) return undefined;

    const compensation = raw.verguetungsangabe?.toLowerCase().trim();

    return {
      min,
      max,
      currency: 'EUR',
      type: compensation && compensation !== 'keine_angaben' ? compensation : undefined,
    };
  }

  private toNumber(value: unknown): number | undefined {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? Math.round(value) : undefined;
    }
    if (typeof value !== 'string' || !value.trim()) return undefined;

    const parsed = Number(value.replace(/[^\d.]/g, ''));
    return Number.isFinite(parsed) ? Math.round(parsed) : undefined;
  }

  private buildDescription(
    raw: ArbeitsagenturJobItem,
    title: string,
    company: string,
    city: string | undefined,
    isRemote: boolean,
    reference: string
  ): string {
    const parts = [`${title} at ${company}`];

    if (city) parts.push(`Location: ${city}`);
    if (raw.vertragsdauer && raw.vertragsdauer.toUpperCase() !== 'KEINE_ANGABE') {
      parts.push(`Contract: ${raw.vertragsdauer}`);
    }
    if (raw.arbeitszeitVollzeit) parts.push('Full-time position');
    if (isRemote) parts.push('Home office possible');
    if (reference) parts.push(`Reference: ${reference}`);

    return `${parts.join('. ')}.`;
  }

  /** Derives the stable listing slug, preferring the official reference number. */
  private buildItemSlug(raw: ArbeitsagenturJobItem, title: string, company: string): string {
    const reference = (raw.referenznummer || '').trim();
    if (reference) return reference;

    const cipher = (raw.chiffrenummer || '').trim();
    if (cipher) return cipher;

    return `${title}_${company}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private mapTextToSeniority(text: string): SeniorityLevel {
    const value = text.toLowerCase();

    if (/lead|head|leitung|leiter|principal|staff|architekt|architect|expert|spezialist/.test(value)) {
      return 'lead';
    }
    if (/senior/.test(value)) return 'senior';
    if (
      /junior|absolvent|trainee|praktik|werkstudent|ausbildung|intern|einsteiger|berufseinsteiger|quereinsteiger/.test(
        value
      )
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
   * in fixed-size pages so successive scans while the service is unreachable keep
   * returning fresh (non-overlapping) demo listings.
   */
  private resolveFallbackPage(criteria: SearchCriteria): number {
    const offset = criteria.seenJobIds?.length ?? 0;
    return Math.max(1, Math.floor(offset / ARBEITSAGENTUR_FALLBACK_PAGE_SIZE) + 1);
  }

  public getSampleFallbackListings(criteria: SearchCriteria, page: number = 1): ProviderResult {
    const userRole = criteria.skills?.[0] || 'Software Engineer';
    const now = Date.now();

    const pageSize = ARBEITSAGENTUR_FALLBACK_PAGE_SIZE;
    const totalItems = ARBEITSAGENTUR_FALLBACK_JOB_POOL.length;
    const effectivePage = Math.max(1, page);
    const startIndex = ((effectivePage - 1) * pageSize) % totalItems;
    const pageItems = ARBEITSAGENTUR_FALLBACK_JOB_POOL.slice(startIndex, startIndex + pageSize);

    const baseTimestamp = now - (effectivePage - 1) * 3600 * 1000 * 24;

    const listings: JobListing[] = pageItems.map((item, idx) => {
      const itemTimestamp = new Date(baseTimestamp - idx * 60000).toISOString();
      return {
        id: `arbeitsagentur_demo_p${effectivePage}_${item.id}`,
        provider: 'arbeitsagentur',
        title: item.titleTemplate(userRole),
        company: item.company,
        city: item.city,
        isRemote: item.isRemote,
        workplaceType: item.workplaceType,
        seniority: item.seniority,
        requiredSkills: item.requiredSkills,
        spokenLanguages: item.spokenLanguages,
        salaryRange: item.salaryRange,
        url: `${ARBEITSAGENTUR_DETAIL_URL_BASE}/${item.referenznummer}`,
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



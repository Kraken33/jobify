import { BaseJobProvider } from './JobProvider';
import { JobListing, ProviderResult, SearchCriteria, SeniorityLevel } from '@/types';
import { FALLBACK_JOB_POOL } from './fallbackPool';

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

  private baseUrl = 'https://api.justjoin.it/v2/user-panel/offers';

  async searchJobs(criteria: SearchCriteria): Promise<ProviderResult> {
    const limit = criteria.limit || 25;
    const url = new URL(this.baseUrl);

    url.searchParams.set('page', '1');
    url.searchParams.set('perPage', String(limit));
    url.searchParams.set('sortBy', 'published_at');
    url.searchParams.set('orderBy', 'DESC');

    if (criteria.workMode === 'remote') {
      url.searchParams.set('workplaceType', 'remote');
    } else if (criteria.workMode === 'hybrid') {
      url.searchParams.set('workplaceType', 'partly_remote');
    } else if (criteria.workMode === 'office') {
      url.searchParams.set('workplaceType', 'office');
    }

    if (criteria.seniority) {
      url.searchParams.append('experienceLevels[]', criteria.seniority);
    }

    // Map keywords/skills to categories if applicable
    if (criteria.skills && criteria.skills.length > 0) {
      const primaryCategory = this.mapSkillToCategory(criteria.skills[0]);
      if (primaryCategory) {
        url.searchParams.append('categories[]', primaryCategory);
      }
    }

    try {
      const response = await fetch(url.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Jobify/2.0; +https://github.com)',
          'Accept': 'application/json',
          'Version': '2',
        },
        next: { revalidate: 300 },
      });

      if (!response.ok) {
        throw new Error(`JustJoin API responded with status ${response.status}`);
      }

      const json = await response.json();
      const rawOffers: JustJoinRawOffer[] = Array.isArray(json)
        ? json
        : Array.isArray(json.data)
        ? json.data
        : [];

      let listings = rawOffers.map((raw) => this.normalizeOffer(raw));

      if (criteria.publishedAtCursor) {
        const cursorTime = new Date(criteria.publishedAtCursor).getTime();
        listings = listings.filter((l) => {
          if (!l.publishedAt) return false;
          return new Date(l.publishedAt).getTime() > cursorTime;
        });
      }

      let newestPublishedAt: string | null = null;
      for (const item of listings) {
        if (item.publishedAt) {
          if (!newestPublishedAt || new Date(item.publishedAt).getTime() > new Date(newestPublishedAt).getTime()) {
            newestPublishedAt = item.publishedAt;
          }
        }
      }

      return {
        listings,
        nextCursor: newestPublishedAt ? { publishedAtCursor: newestPublishedAt } : null,
        fallback: false,
      };
    } catch (error) {
      // In case the live API is blocked or offline during test/demo, provide structured fallback
      console.warn('JustJoin API fetch warning:', error);
      return this.getSampleFallbackListings(criteria, 1);
    }
  }

  public normalizeOffer(raw: JustJoinRawOffer): JobListing {
    const offerId = String(raw.slug || raw.id || Math.random().toString(36).substring(7));
    const company = raw.companyName || raw.company_name || 'Tech Employer';
    const title = raw.title || 'Software Engineer';
    const wpType = raw.workplaceType || raw.workplace_type || 'remote';
    const isRemote = wpType === 'remote' || wpType === 'partly_remote';

    // Extract skills
    const rawSkills = raw.requiredSkills || raw.skills || [];
    const skills = this.extractSkillTags(rawSkills);

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
    const userRole = criteria.skills?.[0] || 'Full Stack Developer';
    const now = Date.now();

    const pageSize = 3;
    const totalItems = FALLBACK_JOB_POOL.length;
    const effectivePage = Math.max(1, page);
    const startIndex = ((effectivePage - 1) * pageSize) % totalItems;
    const pageItems = FALLBACK_JOB_POOL.slice(startIndex, startIndex + pageSize);

    const baseTimestamp = now - (effectivePage - 1) * 3600 * 1000 * 24;

    const listings: JobListing[] = pageItems.map((item, idx) => {
      const itemTimestamp = new Date(baseTimestamp - idx * 60000).toISOString();
      return {
        id: `justjoin_demo_p${effectivePage}_${item.id}`,
        provider: 'justjoin',
        title: item.titleTemplate(userRole),
        company: item.company,
        city: item.city,
        isRemote: item.isRemote,
        workplaceType: item.workplaceType,
        seniority: item.seniority,
        requiredSkills: item.requiredSkills,
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

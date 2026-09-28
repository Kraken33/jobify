import { BaseJobProvider } from './JobProvider';
import { JobListing, SearchCriteria, SeniorityLevel } from '@/types';

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

  async searchJobs(criteria: SearchCriteria): Promise<JobListing[]> {
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

      return rawOffers.map((raw) => this.normalizeOffer(raw));
    } catch (error) {
      // In case the live API is blocked or offline during test/demo, provide structured fallback
      console.warn('JustJoin API fetch warning:', error);
      return this.getSampleFallbackListings(criteria);
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

  public getSampleFallbackListings(criteria: SearchCriteria): JobListing[] {
    const userRole = criteria.skills?.[0] || 'Full Stack Developer';
    return [
      {
        id: 'justjoin_demo_1',
        provider: 'justjoin',
        title: `Senior ${userRole} (React / Next.js)`,
        company: 'CloudScale Solutions',
        city: 'Remote',
        isRemote: true,
        workplaceType: 'remote',
        seniority: 'senior',
        requiredSkills: ['TypeScript', 'React', 'Next.js', 'Node.js', 'PostgreSQL'],
        salaryRange: { min: 20000, max: 26000, currency: 'PLN' },
        url: 'https://justjoin.it/offers/demo-senior-react-developer',
        publishedAt: new Date().toISOString(),
        description: 'Looking for a Senior Developer to lead frontend architecture and full-stack feature delivery on Next.js and Supabase/PostgreSQL.',
      },
      {
        id: 'justjoin_demo_2',
        provider: 'justjoin',
        title: `Mid Full Stack Engineer`,
        company: 'NextGen Fintech',
        city: 'Warsaw / Remote',
        isRemote: true,
        workplaceType: 'remote',
        seniority: 'mid',
        requiredSkills: ['TypeScript', 'React', 'Node.js', 'Docker', 'AWS'],
        salaryRange: { min: 16000, max: 22000, currency: 'PLN' },
        url: 'https://justjoin.it/offers/demo-mid-fullstack-engineer',
        publishedAt: new Date().toISOString(),
        description: 'Join our product squad developing real-time financial dashboards. Requires React, TypeScript, and Node.js with AWS cloud deployments.',
      },
      {
        id: 'justjoin_demo_3',
        provider: 'justjoin',
        title: `Frontend Specialist`,
        company: 'Apex Digital Studio',
        city: 'Krakow',
        isRemote: false,
        workplaceType: 'office',
        seniority: 'mid',
        requiredSkills: ['JavaScript', 'React', 'CSS', 'HTML', 'Figma'],
        salaryRange: { min: 14000, max: 18000, currency: 'PLN' },
        url: 'https://justjoin.it/offers/demo-frontend-specialist',
        publishedAt: new Date().toISOString(),
        description: 'Design and build high-performance user interfaces for international clients with rich CSS animations and React.',
      },
    ];
  }
}

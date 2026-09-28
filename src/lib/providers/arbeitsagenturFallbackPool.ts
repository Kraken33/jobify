import { SeniorityLevel } from '@/types';

export interface ArbeitsagenturFallbackTemplate {
  id: string;
  titleTemplate: (role: string) => string;
  company: string;
  city: string;
  isRemote: boolean;
  workplaceType: string;
  seniority: SeniorityLevel;
  requiredSkills: string[];
  salaryRange: { min: number; max: number; currency: string };
  referenznummer: string;
  description: string;
}

/** Number of fallback listings generated per virtual page (kept in sync with the generator). */
export const ARBEITSAGENTUR_FALLBACK_PAGE_SIZE = 3;

/**
 * Deterministic offline pool for the Bundesagentur für Arbeit provider. Listings
 * mirror the German market (EUR annual salaries, German cities) so that a scan
 * without network access still demos the DACH search track coherently.
 */
export const ARBEITSAGENTUR_FALLBACK_JOB_POOL: ArbeitsagenturFallbackTemplate[] = [
  {
    id: '1',
    titleTemplate: (role) => `Senior ${role} (React / TypeScript)`,
    company: 'CloudWorks GmbH',
    city: 'Berlin',
    isRemote: true,
    workplaceType: 'remote',
    seniority: 'senior',
    requiredSkills: ['TypeScript', 'React', 'Next.js', 'Node.js'],
    salaryRange: { min: 70000, max: 90000, currency: 'EUR' },
    referenznummer: '10000-100001-S',
    description:
      'Design and deliver React front ends for a multi-tenant SaaS platform, working fully remote within a cross-functional product team.',
  },
  {
    id: '2',
    titleTemplate: () => 'Backend Engineer (Java / Spring Boot)',
    company: 'Nordlicht Systeme AG',
    city: 'Hamburg',
    isRemote: false,
    workplaceType: 'hybrid',
    seniority: 'mid',
    requiredSkills: ['Java', 'Spring Boot', 'PostgreSQL', 'Docker'],
    salaryRange: { min: 60000, max: 75000, currency: 'EUR' },
    referenznummer: '10000-100002-S',
    description:
      'Build and maintain Spring Boot services for logistics customers, with two days of home office per week and on-call rotation.',
  },
  {
    id: '3',
    titleTemplate: () => 'Full Stack Developer (Node.js / Vue)',
    company: 'Rheinstadt Digital GmbH',
    city: 'Köln',
    isRemote: true,
    workplaceType: 'remote',
    seniority: 'mid',
    requiredSkills: ['JavaScript', 'Node.js', 'Vue.js', 'PostgreSQL'],
    salaryRange: { min: 55000, max: 70000, currency: 'EUR' },
    referenznummer: '10000-100003-S',
    description:
      'Own features end to end in a Vue and Node.js stack, from API design through to production monitoring.',
  },
  {
    id: '4',
    titleTemplate: () => 'DevOps Engineer (Kubernetes / AWS)',
    company: 'Alpencloud GmbH',
    city: 'München',
    isRemote: false,
    workplaceType: 'hybrid',
    seniority: 'senior',
    requiredSkills: ['Kubernetes', 'AWS', 'Terraform', 'CI/CD'],
    salaryRange: { min: 75000, max: 95000, currency: 'EUR' },
    referenznummer: '10000-100004-S',
    description:
      'Operate and harden Kubernetes platforms on AWS, driving infrastructure as code and delivery automation.',
  },
  {
    id: '5',
    titleTemplate: () => 'Data Engineer (Python / Spark)',
    company: 'Datenaustausch GmbH',
    city: 'Frankfurt am Main',
    isRemote: false,
    workplaceType: 'office',
    seniority: 'mid',
    requiredSkills: ['Python', 'SQL', 'Spark', 'Airflow'],
    salaryRange: { min: 65000, max: 80000, currency: 'EUR' },
    referenznummer: '10000-100005-S',
    description:
      'Model and orchestrate batch and streaming pipelines feeding the company-wide analytics warehouse.',
  },
  {
    id: '6',
    titleTemplate: () => 'Software Architect (Cloud / Microservices)',
    company: 'Technikwerk Bayern GmbH',
    city: 'Nürnberg',
    isRemote: false,
    workplaceType: 'hybrid',
    seniority: 'lead',
    requiredSkills: ['TypeScript', 'Microservices', 'AWS', 'System Design'],
    salaryRange: { min: 90000, max: 110000, currency: 'EUR' },
    referenznummer: '10000-100006-S',
    description:
      'Define the target architecture for a distributed platform, mentoring engineering teams on domain boundaries and resilience.',
  },
];

import { SeniorityLevel, SpokenLanguage } from '@/types';

export interface ArbeitnowFallbackTemplate {
  id: string;
  slug: string;
  titleTemplate: (role: string) => string;
  company: string;
  location: string;
  isRemote: boolean;
  workplaceType: string;
  seniority: SeniorityLevel;
  tags: string[];
  requiredSkills: string[];
  spokenLanguages?: SpokenLanguage[];
  url: string;
  description: string;
  created_at: number;
}

export const ARBEITNOW_FALLBACK_PAGE_SIZE = 3;

/**
 * Deterministic offline pool for the Arbeitnow provider.
 * Mimics European & English-speaking job listings with realistic Arbeitnow API response fields.
 */
export const ARBEITNOW_FALLBACK_JOB_POOL: ArbeitnowFallbackTemplate[] = [
  {
    id: 'an-1',
    slug: 'senior-full-stack-developer-react-node-berlin-101',
    titleTemplate: (role) => `Senior ${role} (React / Node.js)`,
    company: 'Fintech Solutions GmbH',
    location: 'Berlin',
    isRemote: true,
    workplaceType: 'remote',
    seniority: 'senior',
    tags: ['Software Engineering', 'React', 'Node.js'],
    requiredSkills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL'],
    spokenLanguages: [
      { language: 'English', level: 'C1' },
      { language: 'German', level: 'B1' },
    ],
    url: 'https://www.arbeitnow.com/jobs/companies/fintech-solutions-gmbh/senior-full-stack-developer-berlin-101',
    description:
      '<p>Fintech Solutions GmbH is looking for a Senior Software Engineer to build scalable web applications in React and Node.js.</p><p>Requirements: Fluent English required, German is a plus.</p>',
    created_at: Math.floor(Date.now() / 1000) - 3600 * 2,
  },
  {
    id: 'an-2',
    slug: 'backend-engineer-python-django-munich-102',
    titleTemplate: () => 'Backend Engineer (Python / Django)',
    company: 'AI Systems Europe',
    location: 'Munich',
    isRemote: false,
    workplaceType: 'hybrid',
    seniority: 'mid',
    tags: ['Python', 'Backend', 'AI'],
    requiredSkills: ['Python', 'Django', 'PostgreSQL', 'Docker'],
    spokenLanguages: [{ language: 'English', level: 'B2' }],
    url: 'https://www.arbeitnow.com/jobs/companies/ai-systems-europe/backend-engineer-munich-102',
    description:
      '<p>Develop high-performance REST APIs and microservices for machine learning workloads. English speaking environment.</p>',
    created_at: Math.floor(Date.now() / 1000) - 3600 * 5,
  },
  {
    id: 'an-3',
    slug: 'frontend-developer-vue-javascript-hamburg-103',
    titleTemplate: () => 'Frontend Developer (Vue.js / TypeScript)',
    company: 'MediaLabs SE',
    location: 'Hamburg',
    isRemote: true,
    workplaceType: 'remote',
    seniority: 'mid',
    tags: ['Frontend', 'Vue.js', 'JavaScript'],
    requiredSkills: ['Vue.js', 'TypeScript', 'CSS', 'HTML'],
    spokenLanguages: [
      { language: 'English', level: 'B2' },
      { language: 'German', level: 'B2' },
    ],
    url: 'https://www.arbeitnow.com/jobs/companies/medialabs-se/frontend-developer-hamburg-103',
    description:
      '<p>Join our remote-first frontend team crafting digital media interfaces with Vue 3 and TypeScript.</p>',
    created_at: Math.floor(Date.now() / 1000) - 3600 * 12,
  },
  {
    id: 'an-4',
    slug: 'devops-engineer-kubernetes-aws-frankfurt-104',
    titleTemplate: () => 'DevOps Engineer (Cloud / Kubernetes)',
    company: 'CloudScale Germany',
    location: 'Frankfurt',
    isRemote: false,
    workplaceType: 'hybrid',
    seniority: 'senior',
    tags: ['DevOps', 'Cloud', 'AWS'],
    requiredSkills: ['Kubernetes', 'AWS', 'Terraform', 'Docker'],
    spokenLanguages: [{ language: 'English', level: 'C1' }],
    url: 'https://www.arbeitnow.com/jobs/companies/cloudscale-germany/devops-engineer-frankfurt-104',
    description:
      '<p>Manage and scale AWS infrastructure and Kubernetes clusters for enterprise clients across Europe.</p>',
    created_at: Math.floor(Date.now() / 1000) - 3600 * 24,
  },
  {
    id: 'an-5',
    slug: 'lead-software-architect-cloud-berlin-105',
    titleTemplate: () => 'Lead Software Architect',
    company: 'NextGen Mobility',
    location: 'Berlin',
    isRemote: true,
    workplaceType: 'remote',
    seniority: 'lead',
    tags: ['Software Architecture', 'Cloud', 'Leadership'],
    requiredSkills: ['System Design', 'Microservices', 'AWS', 'TypeScript'],
    spokenLanguages: [{ language: 'English', level: 'C2' }],
    url: 'https://www.arbeitnow.com/jobs/companies/nextgen-mobility/lead-software-architect-berlin-105',
    description:
      '<p>Guide technical vision and cloud platform architecture for next-generation electric mobility services.</p>',
    created_at: Math.floor(Date.now() / 1000) - 3600 * 48,
  },
];

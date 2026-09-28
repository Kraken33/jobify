import { JobListing, SearchCriteria } from '@/types';

export interface IJobProvider {
  id: string;
  name: string;
  searchJobs(criteria: SearchCriteria): Promise<JobListing[]>;
}

export abstract class BaseJobProvider implements IJobProvider {
  abstract id: string;
  abstract name: string;

  abstract searchJobs(criteria: SearchCriteria): Promise<JobListing[]>;

  protected normalizeSkill(skill: string): string {
    return skill.trim().toLowerCase();
  }

  protected extractSkillTags(tags: unknown[]): string[] {
    if (!Array.isArray(tags)) return [];
    return tags
      .map((tag) => {
        if (typeof tag === 'string') return tag;
        if (tag && typeof tag === 'object' && 'name' in tag) return String((tag as { name: unknown }).name);
        return '';
      })
      .filter(Boolean);
  }
}

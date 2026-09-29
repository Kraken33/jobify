import { SearchCriteria, ProviderResult } from '@/types';

export interface IJobProvider {
  id: string;
  name: string;
  searchJobs(criteria: SearchCriteria): Promise<ProviderResult>;
  getJobCount?(criteria: SearchCriteria): Promise<number | null>;
}

export abstract class BaseJobProvider implements IJobProvider {
  abstract id: string;
  abstract name: string;

  abstract searchJobs(criteria: SearchCriteria): Promise<ProviderResult>;

  async getJobCount(_criteria: SearchCriteria): Promise<number | null> {
    return null;
  }

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


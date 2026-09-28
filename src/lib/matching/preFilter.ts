import { CandidateProfile, JobListing, SpokenLanguageLevel } from '@/types';

export interface PreFilterResult {
  passed: boolean;
  reason?: string;
}

export const CEFR_LEVEL_RANK: Record<string, number> = {
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C1: 5,
  C2: 6,
  NATIVE: 7,
};

export function getCefrRank(level?: SpokenLanguageLevel | string): number {
  if (!level) return 0;
  const normalized = level.trim().toUpperCase();
  return CEFR_LEVEL_RANK[normalized] ?? 0;
}

export function evaluateHardConstraints(profile: CandidateProfile, job: JobListing): PreFilterResult {
  // 1. Work Mode Check
  if (profile.workMode === 'remote' && !job.isRemote) {
    return { passed: false, reason: 'Job requires on-site/office attendance while profile requires remote' };
  }

  // 2. Seniority Gap Check
  // Discard extreme seniority mismatch (e.g. Junior candidate vs Lead role)
  if (profile.seniority === 'junior' && (job.seniority === 'senior' || job.seniority === 'lead')) {
    return { passed: false, reason: 'Seniority level gap too high (Junior vs Senior/Lead)' };
  }

  // 3. Minimum Salary Check
  if (profile.minSalary && job.salaryRange?.max) {
    // If currency matches and max offered is below 75% of candidate minimum
    if (
      (!job.salaryRange.currency || !profile.salaryCurrency || job.salaryRange.currency.toUpperCase() === profile.salaryCurrency.toUpperCase()) &&
      job.salaryRange.max < profile.minSalary * 0.75
    ) {
      return { passed: false, reason: 'Salary range is below candidate minimum threshold' };
    }
  }

  // 4. Spoken Language & CEFR Level Check
  if (job.spokenLanguages && job.spokenLanguages.length > 0) {
    const candidateLangs = profile.spokenLanguages || [];
    for (const reqLang of job.spokenLanguages) {
      const matchedCandLang = candidateLangs.find(
        (cl) => cl.language.trim().toLowerCase() === reqLang.language.trim().toLowerCase()
      );

      if (!matchedCandLang) {
        return {
          passed: false,
          reason: `Candidate missing required spoken language: ${reqLang.language}`,
        };
      }

      const candRank = getCefrRank(matchedCandLang.level);
      const reqRank = getCefrRank(reqLang.level);

      if (candRank < reqRank) {
        return {
          passed: false,
          reason: `Candidate ${reqLang.language} level (${matchedCandLang.level}) is below required level (${reqLang.level})`,
        };
      }
    }
  }

  return { passed: true };
}

export function preFilterJobs(profile: CandidateProfile, jobs: JobListing[]): JobListing[] {
  return jobs.filter((job) => evaluateHardConstraints(profile, job).passed);
}

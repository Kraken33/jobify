import { CandidateProfile, JobListing } from '@/types';

export interface PreFilterResult {
  passed: boolean;
  reason?: string;
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

  return { passed: true };
}

export function preFilterJobs(profile: CandidateProfile, jobs: JobListing[]): JobListing[] {
  return jobs.filter((job) => evaluateHardConstraints(profile, job).passed);
}

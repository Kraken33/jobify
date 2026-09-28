import { describe, it } from 'node:test';
import assert from 'node:assert';
import { evaluateHardConstraints, preFilterJobs } from '../lib/matching/preFilter';
import { CandidateProfile, JobListing } from '@/types';

describe('Pre-filter matching rules', () => {
  const baseProfile: CandidateProfile = {
    targetRole: 'Full Stack Developer',
    seniority: 'junior',
    skills: ['React', 'TypeScript'],
    workMode: 'remote',
    minSalary: 10000,
    salaryCurrency: 'PLN',
    experienceSummary: '1 year of experience',
  };

  const remoteJuniorJob: JobListing = {
    id: 'job_1',
    provider: 'justjoin',
    title: 'Junior React Developer',
    company: 'Tech Corp',
    isRemote: true,
    seniority: 'junior',
    requiredSkills: ['React', 'TypeScript'],
    url: 'https://example.com/1',
  };

  const officeSeniorJob: JobListing = {
    id: 'job_2',
    provider: 'justjoin',
    title: 'Senior React Architect',
    company: 'Big Corp',
    isRemote: false,
    seniority: 'senior',
    requiredSkills: ['React', 'Architecture'],
    url: 'https://example.com/2',
  };

  it('passes jobs that satisfy remote and seniority criteria', () => {
    const result = evaluateHardConstraints(baseProfile, remoteJuniorJob);
    assert.strictEqual(result.passed, true);
  });

  it('rejects on-site jobs when profile demands remote', () => {
    const result = evaluateHardConstraints(baseProfile, officeSeniorJob);
    assert.strictEqual(result.passed, false);
  });

  it('filters an array of job listings accurately', () => {
    const filtered = preFilterJobs(baseProfile, [remoteJuniorJob, officeSeniorJob]);
    assert.strictEqual(filtered.length, 1);
    assert.strictEqual(filtered[0].id, 'job_1');
  });
});

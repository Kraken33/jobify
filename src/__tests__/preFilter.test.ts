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

  it('passes when candidate meets or exceeds required spoken language CEFR level', () => {
    const profileWithGerman: CandidateProfile = {
      ...baseProfile,
      spokenLanguages: [
        { language: 'English', level: 'C2' },
        { language: 'German', level: 'C1' },
      ],
    };
    const jobRequiringGerman: JobListing = {
      ...remoteJuniorJob,
      spokenLanguages: [{ language: 'German', level: 'B2' }],
    };
    const result = evaluateHardConstraints(profileWithGerman, jobRequiringGerman);
    assert.strictEqual(result.passed, true);
  });

  it('rejects when candidate lacks a required spoken language', () => {
    const profileWithEnglishOnly: CandidateProfile = {
      ...baseProfile,
      spokenLanguages: [{ language: 'English', level: 'C2' }],
    };
    const jobRequiringGerman: JobListing = {
      ...remoteJuniorJob,
      spokenLanguages: [{ language: 'German', level: 'B1' }],
    };
    const result = evaluateHardConstraints(profileWithEnglishOnly, jobRequiringGerman);
    assert.strictEqual(result.passed, false);
    assert.ok(result.reason?.includes('missing required spoken language'));
  });

  it('rejects when candidate CEFR level is below job required level', () => {
    const profileWithLowGerman: CandidateProfile = {
      ...baseProfile,
      spokenLanguages: [{ language: 'German', level: 'A2' }],
    };
    const jobRequiringGerman: JobListing = {
      ...remoteJuniorJob,
      spokenLanguages: [{ language: 'German', level: 'B2' }],
    };
    const result = evaluateHardConstraints(profileWithLowGerman, jobRequiringGerman);
    assert.strictEqual(result.passed, false);
    assert.ok(result.reason?.includes('below required level'));
  });
});

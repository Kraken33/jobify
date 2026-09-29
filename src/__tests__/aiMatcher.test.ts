import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AiMatcherService } from '../lib/matching/aiMatcher';
import type { CandidateProfile, JobListing } from '../types';

describe('AiMatcherService prompt generation', () => {
  const matcher = new AiMatcherService('test-api-key');

  const baseProfile: CandidateProfile = {
    targetRole: 'Frontend Developer',
    seniority: 'mid',
    skills: ['React', 'TypeScript'],
    workMode: 'remote',
    experienceSummary: 'Experienced React engineer',
    spokenLanguages: [{ language: 'English', level: 'C1' }],
  };

  const baseJob: JobListing = {
    id: 'test-1',
    provider: 'justjoin',
    title: 'Senior React Developer',
    company: 'Tech Corp',
    seniority: 'senior',
    isRemote: true,
    requiredSkills: ['React', 'TypeScript'],
    url: 'https://example.com/job/1',
  };

  it('appends spoken language instruction when spokenLanguages is missing/empty and description is present', () => {
    const jobWithDesc: JobListing = {
      ...baseJob,
      spokenLanguages: undefined,
      description: 'We are looking for a dev. Wymagany język polski w mowie i piśmie.',
    };

    const prompt = matcher.buildPrompt(baseProfile, jobWithDesc);

    assert.ok(
      prompt.includes(
        "If the job description explicitly requires a spoken language that the candidate's profile does not include, list it as a critical gap and reduce the score to reflect the mismatch."
      )
    );
  });

  it('omits spoken language instruction when job has explicit spokenLanguages structured array', () => {
    const jobWithExplicitLangs: JobListing = {
      ...baseJob,
      spokenLanguages: [{ language: 'Polish', level: 'B2' }],
      description: 'We are looking for a dev. Wymagany język polski.',
    };

    const prompt = matcher.buildPrompt(baseProfile, jobWithExplicitLangs);

    assert.strictEqual(
      prompt.includes(
        "If the job description explicitly requires a spoken language that the candidate's profile does not include"
      ),
      false
    );
  });

  it('omits spoken language instruction when description is empty or missing', () => {
    const jobWithoutDesc: JobListing = {
      ...baseJob,
      spokenLanguages: undefined,
      description: '',
    };

    const prompt = matcher.buildPrompt(baseProfile, jobWithoutDesc);

    assert.strictEqual(
      prompt.includes(
        "If the job description explicitly requires a spoken language that the candidate's profile does not include"
      ),
      false
    );
  });
});

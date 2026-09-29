import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert';
import { NextRequest } from 'next/server';
import { POST as matchPost } from '../app/api/match/route';
import { POST as countPost } from '../app/api/session/count/route';
import { providerRegistry } from '../lib/providers';
import type { CandidateProfile, ProviderResult, SearchCriteria, SearchSession } from '../types';

const PROFILE: CandidateProfile = {
  id: 'test-profile-123',
  targetRole: 'Full Stack Developer',
  skills: ['Python', 'Django'],
  seniority: 'senior',
  workMode: 'remote',
  preferredLocation: 'Berlin',
  experienceSummary: 'Experienced developer.',
};

const CUSTOM_SESSION: SearchSession = {
  id: 'session-custom-456',
  name: 'Arbeitnow English Track',
  provider: 'arbeitnow',
  targetRole: 'Javascript',
  skills: ['React', 'TypeScript'],
  seniority: 'mid',
  workMode: 'remote',
  location: 'Munich',
  spokenLanguages: [{ language: 'English', level: 'B2' }],
  providerOptions: {
    arbeitnow: {
      endpoint: 'english-speaking-jobs',
    },
  },
  createdAt: '2026-09-29T12:00:00.000Z',
  updatedAt: '2026-09-29T12:00:00.000Z',
};

describe('Session payload forwarding in /api/match and /api/session/count', () => {
  const originalArbeitnow = providerRegistry.get('arbeitnow');
  let capturedSearchCriteria: SearchCriteria | null = null;
  let capturedCountCriteria: SearchCriteria | null = null;

  const stubArbeitnowProvider = () => {
    capturedSearchCriteria = null;
    capturedCountCriteria = null;
    providerRegistry.register({
      id: 'arbeitnow',
      name: 'Arbeitnow',
      searchJobs: async (criteria: SearchCriteria): Promise<ProviderResult> => {
        capturedSearchCriteria = criteria;
        return { listings: [], nextCursor: null, fallback: true };
      },
      getJobCount: async (criteria: SearchCriteria): Promise<number> => {
        capturedCountCriteria = criteria;
        return 42;
      },
    });
  };

  afterEach(() => {
    if (originalArbeitnow) {
      providerRegistry.register(originalArbeitnow);
    }
    capturedSearchCriteria = null;
    capturedCountCriteria = null;
  });

  describe('/api/match with session payload', () => {
    it('prioritizes session in payload and passes targetRole and providerOptions to provider', async () => {
      stubArbeitnowProvider();

      const request = new NextRequest('http://localhost:3000/api/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-OpenAI-Key': 'sk-test-key',
        },
        body: JSON.stringify({
          profile: PROFILE,
          session: CUSTOM_SESSION,
          limit: 15,
        }),
      });

      const response = await matchPost(request);
      const data = await response.json();

      assert.strictEqual(response.status, 200);
      assert.strictEqual(data.sessionId, CUSTOM_SESSION.id);
      assert.ok(capturedSearchCriteria);
      assert.strictEqual(capturedSearchCriteria?.targetRole, 'Javascript');
      assert.deepStrictEqual(capturedSearchCriteria?.skills, ['React', 'TypeScript']);
      assert.strictEqual(capturedSearchCriteria?.location, 'Munich');
      assert.strictEqual(capturedSearchCriteria?.seniority, 'mid');
      assert.deepStrictEqual(capturedSearchCriteria?.spokenLanguages, [
        { language: 'English', level: 'B2' },
      ]);
      assert.deepStrictEqual(capturedSearchCriteria?.providerHints, {
        arbeitnow: { endpoint: 'english-speaking-jobs' },
      });
    });

    it('passes payload seenJobIds and publishedAtCursor to provider when database checkpoint is absent', async () => {
      stubArbeitnowProvider();

      const request = new NextRequest('http://localhost:3000/api/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-OpenAI-Key': 'sk-test-key',
        },
        body: JSON.stringify({
          profile: PROFILE,
          session: CUSTOM_SESSION,
          seenJobIds: ['arbeitnow_job_1', 'arbeitnow_job_2'],
          publishedAtCursor: 'page:3',
        }),
      });

      const response = await matchPost(request);
      assert.strictEqual(response.status, 200);
      assert.ok(capturedSearchCriteria);
      assert.deepStrictEqual(capturedSearchCriteria?.seenJobIds, ['arbeitnow_job_1', 'arbeitnow_job_2']);
      assert.strictEqual(capturedSearchCriteria?.publishedAtCursor, 'page:3');
    });
  });

  describe('/api/session/count with session payload', () => {
    it('prioritizes session in payload and passes targetRole and providerOptions to provider', async () => {
      stubArbeitnowProvider();

      const request = new NextRequest('http://localhost:3000/api/session/count', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profile: PROFILE,
          session: CUSTOM_SESSION,
        }),
      });

      const response = await countPost(request);
      const data = await response.json();

      assert.strictEqual(response.status, 200);
      assert.strictEqual(data.sessionId, CUSTOM_SESSION.id);
      assert.strictEqual(data.totalVacancies, 42);
      assert.ok(capturedCountCriteria);
      assert.strictEqual(capturedCountCriteria?.targetRole, 'Javascript');
      assert.deepStrictEqual(capturedCountCriteria?.skills, ['React', 'TypeScript']);
      assert.strictEqual(capturedCountCriteria?.location, 'Munich');
      assert.strictEqual(capturedCountCriteria?.seniority, 'mid');
      assert.deepStrictEqual(capturedCountCriteria?.spokenLanguages, [
        { language: 'English', level: 'B2' },
      ]);
      assert.deepStrictEqual(capturedCountCriteria?.providerHints, {
        arbeitnow: { endpoint: 'english-speaking-jobs' },
      });
    });
  });
});

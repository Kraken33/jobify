import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert';
import { NextRequest } from 'next/server';
import { POST } from '../app/api/match/route';
import { providerRegistry } from '../lib/providers';
import type { CandidateProfile, ProviderResult, SearchCriteria } from '../types';

const PROFILE: CandidateProfile = {
  targetRole: 'Frontend Developer',
  skills: ['React', 'TypeScript'],
  seniority: 'mid',
  workMode: 'remote',
  preferredLocation: 'Kraków',
  experienceSummary: 'Six years building production React applications.',
};

function buildRequest(headers: Record<string, string>): NextRequest {
  return new NextRequest('http://localhost:3000/api/match', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-OpenAI-Key': 'sk-test-key',
      ...headers,
    },
    body: JSON.stringify({
      profile: PROFILE,
      providerId: 'justjoin',
      limit: 20,
    }),
  });
}

describe('/api/match Apify token plumbing', () => {
  const originalProvider = providerRegistry.get('justjoin');
  let capturedCriteria: SearchCriteria | null = null;

  /** Captures the criteria passed to the provider and returns an empty dataset. */
  const stubProvider = () => {
    capturedCriteria = null;
    providerRegistry.register({
      id: 'justjoin',
      name: 'Stub JustJoin',
      searchJobs: async (criteria: SearchCriteria): Promise<ProviderResult> => {
        capturedCriteria = criteria;
        return { listings: [], nextCursor: null, fallback: true };
      },
    });
  };

  afterEach(() => {
    if (originalProvider) {
      providerRegistry.register(originalProvider);
    }
    capturedCriteria = null;
  });

  it('forwards the X-Apify-Token header into provider search criteria', async () => {
    stubProvider();

    const response = await POST(buildRequest({ 'X-Apify-Token': 'apify_api_header_token' }));
    const payload = await response.json();

    assert.strictEqual(response.status, 200);
    assert.ok(capturedCriteria);
    assert.strictEqual(capturedCriteria?.apifyToken, 'apify_api_header_token');
    assert.strictEqual(capturedCriteria?.limit, 20);
    assert.deepStrictEqual(capturedCriteria?.skills, ['React', 'TypeScript']);
    assert.strictEqual(capturedCriteria?.seniority, 'mid');
    assert.strictEqual(capturedCriteria?.workMode, 'remote');
    assert.strictEqual(capturedCriteria?.location, 'Kraków');
    assert.strictEqual(payload.totalFetched, 0);
  });

  it('passes a null Apify token when the header is omitted', async () => {
    stubProvider();

    const response = await POST(buildRequest({}));

    assert.strictEqual(response.status, 200);
    assert.ok(capturedCriteria);
    assert.strictEqual(capturedCriteria?.apifyToken, null);
  });

  it('still rejects scans without an OpenAI key', async () => {
    stubProvider();

    const request = new NextRequest('http://localhost:3000/api/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Apify-Token': 'apify_api_header_token' },
      body: JSON.stringify({ profile: PROFILE, providerId: 'justjoin' }),
    });

    const response = await POST(request);

    assert.strictEqual(response.status, 401);
    assert.strictEqual(capturedCriteria, null);
  });

  it('includes hard-constraint mismatched jobs with a 25% score low match at the bottom', async () => {
    providerRegistry.register({
      id: 'justjoin',
      name: 'Stub JustJoin With Mismatch',
      searchJobs: async (): Promise<ProviderResult> => {
        return {
          listings: [
            {
              id: 'job_mismatch_onsite',
              provider: 'justjoin',
              title: 'Onsite Developer',
              company: 'Office Corp',
              isRemote: false,
              workplaceType: 'office',
              seniority: 'senior',
              requiredSkills: ['React'],
              url: 'https://example.com/onsite',
            },
          ],
          nextCursor: null,
          fallback: true,
        };
      },
    });

    const response = await POST(buildRequest({}));
    const payload = await response.json();

    assert.strictEqual(response.status, 200);
    assert.strictEqual(payload.matches.length, 1);
    assert.strictEqual(payload.matches[0].job.id, 'job_mismatch_onsite');
    assert.strictEqual(payload.matches[0].evaluation.score, 25);
    assert.strictEqual(payload.matches[0].evaluation.verdict, 'Low Match');
    assert.ok(payload.matches[0].evaluation.gaps[0].includes('requires remote'));
  });
});

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  loadSessionMatches,
  saveSessionMatches,
  clearSessionMatches,
  getMatchStorageKey,
  loadAppliedMatches,
  saveAppliedMatch,
  updateMatchStatus,
} from '../lib/storage/matchStorage';
import { setSupabaseClient } from '../lib/supabase/client';
import { createMockSupabaseClient } from './mockSupabase';
import { MatchResult } from '../types';

describe('matchStorage per-session isolation', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    setSupabaseClient(mockSupabase);
  });

  const sampleMatch = (id: string, sessionId: string): MatchResult => ({
    id,
    sessionId,
    job: {
      id: `job-${id}`,
      provider: 'justjoin',
      title: 'Frontend Engineer',
      company: 'Tech Corp',
      isRemote: true,
      seniority: 'mid',
      requiredSkills: ['React', 'JavaScript'],
      url: 'https://example.com/job',
    },
    evaluation: {
      score: 85,
      verdict: 'Strong Match',
      pros: ['Great fit'],
      gaps: [],
      summary: 'Matches profile',
    },
    createdAt: new Date().toISOString(),
  });

  it('saves and retrieves matches isolated per session ID', async () => {
    const session1Matches = [sampleMatch('m1', 'session-1'), sampleMatch('m2', 'session-1')];
    const session2Matches = [sampleMatch('m3', 'session-2')];

    await saveSessionMatches('session-1', session1Matches);
    await saveSessionMatches('session-2', session2Matches);

    const loaded1 = await loadSessionMatches('session-1');
    const loaded2 = await loadSessionMatches('session-2');

    assert.strictEqual(loaded1.length, 2);
    assert.strictEqual(loaded1.some((m) => m.job.id === 'job-m1'), true);
    assert.strictEqual(loaded1.some((m) => m.job.id === 'job-m2'), true);

    assert.strictEqual(loaded2.length, 1);
    assert.strictEqual(loaded2[0].job.id, 'job-m3');
  });

  it('clears matches only for the specified session ID', async () => {
    await saveSessionMatches('session-1', [sampleMatch('m1', 'session-1')]);
    await saveSessionMatches('session-2', [sampleMatch('m2', 'session-2')]);

    await clearSessionMatches('session-1');

    const loaded1 = await loadSessionMatches('session-1');
    const loaded2 = await loadSessionMatches('session-2');

    assert.strictEqual(loaded1.length, 0);
    assert.strictEqual(loaded2.length, 1);
  });

  it('deduplicates applied matches when multiple rows exist with the same provider_job_id', async () => {
    // Insert duplicate applied rows directly (simulating multiple scans/sessions)
    await mockSupabase.from('job_matches').insert([
      {
        id: '11111111-1111-4111-a111-111111111111',
        session_id: 'session-1',
        provider_job_id: 'job-applied-dup',
        provider: 'justjoin',
        title: 'Senior Engineer',
        company: 'Corp A',
        status: 'applied',
        created_at: new Date(Date.now() - 1000).toISOString(),
      },
      {
        id: '22222222-2222-4222-a222-222222222222',
        session_id: 'session-2',
        provider_job_id: 'job-applied-dup',
        provider: 'justjoin',
        title: 'Senior Engineer',
        company: 'Corp A',
        status: 'applied',
        created_at: new Date().toISOString(),
      },
      {
        id: '33333333-3333-4333-a333-333333333333',
        session_id: 'session-1',
        provider_job_id: 'job-applied-unique',
        provider: 'justjoin',
        title: 'Staff Engineer',
        company: 'Corp B',
        status: 'applied',
        created_at: new Date().toISOString(),
      },
    ]);

    const appliedMatches = await loadAppliedMatches();
    assert.strictEqual(appliedMatches.length, 2);
    const jobIds = appliedMatches.map((m) => m.job.id);
    assert.deepStrictEqual(jobIds.sort(), ['job-applied-dup', 'job-applied-unique'].sort());
  });
});


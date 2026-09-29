import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { loadSessionMatches, saveSessionMatches, clearSessionMatches, getMatchStorageKey } from '../lib/storage/matchStorage';
import { setSupabaseClient } from '../lib/supabase/client';
import { createMockSupabaseClient } from './mockSupabase';
import { MatchResult } from '../types';

describe('matchStorage per-session isolation', () => {
  beforeEach(() => {
    setSupabaseClient(createMockSupabaseClient());
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
});

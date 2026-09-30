import { describe, it } from 'node:test';
import assert from 'node:assert';
import { MatchResult, ProviderCursor } from '../types';

/**
 * Pure helper testing the scan flow state logic:
 * Uninitialized / empty session -> Scan Batch mode (uses batchSize limit e.g. 20)
 * Session with matches or cursor -> Update mode (uses max delta limit e.g. 100)
 */
function computeScanFlowState(
  matches: MatchResult[],
  nextCursor?: ProviderCursor | null,
  configuredBatchSize: number = 20,
  customLimit?: number
) {
  const isUpdateMode = matches.length > 0 || Boolean(nextCursor?.publishedAtCursor);
  const scanLimit =
    typeof customLimit === 'number' && !Number.isNaN(customLimit)
      ? customLimit
      : isUpdateMode
      ? 100
      : configuredBatchSize;

  const buttonLabel = isUpdateMode ? 'Update' : `Scan Batch (${configuredBatchSize})`;

  return { isUpdateMode, scanLimit, buttonLabel };
}

describe('Scan Flow State (Initial Prefetch vs Update Delta)', () => {
  it('starts in Scan Batch mode for fresh session with no matches and no cursor', () => {
    const state = computeScanFlowState([], null, 20);
    assert.strictEqual(state.isUpdateMode, false);
    assert.strictEqual(state.scanLimit, 20);
    assert.strictEqual(state.buttonLabel, 'Scan Batch (20)');
  });

  it('respects custom initial prefetch batch size in Scan Batch mode', () => {
    const state = computeScanFlowState([], null, 50);
    assert.strictEqual(state.isUpdateMode, false);
    assert.strictEqual(state.scanLimit, 50);
    assert.strictEqual(state.buttonLabel, 'Scan Batch (50)');
  });

  it('transitions to Update mode when matches exist', () => {
    const mockMatch: MatchResult = {
      id: 'match_1',
      job: {
        id: 'job_1',
        title: 'Software Engineer',
        company: 'Tech Co',
        url: 'https://example.com/job/1',
        provider: 'justjoin',
        publishedAt: '2026-09-30T10:00:00Z',
      },
      evaluation: {
        score: 85,
        verdict: 'High Match',
        pros: ['Great skills'],
        gaps: [],
        summary: 'Strong candidate match',
      },
    };

    const state = computeScanFlowState([mockMatch], null, 20);
    assert.strictEqual(state.isUpdateMode, true);
    assert.strictEqual(state.scanLimit, 100);
    assert.strictEqual(state.buttonLabel, 'Update');
  });

  it('transitions to Update mode when nextCursor exists even if matches list is filtered', () => {
    const cursor: ProviderCursor = { publishedAtCursor: '2026-09-30T10:00:00Z' };
    const state = computeScanFlowState([], cursor, 20);
    assert.strictEqual(state.isUpdateMode, true);
    assert.strictEqual(state.scanLimit, 100);
    assert.strictEqual(state.buttonLabel, 'Update');
  });

  it('reverts to Scan Batch mode upon session reset (clearing matches and cursor)', () => {
    // Before reset: active session with matches
    const mockMatch: MatchResult = {
      id: 'match_1',
      job: {
        id: 'job_1',
        title: 'Dev',
        company: 'Co',
        url: 'https://example.com',
        provider: 'justjoin',
        publishedAt: '2026-09-30T10:00:00Z',
      },
      evaluation: { score: 90, verdict: 'High Match', pros: [], gaps: [], summary: 'Good' },
    };
    const beforeReset = computeScanFlowState([mockMatch], { publishedAtCursor: '2026-09-30T10:00:00Z' }, 20);
    assert.strictEqual(beforeReset.isUpdateMode, true);
    assert.strictEqual(beforeReset.buttonLabel, 'Update');

    // After reset: matches cleared, cursor reset
    const afterReset = computeScanFlowState([], null, 20);
    assert.strictEqual(afterReset.isUpdateMode, false);
    assert.strictEqual(afterReset.scanLimit, 20);
    assert.strictEqual(afterReset.buttonLabel, 'Scan Batch (20)');
  });
});

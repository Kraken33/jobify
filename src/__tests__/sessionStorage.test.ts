import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { createImplicitSession, hashString } from '../lib/storage/sessionStorage';
import { loadCheckpoint, saveCheckpoint, clearCheckpoint } from '../lib/storage/checkpointStorage';
import { CandidateProfile } from '../types';

describe('sessionStorage and checkpointStorage', () => {
  const profile: CandidateProfile = {
    id: 'test-profile-123',
    targetRole: 'Full Stack Developer',
    seniority: 'mid',
    skills: ['React', 'TypeScript'],
    workMode: 'remote',
    experienceSummary: 'Senior developer',
  };

  it('createImplicitSession produces stable deterministic session ID', () => {
    const s1 = createImplicitSession(profile);
    const s2 = createImplicitSession(profile);
    assert.strictEqual(s1.id, s2.id);
    assert.strictEqual(s1.name, 'Default Search');
    assert.strictEqual(s1.provider, 'justjoin');
  });

  it('handles checkpoint storage in guest mode (localStorage mock / fallback)', async () => {
    // When window is undefined or localStorage not available, should not throw
    const loaded = await loadCheckpoint('test-session', 'justjoin');
    assert.strictEqual(loaded, null);

    await saveCheckpoint({
      sessionId: 'test-session',
      providerId: 'justjoin',
      providerFingerprint: 'abc',
      publishedAtCursor: '2026-09-28T12:00:00Z',
      seenJobIds: ['job1', 'job2'],
      lastScanAt: '2026-09-28T12:00:00Z',
    });

    await clearCheckpoint('test-session', 'justjoin');
  });
});

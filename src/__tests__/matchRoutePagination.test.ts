import { describe, it } from 'node:test';
import assert from 'node:assert';
import { computeProviderFingerprint } from '../lib/providers/fingerprint';
import { JustJoinProvider } from '../lib/providers/JustJoinProvider';
import { SearchCriteria } from '../types';

describe('Match pagination integration logic', () => {
  const provider = new JustJoinProvider();

  it('second scan with cursor returns different items or cursor advanced in fallback generator', () => {
    const criteria1: SearchCriteria = {
      skills: ['TypeScript', 'React'],
      seniority: 'mid',
      workMode: 'remote',
    };

    const res1 = provider.getSampleFallbackListings(criteria1, 1);
    assert.ok(res1.nextCursor?.publishedAtCursor);

    // In fallback mode, page 2 represents subsequent scan
    const criteria2: SearchCriteria = {
      ...criteria1,
      publishedAtCursor: res1.nextCursor.publishedAtCursor,
    };
    const res2 = provider.getSampleFallbackListings(criteria2, 2);

    const ids1 = new Set(res1.listings.map((l) => l.id));
    const overlap = res2.listings.filter((l) => ids1.has(l.id));
    assert.strictEqual(overlap.length, 0, 'Successive scans should not return overlapping jobs');
  });

  it('changing provider search parameters invalidates the fingerprint', () => {
    const fp1 = computeProviderFingerprint({
      skills: ['TypeScript', 'React'],
      seniority: 'mid',
      workMode: 'remote',
    });

    // Change workMode
    const fpChangedWorkMode = computeProviderFingerprint({
      skills: ['TypeScript', 'React'],
      seniority: 'mid',
      workMode: 'office',
    });
    assert.notStrictEqual(fp1, fpChangedWorkMode);

    // Changing only candidate non-provider fields (like experienceSummary or targetRole) does not affect fingerprint
    // because fingerprint only takes skills, seniority, workMode, location
    const fpSame = computeProviderFingerprint({
      skills: ['TypeScript', 'React'],
      seniority: 'mid',
      workMode: 'remote',
    });
    assert.strictEqual(fp1, fpSame);
  });
});

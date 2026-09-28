import { describe, it } from 'node:test';
import assert from 'node:assert';
import { JustJoinProvider } from '../lib/providers/JustJoinProvider';
import { computeProviderFingerprint } from '../lib/providers/fingerprint';

describe('JustJoinProvider normalization', () => {
  const provider = new JustJoinProvider();

  it('correctly normalizes a full JustJoin offer payload', () => {
    const rawOffer = {
      id: 'offer-123',
      slug: 'react-lead-developer',
      title: 'Lead Frontend Engineer',
      companyName: 'Acme Corp',
      city: 'Warsaw',
      workplaceType: 'remote',
      experienceLevel: 'senior',
      requiredSkills: [{ name: 'React' }, { name: 'TypeScript' }],
      employmentTypes: [
        {
          salary: {
            from: 25000,
            to: 32000,
            currency: 'PLN',
          },
        },
      ],
      body: 'Full job description text...',
    };

    const normalized = provider.normalizeOffer(rawOffer);

    assert.strictEqual(normalized.id, 'justjoin_react-lead-developer');
    assert.strictEqual(normalized.provider, 'justjoin');
    assert.strictEqual(normalized.title, 'Lead Frontend Engineer');
    assert.strictEqual(normalized.company, 'Acme Corp');
    assert.strictEqual(normalized.isRemote, true);
    assert.strictEqual(normalized.seniority, 'senior');
    assert.deepStrictEqual(normalized.requiredSkills, ['React', 'TypeScript']);
    assert.strictEqual(normalized.salaryRange?.min, 25000);
    assert.strictEqual(normalized.salaryRange?.max, 32000);
    assert.strictEqual(normalized.salaryRange?.currency, 'PLN');
    assert.strictEqual(normalized.url, 'https://justjoin.it/offers/react-lead-developer');
  });

  it('handles missing salary and fallback values without errors', () => {
    const rawMinimalOffer = {
      title: 'Junior Python Dev',
      company_name: 'StartupLab',
      experience_level: 'junior',
      skills: ['Python'],
      workplace_type: 'office',
    };

    const normalized = provider.normalizeOffer(rawMinimalOffer);

    assert.strictEqual(normalized.title, 'Junior Python Dev');
    assert.strictEqual(normalized.company, 'StartupLab');
    assert.strictEqual(normalized.isRemote, false);
    assert.strictEqual(normalized.seniority, 'junior');
    assert.strictEqual(normalized.salaryRange, undefined);
    assert.strictEqual(normalized.url.startsWith('https://justjoin.it/offers/'), true);
  });

  it('multi-page fallback returns non-overlapping listings for page 1 and page 2', () => {
    const criteria = { skills: ['React', 'TypeScript'] };
    const res1 = provider.getSampleFallbackListings(criteria, 1);
    const res2 = provider.getSampleFallbackListings(criteria, 2);

    assert.strictEqual(res1.fallback, true);
    assert.strictEqual(res2.fallback, true);
    assert.ok(res1.nextCursor?.publishedAtCursor);
    assert.ok(res2.nextCursor?.publishedAtCursor);

    const ids1 = new Set(res1.listings.map((l) => l.id));
    for (const l of res2.listings) {
      assert.strictEqual(ids1.has(l.id), false, `Page 1 and Page 2 shouldn't overlap: ${l.id}`);
    }
  });

  it('fingerprint is deterministic and sensitive to field changes', () => {
    const fp1 = computeProviderFingerprint({
      skills: ['React', 'TypeScript'],
      seniority: 'mid',
      workMode: 'remote',
      location: 'Warsaw',
    });
    const fp2 = computeProviderFingerprint({
      skills: ['typescript', 'react '],
      seniority: 'mid',
      workMode: 'remote',
      location: 'Warsaw',
    });
    assert.strictEqual(fp1, fp2);

    const fpDifferentWorkMode = computeProviderFingerprint({
      skills: ['React', 'TypeScript'],
      seniority: 'mid',
      workMode: 'office',
      location: 'Warsaw',
    });
    assert.notStrictEqual(fp1, fpDifferentWorkMode);
  });
});


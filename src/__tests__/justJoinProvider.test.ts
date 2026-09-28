import { describe, it } from 'node:test';
import assert from 'node:assert';
import { JustJoinProvider } from '../lib/providers/JustJoinProvider';

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
});

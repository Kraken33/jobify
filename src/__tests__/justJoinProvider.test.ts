import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert';
import { APIFY_ACTOR_ENDPOINT, JustJoinProvider } from '../lib/providers/JustJoinProvider';
import type { ApifyJustJoinItem } from '../lib/providers/JustJoinProvider';
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
      spokenLanguages: [{ language: 'English', level: 'C1' }],
    });
    const fp2 = computeProviderFingerprint({
      skills: ['typescript', 'react '],
      seniority: 'mid',
      workMode: 'remote',
      location: 'Warsaw',
      spokenLanguages: [{ language: 'english', level: 'C1' }],
    });
    assert.strictEqual(fp1, fp2);

    const fpDifferentWorkMode = computeProviderFingerprint({
      skills: ['React', 'TypeScript'],
      seniority: 'mid',
      workMode: 'office',
      location: 'Warsaw',
      spokenLanguages: [{ language: 'English', level: 'C1' }],
    });
    assert.notStrictEqual(fp1, fpDifferentWorkMode);

    const fpDifferentLanguage = computeProviderFingerprint({
      skills: ['React', 'TypeScript'],
      seniority: 'mid',
      workMode: 'remote',
      location: 'Warsaw',
      spokenLanguages: [{ language: 'German', level: 'B2' }],
    });
    assert.notStrictEqual(fp1, fpDifferentLanguage);
  });
});



describe('JustJoinProvider Apify scraper integration', () => {
  const provider = new JustJoinProvider();
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
  });

  /** Silences the expected degradation warnings emitted by the fallback paths. */
  const silenceWarnings = () => {
    console.warn = () => {};
  };

  /** Installs a stubbed global fetch for the duration of a single test. */
  const mockFetch = (
    handler: (input: string | URL | Request, init?: RequestInit) => Promise<Response>
  ) => {
    globalThis.fetch = handler as unknown as typeof fetch;
  };

  it('normalizes a full Apify dataset item into a canonical listing', () => {
    const item: ApifyJustJoinItem = {
      jobTitle: 'Senior React Developer',
      company: 'Acme Corp',
      companyLogo: 'https://cdn.apify.com/logo.png',
      city: 'Warszawa',
      salary: { min: 20000, max: 26000, currency: 'pln', type: 'b2b' },
      experience: 'senior',
      workplace: 'remote',
      requiredSkills: ['React', 'TypeScript', 'Next.js'],
      published: '2026-09-20T10:00:00.000Z',
      description: 'Build modern UIs for our fintech platform.',
      jobUrl: 'https://justjoin.it/offers/acme-senior-react',
    };

    const listing = provider.normalizeApifyItem(item);

    assert.strictEqual(listing.id, 'justjoin_acme-senior-react');
    assert.strictEqual(listing.provider, 'justjoin');
    assert.strictEqual(listing.title, 'Senior React Developer');
    assert.strictEqual(listing.company, 'Acme Corp');
    assert.strictEqual(listing.companyLogoUrl, 'https://cdn.apify.com/logo.png');
    assert.strictEqual(listing.city, 'Warszawa');
    assert.strictEqual(listing.isRemote, true);
    assert.strictEqual(listing.workplaceType, 'remote');
    assert.strictEqual(listing.seniority, 'senior');
    assert.deepStrictEqual(listing.requiredSkills, ['React', 'TypeScript', 'Next.js']);
    assert.strictEqual(listing.salaryRange?.min, 20000);
    assert.strictEqual(listing.salaryRange?.max, 26000);
    assert.strictEqual(listing.salaryRange?.currency, 'PLN');
    assert.strictEqual(listing.salaryRange?.type, 'b2b');
    assert.strictEqual(listing.url, 'https://justjoin.it/offers/acme-senior-react');
    assert.strictEqual(listing.publishedAt, '2026-09-20T10:00:00.000Z');
    assert.strictEqual(listing.description, 'Build modern UIs for our fintech platform.');
  });

  it('parses string salaries, array salary variants, and hybrid workplaces', () => {
    const hybrid = provider.normalizeApifyItem({
      jobTitle: 'Frontend Developer',
      company: 'Beta Studio',
      workplace: 'hybrid',
      experience: 'junior',
      salary: '16 000 - 22 000 PLN (B2B)',
      requiredSkills: [{ name: 'React' }, 'TypeScript'],
      published: '2026-09-18T08:30:00.000Z',
      jobUrl: 'https://justjoin.it/offers/beta-frontend?utm_source=apify',
    });

    assert.strictEqual(hybrid.id, 'justjoin_beta-frontend');
    assert.strictEqual(hybrid.workplaceType, 'hybrid');
    assert.strictEqual(hybrid.isRemote, false);
    assert.strictEqual(hybrid.seniority, 'junior');
    assert.deepStrictEqual(hybrid.requiredSkills, ['React', 'TypeScript']);
    assert.strictEqual(hybrid.salaryRange?.min, 16000);
    assert.strictEqual(hybrid.salaryRange?.max, 22000);
    assert.strictEqual(hybrid.salaryRange?.currency, 'PLN');
    assert.strictEqual(hybrid.salaryRange?.type, 'B2B');

    const withVariants = provider.normalizeApifyItem({
      jobTitle: 'Backend Engineer',
      company: 'Gamma',
      workplace: 'Office',
      experience: 'lead',
      salary: [{ currency: 'PLN' }, { min: 30000, max: 38000, currency: 'pln' }],
    });

    assert.strictEqual(withVariants.workplaceType, 'office');
    assert.strictEqual(withVariants.seniority, 'lead');
    assert.strictEqual(withVariants.salaryRange?.min, 30000);
    assert.strictEqual(withVariants.salaryRange?.max, 38000);
    assert.strictEqual(withVariants.url.startsWith('https://justjoin.it/offers/'), true);
  });
  it('sorts newest-first, deduplicates, and filters by the published cursor', () => {
    const items: ApifyJustJoinItem[] = [
      {
        jobTitle: 'Older Role',
        company: 'Alpha',
        workplace: 'remote',
        published: '2026-09-10T09:00:00.000Z',
        jobUrl: 'https://justjoin.it/offers/older-role',
      },
      {
        jobTitle: 'Newest Role',
        company: 'Beta',
        workplace: 'remote',
        published: '2026-09-22T11:00:00.000Z',
        jobUrl: 'https://justjoin.it/offers/newest-role',
      },
      {
        // Same offer URL as above: must be deduplicated by id
        jobTitle: 'Newest Role (duplicate)',
        company: 'Beta',
        workplace: 'remote',
        published: '2026-09-22T11:00:00.000Z',
        jobUrl: 'https://justjoin.it/offers/newest-role',
      },
    ];

    const filtered = provider.normalizeApifyDataset(items, {
      publishedAtCursor: '2026-09-15T00:00:00.000Z',
    });

    assert.strictEqual(filtered.fallback, false);
    assert.strictEqual(filtered.listings.length, 1);
    assert.strictEqual(filtered.listings[0].id, 'justjoin_newest-role');
    assert.strictEqual(filtered.listings[0].publishedAt, '2026-09-22T11:00:00.000Z');
    assert.strictEqual(filtered.nextCursor?.publishedAtCursor, '2026-09-22T11:00:00.000Z');

    const unfiltered = provider.normalizeApifyDataset(items);
    assert.strictEqual(unfiltered.listings.length, 2);
    assert.strictEqual(unfiltered.listings[0].title, 'Newest Role');
    assert.strictEqual(unfiltered.listings[1].title, 'Older Role');

    const empty = provider.normalizeApifyDataset([]);
    assert.strictEqual(empty.listings.length, 0);
    assert.strictEqual(empty.nextCursor, null);
    assert.strictEqual(empty.fallback, false);
  });


  it('serializes criteria into the actor input and maps the dataset response', async () => {
    let capturedUrl = '';
    let capturedBody: Record<string, unknown> = {};

    mockFetch(async (input, init) => {
      capturedUrl = String(input);
      capturedBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(
        JSON.stringify([
          {
            jobTitle: 'Senior React Developer',
            company: 'Acme Corp',
            workplace: 'remote',
            experience: 'senior',
            requiredSkills: ['React'],
            published: '2026-09-21T10:00:00.000Z',
            jobUrl: 'https://justjoin.it/offers/acme-senior-react',
          },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const result = await provider.searchJobs({
      skills: ['React', 'TypeScript'],
      seniority: 'mid',
      workMode: 'remote',
      location: 'Kraków',
      limit: 20,
      apifyToken: 'apify_api_test_token',
    });

    assert.strictEqual(capturedUrl.startsWith(APIFY_ACTOR_ENDPOINT), true);
    assert.strictEqual(capturedUrl.includes('token=apify_api_test_token'), true);
    assert.deepStrictEqual(capturedBody, {
      maxItems: 20,
      sortBy: 'published',
      extractFullDetails: false,
      location: 'krakow',
      keyword: 'React',
      experienceLevel: ['mid'],
      workplaceType: ['remote'],
      category: 'javascript',
    });
    assert.strictEqual('apifyToken' in capturedBody, false);

    assert.strictEqual(result.fallback, false);
    assert.strictEqual(result.listings.length, 1);
    assert.strictEqual(result.listings[0].id, 'justjoin_acme-senior-react');
  });

  it('falls back to deterministic listings when no Apify token is configured', async () => {
    silenceWarnings();
    let fetchCalled = false;
    mockFetch(async () => {
      fetchCalled = true;
      throw new Error('fetch must not be called without an Apify token');
    });

    const result = await provider.searchJobs({ skills: ['React'], seniority: 'mid' });

    assert.strictEqual(fetchCalled, false);
    assert.strictEqual(result.fallback, true);
    assert.strictEqual(result.listings.length, 3);
    assert.ok(result.nextCursor?.publishedAtCursor);
  });

  it('falls back when the Apify run returns 401/402 or a network error', async () => {
    silenceWarnings();

    mockFetch(
      async () =>
        new Response(JSON.stringify({ error: { type: 'insufficient-permissions' } }), {
          status: 401,
        })
    );
    const unauthorized = await provider.searchJobs({
      skills: ['React'],
      apifyToken: 'apify_api_expired',
    });
    assert.strictEqual(unauthorized.fallback, true);
    assert.ok(unauthorized.listings.length > 0);

    mockFetch(async () => new Response('insufficient credits', { status: 402 }));
    const noCredits = await provider.searchJobs({
      skills: ['React'],
      apifyToken: 'apify_api_no_credits',
    });
    assert.strictEqual(noCredits.fallback, true);
    assert.ok(noCredits.listings.length > 0);

    mockFetch(async () => {
      throw new Error('fetch failed');
    });
    const networkFailure = await provider.searchJobs({
      skills: ['React'],
      apifyToken: 'apify_api_offline',
    });
    assert.strictEqual(networkFailure.fallback, true);
    assert.ok(networkFailure.listings.length > 0);
  });

  it('advances the deterministic fallback page as the scan offset grows', async () => {
    silenceWarnings();
    const firstScan = await provider.searchJobs({ skills: ['React'] });
    const secondScan = await provider.searchJobs({
      skills: ['React'],
      seenJobIds: firstScan.listings.map((listing) => listing.id),
    });

    const firstIds = new Set(firstScan.listings.map((listing) => listing.id));
    assert.strictEqual(secondScan.fallback, true);
    assert.strictEqual(secondScan.listings.length, 3);
    for (const listing of secondScan.listings) {
      assert.strictEqual(firstIds.has(listing.id), false, `Unexpected repeat: ${listing.id}`);
    }
  });


});

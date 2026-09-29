import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert';
import {
  ARBEITSAGENTUR_API_KEY,
  ARBEITSAGENTUR_JOBS_ENDPOINT,
  ArbeitsagenturProvider,
} from '../lib/providers/ArbeitsagenturProvider';
import type { ArbeitsagenturJobItem } from '../lib/providers/ArbeitsagenturProvider';
import { providerRegistry } from '../lib/providers';

const FULL_ITEM: ArbeitsagenturJobItem = {
  stellenangebotsTitel: 'Senior React Developer (m/w/d)',
  hauptberuf: 'Softwareentwickler/in',
  alleBerufe: ['Softwareentwickler/in'],
  firma: 'CloudWorks GmbH',
  referenznummer: '10000-123456-S',
  stellenlokationen: [
    { adresse: { plz: '10178', ort: 'Berlin', region: 'BERLIN', land: 'DEUTSCHLAND' } },
  ],
  homeofficemoeglich: true,
  homeofficetyp: 'NACH_VEREINBARUNG',
  gehaltsspanneVon: 70000,
  gehaltsspanneBis: 90000,
  verguetungsangabe: 'JAHRESGEHALT',
  vertragsdauer: 'UNBEFRISTET',
  arbeitszeitVollzeit: true,
  externeURL: 'https://example.com/apply/123',
  aenderungsdatum: '2026-09-24T08:46:29.564',
};

describe('ArbeitsagenturProvider normalization', () => {
  const provider = new ArbeitsagenturProvider();

  it('exposes its identity and is registered in the provider registry', () => {
    assert.strictEqual(provider.id, 'arbeitsagentur');
    assert.strictEqual(provider.name, 'Bundesagentur für Arbeit');
    assert.strictEqual(providerRegistry.get('arbeitsagentur'), providerRegistry.get('arbeitsagentur'));
    assert.strictEqual(providerRegistry.get('arbeitsagentur')?.id, 'arbeitsagentur');
    assert.strictEqual(providerRegistry.get('justjoin')?.id, 'justjoin');
    assert.deepStrictEqual(
      providerRegistry
        .getAll()
        .map((entry) => entry.id)
        .sort(),
      ['arbeitnow', 'arbeitsagentur', 'justjoin']
    );
  });

  it('normalizes a full Arbeitsagentur offer payload', () => {
    const listing = provider.normalizeJobItem(FULL_ITEM, { skills: ['React', 'TypeScript'] });

    assert.strictEqual(listing.id, 'arbeitsagentur_10000-123456-S');
    assert.strictEqual(listing.provider, 'arbeitsagentur');
    assert.strictEqual(listing.title, 'Senior React Developer (m/w/d)');
    assert.strictEqual(listing.company, 'CloudWorks GmbH');
    assert.strictEqual(listing.city, 'Berlin');
    assert.strictEqual(listing.isRemote, true);
    assert.strictEqual(listing.workplaceType, 'hybrid');
    assert.strictEqual(listing.seniority, 'senior');
    assert.deepStrictEqual(listing.requiredSkills, ['Softwareentwickler/in', 'React']);
    assert.strictEqual(listing.salaryRange?.min, 70000);
    assert.strictEqual(listing.salaryRange?.max, 90000);
    assert.strictEqual(listing.salaryRange?.currency, 'EUR');
    assert.strictEqual(listing.salaryRange?.type, 'jahresgehalt');
    assert.strictEqual(listing.url, 'https://example.com/apply/123');
    assert.strictEqual(
      new Date(listing.publishedAt as string).getTime(),
      new Date('2026-09-24T08:46:29.564').getTime()
    );
    assert.ok(listing.description?.includes('CloudWorks GmbH'));
    assert.ok(listing.description?.includes('Reference: 10000-123456-S'));
  });

  it('handles minimal payloads without salary or external URL', () => {
    const listing = provider.normalizeJobItem({
      stellenangebotsTitel: 'Junior Python Developer',
      firma: 'StartupLab',
      referenznummer: '',
      chiffrenummer: '305516',
      homeofficemoeglich: false,
      verguetungsangabe: 'KEINE_ANGABEN',
      datumErsteVeroeffentlichung: '2026-09-03',
    });

    assert.strictEqual(listing.id, 'arbeitsagentur_305516');
    assert.strictEqual(listing.company, 'StartupLab');
    assert.strictEqual(listing.city, 'Deutschland');
    assert.strictEqual(listing.isRemote, false);
    assert.strictEqual(listing.workplaceType, 'office');
    assert.strictEqual(listing.seniority, 'junior');
    assert.strictEqual(listing.salaryRange, undefined);
    assert.strictEqual(
      listing.url,
      'https://www.arbeitsagentur.de/jobsuche/jobdetail/305516'
    );
    assert.deepStrictEqual(listing.requiredSkills, []);
  });

  it('derives the fallback listing id deterministically when no reference exists', () => {
    const raw = { stellenangebotsTitel: 'Backend Engineer', firma: 'Nordlicht Systeme AG' };

    const first = provider.normalizeJobItem(raw);
    const second = provider.normalizeJobItem(raw);

    assert.strictEqual(first.id, second.id);
    assert.strictEqual(first.id, 'arbeitsagentur_backend-engineer-nordlicht-systeme-ag');
  });

  it('maps seniority from the German posting text', () => {
    const junior = provider.normalizeJobItem({ hauptberuf: 'Absolvent der Informatik' });
    const lead = provider.normalizeJobItem({ hauptberuf: 'Software Architekt (m/w/d)' });
    const mid = provider.normalizeJobItem({ hauptberuf: 'Fullstack-Entwickler/in' });

    assert.strictEqual(junior.seniority, 'junior');
    assert.strictEqual(lead.seniority, 'lead');
    assert.strictEqual(mid.seniority, 'mid');
  });
});

describe('ArbeitsagenturProvider search integration', () => {
  const provider = new ArbeitsagenturProvider();
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

  it('serializes criteria into query parameters and maps the response envelope', async () => {
    let capturedUrl = '';
    let capturedHeaders: Record<string, string> = {};

    mockFetch(async (input, init) => {
      capturedUrl = String(input);
      capturedHeaders = (init?.headers ?? {}) as Record<string, string>;
      return new Response(
        JSON.stringify({
          ergebnisliste: [
            {
              stellenangebotsTitel: 'React Developer (m/w/d)',
              firma: 'Smartbroker',
              referenznummer: '13644-305516-S',
              homeofficemoeglich: true,
              homeofficetyp: 'NACH_VEREINBARUNG',
              stellenlokationen: [{ adresse: { ort: 'Berlin' } }],
              aenderungsdatum: '2026-09-21T10:00:00.000Z',
            },
          ],
          maxErgebnisse: 72,
          page: 1,
          size: 20,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const result = await provider.searchJobs({
      targetRole: 'React Developer',
      skills: ['React', 'TypeScript'],
      seniority: 'mid',
      workMode: 'remote',
      location: 'Berlin',
      limit: 20,
    });

    const url = new URL(capturedUrl);
    assert.strictEqual(`${url.origin}${url.pathname}`, ARBEITSAGENTUR_JOBS_ENDPOINT);
    assert.strictEqual(url.searchParams.get('was'), 'React Developer');
    assert.strictEqual(url.searchParams.get('wo'), 'Berlin');
    assert.strictEqual(url.searchParams.get('homeofficemoeglich'), 'true');
    assert.strictEqual(url.searchParams.get('page'), '1');
    assert.strictEqual(url.searchParams.get('size'), '20');
    assert.strictEqual(capturedHeaders['X-API-Key'], ARBEITSAGENTUR_API_KEY);

    assert.strictEqual(result.fallback, false);
    assert.strictEqual(result.listings.length, 1);
    assert.strictEqual(result.listings[0].id, 'arbeitsagentur_13644-305516-S');
    assert.strictEqual(result.listings[0].provider, 'arbeitsagentur');
    assert.strictEqual(result.listings[0].city, 'Berlin');
    assert.strictEqual(result.listings[0].isRemote, true);
    assert.strictEqual(
      result.nextCursor?.publishedAtCursor,
      '2026-09-21T10:00:00.000Z'
    );
  });

  it('omits location and home office filters that the service cannot resolve', () => {
    const generic = new URL(
      provider.buildSearchUrl({ targetRole: 'Java Developer', skills: ['Java'], location: 'Remote', workMode: 'any' })
    );
    assert.strictEqual(generic.searchParams.get('was'), 'Java Developer');
    assert.strictEqual(generic.searchParams.has('wo'), false);
    assert.strictEqual(generic.searchParams.has('homeofficemoeglich'), false);
    assert.strictEqual(generic.searchParams.get('size'), '25');

    const multi = new URL(
      provider.buildSearchUrl({ targetRole: 'Java Engineer', skills: ['Java'], location: 'Remote / München' })
    );
    assert.strictEqual(multi.searchParams.get('wo'), 'München');
    assert.strictEqual(multi.searchParams.get('was'), 'Java Engineer');

    const keywords = new URL(
      provider.buildSearchUrl({ keywords: ['Data Engineer'], skills: ['Python'] })
    );
    assert.strictEqual(keywords.searchParams.get('was'), 'Data Engineer');

    const noRoleSkillsOnly = new URL(provider.buildSearchUrl({ skills: ['Go'], limit: 80 }));
    assert.strictEqual(noRoleSkillsOnly.searchParams.has('was'), false);
    assert.strictEqual(noRoleSkillsOnly.searchParams.get('size'), '25');
  });

  it('sorts newest-first, deduplicates and filters by the published cursor', () => {
    const payload = {
      ergebnisliste: [
        {
          stellenangebotsTitel: 'Older Role',
          firma: 'Alpha',
          referenznummer: 'ref-older',
          aenderungsdatum: '2026-09-10T09:00:00.000Z',
        },
        {
          stellenangebotsTitel: 'Newest Role',
          firma: 'Beta',
          referenznummer: 'ref-newest',
          aenderungsdatum: '2026-09-22T11:00:00.000Z',
        },
        {
          stellenangebotsTitel: 'Newest Role (duplicate)',
          firma: 'Beta',
          referenznummer: 'ref-newest',
          aenderungsdatum: '2026-09-22T11:00:00.000Z',
        },
      ],
    };

    const filtered = provider.normalizeSearchResponse(payload, {
      publishedAtCursor: '2026-09-15T00:00:00.000Z',
    });

    assert.strictEqual(filtered.fallback, false);
    assert.strictEqual(filtered.listings.length, 1);
    assert.strictEqual(filtered.listings[0].id, 'arbeitsagentur_ref-newest');
    assert.strictEqual(filtered.nextCursor?.publishedAtCursor, '2026-09-22T11:00:00.000Z');

    const unfiltered = provider.normalizeSearchResponse(payload);
    assert.strictEqual(unfiltered.listings.length, 2);
    assert.strictEqual(unfiltered.listings[0].title, 'Newest Role');
    assert.strictEqual(unfiltered.listings[1].title, 'Older Role');

    const empty = provider.normalizeSearchResponse({ ergebnisliste: [] });
    assert.strictEqual(empty.listings.length, 0);
    assert.strictEqual(empty.nextCursor, null);

    const malformed = provider.normalizeSearchResponse(null, {
      publishedAtCursor: '2026-09-15T00:00:00.000Z',
    });
    assert.strictEqual(malformed.listings.length, 0);
    assert.strictEqual(malformed.nextCursor, null);
    assert.strictEqual(malformed.fallback, false);
  });

  it('broadens the search when the requested location yields no live postings', async () => {
    const requested: string[] = [];

    mockFetch(async (input) => {
      const url = new URL(String(input));
      requested.push(url.toString());
      const located = url.searchParams.has('wo');

      // The board only lists jobs in Germany: an unresolvable `wo` is answered
      // with HTTP 200 and an empty envelope rather than an error.
      return new Response(
        JSON.stringify(
          located
            ? { ergebnisliste: [], maxErgebnisse: 0 }
            : { ergebnisliste: [FULL_ITEM], maxErgebnisse: 368 }
        ),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const result = await provider.searchJobs({
      targetRole: 'React Developer',
      skills: ['React'],
      workMode: 'remote',
      location: 'Warsaw, Poland',
      limit: 20,
    });

    assert.strictEqual(requested.length, 2);

    const primary = new URL(requested[0]);
    const broadened = new URL(requested[1]);
    assert.strictEqual(primary.searchParams.get('wo'), 'Warsaw');
    assert.strictEqual(broadened.searchParams.has('wo'), false);
    // Only the location is dropped; every other criterion survives the retry.
    assert.strictEqual(broadened.searchParams.get('was'), 'React Developer');
    assert.strictEqual(broadened.searchParams.get('homeofficemoeglich'), 'true');
    assert.strictEqual(broadened.searchParams.get('size'), '20');

    assert.strictEqual(result.fallback, false);
    assert.strictEqual(result.listings.length, 1);
    assert.strictEqual(result.listings[0].id, 'arbeitsagentur_10000-123456-S');
    assert.ok(result.notice?.includes('Warsaw'));
  });

  it('keeps the location filter when it already returns live postings', async () => {
    let calls = 0;
    mockFetch(async () => {
      calls += 1;
      return new Response(JSON.stringify({ ergebnisliste: [FULL_ITEM], maxErgebnisse: 1 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const result = await provider.searchJobs({
      skills: ['React'],
      workMode: 'remote',
      location: 'Berlin',
    });

    assert.strictEqual(calls, 1);
    assert.strictEqual(result.listings.length, 1);
    assert.strictEqual(result.notice, undefined);
  });

  it('broadens when the located page holds nothing usable for the track', async () => {
    const requested: string[] = [];

    mockFetch(async (input) => {
      const url = new URL(String(input));
      requested.push(url.toString());
      const located = url.searchParams.has('wo');

      // Real service behaviour for a non-German city: it still answers
      // `homeofficemoeglich=true` with a single on-site posting, which the
      // remote hard constraint then rejects.
      return new Response(
        JSON.stringify({
          ergebnisliste: located
            ? [{ ...FULL_ITEM, referenznummer: '99999-1-S', homeofficemoeglich: false }]
            : [FULL_ITEM],
          maxErgebnisse: located ? 1 : 368,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const result = await provider.searchJobs({
      targetRole: 'React Developer',
      skills: ['React'],
      workMode: 'remote',
      location: 'Warsaw',
      limit: 20,
    });

    assert.strictEqual(requested.length, 2);
    assert.strictEqual(new URL(requested[1]).searchParams.has('wo'), false);
    assert.strictEqual(result.fallback, false);
    assert.strictEqual(result.listings.length, 1);
    assert.strictEqual(result.listings[0].isRemote, true);
    assert.ok(result.notice?.includes('Warsaw'));
  });

  it('does not broaden when postings exist but the cursor filtered them out', async () => {
    let calls = 0;
    mockFetch(async () => {
      calls += 1;
      return new Response(
        JSON.stringify({
          ergebnisliste: [{ ...FULL_ITEM, aenderungsdatum: '2026-09-01T00:00:00.000Z' }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const result = await provider.searchJobs({
      skills: ['React'],
      location: 'Berlin',
      publishedAtCursor: '2026-09-20T00:00:00.000Z',
    });

    // The service had postings; the incremental frontier consumed them. This
    // must stay a single request so cursors keep their meaning across scans.
    assert.strictEqual(calls, 1);
    assert.strictEqual(result.listings.length, 0);
    assert.strictEqual(result.notice, undefined);
  });

  it('does not retry a location-less search that legitimately has no postings', async () => {
    let calls = 0;
    mockFetch(async () => {
      calls += 1;
      return new Response(JSON.stringify({ ergebnisliste: [], maxErgebnisse: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const result = await provider.searchJobs({ targetRole: 'Drupal Specialist', location: 'Remote' });

    assert.strictEqual(calls, 1);
    assert.strictEqual(result.listings.length, 0);
    assert.strictEqual(result.notice, undefined);
  });

  it('falls back when the service errors, is unreachable or times out', async () => {
    silenceWarnings();

    mockFetch(async () => new Response('forbidden', { status: 403 }));
    const forbidden = await provider.searchJobs({ skills: ['React'] });
    assert.strictEqual(forbidden.fallback, true);
    assert.ok(forbidden.listings.length > 0);

    mockFetch(async () => new Response('boom', { status: 500 }));
    const serverError = await provider.searchJobs({ skills: ['React'] });
    assert.strictEqual(serverError.fallback, true);
    assert.ok(serverError.listings.length > 0);

    mockFetch(async () => {
      throw new Error('fetch failed');
    });
    const offline = await provider.searchJobs({ skills: ['React'] });
    assert.strictEqual(offline.fallback, true);
    assert.ok(offline.listings.length > 0);

    mockFetch(async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      throw abortError;
    });
    const timedOut = await provider.searchJobs({ skills: ['React'] });
    assert.strictEqual(timedOut.fallback, true);
    assert.ok(timedOut.listings.length > 0);
  });

  it('multi-page fallback returns non-overlapping listings for page 1 and page 2', () => {
    const criteria = { skills: ['React', 'TypeScript'] };
    const res1 = provider.getSampleFallbackListings(criteria, 1);
    const res2 = provider.getSampleFallbackListings(criteria, 2);

    assert.strictEqual(res1.fallback, true);
    assert.strictEqual(res2.fallback, true);
    assert.strictEqual(res1.listings.length, 3);
    assert.strictEqual(res2.listings.length, 3);
    assert.strictEqual(res1.listings[0].provider, 'arbeitsagentur');
    assert.strictEqual(res1.listings[0].salaryRange?.currency, 'EUR');
    assert.ok(res1.listings[0].url.startsWith('https://www.arbeitsagentur.de/jobsuche/jobdetail/'));
    assert.ok(res1.nextCursor?.publishedAtCursor);
    assert.ok(res2.nextCursor?.publishedAtCursor);

    const ids1 = new Set(res1.listings.map((listing) => listing.id));
    for (const listing of res2.listings) {
      assert.strictEqual(ids1.has(listing.id), false, `Unexpected repeat: ${listing.id}`);
    }
  });

  it('advances the deterministic fallback page as the scan offset grows', async () => {
    silenceWarnings();
    mockFetch(async () => {
      throw new Error('fetch failed');
    });

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

  it('queries total job count using maxErgebnisse', async () => {
    mockFetch(async () => {
      return new Response(
        JSON.stringify({ ergebnisliste: [], maxErgebnisse: 142 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const count = await provider.getJobCount({ skills: ['React'] });
    assert.strictEqual(count, 142);
  });
});

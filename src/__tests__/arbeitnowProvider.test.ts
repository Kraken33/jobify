import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert';
import {
  ARBEITNOW_API_ENDPOINT,
  ArbeitnowProvider,
} from '../lib/providers/ArbeitnowProvider';
import type { ArbeitnowJobItem } from '../lib/providers/ArbeitnowProvider';
import { providerRegistry } from '../lib/providers';

const SAMPLE_ITEM: ArbeitnowJobItem = {
  slug: 'software-engineer-berlin-123456',
  company_name: 'Preiswecker GmbH',
  title: 'Software Engineer (m/w/d)',
  description: '<p>Preiswecker is looking for a Software Engineer in Berlin. English required, German is a plus.</p>',
  remote: true,
  url: 'https://www.preiswecker.com/jobs/123456',
  tags: ['Software Engineering', 'React', 'German'],
  job_types: ['Full-time'],
  location: 'Berlin',
  created_at: 1786516800,
};

describe('ArbeitnowProvider normalization', () => {
  const provider = new ArbeitnowProvider();

  it('exposes its identity and is registered in the provider registry', () => {
    assert.strictEqual(provider.id, 'arbeitnow');
    assert.strictEqual(provider.name, 'Arbeitnow');
    assert.strictEqual(providerRegistry.get('arbeitnow')?.id, 'arbeitnow');
    assert.ok(
      providerRegistry
        .getAll()
        .map((entry) => entry.id)
        .includes('arbeitnow')
    );
  });

  it('normalizes a full Arbeitnow job payload', () => {
    const listing = provider.normalizeJobItem(SAMPLE_ITEM, { skills: ['React'] });

    assert.strictEqual(listing.id, 'arbeitnow_software-engineer-berlin-123456');
    assert.strictEqual(listing.provider, 'arbeitnow');
    assert.strictEqual(listing.title, 'Software Engineer (m/w/d)');
    assert.strictEqual(listing.company, 'Preiswecker GmbH');
    assert.strictEqual(listing.city, 'Berlin');
    assert.strictEqual(listing.isRemote, true);
    assert.strictEqual(listing.workplaceType, 'remote');
    assert.strictEqual(listing.seniority, 'mid');
    assert.strictEqual(listing.url, 'https://www.preiswecker.com/jobs/123456');
    assert.strictEqual(
      new Date(listing.publishedAt as string).getTime(),
      1786516800 * 1000
    );
    assert.ok(listing.spokenLanguages && listing.spokenLanguages.length > 0);
  });

  it('extracts spoken languages from description HTML and tags', () => {
    const languages = provider.extractSpokenLanguages(
      ['Software Engineering', 'German'],
      '<p>We require fluent English and German B2 spoken skills.</p>'
    );

    const langNames = languages.map((l) => l.language);
    assert.ok(langNames.includes('English'));
    assert.ok(langNames.includes('German'));
  });

  it('filters by publishedAtCursor timestamp', () => {
    const olderItem: ArbeitnowJobItem = {
      slug: 'older-job',
      title: 'Backend Dev',
      created_at: 1000000,
    };
    const newerItem: ArbeitnowJobItem = {
      slug: 'newer-job',
      title: 'Frontend Dev',
      created_at: 2000000,
    };

    const payload = { data: [olderItem, newerItem] };

    const cursorDate = new Date(1500000 * 1000).toISOString();
    const result = provider.normalizeApiResponse(payload, {
      publishedAtCursor: cursorDate,
    });

    assert.strictEqual(result.listings.length, 1);
    assert.strictEqual(result.listings[0].id, 'arbeitnow_newer-job');
    assert.strictEqual(
      result.nextCursor?.publishedAtCursor,
      new Date(2000000 * 1000).toISOString()
    );
  });
});

describe('ArbeitnowProvider API integration & Fallback', () => {
  const provider = new ArbeitnowProvider();
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
  });

  const mockFetch = (
    handler: (input: string | URL | Request, init?: RequestInit) => Promise<Response>
  ) => {
    globalThis.fetch = handler as unknown as typeof fetch;
  };

  it('fetches live jobs from Arbeitnow endpoint', async () => {
    let capturedUrl = '';

    mockFetch(async (input) => {
      capturedUrl = String(input);
      return new Response(
        JSON.stringify({
          data: [SAMPLE_ITEM],
          meta: { current_page: 1, total: 100 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const result = await provider.searchJobs({ limit: 10 });
    assert.strictEqual(capturedUrl, `${ARBEITNOW_API_ENDPOINT}?page=1`);
    assert.strictEqual(result.fallback, false);
    assert.strictEqual(result.listings.length, 1);
    assert.strictEqual(result.listings[0].id, 'arbeitnow_software-engineer-berlin-123456');
  });

  it('queries total job count via getJobCount', async () => {
    mockFetch(async () => {
      return new Response(
        JSON.stringify({
          data: [],
          meta: { current_page: 1, total: 450 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const count = await provider.getJobCount({});
    assert.strictEqual(count, 450);
  });

  it('degrades gracefully to fallback pool on network error', async () => {
    console.warn = () => {};
    mockFetch(async () => {
      throw new Error('Network failure');
    });

    const result = await provider.searchJobs({});
    assert.strictEqual(result.fallback, true);
    assert.ok(result.listings.length > 0);
    assert.strictEqual(result.listings[0].provider, 'arbeitnow');
  });
});

describe('ArbeitnowProvider Web Search Scraping', () => {
  const provider = new ArbeitnowProvider();
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
  });

  const mockFetch = (
    handler: (input: string | URL | Request, init?: RequestInit) => Promise<Response>
  ) => {
    globalThis.fetch = handler as unknown as typeof fetch;
  };

  const SAMPLE_HTML_SEARCH = `
    <html>
      <body>
        <div>Showing 1 - 35 of 212 Jobs</div>
        <div class="flex-shrink-0 h-16 w-16">
          <img title="HOPn UG" alt="HOPn UG Jobs" />
        </div>
        <div>
          <h3 itemprop="title">
            <a href="https://www.arbeitnow.com/jobs/companies/hopn-ug/javascript-developer-puchheim-481737" data-job-item-link="true" title="JavaScript Developer">JavaScript Developer</a>
          </h3>
          <span class="text-gray-600">Puchheim</span>
          <button data-key="Remote">Remote</button>
          <button data-key="JavaScript">JavaScript</button>
          <button data-key="English speaking">English speaking</button>
        </div>
      </body>
    </html>
  `;

  it('builds web search URL with serialized search terms and language tags', () => {
    const url = provider.buildSearchUrl({
      keywords: ['javascript'],
      spokenLanguages: [{ language: 'English', level: 'B2' }],
    });

    assert.ok(url.includes('search=javascript'));
    assert.ok(url.includes('english'));
    assert.ok(url.includes('tags='));
    assert.ok(url.includes('sort_by=relevance'));
  });

  it('parses job listings from web search HTML', () => {
    const listings = provider.parseWebSearchHtml(SAMPLE_HTML_SEARCH, {
      keywords: ['JavaScript'],
    });

    assert.strictEqual(listings.length, 1);
    assert.strictEqual(listings[0].id, 'arbeitnow_javascript-developer-puchheim-481737');
    assert.strictEqual(listings[0].title, 'JavaScript Developer');
    assert.strictEqual(listings[0].company, 'HOPn UG');
    assert.strictEqual(listings[0].city, 'Puchheim');
    assert.strictEqual(listings[0].isRemote, true);
    assert.ok(listings[0].requiredSkills.includes('JavaScript'));
    assert.ok(listings[0].spokenLanguages && listings[0].spokenLanguages.some((l) => l.language === 'English'));
  });

  it('parses total job count from web search HTML', () => {
    const count = provider.parseTotalCountFromHtml(SAMPLE_HTML_SEARCH);
    assert.strictEqual(count, 212);
  });

  it('executes web search fetching when search terms are provided in criteria', async () => {
    let requestedUrl = '';
    mockFetch(async (input) => {
      requestedUrl = String(input);
      return new Response(SAMPLE_HTML_SEARCH, {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      });
    });

    const result = await provider.searchJobs({
      keywords: ['javascript'],
      spokenLanguages: [{ language: 'English', level: 'B2' }],
    });

    assert.ok(requestedUrl.startsWith('https://www.arbeitnow.com?search=javascript'));
    assert.strictEqual(result.fallback, false);
    assert.strictEqual(result.listings.length, 1);
    assert.strictEqual(result.listings[0].title, 'JavaScript Developer');
  });

  it('falls back to API or fallback pool when web search fails', async () => {
    console.warn = () => {};
    mockFetch(async (input) => {
      const url = String(input);
      // Match web-search URLs: root with query params, or a named endpoint path (not the /api/ REST path)
      if (url.includes('arbeitnow.com?') || (url.includes('arbeitnow.com/') && !url.includes('/api/'))) {
        return new Response('Internal Server Error', { status: 500 });
      }
      return new Response(JSON.stringify({ data: [], meta: { total: 0 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const result = await provider.searchJobs({ keywords: ['react'] });
    assert.strictEqual(result.fallback, false);
    assert.strictEqual(result.listings.length, 0);
  });

  it('uses generic root URL and no implicit tag when no endpoint hint is provided', () => {
    const url = provider.buildSearchUrl({ keywords: ['javascript'] });
    assert.ok(url.startsWith('https://www.arbeitnow.com?'), `Expected generic root, got: ${url}`);
    assert.ok(url.includes('search=javascript'));
    assert.ok(!url.includes('tags='), `Expected no tags param without endpoint or spoken languages, got: ${url}`);
  });

  it('injects endpoint path AND its implicit tag for english-speaking-jobs', () => {
    const url = provider.buildSearchUrl(
      {
        keywords: ['javascript'],
        providerHints: { arbeitnow: { endpoint: 'english-speaking-jobs' } },
      },
      1
    );
    assert.ok(
      url.startsWith('https://www.arbeitnow.com/english-speaking-jobs?'),
      `Expected english-speaking-jobs path, got: ${url}`
    );
    assert.ok(url.includes('search=javascript'));
    assert.ok(url.includes('sort_by=relevance'));
    // Implicit tag must be present
    assert.ok(
      url.includes('english+speaking') || url.includes('english%20speaking'),
      `Expected "english speaking" tag in URL, got: ${url}`
    );
  });

  it('injects endpoint path AND its implicit tag for visa-sponsorship-jobs', () => {
    const url = provider.buildSearchUrl(
      {
        keywords: ['python'],
        providerHints: { arbeitnow: { endpoint: 'visa-sponsorship-jobs' } },
      },
      1
    );
    assert.ok(url.startsWith('https://www.arbeitnow.com/visa-sponsorship-jobs?'));
    assert.ok(
      url.includes('visa+sponsorship') || url.includes('visa%20sponsorship'),
      `Expected "visa sponsorship" tag in URL, got: ${url}`
    );
  });

  it('changes only the path for path-only endpoints (no spurious tags)', () => {
    for (const endpoint of ['jobs-with-salary', '4-day-work-week-jobs', 'jobs-with-relocation']) {
      const url = provider.buildSearchUrl(
        { keywords: ['react'], providerHints: { arbeitnow: { endpoint } } },
        1
      );
      assert.ok(
        url.startsWith(`https://www.arbeitnow.com/${endpoint}?`),
        `Expected ${endpoint} path, got: ${url}`
      );
      assert.ok(!url.includes('tags='), `Expected no tags param for ${endpoint}, got: ${url}`);
    }
  });

  it('does not duplicate the english-speaking tag when user also added English spoken language', () => {
    const url = provider.buildSearchUrl({
      keywords: ['typescript'],
      spokenLanguages: [{ language: 'English', level: 'B2' }],
      providerHints: { arbeitnow: { endpoint: 'english-speaking-jobs' } },
    });
    // URLSearchParams encodes spaces as '+'; replace before decoding
    const rawTagParam = url.split('tags=')[1]?.split('&')[0] || '';
    const tagParam = decodeURIComponent(rawTagParam.replace(/\+/g, ' '));
    const parsed: string[] = JSON.parse(tagParam);
    assert.strictEqual(
      parsed.filter((t) => t === 'english speaking').length,
      1,
      `Expected "english speaking" exactly once, got: ${JSON.stringify(parsed)}`
    );
  });
});

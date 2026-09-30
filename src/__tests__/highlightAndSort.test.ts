import { describe, it } from 'node:test';
import assert from 'node:assert';
import { MatchResult } from '@/types';
import { formatPublishedDate, getDayTimestamp } from '@/lib/utils/dateFormat';

describe('Highlight and Sort New Vacancies Logic', () => {
  const mockMatches: MatchResult[] = [
    {
      id: 'match-1',
      job: {
        id: 'job-1',
        provider: 'justjoin',
        title: 'Backend Engineer',
        company: 'Alpha Inc',
        isRemote: true,
        seniority: 'senior',
        requiredSkills: ['Node.js'],
        url: 'https://example.com/1',
        publishedAt: '2026-09-30T10:00:00Z',
        salaryRange: { min: 20000, max: 25000, currency: 'PLN' },
      },
      evaluation: {
        score: 75,
        verdict: 'Moderate Match',
        pros: ['Node.js experience'],
        gaps: [],
        summary: 'Good fit',
      },
      createdAt: '2026-09-30T10:05:00Z',
      status: 'active',
    },
    {
      id: 'match-2',
      job: {
        id: 'job-2',
        provider: 'justjoin',
        title: 'Lead Architect',
        company: 'Beta Corp',
        isRemote: true,
        seniority: 'lead',
        requiredSkills: ['Architecture'],
        url: 'https://example.com/2',
        publishedAt: '2026-09-30T08:00:00Z', // Same day as match-1, but higher score
        salaryRange: { min: 30000, max: 35000, currency: 'PLN' },
      },
      evaluation: {
        score: 95,
        verdict: 'Strong Match',
        pros: ['Exceptional seniority'],
        gaps: [],
        summary: 'Top tier match',
      },
      createdAt: '2026-09-30T08:05:00Z',
      status: 'active',
    },
    {
      id: 'match-3',
      job: {
        id: 'job-3',
        provider: 'arbeitnow',
        title: 'Fullstack Dev',
        company: 'Gamma GmbH',
        isRemote: true,
        seniority: 'mid',
        requiredSkills: ['React', 'Node'],
        url: 'https://example.com/3',
        publishedAt: '2026-09-28T12:00:00Z', // Older day, high score
        salaryRange: { min: 15000, max: 18000, currency: 'PLN' },
      },
      evaluation: {
        score: 99,
        verdict: 'Strong Match',
        pros: ['Stack match'],
        gaps: [],
        summary: 'Great match',
      },
      createdAt: '2026-09-28T12:05:00Z',
      status: 'active',
    },
    {
      id: 'match-4',
      job: {
        id: 'job-4',
        provider: 'arbeitsagentur',
        title: 'Junior Developer',
        company: 'Delta AG',
        isRemote: false,
        seniority: 'junior',
        requiredSkills: ['JavaScript'],
        url: 'https://example.com/4',
        // Missing publishedAt, fallback to createdAt
      },
      evaluation: {
        score: 60,
        verdict: 'Moderate Match',
        pros: ['Basic skills'],
        gaps: ['Junior level'],
        summary: 'Entry level',
      },
      createdAt: '2026-09-29T14:00:00Z',
      status: 'active',
    },
  ];

  const sortMatches = (
    matches: MatchResult[],
    sortBy: 'newest' | 'score' | 'salary'
  ): MatchResult[] => {
    return [...matches].sort((a, b) => {
      if (sortBy === 'newest') {
        const dayA = getDayTimestamp(a.job.publishedAt || a.createdAt);
        const dayB = getDayTimestamp(b.job.publishedAt || b.createdAt);
        if (dayB !== dayA) {
          return dayB - dayA;
        }
        return b.evaluation.score - a.evaluation.score;
      }
      if (sortBy === 'score') {
        return b.evaluation.score - a.evaluation.score;
      }
      const aSalary = a.job.salaryRange?.max || a.job.salaryRange?.min || 0;
      const bSalary = b.job.salaryRange?.max || b.job.salaryRange?.min || 0;
      return bSalary - aSalary;
    });
  };

  it('sorts by newest day first, breaking ties with AI fit score', () => {
    const sorted = sortMatches(mockMatches, 'newest');

    // Expected order:
    // 1. 2026-09-30 items: match-2 (95%) before match-1 (75%)
    // 2. 2026-09-29 items: match-4 (60%)
    // 3. 2026-09-28 items: match-3 (99%)
    assert.strictEqual(sorted[0].id, 'match-2'); // 2026-09-30, score 95
    assert.strictEqual(sorted[1].id, 'match-1'); // 2026-09-30, score 75
    assert.strictEqual(sorted[2].id, 'match-4'); // 2026-09-29
    assert.strictEqual(sorted[3].id, 'match-3'); // 2026-09-28
  });

  it('sorts strictly by fit score when score mode is selected', () => {
    const sorted = sortMatches(mockMatches, 'score');
    assert.strictEqual(sorted[0].id, 'match-3'); // score 99
    assert.strictEqual(sorted[1].id, 'match-2'); // score 95
    assert.strictEqual(sorted[2].id, 'match-1'); // score 75
    assert.strictEqual(sorted[3].id, 'match-4'); // score 60
  });

  it('sorts by salary when salary mode is selected', () => {
    const sorted = sortMatches(mockMatches, 'salary');
    assert.strictEqual(sorted[0].id, 'match-2'); // 35000 max
    assert.strictEqual(sorted[1].id, 'match-1'); // 25000 max
    assert.strictEqual(sorted[2].id, 'match-3'); // 18000 max
    assert.strictEqual(sorted[3].id, 'match-4'); // no salary
  });

  it('accurately identifies newly fetched job IDs using set lookup', () => {
    const newlyFetchedJobIds = ['job-1', 'job-2'];
    const newJobIdSet = new Set(newlyFetchedJobIds);

    const isMatch1New = newJobIdSet.has(mockMatches[0].id) || newJobIdSet.has(mockMatches[0].job.id);
    const isMatch3New = newJobIdSet.has(mockMatches[2].id) || newJobIdSet.has(mockMatches[2].job.id);

    assert.strictEqual(isMatch1New, true);
    assert.strictEqual(isMatch3New, false);
  });

  it('formats publication date as Today, Yesterday, or DD.MM.YYYY', () => {
    const now = new Date();
    const todayISO = now.toISOString();

    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayISO = yesterday.toISOString();

    const pastDateISO = '2025-05-15T10:00:00Z';

    assert.strictEqual(formatPublishedDate(todayISO), 'Today');
    assert.strictEqual(formatPublishedDate(yesterdayISO), 'Yesterday');
    assert.strictEqual(formatPublishedDate(pastDateISO), '15.05.2025');
    assert.strictEqual(formatPublishedDate(null), '');
    assert.strictEqual(formatPublishedDate('invalid-date'), '');
  });

  it('generates day group dividers on date transitions in newest sort', () => {
    const sorted = sortMatches(mockMatches, 'newest');
    const dividers: { index: number; label: string }[] = [];

    sorted.forEach((match, index) => {
      const currentDayKey = formatPublishedDate(match.job.publishedAt || match.createdAt);
      const prevMatch = index > 0 ? sorted[index - 1] : null;
      const prevDayKey = prevMatch
        ? formatPublishedDate(prevMatch.job.publishedAt || prevMatch.createdAt)
        : null;

      if (index === 0 || currentDayKey !== prevDayKey) {
        dividers.push({ index, label: currentDayKey });
      }
    });

    // 3 date groups: 2026-09-30 (items 0 and 1), 2026-09-29 (item 2), 2026-09-28 (item 3)
    assert.strictEqual(dividers.length, 3);
    assert.strictEqual(dividers[0].index, 0);
    assert.strictEqual(dividers[1].index, 2);
    assert.strictEqual(dividers[2].index, 3);
  });
});

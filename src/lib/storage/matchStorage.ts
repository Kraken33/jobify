import { MatchResult } from '@/types';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

const APPLIED_STORAGE_KEY = 'jobify:applied';
const APPLIED_MAX_ENTRIES = 200;

export function getMatchStorageKey(sessionId: string): string {
  return `jobify:matches:${sessionId}`;
}

export async function loadSessionMatches(sessionId: string): Promise<MatchResult[]> {
  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConfigured) {
    try {
      // Query job_matches by session_id
      const query = supabase
        .from('job_matches')
        .select('*')
        .order('created_at', { ascending: false });

      if (sessionId.startsWith('jobify:implicit:')) {
        query.is('session_id', null);
      } else {
        query.eq('session_id', sessionId);
      }

      const { data, error } = await query;
      if (data && !error && data.length > 0) {
        return data.map((row) => ({
          id: row.id,
          sessionId: row.session_id || sessionId,
          job: {
            id: row.provider_job_id || row.id,
            provider: row.provider || 'justjoin',
            title: row.title,
            company: row.company,
            city: row.city,
            isRemote: row.is_remote ?? false,
            seniority: row.seniority || 'mid',
            requiredSkills: row.required_skills || [],
            salaryRange: {
              min: row.salary_min,
              max: row.salary_max,
              currency: row.salary_currency || 'PLN',
            },
            url: row.url,
          },
          evaluation: {
            score: row.fit_score || 0,
            verdict: row.verdict || 'Moderate Match',
            pros: row.pros || [],
            gaps: row.gaps || [],
            summary: row.summary || '',
          },
          createdAt: row.created_at,
          // status absent in DB rows defaults to 'active' at render time
        }));
      }
    } catch (err) {
      console.warn('Failed to load session matches from Supabase, falling back to localStorage:', err);
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(getMatchStorageKey(sessionId));
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  return [];
}

export async function saveSessionMatches(sessionId: string, matches: MatchResult[]): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      // Cap at 100 most recent items to avoid localStorage quota issues
      // status field is preserved as-is in the serialised object
      const capped = matches.slice(0, 100);
      localStorage.setItem(getMatchStorageKey(sessionId), JSON.stringify(capped));
    } catch {
      // Ignore quota errors
    }
  }
}

export async function clearSessionMatches(sessionId: string): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(getMatchStorageKey(sessionId));
    } catch {
      // Ignore
    }
  }

  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConfigured) {
    try {
      if (!sessionId.startsWith('jobify:implicit:')) {
        await supabase.from('job_matches').delete().eq('session_id', sessionId);
      }
    } catch (err) {
      console.warn('Failed to clear session matches from Supabase:', err);
    }
  }
}

// ─── Global Applied Store ────────────────────────────────────────────────────
// Stored in localStorage under a single global key, independent of sessions.

export function loadAppliedMatches(): MatchResult[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(APPLIED_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as MatchResult[];
    }
  } catch {
    // Ignore parse errors
  }
  return [];
}

export function saveAppliedMatch(match: MatchResult): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = loadAppliedMatches();
    // Remove any prior entry for the same job to avoid duplicates
    const deduplicated = existing.filter((m) => m.job.id !== match.job.id);
    // Prepend (most recent first) and cap
    const updated = [{ ...match, status: 'applied' as const }, ...deduplicated].slice(
      0,
      APPLIED_MAX_ENTRIES,
    );
    localStorage.setItem(APPLIED_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore quota errors
  }
}

export function removeAppliedMatch(matchId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = loadAppliedMatches();
    const updated = existing.filter((m) => m.id !== matchId);
    localStorage.setItem(APPLIED_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore
  }
}

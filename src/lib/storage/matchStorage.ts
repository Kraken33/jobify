import { MatchResult } from '@/types';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

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

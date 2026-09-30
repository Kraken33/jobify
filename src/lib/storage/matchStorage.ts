import { MatchResult } from '@/types';
import { getSupabaseClient } from '@/lib/supabase/client';

export function getMatchStorageKey(sessionId: string): string {
  return `jobify:matches:${sessionId}`;
}

export async function loadSessionMatches(sessionId: string): Promise<MatchResult[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return [];
  }

  try {
    let query = supabase
      .from('job_matches')
      .select('*')
      .or('status.eq.active,status.is.null')
      .order('created_at', { ascending: false });

    if (sessionId.startsWith('jobify:implicit:')) {
      query = query.is('session_id', null);
    } else {
      query = query.eq('session_id', sessionId);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Failed to load session matches from Supabase:', error);
      return [];
    }

    if (data && data.length > 0) {
      const seenJobIds = new Set<string>();
      const uniqueMatches: MatchResult[] = [];

      for (const row of data) {
        const jobId = row.provider_job_id || row.id;
        if (seenJobIds.has(jobId)) {
          continue;
        }
        seenJobIds.add(jobId);

        uniqueMatches.push({
          id: row.id,
          sessionId: row.session_id || sessionId,
          status: (row.status as 'active' | 'applied' | 'dismissed') || 'active',
          job: {
            id: jobId,
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
        });
      }

      return uniqueMatches;
    }
  } catch (err) {
    console.warn('Exception loading session matches from Supabase:', err);
  }

  return [];
}

export async function saveSessionMatches(sessionId: string, matches: MatchResult[]): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase || matches.length === 0) {
    return;
  }

  try {
    const isImplicit = sessionId.startsWith('jobify:implicit:');
    const rows = matches.map((m) => ({
      session_id: isImplicit ? null : sessionId,
      provider: m.job.provider || 'justjoin',
      provider_job_id: m.job.id,
      title: m.job.title,
      company: m.job.company,
      city: m.job.city || null,
      is_remote: m.job.isRemote ?? false,
      seniority: m.job.seniority || null,
      url: m.job.url,
      salary_min: m.job.salaryRange?.min || null,
      salary_max: m.job.salaryRange?.max || null,
      salary_currency: m.job.salaryRange?.currency || 'PLN',
      required_skills: m.job.requiredSkills || [],
      fit_score: m.evaluation.score,
      verdict: m.evaluation.verdict,
      pros: m.evaluation.pros || [],
      gaps: m.evaluation.gaps || [],
      summary: m.evaluation.summary || null,
      status: m.status || 'active',
    }));

    if (isImplicit) {
      for (const row of rows) {
        const { error: upsertErr } = await supabase
          .from('job_matches')
          .upsert(row, { onConflict: 'provider_job_id' });
        if (upsertErr) {
          await supabase.from('job_matches').insert([row]);
        }
      }
    } else {
      const { error: upsertErr } = await supabase
        .from('job_matches')
        .upsert(rows, { onConflict: 'session_id,provider_job_id', ignoreDuplicates: true });
      if (upsertErr) {
        for (const row of rows) {
          await supabase.from('job_matches').insert([row]);
        }
      }
    }
  } catch (err) {
    console.warn('Exception while saving session matches in Supabase:', err);
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUUID(str: string): boolean {
  return UUID_REGEX.test(str);
}

export async function updateMatchStatus(
  matchId: string,
  status: 'active' | 'applied' | 'dismissed',
  providerJobId?: string
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return;
  }

  const uuidCandidates = new Set<string>();
  const textCandidates = new Set<string>();

  const processCandidate = (idStr: string) => {
    if (!idStr) return;
    if (isUUID(idStr)) {
      uuidCandidates.add(idStr);
    } else {
      textCandidates.add(idStr);
    }
  };

  processCandidate(matchId);
  processCandidate(providerJobId || '');

  if (matchId && matchId.startsWith('match_')) {
    const extracted = matchId.replace(/^match_/, '').replace(/_\d+$/, '');
    processCandidate(extracted);
  }

  try {
    const orConditions: string[] = [];
    for (const uuid of uuidCandidates) {
      orConditions.push(`id.eq.${uuid}`);
      orConditions.push(`provider_job_id.eq.${uuid}`);
    }
    for (const textId of textCandidates) {
      orConditions.push(`provider_job_id.eq.${textId}`);
    }

    if (orConditions.length === 0) return;

    const { error } = await supabase
      .from('job_matches')
      .update({ status })
      .or(orConditions.join(','));

    if (error) {
      console.warn('Failed to update match status in Supabase:', error);
    }
  } catch (err) {
    console.warn('Exception updating match status in Supabase:', err);
  }
}

export async function clearSessionMatches(sessionId: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      if (sessionId.startsWith('jobify:implicit:')) {
        await supabase.from('job_matches').delete().is('session_id', null);
      } else {
        await supabase.from('job_matches').delete().eq('session_id', sessionId);
      }
    } catch (err) {
      console.warn('Failed to clear session matches from Supabase:', err);
    }
  }
}

// ─── Global Applied Store (Supabase-backed) ──────────────────────────────────

export async function loadAppliedMatches(): Promise<MatchResult[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('job_matches')
      .select('*')
      .eq('status', 'applied')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Failed to load applied matches from Supabase:', error);
      return [];
    }

    if (data && data.length > 0) {
      const seenJobIds = new Set<string>();
      const uniqueMatches: MatchResult[] = [];

      for (const row of data) {
        const jobId = row.provider_job_id || row.id;
        if (seenJobIds.has(jobId)) {
          continue;
        }
        seenJobIds.add(jobId);

        uniqueMatches.push({
          id: row.id,
          sessionId: row.session_id,
          status: 'applied' as const,
          job: {
            id: jobId,
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
        });
      }

      return uniqueMatches;
    }
  } catch (err) {
    console.warn('Exception loading applied matches from Supabase:', err);
  }

  return [];
}

export async function saveAppliedMatch(match: MatchResult): Promise<void> {
  await updateMatchStatus(match.id, 'applied', match.job?.id);
}

export async function removeAppliedMatch(matchId: string, providerJobId?: string): Promise<void> {
  await updateMatchStatus(matchId, 'active', providerJobId);
}


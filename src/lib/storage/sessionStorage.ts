import { CandidateProfile, SearchSession } from '@/types';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

const SESSIONS_STORAGE_KEY = 'jobify:search_sessions';

export function hashString(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
  }
  return (hash >>> 0).toString(16);
}

export function createImplicitSession(profile: CandidateProfile): SearchSession {
  // Derive a deterministic session ID from profile id or skills/seniority/workMode
  const seed = profile.id || `${profile.targetRole}_${profile.skills.join(',')}_${profile.seniority}_${profile.workMode}`;
  const implicitId = `jobify:implicit:${hashString(seed)}`;
  const now = new Date().toISOString();

  return {
    id: implicitId,
    profileId: profile.id,
    name: 'Default Search',
    provider: 'justjoin',
    skills: profile.skills || [],
    seniority: profile.seniority || 'mid',
    workMode: profile.workMode || 'remote',
    location: profile.preferredLocation,
    createdAt: profile.createdAt || now,
    updatedAt: profile.updatedAt || now,
  };
}

export async function loadSessions(profileId?: string): Promise<SearchSession[]> {
  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConfigured) {
    try {
      let query = supabase.from('search_sessions').select('*').order('created_at', { ascending: true });
      if (profileId) {
        query = query.eq('profile_id', profileId);
      }
      const { data, error } = await query;
      if (data && !error && data.length > 0) {
        return data.map((row) => ({
          id: row.id,
          profileId: row.profile_id,
          name: row.name,
          provider: row.provider_id || 'justjoin',
          skills: row.skills || [],
          seniority: row.seniority,
          workMode: row.work_mode,
          location: row.location,
          createdAt: row.created_at,
          updatedAt: row.created_at,
        }));
      }
    } catch (err) {
      console.warn('Failed to load sessions from Supabase, falling back to localStorage:', err);
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
      if (raw) {
        const sessions: SearchSession[] = JSON.parse(raw);
        if (profileId) {
          return sessions.filter((s) => !s.profileId || s.profileId === profileId);
        }
        return sessions;
      }
    } catch {
      // Ignore parse error
    }
  }

  return [];
}

export async function saveSession(session: SearchSession): Promise<SearchSession> {
  const now = new Date().toISOString();
  const updatedSession: SearchSession = {
    ...session,
    updatedAt: now,
  };

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
      const sessions: SearchSession[] = raw ? JSON.parse(raw) : [];
      const idx = sessions.findIndex((s) => s.id === session.id);
      if (idx >= 0) {
        sessions[idx] = updatedSession;
      } else {
        sessions.push(updatedSession);
      }
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    } catch {
      // Ignore quota error
    }
  }

  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConfigured) {
    try {
      const row = {
        id: updatedSession.id.startsWith('jobify:implicit:') ? undefined : updatedSession.id,
        profile_id: updatedSession.profileId,
        name: updatedSession.name,
        provider_id: updatedSession.provider,
        skills: updatedSession.skills,
        seniority: updatedSession.seniority,
        work_mode: updatedSession.workMode,
        location: updatedSession.location,
      };

      if (row.id) {
        await supabase.from('search_sessions').upsert(row);
      } else if (updatedSession.profileId) {
        const { data } = await supabase.from('search_sessions').insert([row]).select('id').single();
        if (data?.id) {
          updatedSession.id = data.id;
        }
      }
    } catch (err) {
      console.warn('Failed to persist session to Supabase:', err);
    }
  }

  return updatedSession;
}

export async function deleteSession(sessionId: string): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
      if (raw) {
        const sessions: SearchSession[] = JSON.parse(raw);
        const filtered = sessions.filter((s) => s.id !== sessionId);
        localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(filtered));
      }
    } catch {
      // Ignore
    }
  }

  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConfigured) {
    try {
      // If it's a real UUID (not an implicit session), delete from Supabase
      if (!sessionId.startsWith('jobify:implicit:')) {
        await supabase.from('search_sessions').delete().eq('id', sessionId);
      }
    } catch (err) {
      console.warn('Failed to delete session from Supabase:', err);
    }
  }
}


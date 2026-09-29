import { CandidateProfile, SearchSession } from '@/types';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

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
    targetRole: profile.targetRole,
    skills: profile.skills || [],
    seniority: profile.seniority || 'mid',
    workMode: profile.workMode || 'remote',
    location: profile.preferredLocation,
    spokenLanguages: profile.spokenLanguages,
    createdAt: profile.createdAt || now,
    updatedAt: profile.updatedAt || now,
  };
}

export async function loadSessions(profileId?: string): Promise<SearchSession[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return [];
  }

  try {
    let query = supabase.from('search_sessions').select('*').order('created_at', { ascending: true });
    if (profileId) {
      query = query.or(`profile_id.eq.${profileId},profile_id.is.null`);
    }
    const { data, error } = await query;
    if (error) {
      console.warn('Failed to load search sessions from Supabase:', error);
      return [];
    }

    if (data && data.length > 0) {
      return data.map((row) => ({
        id: row.id,
        profileId: row.profile_id,
        name: row.name,
        provider: row.provider_id || 'justjoin',
        targetRole: row.target_role || row.targetRole,
        skills: row.skills || [],
        seniority: row.seniority,
        workMode: row.work_mode,
        location: row.location,
        spokenLanguages: row.spoken_languages || row.spokenLanguages || [],
        providerOptions: row.provider_options || row.providerOptions,
        createdAt: row.created_at,
        updatedAt: row.created_at,
      }));
    }
  } catch (err) {
    console.warn('Exception loading sessions from Supabase:', err);
  }

  return [];
}

export async function saveSession(session: SearchSession): Promise<SearchSession> {
  const now = new Date().toISOString();
  const updatedSession: SearchSession = {
    ...session,
    updatedAt: now,
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const isCustomId = updatedSession.id && !updatedSession.id.startsWith('jobify:implicit:');
      const row = {
        ...(isCustomId ? { id: updatedSession.id } : {}),
        profile_id: updatedSession.profileId || null,
        name: updatedSession.name,
        provider_id: updatedSession.provider || 'justjoin',
        target_role: updatedSession.targetRole || null,
        skills: updatedSession.skills || [],
        seniority: updatedSession.seniority,
        work_mode: updatedSession.workMode,
        location: updatedSession.location || null,
        spoken_languages: updatedSession.spokenLanguages || [],
        provider_options: updatedSession.providerOptions || {},
      };

      if (isCustomId) {
        const { error } = await supabase.from('search_sessions').upsert(row);
        if (error) {
          console.warn('Failed to upsert session in Supabase:', error);
        }
      } else {
        const { data, error } = await supabase.from('search_sessions').insert([row]).select('id').single();
        if (data?.id) {
          updatedSession.id = data.id;
        } else if (error) {
          console.warn('Failed to insert session in Supabase:', error);
        }
      }
    } catch (err) {
      console.warn('Exception while saving session to Supabase:', err);
    }
  }

  return updatedSession;
}

export async function deleteSession(sessionId: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      if (!sessionId.startsWith('jobify:implicit:')) {
        const { error } = await supabase.from('search_sessions').delete().eq('id', sessionId);
        if (error) {
          console.warn('Failed to delete session from Supabase:', error);
        }
      }
    } catch (err) {
      console.warn('Exception while deleting session from Supabase:', err);
    }
  }
}

import { CandidateProfile } from '@/types';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

const PROFILE_STORAGE_KEY = 'jobify_candidate_profile';

export const DEFAULT_PROFILE: CandidateProfile = {
  targetRole: 'Full Stack Developer',
  seniority: 'mid',
  skills: ['TypeScript', 'React', 'Next.js', 'Node.js', 'PostgreSQL'],
  workMode: 'remote',
  preferredLocation: 'Poland / Remote',
  minSalary: 16000,
  salaryCurrency: 'PLN',
  experienceSummary: '3+ years of building web applications with TypeScript, React, Next.js, and Node.js. Experience with REST APIs, SQL databases, and responsive UI design.',
};

export async function loadCandidateProfile(): Promise<CandidateProfile> {
  if (typeof window === 'undefined') return DEFAULT_PROFILE;

  // Try Supabase first if available
  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        return {
          id: data.id,
          targetRole: data.target_role,
          seniority: data.seniority,
          skills: data.skills || [],
          workMode: data.work_mode,
          preferredLocation: data.preferred_location,
          minSalary: data.min_salary,
          salaryCurrency: data.salary_currency || 'PLN',
          experienceSummary: data.experience_summary || '',
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      }
    } catch {
      // Fallback to localStorage
    }
  }

  // Local storage fallback
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // Ignore JSON parse errors
  }

  return DEFAULT_PROFILE;
}

export async function saveCandidateProfile(profile: CandidateProfile): Promise<CandidateProfile> {
  const now = new Date().toISOString();
  const updatedProfile: CandidateProfile = {
    ...profile,
    updatedAt: now,
  };

  // Always save to localStorage for immediate client-side offline access
  if (typeof window !== 'undefined') {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updatedProfile));
  }

  // Also persist to Supabase if configured
  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConfigured) {
    try {
      const record = {
        target_role: updatedProfile.targetRole,
        seniority: updatedProfile.seniority,
        skills: updatedProfile.skills,
        work_mode: updatedProfile.workMode,
        preferred_location: updatedProfile.preferredLocation,
        min_salary: updatedProfile.minSalary,
        salary_currency: updatedProfile.salaryCurrency,
        experience_summary: updatedProfile.experienceSummary,
        updated_at: now,
      };

      if (updatedProfile.id) {
        await supabase.from('profiles').update(record).eq('id', updatedProfile.id);
      } else {
        const { data } = await supabase.from('profiles').insert([record]).select('id').single();
        if (data?.id) {
          updatedProfile.id = data.id;
          if (typeof window !== 'undefined') {
            localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updatedProfile));
          }
        }
      }
    } catch {
      // Graceful fallback
    }
  }

  return updatedProfile;
}

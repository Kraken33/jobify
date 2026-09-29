import { CandidateProfile } from '@/types';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

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
  const supabase = getSupabaseClient();
  if (supabase) {
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

      // If no profile exists yet in Supabase, create and persist default profile
      const defaultRecord = {
        target_role: DEFAULT_PROFILE.targetRole,
        seniority: DEFAULT_PROFILE.seniority,
        skills: DEFAULT_PROFILE.skills,
        work_mode: DEFAULT_PROFILE.workMode,
        preferred_location: DEFAULT_PROFILE.preferredLocation,
        min_salary: DEFAULT_PROFILE.minSalary,
        salary_currency: DEFAULT_PROFILE.salaryCurrency,
        experience_summary: DEFAULT_PROFILE.experienceSummary,
      };

      const { data: createdData, error: createError } = await supabase
        .from('profiles')
        .insert([defaultRecord])
        .select('*')
        .single();

      if (createdData && !createError) {
        return {
          id: createdData.id,
          targetRole: createdData.target_role,
          seniority: createdData.seniority,
          skills: createdData.skills || [],
          workMode: createdData.work_mode,
          preferredLocation: createdData.preferred_location,
          minSalary: createdData.min_salary,
          salaryCurrency: createdData.salary_currency || 'PLN',
          experienceSummary: createdData.experience_summary || '',
          createdAt: createdData.created_at,
          updatedAt: createdData.updated_at,
        };
      }
    } catch (err) {
      console.warn('Failed to load candidate profile from Supabase:', err);
    }
  }

  return DEFAULT_PROFILE;
}

export async function saveCandidateProfile(profile: CandidateProfile): Promise<CandidateProfile> {
  const now = new Date().toISOString();
  const updatedProfile: CandidateProfile = {
    ...profile,
    updatedAt: now,
  };

  const supabase = getSupabaseClient();
  if (supabase) {
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
        const { error } = await supabase.from('profiles').update(record).eq('id', updatedProfile.id);
        if (error) {
          console.warn('Failed to update candidate profile in Supabase:', error);
        }
      } else {
        const { data, error } = await supabase.from('profiles').insert([record]).select('id').single();
        if (data?.id) {
          updatedProfile.id = data.id;
        } else if (error) {
          console.warn('Failed to insert candidate profile in Supabase:', error);
        }
      }
    } catch (err) {
      console.warn('Exception while saving profile to Supabase:', err);
    }
  }

  return updatedProfile;
}

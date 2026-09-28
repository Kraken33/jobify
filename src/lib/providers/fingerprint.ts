import { SpokenLanguage } from '@/types';

export function computeProviderFingerprint(params: {
  skills: string[];
  seniority: string;
  workMode: string;
  location?: string;
  spokenLanguages?: SpokenLanguage[];
}): string {
  const normalized = {
    location: (params.location || '').trim().toLowerCase(),
    seniority: (params.seniority || '').trim().toLowerCase(),
    skills: [...(params.skills || [])]
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
      .sort(),
    spokenLanguages: [...(params.spokenLanguages || [])]
      .map((l) => ({
        language: l.language.trim().toLowerCase(),
        level: l.level.trim().toUpperCase(),
      }))
      .sort((a, b) => a.language.localeCompare(b.language)),
    workMode: (params.workMode || '').trim().toLowerCase(),
  };

  const str = JSON.stringify(normalized);
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
  }
  return (hash >>> 0).toString(16);
}

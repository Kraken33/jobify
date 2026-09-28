export function computeProviderFingerprint(params: {
  skills: string[];
  seniority: string;
  workMode: string;
  location?: string;
}): string {
  const normalized = {
    location: (params.location || '').trim().toLowerCase(),
    seniority: (params.seniority || '').trim().toLowerCase(),
    skills: [...(params.skills || [])]
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
      .sort(),
    workMode: (params.workMode || '').trim().toLowerCase(),
  };

  const str = JSON.stringify(normalized);
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
  }
  return (hash >>> 0).toString(16);
}

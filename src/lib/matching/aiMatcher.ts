import OpenAI from 'openai';
import { CandidateProfile, JobListing, MatchEvaluation } from '@/types';

export class AiMatcherService {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({
      apiKey,
    });
  }

  async evaluateFit(profile: CandidateProfile, job: JobListing): Promise<MatchEvaluation> {
    const candLangs =
      profile.spokenLanguages && profile.spokenLanguages.length > 0
        ? profile.spokenLanguages.map((l) => `${l.language} (${l.level})`).join(', ')
        : 'N/A';

    const jobLangs =
      job.spokenLanguages && job.spokenLanguages.length > 0
        ? job.spokenLanguages.map((l) => `${l.language} (${l.level})`).join(', ')
        : 'N/A';

    const prompt = `
You are an expert technical recruiter assessing candidate-job fit.

Candidate Profile:
- Target Role: ${profile.targetRole}
- Seniority: ${profile.seniority}
- Core Skills: ${profile.skills.join(', ')}
- Work Mode: ${profile.workMode}
- Preferred Location: ${profile.preferredLocation || 'N/A'}
- Spoken Languages: ${candLangs}
- Experience Summary: ${profile.experienceSummary || 'N/A'}

Job Listing:
- Title: ${job.title}
- Company: ${job.company}
- Seniority: ${job.seniority}
- Work Mode: ${job.isRemote ? 'Remote' : job.city || 'On-site'}
- Required Skills: ${job.requiredSkills.join(', ')}
- Spoken Languages Required: ${jobLangs}
- Description: ${job.description || 'N/A'}

Evaluate how well the candidate profile matches this job posting.
Provide a realistic match score between 0 and 100, a short verdict ("Strong Match", "Moderate Match", "Low Match", or "Mismatch"), key pros/advantages, critical skill gaps, and a concise 1-2 sentence summary.

Return valid JSON adhering to this exact format:
{
  "score": number,
  "verdict": "Strong Match" | "Moderate Match" | "Low Match" | "Mismatch",
  "pros": string[],
  "gaps": string[],
  "summary": string
}
`.trim();

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You evaluate tech candidate-to-job fit objectively and output JSON strictly.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });

      const rawContent = response.choices[0]?.message?.content;
      if (!rawContent) {
        throw new Error('OpenAI returned an empty response.');
      }

      const parsed = JSON.parse(rawContent);

      return {
        score: Math.min(100, Math.max(0, Number(parsed.score) || 50)),
        verdict: parsed.verdict || (parsed.score >= 80 ? 'Strong Match' : parsed.score >= 60 ? 'Moderate Match' : 'Low Match'),
        pros: Array.isArray(parsed.pros) ? parsed.pros : [],
        gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
        summary: parsed.summary || 'Fit evaluation completed.',
      };
    } catch (error: unknown) {
      const err = error as { status?: number; code?: string; message?: string };
      if (err.status === 401 || err.code === 'invalid_api_key') {
        throw new Error('Invalid OpenAI API Key provided. Please check your key in settings.');
      }
      if (err.status === 429) {
        throw new Error('OpenAI rate limit or quota exceeded. Please check your OpenAI account billing.');
      }
      throw new Error(`OpenAI evaluation error: ${err.message || 'Unknown error'}`);
    }
  }
}

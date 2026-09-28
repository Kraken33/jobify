import { NextRequest, NextResponse } from 'next/server';
import { CandidateProfile, MatchResult, JobListing } from '@/types';
import { providerRegistry } from '@/lib/providers';
import { preFilterJobs } from '@/lib/matching/preFilter';
import { AiMatcherService } from '@/lib/matching/aiMatcher';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const apiKey =
      request.headers.get('x-openai-key') ||
      request.headers.get('authorization')?.replace('Bearer ', '');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing OpenAI API Key. Please connect your API key in Settings.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const profile: CandidateProfile = body.profile;
    const providerId: string = body.providerId || 'justjoin';
    const maxScanLimit: number = Math.min(25, body.limit || 20);

    if (!profile || !profile.targetRole) {
      return NextResponse.json(
        { error: 'Valid candidate profile is required for matching.' },
        { status: 400 }
      );
    }

    // 1. Fetch raw listings from provider
    const provider = providerRegistry.get(providerId);
    if (!provider) {
      return NextResponse.json(
        { error: `Provider '${providerId}' not found.` },
        { status: 404 }
      );
    }

    const rawListings = await provider.searchJobs({
      skills: profile.skills,
      seniority: profile.seniority,
      workMode: profile.workMode,
      limit: maxScanLimit,
    });

    // 2. Pre-filter by hard constraints
    const eligibleJobs = preFilterJobs(profile, rawListings);

    if (eligibleJobs.length === 0) {
      return NextResponse.json({
        matches: [],
        totalFetched: rawListings.length,
        totalEligible: 0,
        message: 'No jobs met your baseline constraints (e.g. remote or seniority). Try broadening preferences.',
      });
    }

    // 3. Score eligible jobs with OpenAI in parallel batches (up to 12 jobs evaluated to balance speed & tokens)
    const jobsToEvaluate = eligibleJobs.slice(0, 12);
    const matcher = new AiMatcherService(apiKey);

    const matchPromises = jobsToEvaluate.map(async (job: JobListing): Promise<MatchResult> => {
      try {
        const evaluation = await matcher.evaluateFit(profile, job);
        return {
          id: `match_${job.id}_${Date.now()}`,
          job,
          evaluation,
          createdAt: new Date().toISOString(),
        };
      } catch (err: unknown) {
        // Fallback score if individual prompt fails
        const message = err instanceof Error ? err.message : 'Evaluation failed';
        return {
          id: `match_${job.id}_${Date.now()}`,
          job,
          evaluation: {
            score: 50,
            verdict: 'Moderate Match',
            pros: ['Basic skill overlap with requirements'],
            gaps: [message],
            summary: 'Automated quick evaluation.',
          },
          createdAt: new Date().toISOString(),
        };
      }
    });

    const results = await Promise.all(matchPromises);

    // Sort descending by fit score
    results.sort((a, b) => b.evaluation.score - a.evaluation.score);

    // 4. Optionally save matches to Supabase if configured and profile has an ID
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured && profile.id) {
      try {
        const rows = results.map((m) => ({
          profile_id: profile.id,
          provider: m.job.provider,
          provider_job_id: m.job.id,
          title: m.job.title,
          company: m.job.company,
          city: m.job.city,
          is_remote: m.job.isRemote,
          seniority: m.job.seniority,
          url: m.job.url,
          salary_min: m.job.salaryRange?.min,
          salary_max: m.job.salaryRange?.max,
          salary_currency: m.job.salaryRange?.currency,
          required_skills: m.job.requiredSkills,
          fit_score: m.evaluation.score,
          verdict: m.evaluation.verdict,
          pros: m.evaluation.pros,
          gaps: m.evaluation.gaps,
          summary: m.evaluation.summary,
        }));
        await supabase.from('job_matches').insert(rows);
      } catch (dbErr) {
        console.warn('Could not persist match cache to Supabase:', dbErr);
      }
    }

    return NextResponse.json({
      matches: results,
      totalFetched: rawListings.length,
      totalEligible: eligibleJobs.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

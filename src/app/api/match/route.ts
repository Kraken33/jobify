import { NextRequest, NextResponse } from 'next/server';
import { CandidateProfile, MatchResult, JobListing, SearchSession, ScanCheckpoint } from '@/types';
import { providerRegistry } from '@/lib/providers';
import { preFilterJobs } from '@/lib/matching/preFilter';
import { AiMatcherService } from '@/lib/matching/aiMatcher';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { createImplicitSession, loadSessions, saveSession } from '@/lib/storage/sessionStorage';
import { loadCheckpoint, saveCheckpoint } from '@/lib/storage/checkpointStorage';
import { computeProviderFingerprint } from '@/lib/providers/fingerprint';

export async function POST(request: NextRequest) {
  try {
    const apiKey =
      request.headers.get('x-openai-key') ||
      request.headers.get('authorization')?.replace('Bearer ', '');

    const apifyToken = request.headers.get('x-apify-token') || null;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing OpenAI API Key. Please connect your API key in Settings.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const profile: CandidateProfile = body.profile;
    const providerId: string = body.providerId || 'justjoin';
    let sessionId: string | undefined = body.sessionId;
    const maxScanLimit: number = Math.min(25, body.limit || 20);

    if (!profile || !profile.targetRole) {
      return NextResponse.json(
        { error: 'Valid candidate profile is required for matching.' },
        { status: 400 }
      );
    }

    // 1. Resolve session
    let session: SearchSession | undefined;
    if (sessionId) {
      const allSessions = await loadSessions(profile.id);
      session = allSessions.find((s) => s.id === sessionId);
    }

    if (!session) {
      session = createImplicitSession(profile);
      sessionId = session.id;
      await saveSession(session);
    }

    // Compute provider fingerprint for the session parameters
    const currentFingerprint = computeProviderFingerprint({
      skills: session.skills,
      seniority: session.seniority,
      workMode: session.workMode,
      location: session.location,
    });

    // 2. Load existing checkpoint
    let checkpoint: ScanCheckpoint | null = await loadCheckpoint(session.id, providerId);
    let publishedAtCursor: string | null = null;
    let seenJobIds: string[] = [];

    if (checkpoint) {
      if (checkpoint.providerFingerprint === currentFingerprint) {
        publishedAtCursor = checkpoint.publishedAtCursor;
        seenJobIds = checkpoint.seenJobIds || [];
      } else {
        // Fingerprint changed -> invalidate cursor & seenJobIds for full fetch
        publishedAtCursor = null;
        seenJobIds = [];
      }
    }

    // 3. Fetch listings from provider
    const provider = providerRegistry.get(providerId);
    if (!provider) {
      return NextResponse.json(
        { error: `Provider '${providerId}' not found.` },
        { status: 404 }
      );
    }

    const providerResult = await provider.searchJobs({
      skills: session.skills,
      seniority: session.seniority,
      workMode: session.workMode,
      location: session.location,
      limit: maxScanLimit,
      publishedAtCursor,
      seenJobIds,
      apifyToken,
    });

    const rawListings = providerResult.listings;
    const seenSet = new Set(seenJobIds);

    // 4. Deduplicate: skip any listing whose id is already in seenJobIds
    const unseenListings = rawListings.filter((job) => !seenSet.has(job.id));

    // 5. Pre-filter unseen listings against hard constraints
    const eligibleJobs = preFilterJobs(profile, unseenListings);

    if (eligibleJobs.length === 0) {
      // Save checkpoint even if no new eligible jobs were scored
      const updatedCursor = providerResult.nextCursor?.publishedAtCursor ?? publishedAtCursor;
      const updatedCheckpoint: ScanCheckpoint = {
        sessionId: session.id,
        providerId,
        providerFingerprint: currentFingerprint,
        publishedAtCursor: updatedCursor,
        seenJobIds,
        lastScanAt: new Date().toISOString(),
      };
      await saveCheckpoint(updatedCheckpoint);

      return NextResponse.json({
        matches: [],
        totalFetched: rawListings.length,
        totalEligible: 0,
        nextCursor: providerResult.nextCursor,
        totalSeen: seenJobIds.length,
        sessionId: session.id,
        message: 'No new jobs met your baseline constraints. Try broadening preferences.',
      });
    }

    // 6. Score eligible jobs with OpenAI in parallel batches (up to 12 jobs evaluated)
    const jobsToEvaluate = eligibleJobs.slice(0, 12);
    const matcher = new AiMatcherService(apiKey);

    const matchPromises = jobsToEvaluate.map(async (job: JobListing): Promise<MatchResult> => {
      try {
        const evaluation = await matcher.evaluateFit(profile, job);
        return {
          id: `match_${job.id}_${Date.now()}`,
          sessionId: session?.id,
          job,
          evaluation,
          createdAt: new Date().toISOString(),
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Evaluation failed';
        return {
          id: `match_${job.id}_${Date.now()}`,
          sessionId: session?.id,
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
    results.sort((a, b) => b.evaluation.score - a.evaluation.score);

    // 7. Update checkpoint with newly scored job IDs (capped at 500 most-recent)
    const newlyScoredIds = jobsToEvaluate.map((j) => j.id);
    const combinedSeen = Array.from(new Set([...seenJobIds, ...newlyScoredIds]));
    const cappedSeen = combinedSeen.slice(-500);

    const updatedCursor = providerResult.nextCursor?.publishedAtCursor ?? publishedAtCursor;
    const newCheckpoint: ScanCheckpoint = {
      sessionId: session.id,
      providerId,
      providerFingerprint: currentFingerprint,
      publishedAtCursor: updatedCursor,
      seenJobIds: cappedSeen,
      lastScanAt: new Date().toISOString(),
    };
    await saveCheckpoint(newCheckpoint);

    // 8. Optionally save matches to Supabase if configured and profile has an ID
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured && profile.id) {
      try {
        const rows = results.map((m) => ({
          profile_id: profile.id,
          session_id: session?.id.startsWith('jobify:implicit:') ? null : session?.id,
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
      nextCursor: providerResult.nextCursor,
      totalSeen: cappedSeen.length,
      sessionId: session.id,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

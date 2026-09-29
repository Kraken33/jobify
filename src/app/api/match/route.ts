import { NextRequest, NextResponse } from 'next/server';
import { CandidateProfile, MatchResult, JobListing, SearchSession, ScanCheckpoint } from '@/types';
import { providerRegistry } from '@/lib/providers';
import { evaluateHardConstraints, preFilterJobs } from '@/lib/matching/preFilter';
import { AiMatcherService } from '@/lib/matching/aiMatcher';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { createImplicitSession, loadSessions, saveSession } from '@/lib/storage/sessionStorage';
import { loadCheckpoint, saveCheckpoint } from '@/lib/storage/checkpointStorage';
import { computeProviderFingerprint } from '@/lib/providers/fingerprint';

/**
 * Builds an actionable message for the case where the provider returned no
 * listings at all. The baseline-constraint copy would be misleading there,
 * because nothing was fetched for the pre-filter to reject.
 */
function buildEmptyListingMessage(providerName: string, location?: string): string {
  const locationHint = location ? ` for "${location}"` : '';
  return `${providerName} returned no postings${locationHint}. Try a broader keyword or a different location.`;
}

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
    let sessionId: string | undefined = body.sessionId;
    const maxScanLimit: number = Math.min(100, Math.max(1, body.limit || 20));

    if (!profile || !profile.targetRole) {
      return NextResponse.json(
        { error: 'Valid candidate profile is required for matching.' },
        { status: 400 }
      );
    }

    // 1. Resolve session: prioritize payload session, then DB lookup, then implicit session
    let session: SearchSession | undefined = body.session;
    if (session) {
      sessionId = session.id;
    } else if (sessionId) {
      const allSessions = await loadSessions(profile.id);
      session = allSessions.find((s) => s.id === sessionId);
    }

    if (!session) {
      session = createImplicitSession(profile);
      sessionId = session.id;
      await saveSession(session);
    }

    const providerId: string = body.providerId || session.provider || 'justjoin';

    // Compute provider fingerprint for the session parameters
    const currentFingerprint = computeProviderFingerprint({
      targetRole: session.targetRole || profile.targetRole,
      skills: session.skills,
      seniority: session.seniority,
      workMode: session.workMode,
      location: session.location,
      spokenLanguages: session.spokenLanguages || profile.spokenLanguages,
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

    // Cast session-level provider options to the typed hints shape for the adapter
    const arbeitnowOpts = (session.providerOptions as { arbeitnow?: { endpoint?: string } } | undefined)
      ?.arbeitnow;

    const providerResult = await provider.searchJobs({
      targetRole: session.targetRole || profile.targetRole,
      skills: session.skills,
      seniority: session.seniority,
      workMode: session.workMode,
      location: session.location,
      spokenLanguages: session.spokenLanguages || profile.spokenLanguages,
      limit: maxScanLimit,
      publishedAtCursor,
      seenJobIds,
      apifyToken,
      ...(arbeitnowOpts ? { providerHints: { arbeitnow: arbeitnowOpts } } : {}),
    });

    const rawListings = providerResult.listings;
    const seenSet = new Set(seenJobIds);

    // 4. Deduplicate: skip any listing whose id is already in seenJobIds
    const unseenListings = rawListings.filter((job) => !seenSet.has(job.id));

    if (unseenListings.length === 0) {
      // Save checkpoint when no new unseen jobs were returned
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
        notice: providerResult.notice,
        message:
          rawListings.length === 0
            ? buildEmptyListingMessage(provider.name, session.location)
            : 'No new postings since your last scan. Postings already found for this track are kept below.',
      });
    }

    // 5. Partition unseen listings into eligible vs hard-constraint mismatches
    const eligibleJobs: JobListing[] = [];
    const lowMatchResults: MatchResult[] = [];

    for (const job of unseenListings) {
      const constraintCheck = evaluateHardConstraints(profile, job);
      if (constraintCheck.passed) {
        eligibleJobs.push(job);
      } else {
        lowMatchResults.push({
          id: `match_${job.id}_${Date.now()}`,
          sessionId: session?.id,
          job,
          evaluation: {
            score: 25,
            verdict: 'Low Match',
            pros: ['Matched basic provider search criteria'],
            gaps: [constraintCheck.reason || 'Does not satisfy hard profile constraints'],
            summary: 'Automated evaluation: soft constraint failure.',
          },
          createdAt: new Date().toISOString(),
        });
      }
    }

    // 6. Score eligible jobs with OpenAI in parallel batches (evaluating full requested batch)
    const jobsToEvaluate = eligibleJobs;
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

    const aiResults = await Promise.all(matchPromises);

    // Combine AI scored matches and synthetic low match results
    const results = [...aiResults, ...lowMatchResults];
    results.sort((a, b) => b.evaluation.score - a.evaluation.score);

    // 7. Update checkpoint with newly processed job IDs (capped at 500 most-recent)
    const newlyScoredIds = [...jobsToEvaluate.map((j) => j.id), ...lowMatchResults.map((r) => r.job.id)];
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

    // 8. Optionally save matches to Supabase idempotently if configured and profile has an ID
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured && profile.id) {
      try {
        const isImplicit = session?.id.startsWith('jobify:implicit:');
        const rows = results.map((m) => ({
          profile_id: profile.id,
          session_id: isImplicit ? null : session?.id,
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
          status: 'active',
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
      notice: providerResult.notice,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

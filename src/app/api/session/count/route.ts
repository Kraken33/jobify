import { NextRequest, NextResponse } from 'next/server';
import { CandidateProfile, SearchSession } from '@/types';
import { providerRegistry } from '@/lib/providers';
import { createImplicitSession, loadSessions } from '@/lib/storage/sessionStorage';

export async function POST(request: NextRequest) {
  try {
    const apifyToken = request.headers.get('x-apify-token') || null;
    const body = await request.json();

    const profile: CandidateProfile = body.profile;
    let sessionId: string | undefined = body.sessionId;

    if (!profile || !profile.targetRole) {
      return NextResponse.json(
        { error: 'Valid candidate profile is required to query vacancy count.' },
        { status: 400 }
      );
    }

    // Resolve session: prioritize payload session, then DB lookup, then implicit session
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
    }

    const providerId: string = body.providerId || session.provider || 'justjoin';
    const provider = providerRegistry.get(providerId);
    if (!provider) {
      return NextResponse.json(
        { error: `Provider '${providerId}' not found.` },
        { status: 404 }
      );
    }

    let totalVacancies: number | null = null;
    const arbeitnowOpts = (session.providerOptions as { arbeitnow?: { endpoint?: string } } | undefined)
      ?.arbeitnow;

    if (typeof provider.getJobCount === 'function') {
      totalVacancies = await provider.getJobCount({
        targetRole: session.targetRole || profile.targetRole,
        skills: session.skills,
        seniority: session.seniority,
        workMode: session.workMode,
        location: session.location,
        spokenLanguages: session.spokenLanguages || profile.spokenLanguages,
        apifyToken,
        ...(arbeitnowOpts ? { providerHints: { arbeitnow: arbeitnowOpts } } : {}),
      });
    }

    return NextResponse.json({
      sessionId: session.id,
      providerId: provider.id,
      totalVacancies,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to query vacancy count';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

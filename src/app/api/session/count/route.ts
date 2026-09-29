import { NextRequest, NextResponse } from 'next/server';
import { CandidateProfile, SearchSession } from '@/types';
import { providerRegistry } from '@/lib/providers';
import { createImplicitSession, loadSessions } from '@/lib/storage/sessionStorage';

export async function POST(request: NextRequest) {
  try {
    const apifyToken = request.headers.get('x-apify-token') || null;
    const body = await request.json();

    const profile: CandidateProfile = body.profile;
    const providerId: string = body.providerId || 'justjoin';
    let sessionId: string | undefined = body.sessionId;

    if (!profile || !profile.targetRole) {
      return NextResponse.json(
        { error: 'Valid candidate profile is required to query vacancy count.' },
        { status: 400 }
      );
    }

    let session: SearchSession | undefined;
    if (sessionId) {
      const allSessions = await loadSessions(profile.id);
      session = allSessions.find((s) => s.id === sessionId);
    }

    if (!session) {
      session = createImplicitSession(profile);
    }

    const provider = providerRegistry.get(providerId || session.provider || 'justjoin');
    if (!provider) {
      return NextResponse.json(
        { error: `Provider '${providerId}' not found.` },
        { status: 404 }
      );
    }

    let totalVacancies: number | null = null;

    if (typeof provider.getJobCount === 'function') {
      totalVacancies = await provider.getJobCount({
        skills: session.skills,
        seniority: session.seniority,
        workMode: session.workMode,
        location: session.location,
        apifyToken,
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

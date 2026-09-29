import { NextRequest, NextResponse } from 'next/server';
import { getLogEntries, clearLogEntries, getLogStoreStats } from '@/lib/logger/logStore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider') || undefined;
    const statusCategory = (searchParams.get('status') as 'all' | 'success' | 'error') || undefined;
    const search = searchParams.get('search') || undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    const logs = getLogEntries({
      provider,
      statusCategory,
      search,
      limit,
    });

    return NextResponse.json(logs);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve logs';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    clearLogEntries();
    const stats = getLogStoreStats();
    return NextResponse.json({
      success: true,
      message: 'Log buffer cleared successfully',
      stats,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to clear logs';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

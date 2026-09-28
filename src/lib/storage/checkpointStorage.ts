import { ScanCheckpoint } from '@/types';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

export function getCheckpointStorageKey(sessionId: string, providerId: string): string {
  return `jobify:checkpoint:${sessionId}:${providerId}`;
}

export async function loadCheckpoint(
  sessionId: string,
  providerId: string
): Promise<ScanCheckpoint | null> {
  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('scan_checkpoints')
        .select('*')
        .eq('session_id', sessionId)
        .eq('provider_id', providerId)
        .maybeSingle();

      if (data && !error) {
        return {
          sessionId: data.session_id,
          providerId: data.provider_id,
          providerFingerprint: data.provider_fingerprint,
          publishedAtCursor: data.published_at_cursor,
          seenJobIds: data.seen_job_ids || [],
          lastScanAt: data.last_scan_at || new Date().toISOString(),
        };
      }
    } catch (err) {
      console.warn('Failed to load checkpoint from Supabase, falling back to localStorage:', err);
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(getCheckpointStorageKey(sessionId, providerId));
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // Ignore localStorage parse errors
    }
  }

  return null;
}

export async function saveCheckpoint(checkpoint: ScanCheckpoint): Promise<void> {
  // Always save to localStorage if in browser
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(
        getCheckpointStorageKey(checkpoint.sessionId, checkpoint.providerId),
        JSON.stringify(checkpoint)
      );
    } catch {
      // Ignore quota errors
    }
  }

  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConfigured) {
    try {
      const row = {
        session_id: checkpoint.sessionId,
        provider_id: checkpoint.providerId,
        provider_fingerprint: checkpoint.providerFingerprint,
        published_at_cursor: checkpoint.publishedAtCursor,
        seen_job_ids: checkpoint.seenJobIds,
        last_scan_at: checkpoint.lastScanAt,
      };

      await supabase
        .from('scan_checkpoints')
        .upsert(row, { onConflict: 'session_id,provider_id' });
    } catch (err) {
      console.warn('Failed to upsert checkpoint to Supabase:', err);
    }
  }
}

export async function clearCheckpoint(sessionId: string, providerId: string): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(getCheckpointStorageKey(sessionId, providerId));
    } catch {
      // Ignore
    }
  }

  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConfigured) {
    try {
      await supabase
        .from('scan_checkpoints')
        .delete()
        .eq('session_id', sessionId)
        .eq('provider_id', providerId);
    } catch (err) {
      console.warn('Failed to clear checkpoint in Supabase:', err);
    }
  }
}

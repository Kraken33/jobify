import { ScanCheckpoint } from '@/types';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

export async function loadCheckpoint(
  sessionId: string,
  providerId: string
): Promise<ScanCheckpoint | null> {
  const supabase = getSupabaseClient();
  if (supabase) {
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
      console.warn('Failed to load checkpoint from Supabase:', err);
    }
  }

  return null;
}

export async function saveCheckpoint(checkpoint: ScanCheckpoint): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const row = {
        session_id: checkpoint.sessionId,
        provider_id: checkpoint.providerId,
        provider_fingerprint: checkpoint.providerFingerprint,
        published_at_cursor: checkpoint.publishedAtCursor,
        seen_job_ids: checkpoint.seenJobIds,
        last_scan_at: checkpoint.lastScanAt,
      };

      const { error } = await supabase
        .from('scan_checkpoints')
        .upsert(row, { onConflict: 'session_id,provider_id' });
      if (error) {
        console.warn('Failed to upsert checkpoint in Supabase:', error);
      }
    } catch (err) {
      console.warn('Exception while saving checkpoint to Supabase:', err);
    }
  }
}

export async function clearCheckpoint(sessionId: string, providerId: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { error } = await supabase
        .from('scan_checkpoints')
        .delete()
        .eq('session_id', sessionId)
        .eq('provider_id', providerId);
      if (error) {
        console.warn('Failed to clear checkpoint from Supabase:', error);
      }
    } catch (err) {
      console.warn('Exception while clearing checkpoint in Supabase:', err);
    }
  }
}

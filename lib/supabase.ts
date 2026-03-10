/**
 * Supabase integration for remote session sync.
 * Greg can view Frederick's progress from his own device.
 *
 * Setup: Create a Supabase project at supabase.com (free tier) and add:
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
 * to .env.local
 *
 * Required table (run in Supabase SQL editor):
 *
 * CREATE TABLE sessions (
 *   id TEXT PRIMARY KEY,
 *   started_at BIGINT NOT NULL,
 *   completed_at BIGINT,
 *   phase TEXT NOT NULL,
 *   track TEXT NOT NULL,
 *   total_exercises INT,
 *   completed_count INT,
 *   skipped_count INT,
 *   average_accuracy INT,
 *   average_confidence INT,
 *   average_latency_ms INT,
 *   average_self_report REAL,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * -- Enable RLS but allow inserts/reads with anon key for simplicity
 * ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Allow all for anon" ON sessions FOR ALL USING (true);
 */

import type { SessionRecord } from './storage';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function isConfigured(): boolean {
  return !!(SUPABASE_URL && SUPABASE_KEY && SUPABASE_URL !== 'your-supabase-url');
}

async function supabaseFetch(path: string, options: RequestInit = {}) {
  if (!isConfigured()) return null;

  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY!,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'return=minimal',
      ...options.headers,
    },
  });

  if (!res.ok) {
    console.error('Supabase error:', res.status, await res.text());
    return null;
  }

  const contentType = res.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return res.json();
  }
  return null;
}

/**
 * Sync a completed session to Supabase for Greg's dashboard.
 */
export async function syncSession(session: SessionRecord): Promise<boolean> {
  if (!isConfigured() || !session.summary) return false;

  try {
    await supabaseFetch('/sessions', {
      method: 'POST',
      body: JSON.stringify({
        id: session.id,
        started_at: session.startedAt,
        completed_at: session.completedAt,
        phase: session.phase,
        track: session.track,
        total_exercises: session.summary.totalExercises,
        completed_count: session.summary.completed,
        skipped_count: session.summary.skipped,
        average_accuracy: session.summary.averageAccuracy,
        average_confidence: session.summary.averageConfidence,
        average_latency_ms: session.summary.averageLatencyMs,
        average_self_report: session.summary.averageSelfReport,
      }),
      headers: {
        'Prefer': 'resolution=merge-duplicates',
      },
    });
    return true;
  } catch (error) {
    console.error('Failed to sync session:', error);
    return false;
  }
}

/**
 * Fetch all sessions from Supabase (for Greg's dashboard).
 */
export async function fetchRemoteSessions(): Promise<RemoteSession[]> {
  if (!isConfigured()) return [];

  try {
    const data = await supabaseFetch('/sessions?order=started_at.desc&limit=50', {
      method: 'GET',
      headers: { 'Prefer': 'return=representation' },
    });
    return data || [];
  } catch {
    return [];
  }
}

export interface RemoteSession {
  id: string;
  started_at: number;
  completed_at: number | null;
  phase: string;
  track: string;
  total_exercises: number;
  completed_count: number;
  skipped_count: number;
  average_accuracy: number;
  average_confidence: number;
  average_latency_ms: number;
  average_self_report: number;
  created_at: string;
}

export { isConfigured as isSupabaseConfigured };

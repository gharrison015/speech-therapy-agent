'use client';

import { useState, useEffect } from 'react';
import { fetchRemoteSessions, isSupabaseConfigured, type RemoteSession } from '@/lib/supabase';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function DashboardPage() {
  const [sessions, setSessions] = useState<RemoteSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setError('Dashboard not configured yet. Add Supabase credentials to .env.local');
      setLoading(false);
      return;
    }

    fetchRemoteSessions()
      .then((data) => {
        setSessions(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load session data.');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-xl text-muted">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-lg text-muted text-center">{error}</p>
        <div className="w-full p-4 bg-gray-50 border border-border rounded-xl text-sm text-muted">
          <p className="font-medium text-foreground mb-2">Setup Instructions:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Create a free Supabase project at supabase.com</li>
            <li>Run the SQL from <code>lib/supabase.ts</code> to create the sessions table</li>
            <li>Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to <code>.env.local</code></li>
            <li>Restart the dev server</li>
          </ol>
        </div>
      </div>
    );
  }

  const completed = sessions.filter((s) => s.completed_at);
  const totalSessions = completed.length;

  // Stats
  const thisWeek = completed.filter(
    (s) => s.started_at > Date.now() - 7 * 24 * 60 * 60 * 1000
  );
  const avgAccuracy =
    completed.length > 0
      ? Math.round(
          completed.reduce((sum, s) => sum + s.average_accuracy, 0) / completed.length
        )
      : 0;

  // Chart data
  const chartData = [...completed]
    .reverse()
    .slice(-14) // Last 14 sessions
    .map((s) => ({
      date: new Date(s.started_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      accuracy: s.average_accuracy,
      confidence: s.average_confidence,
      selfReport: s.average_self_report,
    }));

  // Check for any concerning trends
  const recentAccuracies = completed.slice(0, 3).map((s) => s.average_accuracy);
  const olderAccuracies = completed.slice(3, 6).map((s) => s.average_accuracy);
  const recentAvg = recentAccuracies.length > 0
    ? recentAccuracies.reduce((a, b) => a + b, 0) / recentAccuracies.length
    : 0;
  const olderAvg = olderAccuracies.length > 0
    ? olderAccuracies.reduce((a, b) => a + b, 0) / olderAccuracies.length
    : 0;
  const hasRegression = olderAccuracies.length >= 3 && recentAvg < olderAvg - 15;

  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Frederick&apos;s Progress</h1>
        <button
          onClick={() => window.location.reload()}
          className="text-primary font-medium underline underline-offset-4"
        >
          Refresh
        </button>
      </div>

      <p className="text-muted">
        Remote dashboard for monitoring Frederick&apos;s speech therapy sessions.
      </p>

      {/* Alert for regression */}
      {hasRegression && (
        <div className="w-full p-4 bg-red-50 border-2 border-red-300 rounded-xl">
          <p className="font-bold text-red-800">Attention Needed</p>
          <p className="text-red-700 mt-1">
            Frederick&apos;s recent accuracy has dropped by more than 15% compared to earlier
            sessions. This could indicate a change worth discussing with his medical team.
          </p>
          <p className="text-sm text-red-600 mt-2">
            Recent avg: {Math.round(recentAvg)}% | Previous avg: {Math.round(olderAvg)}%
          </p>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-sm text-muted">Total Sessions</p>
          <p className="text-3xl font-bold">{totalSessions}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-sm text-muted">This Week</p>
          <p className="text-3xl font-bold">{thisWeek.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-sm text-muted">Avg. Accuracy</p>
          <p className="text-3xl font-bold">{avgAccuracy}%</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-sm text-muted">Last Session</p>
          <p className="text-lg font-bold">
            {completed.length > 0
              ? new Date(completed[0].started_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })
              : 'None yet'}
          </p>
        </div>
      </div>

      {/* Accuracy trend chart */}
      {chartData.length >= 2 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-4">Accuracy Trend</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="accuracy"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Accuracy %"
              />
              <Line
                type="monotone"
                dataKey="selfReport"
                stroke="#16a34a"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Motor Comfort (x20)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent sessions list */}
      {completed.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Recent Sessions</h2>
          <div className="flex flex-col gap-2">
            {completed.slice(0, 15).map((session) => (
              <div
                key={session.id}
                className="bg-card border border-border rounded-xl p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">
                    {new Date(session.started_at).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                  <p className="text-sm text-muted">
                    {session.completed_count}/{session.total_exercises} exercises
                    {session.skipped_count > 0 && ` (${session.skipped_count} skipped)`}
                    {' · '}Phase: {session.phase}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-xl font-bold ${
                    session.average_accuracy >= 80 ? 'text-success' :
                    session.average_accuracy >= 60 ? 'text-primary' :
                    'text-warning'
                  }`}>
                    {session.average_accuracy}%
                  </p>
                  <p className="text-sm text-muted">accuracy</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {completed.length === 0 && (
        <div className="text-center py-12">
          <p className="text-xl text-muted">No sessions recorded yet.</p>
          <p className="text-muted mt-2">
            Sessions will appear here once Frederick completes his first practice.
          </p>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSessionStats, exportAllData, type SessionRecord } from '@/lib/storage';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function ProgressPage() {
  const [stats, setStats] = useState<{
    totalSessions: number;
    thisWeekSessions: number;
    currentStreak: number;
    averageAccuracy: number;
    recentSessions: SessionRecord[];
  } | null>(null);

  useEffect(() => {
    getSessionStats().then(setStats);
  }, []);

  const handleExport = async () => {
    const data = await exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `speech-therapy-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-xl text-muted">Loading...</p>
      </div>
    );
  }

  // Prepare chart data
  const chartData = [...stats.recentSessions]
    .reverse()
    .map((session) => ({
      date: new Date(session.startedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      accuracy: session.summary?.averageAccuracy || 0,
      confidence: session.summary?.averageConfidence || 0,
    }));

  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your Progress</h1>
        <Link
          href="/"
          className="text-primary font-medium underline underline-offset-4"
        >
          Home
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-sm text-muted">Total Sessions</p>
          <p className="text-3xl font-bold">{stats.totalSessions}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-sm text-muted">Current Streak</p>
          <p className="text-3xl font-bold">{stats.currentStreak} days</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-sm text-muted">This Week</p>
          <p className="text-3xl font-bold">{stats.thisWeekSessions}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-sm text-muted">Avg. Accuracy</p>
          <p className="text-3xl font-bold">{stats.averageAccuracy}%</p>
        </div>
      </div>

      {/* Accuracy trend chart */}
      {chartData.length >= 2 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-4">Accuracy Trend</h2>
          <ResponsiveContainer width="100%" height={200}>
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
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent sessions list */}
      {stats.recentSessions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Recent Sessions</h2>
          <div className="flex flex-col gap-2">
            {stats.recentSessions.map((session) => (
              <div
                key={session.id}
                className="bg-card border border-border rounded-xl p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">
                    {new Date(session.startedAt).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="text-sm text-muted">
                    {session.summary?.completed}/{session.summary?.totalExercises} exercises
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">
                    {session.summary?.averageAccuracy || 0}%
                  </p>
                  <p className="text-sm text-muted">accuracy</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export data button */}
      <button
        onClick={handleExport}
        className="w-full py-3 px-6 border-2 border-border text-foreground text-lg font-medium rounded-xl hover:bg-gray-50 active:scale-[0.98] transition-all"
      >
        Save My Data
      </button>

      {/* Disclaimer */}
      <p className="text-sm text-muted text-center leading-relaxed">
        This data is stored on your device. Use &quot;Save My Data&quot; to create a backup
        you can share with your speech therapist.
      </p>
    </div>
  );
}

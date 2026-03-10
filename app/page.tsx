'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSessionStats } from '@/lib/storage';
import { getInProgress } from '@/lib/storage';
import InstallPrompt from '@/components/InstallPrompt';

export default function Home() {
  const [stats, setStats] = useState<{
    totalSessions: number;
    thisWeekSessions: number;
    currentStreak: number;
    averageAccuracy: number;
  } | null>(null);
  const [hasInProgress, setHasInProgress] = useState(false);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    // Set greeting based on time of day
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    // Load stats
    getSessionStats().then(setStats);
    getInProgress().then((ip) => setHasInProgress(!!ip));
  }, []);

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      <InstallPrompt />

      {/* Greeting */}
      <div className="text-center">
        <h1 className="text-3xl font-bold">{greeting}, Fred.</h1>
        {stats && stats.currentStreak > 0 && (
          <p className="text-lg text-muted mt-2">
            Day {stats.totalSessions + 1} &middot; {stats.currentStreak}-day streak
          </p>
        )}
        {stats && stats.currentStreak === 0 && stats.totalSessions > 0 && (
          <p className="text-lg text-muted mt-2">
            Welcome back! Ready to practice?
          </p>
        )}
        {stats && stats.totalSessions === 0 && (
          <p className="text-lg text-muted mt-2">
            Ready for your first session?
          </p>
        )}
      </div>

      {/* Resume in-progress session */}
      {hasInProgress && (
        <Link
          href="/session?resume=true"
          className="w-full py-4 px-6 bg-warning text-white text-xl font-semibold rounded-2xl shadow-md text-center hover:opacity-90 active:scale-[0.98] transition-all"
        >
          Resume Session
        </Link>
      )}

      {/* Start session button */}
      <Link
        href="/session"
        className="w-full py-6 px-6 bg-primary text-white text-2xl font-bold rounded-2xl shadow-lg text-center hover:bg-primary-dark active:scale-[0.98] transition-all flex items-center justify-center gap-3"
      >
        <span className="text-3xl">🎙️</span>
        Start Session
      </Link>

      {/* Quick stats */}
      {stats && stats.totalSessions > 0 && (
        <div className="w-full grid grid-cols-2 gap-3">
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-sm text-muted">This Week</p>
            <p className="text-2xl font-bold">{stats.thisWeekSessions} sessions</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-sm text-muted">Avg. Accuracy</p>
            <p className="text-2xl font-bold">{stats.averageAccuracy}%</p>
          </div>
        </div>
      )}

      {/* View progress link */}
      {stats && stats.totalSessions > 0 && (
        <Link
          href="/progress"
          className="text-lg text-primary font-medium underline underline-offset-4 hover:text-primary-dark transition-colors"
        >
          View Progress
        </Link>
      )}

      {/* Disclaimer on first visit */}
      {stats && stats.totalSessions === 0 && (
        <div className="w-full p-4 bg-gray-50 border border-border rounded-xl text-sm text-muted leading-relaxed">
          <p className="font-medium text-foreground mb-1">Important</p>
          <p>
            This tool supplements — not replaces — professional speech therapy.
            If you experience any new symptoms, worsening speech, confusion, weakness,
            or vision changes, contact your medical team immediately.
          </p>
        </div>
      )}
    </div>
  );
}

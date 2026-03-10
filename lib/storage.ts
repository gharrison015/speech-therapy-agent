'use client';

import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'speech-therapy';
const DB_VERSION = 1;

export interface ExerciseResult {
  exerciseId: string;
  type: 'motor' | 'speech' | 'cognitive';
  transcript?: string;
  confidence?: number;
  selfReport?: number; // 1-5 scale for motor exercises
  target?: string;
  isCorrect?: boolean;
  latencyMs: number;
  skipped: boolean;
  timestamp: number;
}

export interface SessionRecord {
  id: string;
  startedAt: number;
  completedAt?: number;
  phase: string;
  track: string;
  exercises: ExerciseResult[];
  summary?: {
    totalExercises: number;
    completed: number;
    skipped: number;
    averageAccuracy: number;
    averageConfidence: number;
    averageLatencyMs: number;
    averageSelfReport: number;
  };
  synced: boolean;
}

export interface InProgressSession {
  sessionId: string;
  exerciseIndex: number;
  exercises: ExerciseResult[];
  startedAt: number;
  phase: string;
  track: string;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Completed sessions
        if (!db.objectStoreNames.contains('sessions')) {
          const store = db.createObjectStore('sessions', { keyPath: 'id' });
          store.createIndex('startedAt', 'startedAt');
          store.createIndex('synced', 'synced');
        }
        // In-progress session state (for interruption recovery)
        if (!db.objectStoreNames.contains('inProgress')) {
          db.createObjectStore('inProgress', { keyPath: 'sessionId' });
        }
        // Audio recordings
        if (!db.objectStoreNames.contains('recordings')) {
          const recStore = db.createObjectStore('recordings', { autoIncrement: true });
          recStore.createIndex('sessionId', 'sessionId');
        }
      },
    });
  }
  return dbPromise;
}

// --- In-progress session (interruption recovery) ---

export async function saveInProgress(session: InProgressSession): Promise<void> {
  const db = await getDB();
  await db.put('inProgress', session);
}

export async function getInProgress(): Promise<InProgressSession | undefined> {
  const db = await getDB();
  const all = await db.getAll('inProgress');
  return all[0]; // Only one in-progress session at a time
}

export async function clearInProgress(): Promise<void> {
  const db = await getDB();
  await db.clear('inProgress');
}

// --- Completed sessions ---

export async function saveSession(session: SessionRecord): Promise<void> {
  const db = await getDB();
  await db.put('sessions', session);
}

export async function getSessions(limit?: number): Promise<SessionRecord[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('sessions', 'startedAt');
  const sorted = all.reverse(); // Most recent first
  return limit ? sorted.slice(0, limit) : sorted;
}

export async function getSession(id: string): Promise<SessionRecord | undefined> {
  const db = await getDB();
  return db.get('sessions', id);
}

export async function getUnsyncedSessions(): Promise<SessionRecord[]> {
  const sessions = await getSessions();
  return sessions.filter((s) => !s.synced);
}

export async function markSynced(id: string): Promise<void> {
  const db = await getDB();
  const session = await db.get('sessions', id);
  if (session) {
    session.synced = true;
    await db.put('sessions', session);
  }
}

// --- Audio recordings ---

export async function saveRecording(
  sessionId: string,
  exerciseId: string,
  blob: Blob
): Promise<void> {
  const db = await getDB();
  await db.add('recordings', { sessionId, exerciseId, blob, timestamp: Date.now() });
}

// --- Stats ---

export async function getSessionStats(): Promise<{
  totalSessions: number;
  thisWeekSessions: number;
  currentStreak: number;
  averageAccuracy: number;
  recentSessions: SessionRecord[];
}> {
  const sessions = await getSessions();
  const completed = sessions.filter((s) => s.completedAt);

  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thisWeek = completed.filter((s) => s.startedAt > weekAgo);

  // Calculate streak (consecutive days with sessions)
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) {
    const dayStart = new Date(today);
    dayStart.setDate(dayStart.getDate() - i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const hasSession = completed.some(
      (s) => s.startedAt >= dayStart.getTime() && s.startedAt < dayEnd.getTime()
    );

    if (hasSession) {
      streak++;
    } else if (i > 0) {
      // Allow today to be missing (hasn't practiced yet today)
      break;
    }
  }

  const avgAccuracy =
    completed.length > 0
      ? completed.reduce((sum, s) => sum + (s.summary?.averageAccuracy || 0), 0) /
        completed.length
      : 0;

  return {
    totalSessions: completed.length,
    thisWeekSessions: thisWeek.length,
    currentStreak: streak,
    averageAccuracy: Math.round(avgAccuracy),
    recentSessions: completed.slice(0, 10),
  };
}

// --- Export all data ---

export async function exportAllData(): Promise<string> {
  const sessions = await getSessions();
  const stats = await getSessionStats();
  return JSON.stringify({ exportedAt: new Date().toISOString(), stats, sessions }, null, 2);
}

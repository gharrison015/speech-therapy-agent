import type { ExerciseResult } from './storage';

/**
 * Compare the spoken transcript to the target, returning accuracy 0-100.
 * Uses normalized word-level comparison (case-insensitive, punctuation-stripped).
 */
export function scoreTranscription(transcript: string, target: string): number {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .split(/\s+/);

  const targetWords = normalize(target);
  const spokenWords = normalize(transcript);

  if (targetWords.length === 0) return 100;
  if (spokenWords.length === 0) return 0;

  // Count matching words in order (allowing for insertions/substitutions)
  let matches = 0;
  let tIdx = 0;
  for (const word of spokenWords) {
    if (tIdx < targetWords.length && word === targetWords[tIdx]) {
      matches++;
      tIdx++;
    }
  }

  return Math.round((matches / targetWords.length) * 100);
}

/**
 * Summarize a set of exercise results for end-of-session display.
 */
export function summarizeSession(exercises: ExerciseResult[]): {
  totalExercises: number;
  completed: number;
  skipped: number;
  averageAccuracy: number;
  averageConfidence: number;
  averageLatencyMs: number;
  averageSelfReport: number;
} {
  const completed = exercises.filter((e) => !e.skipped);
  const skipped = exercises.filter((e) => e.skipped);

  const speechExercises = completed.filter((e) => e.type === 'speech' || e.type === 'cognitive');
  const motorExercises = completed.filter((e) => e.type === 'motor');

  const avgAccuracy =
    speechExercises.length > 0
      ? speechExercises.reduce((sum, e) => {
          if (e.target && e.transcript) {
            return sum + scoreTranscription(e.transcript, e.target);
          }
          return sum + (e.isCorrect ? 100 : 0);
        }, 0) / speechExercises.length
      : 0;

  const avgConfidence =
    speechExercises.length > 0
      ? speechExercises.reduce((sum, e) => sum + (e.confidence || 0), 0) /
        speechExercises.length
      : 0;

  const avgLatency =
    completed.length > 0
      ? completed.reduce((sum, e) => sum + e.latencyMs, 0) / completed.length
      : 0;

  const avgSelfReport =
    motorExercises.length > 0
      ? motorExercises.reduce((sum, e) => sum + (e.selfReport || 0), 0) / motorExercises.length
      : 0;

  return {
    totalExercises: exercises.length,
    completed: completed.length,
    skipped: skipped.length,
    averageAccuracy: Math.round(avgAccuracy),
    averageConfidence: Math.round(avgConfidence * 100),
    averageLatencyMs: Math.round(avgLatency),
    averageSelfReport: Math.round(avgSelfReport * 10) / 10,
  };
}

/**
 * Determine if there's a concerning regression compared to previous sessions.
 * Returns true if accuracy dropped by >15% from the average of the last 3 sessions.
 */
export function detectRegression(
  currentAccuracy: number,
  previousSessionAccuracies: number[]
): boolean {
  if (previousSessionAccuracies.length < 2) return false;
  const recentAvg =
    previousSessionAccuracies.slice(0, 3).reduce((a, b) => a + b, 0) /
    Math.min(previousSessionAccuracies.length, 3);
  return currentAccuracy < recentAvg - 15;
}

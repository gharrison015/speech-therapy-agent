export interface MotorExercise {
  id: string;
  type: 'motor';
  prompt: string;
  instruction: string;
  durationSeconds: number;
  reps: number;
  selfReport: boolean;
}

export interface SpeechExercise {
  id: string;
  type: 'speech';
  prompt: string;
  target: string;
  phonetic: string | null;
  reps: number;
}

export interface CognitiveExercise {
  id: string;
  type: 'cognitive';
  prompt: string;
  target: string | null;
  acceptableAnswers?: string[];
  category: string;
  timedSeconds?: number;
  validateDynamic?: string;
}

export type Exercise = MotorExercise | SpeechExercise | CognitiveExercise;

export interface Phase {
  id: string;
  name: string;
  description: string;
  exercises: Exercise[];
}

export interface Track {
  track: string;
  trackLabel: string;
  description?: string;
  phases?: Phase[];
  exercises?: CognitiveExercise[];
}

// Cached exercise data
let trackAData: Track | null = null;
let trackBData: Track | null = null;

export async function loadTrackA(): Promise<Track> {
  if (trackAData) return trackAData;
  const res = await fetch('/exercises/track-a.json');
  trackAData = await res.json();
  return trackAData!;
}

export async function loadTrackB(): Promise<Track> {
  if (trackBData) return trackBData;
  const res = await fetch('/exercises/track-b.json');
  trackBData = await res.json();
  return trackBData!;
}

/**
 * Build a session exercise list for a given phase.
 * Interleaves Track A exercises with 2-3 Track B cognitive tasks.
 */
export async function buildSessionExercises(phaseId: string): Promise<Exercise[]> {
  const trackA = await loadTrackA();
  const trackB = await loadTrackB();

  const phase = trackA.phases?.find((p) => p.id === phaseId);
  if (!phase) {
    throw new Error(`Phase not found: ${phaseId}`);
  }

  // Each exercise appears once — reps are handled inside the card components
  const exerciseList: Exercise[] = [...phase.exercises];

  // Pick 2-3 random cognitive exercises from Track B
  const cognitivePool = trackB.exercises || [];
  const shuffled = [...cognitivePool].sort(() => Math.random() - 0.5);
  const cognitiveSelection = shuffled.slice(0, Math.min(3, shuffled.length));

  // Interleave cognitive exercises at roughly even intervals
  const sessionExercises: Exercise[] = [...exerciseList];
  if (cognitiveSelection.length > 0 && sessionExercises.length > 0) {
    const interval = Math.floor(sessionExercises.length / (cognitiveSelection.length + 1));
    cognitiveSelection.forEach((cog, i) => {
      const insertAt = Math.min((i + 1) * interval, sessionExercises.length);
      sessionExercises.splice(insertAt + i, 0, cog);
    });
  }

  return sessionExercises;
}

/**
 * Get available phases for the user to select from.
 */
export async function getAvailablePhases(): Promise<{ id: string; name: string; description: string }[]> {
  const trackA = await loadTrackA();
  return (
    trackA.phases?.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
    })) || []
  );
}

/**
 * Validate a dynamic cognitive exercise (e.g., "What day is it?")
 */
export function validateDynamicAnswer(validateType: string, transcript: string): boolean {
  const normalized = transcript.toLowerCase().trim();
  const now = new Date();

  switch (validateType) {
    case 'dayOfWeek': {
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const today = days[now.getDay()];
      return normalized.includes(today);
    }
    case 'month': {
      const months = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december',
      ];
      const thisMonth = months[now.getMonth()];
      return normalized.includes(thisMonth);
    }
    default:
      return false;
  }
}

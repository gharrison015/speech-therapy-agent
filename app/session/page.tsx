'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { buildSessionExercises, getAvailablePhases, type Exercise } from '@/lib/exercises';
import { summarizeSession, scoreTranscription } from '@/lib/scoring';
import {
  saveInProgress,
  getInProgress,
  clearInProgress,
  saveSession,
  type ExerciseResult,
  type SessionRecord,
} from '@/lib/storage';
import { startRecording, stopRecording } from '@/lib/recorder';
import { syncSession } from '@/lib/supabase';
import MotorExerciseCard from '@/components/MotorExerciseCard';
import SpeechExerciseCard from '@/components/SpeechExerciseCard';
import CognitiveExerciseCard from '@/components/CognitiveExerciseCard';
import SessionSummary from '@/components/SessionSummary';

type SessionState = 'loading' | 'select-phase' | 'active' | 'summary';

export default function SessionPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-xl text-muted">Loading...</p>
      </div>
    }>
      <SessionContent />
    </Suspense>
  );
}

function SessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isResume = searchParams.get('resume') === 'true';

  const [state, setState] = useState<SessionState>('loading');
  const [phases, setPhases] = useState<{ id: string; name: string; description: string }[]>([]);
  const [selectedPhase, setSelectedPhase] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<ExerciseResult[]>([]);
  const [sessionId] = useState(() => `session-${Date.now()}`);
  const [summary, setSummary] = useState<ReturnType<typeof summarizeSession> | null>(null);

  // Load phases or resume
  useEffect(() => {
    async function init() {
      if (isResume) {
        const inProgress = await getInProgress();
        if (inProgress) {
          setSelectedPhase(inProgress.phase);
          setResults(inProgress.exercises);
          setCurrentIndex(inProgress.exerciseIndex);
          const exs = await buildSessionExercises(inProgress.phase);
          setExercises(exs);
          setState('active');
          return;
        }
      }
      const availablePhases = await getAvailablePhases();
      setPhases(availablePhases);
      setState('select-phase');
    }
    init();
  }, [isResume]);

  // Start session with selected phase
  const startSession = useCallback(async (phaseId: string) => {
    setSelectedPhase(phaseId);
    const exs = await buildSessionExercises(phaseId);
    setExercises(exs);
    setCurrentIndex(0);
    setResults([]);
    setState('active');
  }, []);

  // Save progress after each exercise
  const saveProgress = useCallback(
    async (newResults: ExerciseResult[], nextIndex: number) => {
      await saveInProgress({
        sessionId,
        exerciseIndex: nextIndex,
        exercises: newResults,
        startedAt: Date.now(),
        phase: selectedPhase,
        track: 'oral-motor',
      });
    },
    [sessionId, selectedPhase]
  );

  // Handle exercise completion
  const handleExerciseComplete = useCallback(
    async (result: ExerciseResult) => {
      // Stop audio recording for this exercise
      await stopRecording();

      const newResults = [...results, result];
      setResults(newResults);
      const nextIndex = currentIndex + 1;

      if (nextIndex >= exercises.length) {
        // Session complete
        const sessionSummary = summarizeSession(newResults);
        setSummary(sessionSummary);

        const record: SessionRecord = {
          id: sessionId,
          startedAt: Date.now() - (newResults.length * 30000), // Approximate
          completedAt: Date.now(),
          phase: selectedPhase,
          track: 'oral-motor',
          exercises: newResults,
          summary: sessionSummary,
          synced: false,
        };
        await saveSession(record);
        syncSession(record).catch(() => {}); // Best-effort sync to Greg's dashboard
        await clearInProgress();
        setState('summary');
      } else {
        setCurrentIndex(nextIndex);
        await saveProgress(newResults, nextIndex);
        // Start recording for next exercise
        startRecording();
      }
    },
    [results, currentIndex, exercises.length, sessionId, selectedPhase, saveProgress]
  );

  // Handle motor exercise completion
  const handleMotorComplete = useCallback(
    (selfReport: number) => {
      const exercise = exercises[currentIndex];
      handleExerciseComplete({
        exerciseId: exercise.id,
        type: 'motor',
        selfReport,
        latencyMs: 0,
        skipped: false,
        timestamp: Date.now(),
      });
    },
    [exercises, currentIndex, handleExerciseComplete]
  );

  // Handle speech exercise completion
  const handleSpeechComplete = useCallback(
    (transcript: string, confidence: number, latencyMs: number) => {
      const exercise = exercises[currentIndex] as Extract<Exercise, { type: 'speech' }>;
      handleExerciseComplete({
        exerciseId: exercise.id,
        type: 'speech',
        transcript,
        confidence,
        target: exercise.target,
        isCorrect: scoreTranscription(transcript, exercise.target) >= 70,
        latencyMs,
        skipped: false,
        timestamp: Date.now(),
      });
    },
    [exercises, currentIndex, handleExerciseComplete]
  );

  // Handle cognitive exercise completion
  const handleCognitiveComplete = useCallback(
    (transcript: string, confidence: number, latencyMs: number, isCorrect: boolean) => {
      const exercise = exercises[currentIndex];
      handleExerciseComplete({
        exerciseId: exercise.id,
        type: 'cognitive',
        transcript,
        confidence,
        isCorrect,
        latencyMs,
        skipped: false,
        timestamp: Date.now(),
      });
    },
    [exercises, currentIndex, handleExerciseComplete]
  );

  // Handle skip
  const handleSkip = useCallback(() => {
    const exercise = exercises[currentIndex];
    handleExerciseComplete({
      exerciseId: exercise.id,
      type: exercise.type as 'motor' | 'speech' | 'cognitive',
      latencyMs: 0,
      skipped: true,
      timestamp: Date.now(),
    });
  }, [exercises, currentIndex, handleExerciseComplete]);

  // End session early
  const handleEndSession = useCallback(async () => {
    if (results.length === 0) {
      await clearInProgress();
      router.push('/');
      return;
    }
    const sessionSummary = summarizeSession(results);
    setSummary(sessionSummary);

    const record: SessionRecord = {
      id: sessionId,
      startedAt: Date.now() - (results.length * 30000),
      completedAt: Date.now(),
      phase: selectedPhase,
      track: 'oral-motor',
      exercises: results,
      summary: sessionSummary,
      synced: false,
    };
    await saveSession(record);
    syncSession(record).catch(() => {}); // Best-effort sync to Greg's dashboard
    await clearInProgress();
    setState('summary');
  }, [results, sessionId, selectedPhase, router]);

  // Render based on state
  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-xl text-muted">Loading...</p>
      </div>
    );
  }

  if (state === 'select-phase') {
    return (
      <div className="flex flex-col gap-6 py-8">
        <h1 className="text-2xl font-bold">Choose Your Exercises</h1>
        <p className="text-lg text-muted">Select the phase that matches where you are in recovery:</p>

        {phases.map((phase) => (
          <button
            key={phase.id}
            onClick={() => startSession(phase.id)}
            className="w-full p-5 bg-card border-2 border-border rounded-2xl text-left hover:border-primary active:scale-[0.98] transition-all"
          >
            <p className="text-xl font-semibold">{phase.name}</p>
            <p className="text-base text-muted mt-1">{phase.description}</p>
          </button>
        ))}

        <button
          onClick={() => router.push('/')}
          className="text-base text-muted underline underline-offset-4 hover:text-foreground transition-colors text-center"
        >
          Go back
        </button>
      </div>
    );
  }

  if (state === 'summary' && summary) {
    return <SessionSummary summary={summary} onDone={() => router.push('/')} />;
  }

  // Active session
  const currentExercise = exercises[currentIndex];
  if (!currentExercise) return null;

  return (
    <div className="flex flex-col gap-4 py-4">
      {/* Session header */}
      <div className="flex items-center justify-between">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / exercises.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Exercise card based on type */}
      {currentExercise.type === 'motor' && (
        <MotorExerciseCard
          key={currentIndex}
          prompt={currentExercise.prompt}
          instruction={'instruction' in currentExercise ? currentExercise.instruction : ''}
          durationSeconds={'durationSeconds' in currentExercise ? currentExercise.durationSeconds : 5}
          onComplete={handleMotorComplete}
          onSkip={handleSkip}
          exerciseNumber={currentIndex + 1}
          totalExercises={exercises.length}
        />
      )}

      {currentExercise.type === 'speech' && (
        <SpeechExerciseCard
          key={currentIndex}
          prompt={currentExercise.prompt}
          target={'target' in currentExercise ? currentExercise.target : ''}
          phonetic={'phonetic' in currentExercise ? currentExercise.phonetic : null}
          onComplete={handleSpeechComplete}
          onSkip={handleSkip}
          exerciseNumber={currentIndex + 1}
          totalExercises={exercises.length}
          phase={selectedPhase}
        />
      )}

      {currentExercise.type === 'cognitive' && (
        <CognitiveExerciseCard
          key={currentIndex}
          prompt={currentExercise.prompt}
          target={'target' in currentExercise ? currentExercise.target : null}
          acceptableAnswers={'acceptableAnswers' in currentExercise ? currentExercise.acceptableAnswers : undefined}
          category={'category' in currentExercise ? currentExercise.category : ''}
          timedSeconds={'timedSeconds' in currentExercise ? currentExercise.timedSeconds : undefined}
          validateDynamic={'validateDynamic' in currentExercise ? currentExercise.validateDynamic : undefined}
          onComplete={handleCognitiveComplete}
          onSkip={handleSkip}
          exerciseNumber={currentIndex + 1}
          totalExercises={exercises.length}
        />
      )}

      {/* End session button */}
      <div className="mt-4 text-center">
        <button
          onClick={handleEndSession}
          className="text-base text-muted underline underline-offset-4 hover:text-foreground transition-colors"
        >
          End session early
        </button>
      </div>
    </div>
  );
}

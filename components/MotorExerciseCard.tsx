'use client';

import { useState, useEffect, useCallback } from 'react';

interface MotorExerciseCardProps {
  prompt: string;
  instruction: string;
  durationSeconds: number;
  reps: number;
  onComplete: (selfReport: number) => void;
  onSkip: () => void;
  exerciseNumber: number;
  totalExercises: number;
}

export default function MotorExerciseCard({
  prompt,
  instruction,
  durationSeconds,
  reps,
  onComplete,
  onSkip,
  exerciseNumber,
  totalExercises,
}: MotorExerciseCardProps) {
  const [phase, setPhase] = useState<'ready' | 'active' | 'rest' | 'rating'>('ready');
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [currentRep, setCurrentRep] = useState(1);
  const [restTime, setRestTime] = useState(3);

  // Countdown timer for active phase
  useEffect(() => {
    if (phase !== 'active') return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Rep finished — go to rest or rating
          if (currentRep < reps) {
            setPhase('rest');
            setRestTime(3);
          } else {
            setPhase('rating');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, currentRep, reps]);

  // Rest countdown between reps
  useEffect(() => {
    if (phase !== 'rest') return;

    const interval = setInterval(() => {
      setRestTime((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Start next rep automatically
          setCurrentRep((r) => r + 1);
          setTimeLeft(durationSeconds);
          setPhase('active');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, durationSeconds]);

  const startTimer = useCallback(() => {
    setCurrentRep(1);
    setTimeLeft(durationSeconds);
    setPhase('active');
  }, [durationSeconds]);

  const submitRating = useCallback((value: number) => {
    onComplete(value);
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      {/* Progress indicator */}
      <div className="text-base text-muted w-full text-left">
        Exercise {exerciseNumber} of {totalExercises}
      </div>

      {/* Exercise prompt */}
      <p className="text-xl font-medium leading-relaxed">{prompt}</p>

      {phase === 'ready' && (
        <>
          {reps > 1 && (
            <p className="text-base text-muted">{reps} reps — timer starts on tap</p>
          )}
          <button
            onClick={startTimer}
            className="w-full py-4 px-6 bg-primary text-white text-xl font-semibold rounded-2xl shadow-md hover:bg-primary-dark active:scale-[0.98] transition-all"
          >
            Start Timer
          </button>
        </>
      )}

      {phase === 'active' && (
        <div className="flex flex-col items-center gap-4 w-full">
          <p className="text-lg font-medium text-primary">{instruction}</p>

          {/* Rep indicator */}
          {reps > 1 && (
            <p className="text-base font-semibold text-primary">
              Rep {currentRep} of {reps}
            </p>
          )}

          {/* Countdown circle */}
          <div className="relative w-28 h-28 flex items-center justify-center">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" fill="none" stroke="#e5e7eb" strokeWidth="8" />
              <circle
                cx="60" cy="60" r="54" fill="none" stroke="#2563eb" strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 54}`}
                strokeDashoffset={`${2 * Math.PI * 54 * (1 - timeLeft / durationSeconds)}`}
                className="transition-all duration-1000 ease-linear"
              />
            </svg>
            <span className="text-4xl font-bold text-primary">{timeLeft}</span>
          </div>
        </div>
      )}

      {phase === 'rest' && (
        <div className="flex flex-col items-center gap-4 w-full">
          <p className="text-lg font-medium text-green-600">Good! Rest for a moment...</p>
          <p className="text-5xl font-bold text-green-600">{restTime}</p>
          <p className="text-base text-muted">Next: Rep {currentRep + 1} of {reps}</p>
        </div>
      )}

      {phase === 'rating' && (
        <div className="flex flex-col items-center gap-4 w-full">
          <p className="text-lg font-medium">
            {reps > 1 ? `All ${reps} reps done! How did that feel overall?` : 'How did that feel?'}
          </p>
          <div className="flex gap-3">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                onClick={() => submitRating(value)}
                className="w-14 h-14 rounded-xl text-xl font-bold transition-all
                  bg-white border-2 border-border text-foreground hover:border-primary active:bg-primary active:text-white"
              >
                {value}
              </button>
            ))}
          </div>
          <p className="text-sm text-muted">1 = very difficult, 5 = easy</p>
        </div>
      )}

      {/* Skip button */}
      <button
        onClick={onSkip}
        className="text-base text-muted underline underline-offset-4 hover:text-foreground transition-colors"
      >
        Skip this exercise
      </button>
    </div>
  );
}

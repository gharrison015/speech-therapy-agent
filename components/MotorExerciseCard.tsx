'use client';

import { useState, useEffect, useCallback } from 'react';

interface MotorExerciseCardProps {
  prompt: string;
  instruction: string;
  durationSeconds: number;
  onComplete: (selfReport: number) => void;
  onSkip: () => void;
  exerciseNumber: number;
  totalExercises: number;
  repNumber?: number;
  totalReps?: number;
}

export default function MotorExerciseCard({
  prompt,
  instruction,
  durationSeconds,
  onComplete,
  onSkip,
  exerciseNumber,
  totalExercises,
  repNumber,
  totalReps,
}: MotorExerciseCardProps) {
  const [phase, setPhase] = useState<'ready' | 'active' | 'rating'>('ready');
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [rating, setRating] = useState<number>(0);

  useEffect(() => {
    if (phase !== 'active') return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setPhase('rating');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase]);

  const startTimer = useCallback(() => {
    setTimeLeft(durationSeconds);
    setPhase('active');
  }, [durationSeconds]);

  const submitRating = useCallback((value: number) => {
    setRating(value);
    onComplete(value);
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      {/* Progress indicator */}
      <div className="text-base text-muted w-full text-left">
        Exercise {exerciseNumber} of {totalExercises}
        {repNumber && totalReps && totalReps > 1 && (
          <span className="ml-2 text-primary font-semibold">
            — Rep {repNumber} of {totalReps}
          </span>
        )}
      </div>

      {/* Exercise prompt */}
      <p className="text-xl font-medium leading-relaxed">{prompt}</p>

      {phase === 'ready' && (
        <button
          onClick={startTimer}
          className="w-full py-4 px-6 bg-primary text-white text-xl font-semibold rounded-2xl shadow-md hover:bg-primary-dark active:scale-[0.98] transition-all"
        >
          Start Timer
        </button>
      )}

      {phase === 'active' && (
        <div className="flex flex-col items-center gap-4 w-full">
          <p className="text-lg font-medium text-primary">{instruction}</p>

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

      {phase === 'rating' && (
        <div className="flex flex-col items-center gap-4 w-full">
          <p className="text-lg font-medium">How did that feel?</p>
          <div className="flex gap-3">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                onClick={() => submitRating(value)}
                className={`w-14 h-14 rounded-xl text-xl font-bold transition-all
                  ${rating === value
                    ? 'bg-primary text-white scale-110'
                    : 'bg-white border-2 border-border text-foreground hover:border-primary'
                  }
                `}
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

'use client';

import { useState, useCallback, useEffect } from 'react';
import MicrophoneButton from './MicrophoneButton';
import { startListening, stopListening, speak, isSpeechSupported } from '@/lib/speech';
import { validateDynamicAnswer } from '@/lib/exercises';

interface CognitiveExerciseCardProps {
  prompt: string;
  target: string | null;
  acceptableAnswers?: string[];
  category: string;
  timedSeconds?: number;
  validateDynamic?: string;
  onComplete: (transcript: string, confidence: number, latencyMs: number, isCorrect: boolean) => void;
  onSkip: () => void;
  exerciseNumber: number;
  totalExercises: number;
}

export default function CognitiveExerciseCard({
  prompt,
  target,
  acceptableAnswers,
  timedSeconds,
  validateDynamic,
  onComplete,
  onSkip,
  exerciseNumber,
  totalExercises,
}: CognitiveExerciseCardProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timedSeconds || 0);
  const [isTiming, setIsTiming] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [error, setError] = useState('');

  const speechSupported = typeof window !== 'undefined' && isSpeechSupported();

  // Speak the prompt on mount
  useEffect(() => {
    speak(prompt).catch(() => {});
  }, [prompt]);

  // Timer for timed exercises (word fluency)
  useEffect(() => {
    if (!isTiming || !timedSeconds) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsTiming(false);
          stopListening();
          setIsListening(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isTiming, timedSeconds]);

  const checkAnswer = useCallback(
    (spoken: string): boolean => {
      const normalized = spoken.toLowerCase().trim();
      // Dynamic validation (day of week, month)
      if (validateDynamic) {
        return validateDynamicAnswer(validateDynamic, normalized);
      }
      // Check acceptable answers list
      if (acceptableAnswers) {
        return acceptableAnswers.some((a) => normalized.includes(a.toLowerCase()));
      }
      // Check against target
      if (target) {
        return normalized.includes(target.toLowerCase());
      }
      // Open-ended (word fluency) — always "correct"
      return true;
    },
    [target, acceptableAnswers, validateDynamic]
  );

  const handleStartListening = useCallback(() => {
    setError('');
    setTranscript('');
    setStartTime(Date.now());
    setIsListening(true);

    if (timedSeconds) {
      setTimeLeft(timedSeconds);
      setIsTiming(true);
    }

    startListening(
      (result) => {
        setTranscript(result.transcript);
        setConfidence(result.confidence);

        if (result.isFinal) {
          setIsListening(false);
          setIsTiming(false);
          const latency = Date.now() - (startTime || Date.now());
          const isCorrect = checkAnswer(result.transcript);

          setTimeout(() => {
            onComplete(result.transcript, result.confidence, latency, isCorrect);
          }, 1500);
        }
      },
      () => {
        setIsListening(false);
        if (transcript) {
          const latency = Date.now() - startTime;
          const isCorrect = checkAnswer(transcript);
          onComplete(transcript, confidence, latency, isCorrect);
        }
      },
      (err) => {
        setIsListening(false);
        setIsTiming(false);
        setError(err);
      }
    );
  }, [timedSeconds, startTime, onComplete, checkAnswer, transcript, confidence]);

  const handleTextSubmit = useCallback(() => {
    if (!textInput.trim()) return;
    const latency = Date.now() - startTime;
    const isCorrect = checkAnswer(textInput.trim());
    onComplete(textInput.trim(), 1.0, latency, isCorrect);
  }, [textInput, startTime, onComplete, checkAnswer]);

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      {/* Progress */}
      <div className="text-base text-muted w-full text-left">
        Exercise {exerciseNumber} of {totalExercises}
      </div>

      {/* Prompt */}
      <p className="text-xl font-semibold leading-relaxed">{prompt}</p>

      {/* Timer display for timed exercises */}
      {timedSeconds && isTiming && (
        <div className="text-5xl font-bold text-primary">
          {timeLeft}s
        </div>
      )}

      {/* Transcript display */}
      {transcript && (
        <div className="w-full p-3 bg-gray-50 rounded-xl">
          <p className="text-sm text-muted">You said:</p>
          <p className="text-lg font-medium">{transcript}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="w-full p-3 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-base text-red-700">{error}</p>
        </div>
      )}

      {/* Input */}
      {!showTextInput ? (
        <>
          {speechSupported ? (
            <MicrophoneButton
              isListening={isListening}
              onPress={isListening ? () => { stopListening(); setIsListening(false); } : handleStartListening}
              size="medium"
            />
          ) : (
            <p className="text-muted">Speech recognition not available.</p>
          )}
          <button
            onClick={() => { setShowTextInput(true); setStartTime(Date.now()); }}
            className="text-base text-muted underline underline-offset-4 hover:text-foreground transition-colors"
          >
            Switch to text mode
          </button>
        </>
      ) : (
        <div className="w-full flex flex-col gap-3">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
            placeholder="Type your answer..."
            className="w-full p-4 text-xl border-2 border-border rounded-xl focus:border-primary focus:outline-none"
            autoFocus
          />
          <button
            onClick={handleTextSubmit}
            className="w-full py-3 bg-primary text-white text-lg font-semibold rounded-xl"
          >
            Submit
          </button>
          <button
            onClick={() => setShowTextInput(false)}
            className="text-base text-muted underline underline-offset-4"
          >
            Switch to voice mode
          </button>
        </div>
      )}

      {/* Skip */}
      <button
        onClick={onSkip}
        className="text-base text-muted underline underline-offset-4 hover:text-foreground transition-colors"
      >
        Skip this exercise
      </button>
    </div>
  );
}

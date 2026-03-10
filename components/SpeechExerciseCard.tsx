'use client';

import { useState, useCallback, useEffect } from 'react';
import MicrophoneButton from './MicrophoneButton';
import { startListening, stopListening, isLowConfidence, speak, isSpeechSupported } from '@/lib/speech';
import { scoreTranscription } from '@/lib/scoring';
import { evaluateExercise } from '@/lib/claude';

interface SpeechExerciseCardProps {
  prompt: string;
  target: string;
  phonetic: string | null;
  onComplete: (transcript: string, confidence: number, latencyMs: number) => void;
  onSkip: () => void;
  exerciseNumber: number;
  totalExercises: number;
  phase: string;
}

export default function SpeechExerciseCard({
  prompt,
  target,
  phonetic,
  onComplete,
  onSkip,
  exerciseNumber,
  totalExercises,
  phase,
}: SpeechExerciseCardProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [startTime, setStartTime] = useState(0);
  const [error, setError] = useState('');

  const speechSupported = typeof window !== 'undefined' && isSpeechSupported();

  // Speak the prompt on mount
  useEffect(() => {
    speak(prompt).catch(() => {});
  }, [prompt]);

  const handleStartListening = useCallback(() => {
    setError('');
    setTranscript('');
    setFeedback('');
    setShowFeedback(false);
    setStartTime(Date.now());
    setIsListening(true);

    startListening(
      (result) => {
        setTranscript(result.transcript);
        setConfidence(result.confidence);

        if (result.isFinal) {
          setIsListening(false);
          const latency = Date.now() - (startTime || Date.now());
          const accuracy = scoreTranscription(result.transcript, target);

          // Get AI feedback
          evaluateExercise({
            exerciseType: 'speech',
            target,
            transcript: result.transcript,
            confidence: result.confidence,
            accuracy,
            exercisePhase: phase,
          }).then((evaluation) => {
            setFeedback(evaluation.feedback + ' ' + evaluation.encouragement);
            setShowFeedback(true);

            // Auto-advance after showing feedback
            setTimeout(() => {
              onComplete(result.transcript, result.confidence, latency);
            }, 2500);
          });
        }
      },
      () => {
        setIsListening(false);
      },
      (err) => {
        setIsListening(false);
        setError(err);
      }
    );
  }, [target, phase, onComplete, startTime]);

  const handleStopListening = useCallback(() => {
    stopListening();
    setIsListening(false);
  }, []);

  const handleTextSubmit = useCallback(() => {
    if (!textInput.trim()) return;
    const latency = Date.now() - startTime;
    onComplete(textInput.trim(), 1.0, latency);
  }, [textInput, startTime, onComplete]);

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      {/* Progress indicator */}
      <div className="text-base text-muted w-full text-left">
        Exercise {exerciseNumber} of {totalExercises}
      </div>

      {/* Prompt */}
      <p className="text-lg text-muted leading-relaxed">{prompt}</p>

      {/* Show the target word large */}
      <p className="text-4xl font-bold text-primary tracking-wide">
        {target.toUpperCase()}
      </p>

      {/* Phonetic hint */}
      {phonetic && (
        <p className="text-lg text-muted italic">({phonetic})</p>
      )}

      {/* Feedback display */}
      {showFeedback && (
        <div className="w-full p-4 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-lg text-green-800">{feedback}</p>
        </div>
      )}

      {/* Transcript display */}
      {transcript && !showFeedback && (
        <div className="w-full p-3 bg-gray-50 rounded-xl">
          <p className="text-sm text-muted">You said:</p>
          <p className="text-xl font-medium">{transcript}</p>
          {isLowConfidence(confidence) && (
            <p className="text-sm text-warning mt-1">
              Low confidence — try again or switch to text
            </p>
          )}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="w-full p-3 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-base text-red-700">{error}</p>
        </div>
      )}

      {/* Microphone button or text input */}
      {!showTextInput ? (
        <>
          {speechSupported ? (
            <MicrophoneButton
              isListening={isListening}
              onPress={isListening ? handleStopListening : handleStartListening}
              disabled={showFeedback}
            />
          ) : (
            <p className="text-muted">Speech recognition not available. Use text mode below.</p>
          )}

          <button
            onClick={() => {
              setShowTextInput(true);
              setStartTime(Date.now());
            }}
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
            placeholder={`Type: ${target}`}
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

'use client';

export interface SpeechResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

const CONFIDENCE_THRESHOLD = 0.6;

let recognition: SpeechRecognition | null = null;

export function isSpeechSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function createRecognition(): SpeechRecognition | null {
  if (!isSpeechSupported()) return null;
  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognitionCtor) return null;
  const rec = new SpeechRecognitionCtor();
  rec.continuous = false;
  rec.interimResults = true;
  rec.lang = 'en-US';
  rec.maxAlternatives = 3;
  return rec;
}

export function startListening(
  onResult: (result: SpeechResult) => void,
  onEnd: () => void,
  onError: (error: string) => void
): void {
  stopListening();
  recognition = createRecognition();
  if (!recognition) {
    onError('Speech recognition is not supported in this browser.');
    return;
  }

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    const last = event.results[event.results.length - 1];
    const result: SpeechResult = {
      transcript: last[0].transcript.trim(),
      confidence: last[0].confidence,
      isFinal: last.isFinal,
    };
    onResult(result);
  };

  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    if (event.error === 'no-speech') {
      onError('No speech detected. Try again or switch to text mode.');
    } else if (event.error === 'audio-capture') {
      onError('Microphone not found. Please check your microphone.');
    } else if (event.error === 'not-allowed') {
      onError('Microphone access denied. Please allow microphone access in your browser settings.');
    } else {
      onError(`Speech recognition error: ${event.error}`);
    }
  };

  recognition.onend = () => {
    onEnd();
  };

  recognition.start();
}

export function stopListening(): void {
  if (recognition) {
    try {
      recognition.abort();
    } catch {
      // Already stopped
    }
    recognition = null;
  }
}

export function isLowConfidence(confidence: number): boolean {
  return confidence > 0 && confidence < CONFIDENCE_THRESHOLD;
}

// Text-to-speech
export function speak(text: string, rate: number = 0.9): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      reject(new Error('Speech synthesis not supported'));
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate; // Slightly slower for clarity
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.lang = 'en-US';

    // Prefer a natural-sounding voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) => v.lang.startsWith('en') && v.name.includes('Samantha')
    ) || voices.find(
      (v) => v.lang.startsWith('en-US') && v.localService
    ) || voices.find(
      (v) => v.lang.startsWith('en')
    );
    if (preferred) utterance.voice = preferred;

    utterance.onend = () => resolve();
    utterance.onerror = (e) => reject(e);
    window.speechSynthesis.speak(utterance);
  });
}

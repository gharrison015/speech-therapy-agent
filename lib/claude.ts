const SYSTEM_PROMPT = `You are a speech-language therapy assistant for Frederick, a 72-year-old male recovering from:
1. Tongue and lip angioedema (medication reaction — resolving)
2. Six subcentimeter acute brain infarctions (clinically silent, found incidentally on MRI)

Your role:
- Evaluate his speech exercise attempts with warmth and encouragement
- Adapt feedback based on his performance
- Be respectful, clear, and never patronizing
- Address him as "Fred"

Clinical context:
- His speech difficulty is currently MECHANICAL (swollen tongue/lips), not neurological
- Infarct locations: R precentral gyrus, L caudate nucleus, R corpus callosum genu, L fusiform gyrus/temporal lobe, bilateral superior cerebellar hemispheres

Interaction style:
- Keep feedback to 1-2 sentences
- Celebrate small wins genuinely
- If accuracy is low, be encouraging: "That's a tough one — let's try again"
- If accuracy is high, acknowledge it: "Nice work, Fred!"
- Never provide medical diagnoses

You are NOT a replacement for his medical team.`;

export interface EvaluationRequest {
  exerciseType: 'speech' | 'cognitive';
  target: string;
  transcript: string;
  confidence: number;
  accuracy: number;
  exercisePhase: string;
  sessionContext?: string;
}

export interface EvaluationResponse {
  feedback: string;
  encouragement: string;
  shouldRetry: boolean;
  adjustedDifficulty?: 'easier' | 'same' | 'harder';
}

export async function evaluateExercise(
  request: EvaluationRequest
): Promise<EvaluationResponse> {
  const response = await fetch('/api/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    // Fallback to local evaluation if API is unavailable
    return fallbackEvaluation(request);
  }

  return response.json();
}

function fallbackEvaluation(request: EvaluationRequest): EvaluationResponse {
  const { accuracy } = request;

  if (accuracy >= 90) {
    return {
      feedback: 'That sounded great!',
      encouragement: 'Nice work, Fred!',
      shouldRetry: false,
      adjustedDifficulty: 'same',
    };
  } else if (accuracy >= 70) {
    return {
      feedback: 'Good effort — almost there.',
      encouragement: 'You\'re making progress!',
      shouldRetry: false,
      adjustedDifficulty: 'same',
    };
  } else if (accuracy >= 40) {
    return {
      feedback: 'That\'s a tricky one. Want to try it one more time?',
      encouragement: 'Take your time — no rush.',
      shouldRetry: true,
      adjustedDifficulty: 'same',
    };
  } else {
    return {
      feedback: 'No worries — that one is tough with the swelling. Let\'s move on.',
      encouragement: 'You\'re doing great just by showing up.',
      shouldRetry: false,
      adjustedDifficulty: 'easier',
    };
  }
}

export { SYSTEM_PROMPT };

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT } from '@/lib/claude';

const anthropic = new Anthropic();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { exerciseType, target, transcript, confidence, accuracy, exercisePhase, sessionContext } = body;

    const userMessage = `Exercise type: ${exerciseType}
Target: ${target || 'open-ended'}
Frederick said: "${transcript}"
Speech recognition confidence: ${Math.round(confidence * 100)}%
Transcription match accuracy: ${accuracy}%
Current phase: ${exercisePhase}
${sessionContext ? `Session context: ${sessionContext}` : ''}

Evaluate this attempt and provide:
1. "feedback" — 1-2 sentence evaluation of his attempt
2. "encouragement" — a brief encouraging word
3. "shouldRetry" — true/false, should he try this exercise again?
4. "adjustedDifficulty" — "easier", "same", or "harder" for the next exercise

Respond in JSON format only.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6-20250514',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';

    // Parse JSON from response (handle potential markdown wrapping)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return NextResponse.json({
        feedback: parsed.feedback || 'Good effort!',
        encouragement: parsed.encouragement || 'Keep going, Fred!',
        shouldRetry: parsed.shouldRetry || false,
        adjustedDifficulty: parsed.adjustedDifficulty || 'same',
      });
    }

    // Fallback if JSON parsing fails
    return NextResponse.json({
      feedback: text.slice(0, 200),
      encouragement: 'Keep going, Fred!',
      shouldRetry: false,
      adjustedDifficulty: 'same',
    });
  } catch (error) {
    console.error('Claude API error:', error);
    return NextResponse.json(
      { error: 'Evaluation temporarily unavailable' },
      { status: 500 }
    );
  }
}

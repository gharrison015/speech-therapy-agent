'use client';

export interface RecordingResult {
  blob: Blob;
  duration: number;
  mimeType: string;
}

let mediaRecorder: MediaRecorder | null = null;
let chunks: Blob[] = [];
let startTime: number = 0;

export function isRecordingSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof MediaRecorder !== 'undefined'
    && typeof navigator.mediaDevices !== 'undefined';
}

export async function startRecording(): Promise<boolean> {
  if (!isRecordingSupported()) return false;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/webm';

    mediaRecorder = new MediaRecorder(stream, { mimeType });
    chunks = [];
    startTime = Date.now();

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    mediaRecorder.start(100); // Collect data every 100ms
    return true;
  } catch {
    return false;
  }
}

export function stopRecording(): Promise<RecordingResult | null> {
  return new Promise((resolve) => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      resolve(null);
      return;
    }

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: mediaRecorder?.mimeType || 'audio/webm' });
      const duration = Date.now() - startTime;

      // Stop all tracks to release the microphone
      mediaRecorder?.stream.getTracks().forEach((track) => track.stop());

      resolve({
        blob,
        duration,
        mimeType: mediaRecorder?.mimeType || 'audio/webm',
      });

      mediaRecorder = null;
      chunks = [];
    };

    mediaRecorder.stop();
  });
}

export function isRecording(): boolean {
  return mediaRecorder?.state === 'recording';
}

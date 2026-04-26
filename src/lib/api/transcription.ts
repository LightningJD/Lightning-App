/**
 * Transcription API client — POSTs audio to /api/transcribe.
 * Mirrors ai-service.ts pattern. All STT happens server-side.
 */

const TRANSCRIBE_URL = '/api/transcribe';

export interface TranscriptionResult {
  success: boolean;
  text?: string;
  durationSec?: number;
  language?: string;
  error?: string;
}

/**
 * Send audio blob to the transcription endpoint.
 */
export async function transcribeAudio(
  audioBlob: Blob,
  questionId: string,
  userId?: string
): Promise<TranscriptionResult> {
  try {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.' + getExtension(audioBlob.type));
    formData.append('questionId', questionId);
    if (userId) formData.append('userId', userId);

    const response = await fetch(TRANSCRIBE_URL, {
      method: 'POST',
      body: formData,
    });

    if (response.status === 429) {
      const data = await response.json().catch(() => ({}));
      return {
        success: false,
        error: data.error || 'Too many recordings. Please wait a moment and try again.',
      };
    }

    if (response.status === 413) {
      return {
        success: false,
        error: 'Recording is too long. Please keep it under 3 minutes.',
      };
    }

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return {
        success: false,
        error: data.error || 'Transcription failed. Please try again.',
      };
    }

    const data = await response.json();
    return {
      success: true,
      text: data.text,
      durationSec: data.durationSec,
      language: data.language,
    };
  } catch {
    return {
      success: false,
      error: 'Network error. Please check your connection and try again.',
    };
  }
}

function getExtension(mimeType: string): string {
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'm4a';
  if (mimeType.includes('wav')) return 'wav';
  return 'webm';
}

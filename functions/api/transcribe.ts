/**
 * Cloudflare Pages Function — Audio Transcription Endpoint
 *
 * Receives audio recordings from the testimony questionnaire voice input,
 * sends them to a speech-to-text service, and returns the transcript.
 *
 * Endpoint: POST /api/transcribe
 * Content-Type: multipart/form-data
 *
 * Body fields:
 *   audio: File (required) — the audio blob
 *   questionId: string (required) — question1..question4
 *   userId: string (optional) — Supabase user UUID
 *
 * Response:
 *   200 { success: true, text: string, durationSec: number, language?: string }
 *   400 { success: false, error: "<reason>" }
 *   413 { success: false, error: "Recording too long" }
 *   429 { success: false, error: "Rate limit reached" }
 *   500 { success: false, error: "Transcription failed" }
 *
 * STT provider is selected via STT_PROVIDER env var (default: "whisper").
 * API key stored server-side only — never exposed to browser.
 */

import { checkRateLimit, getClientIP, rateLimitResponse } from './_rateLimit';

interface Env {
  OPENAI_API_KEY?: string;
  DEEPGRAM_API_KEY?: string;
  STT_PROVIDER?: string; // 'whisper' | 'deepgram'
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const VALID_QUESTION_IDS = ['question1', 'question2', 'question3', 'question4'];

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const ip = getClientIP(request);

  // Rate limit: 20 transcriptions per minute per IP
  const rateCheck = checkRateLimit(ip, 'transcribe', 20, 60_000);
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs, CORS_HEADERS);
  }

  try {
    // Parse multipart form data
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    const questionId = formData.get('questionId') as string | null;

    // Validate inputs
    if (!audioFile) {
      return jsonResponse(400, { success: false, error: 'No audio file provided.' });
    }

    if (!questionId || !VALID_QUESTION_IDS.includes(questionId)) {
      return jsonResponse(400, { success: false, error: 'Invalid question ID.' });
    }

    if (audioFile.size > MAX_FILE_SIZE) {
      return jsonResponse(413, { success: false, error: 'Recording too long. Please keep it under 3 minutes.' });
    }

    if (!audioFile.type.startsWith('audio/')) {
      return jsonResponse(400, { success: false, error: 'Invalid file type. Expected audio.' });
    }

    // Get audio as ArrayBuffer
    const audioBuffer = await audioFile.arrayBuffer();

    // Route to STT provider
    const provider = env.STT_PROVIDER || 'whisper';
    let result: { text: string; durationSec?: number; language?: string };

    if (provider === 'deepgram' && env.DEEPGRAM_API_KEY) {
      result = await transcribeWithDeepgram(audioBuffer, audioFile.type, env.DEEPGRAM_API_KEY);
    } else if (env.OPENAI_API_KEY) {
      result = await transcribeWithWhisper(audioBuffer, audioFile.type, audioFile.name, env.OPENAI_API_KEY);
    } else {
      return jsonResponse(500, { success: false, error: 'Transcription service not configured.' });
    }

    // Truncate to 5000 chars
    const text = result.text.trim().slice(0, 5000);

    return jsonResponse(200, {
      success: true,
      text,
      durationSec: result.durationSec ?? 0,
      language: result.language,
    });

  } catch (err) {
    console.error('Transcription error:', err);
    return jsonResponse(500, { success: false, error: 'Transcription failed. Please try again.' });
  }
};

/**
 * Transcribe with OpenAI Whisper API
 */
async function transcribeWithWhisper(
  audioBuffer: ArrayBuffer,
  mimeType: string,
  fileName: string,
  apiKey: string
): Promise<{ text: string; durationSec?: number; language?: string }> {
  const formData = new FormData();
  const blob = new Blob([audioBuffer], { type: mimeType });
  formData.append('file', blob, fileName || 'recording.webm');
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'verbose_json');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Whisper API error ${response.status}: ${errText}`);
  }

  const data = await response.json() as {
    text: string;
    duration?: number;
    language?: string;
  };

  return {
    text: data.text,
    durationSec: data.duration ? Math.round(data.duration) : undefined,
    language: data.language,
  };
}

/**
 * Transcribe with Deepgram Nova API
 */
async function transcribeWithDeepgram(
  audioBuffer: ArrayBuffer,
  mimeType: string,
  apiKey: string
): Promise<{ text: string; durationSec?: number; language?: string }> {
  const response = await fetch(
    'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true',
    {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': mimeType,
      },
      body: audioBuffer,
    }
  );

  if (!response.ok) {
    const errText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Deepgram API error ${response.status}: ${errText}`);
  }

  const data = await response.json() as {
    results?: {
      channels?: Array<{
        alternatives?: Array<{
          transcript?: string;
        }>;
      }>;
    };
    metadata?: {
      duration?: number;
      language?: string;
    };
  };

  const transcript = data.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';

  return {
    text: transcript,
    durationSec: data.metadata?.duration ? Math.round(data.metadata.duration) : undefined,
    language: data.metadata?.language,
  };
}

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
    },
  });
}

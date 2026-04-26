/**
 * useAudioRecorder — Recording state hook for voice testimony input.
 *
 * Owns MediaRecorder lifecycle, microphone permission, timer, audio analysis.
 * Component (AudioRecorder) is a thin visual layer on top of this hook.
 * Per CLAUDE.md: hooks are the source of truth for state and business logic.
 */
import { useState, useRef, useCallback, useEffect } from 'react';

export type RecorderState = 'idle' | 'requesting' | 'recording' | 'stopping' | 'error';
export type PermissionStatus = 'unknown' | 'granted' | 'denied';

interface UseAudioRecorderOptions {
  maxDurationSec?: number; // default 180 (3 min)
}

interface UseAudioRecorderReturn {
  state: RecorderState;
  permission: PermissionStatus;
  durationSec: number;
  analyser: AnalyserNode | null;
  audioBlob: Blob | null;
  error: string | null;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  reset: () => void;
}

function getSupportedMimeType(): string {
  if (typeof MediaRecorder !== 'undefined') {
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus';
    if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4';
    if (MediaRecorder.isTypeSupported('audio/wav')) return 'audio/wav';
  }
  return 'audio/webm';
}

export function useAudioRecorder(opts: UseAudioRecorderOptions = {}): UseAudioRecorderReturn {
  const maxDuration = opts.maxDurationSec ?? 180;

  const [state, setState] = useState<RecorderState>('idle');
  const [permission, setPermission] = useState<PermissionStatus>('unknown');
  const [durationSec, setDurationSec] = useState(0);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch { /* already stopped */ }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch { /* already closed */ }
      audioContextRef.current = null;
    }
  }, []);

  // Cleanup on unmount — release mic
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const start = useCallback(async () => {
    setError(null);
    setAudioBlob(null);
    chunksRef.current = [];
    setState('requesting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });

      streamRef.current = stream;
      setPermission('granted');

      // Set up audio analyser for waveform visualization
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = 64;
      source.connect(analyserNode);
      setAnalyser(analyserNode);

      // Set up MediaRecorder
      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setState('idle');
        // Release mic
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        if (audioContextRef.current) {
          try { audioContextRef.current.close(); } catch { /* ok */ }
          audioContextRef.current = null;
        }
        setAnalyser(null);
      };

      recorder.onerror = () => {
        setError('Recording failed. Please try again.');
        setState('error');
        cleanup();
      };

      // Start
      recorder.start(1000);
      startTimeRef.current = Date.now();
      setDurationSec(0);
      setState('recording');

      // Timer — update every 500ms for smooth display
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setDurationSec(elapsed);

        // Hard stop at max duration
        if (elapsed >= maxDuration) {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        }
      }, 500);

    } catch (err: unknown) {
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotAllowedError') {
        setPermission('denied');
        setError('Microphone access denied. You can switch to typing instead.');
      } else if (name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone and try again.');
      } else if (name === 'NotReadableError') {
        setError('Microphone is in use by another app. Close it and try again.');
      } else {
        setError('Could not start recording. Please try again.');
      }
      setState('error');
    }
  }, [maxDuration, cleanup]);

  const stop = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setState('stopping');

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const reset = useCallback(() => {
    cleanup();
    setState('idle');
    setDurationSec(0);
    setAudioBlob(null);
    setError(null);
    setAnalyser(null);
    chunksRef.current = [];
  }, [cleanup]);

  return { state, permission, durationSec, analyser, audioBlob, error, start, stop, reset };
}

/**
 * AudioRecorder — Voice input component for testimony questionnaire.
 *
 * Thin visual layer over useAudioRecorder hook.
 * States: idle → requesting → recording → stopping → processing → reviewable.
 * After transcription, fires onTranscriptReady with the text.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Mic, Square, RefreshCw, Loader, AlertCircle } from 'lucide-react';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import AudioWaveform from './AudioWaveform';
import { transcribeAudio } from '../lib/api/transcription';

interface AudioRecorderProps {
  nightMode: boolean;
  questionId: string;
  initialTranscript?: string;
  maxDurationSec?: number;
  onTranscriptReady: (text: string) => void;
  onCancel?: () => void;
}

type Phase = 'idle' | 'recording' | 'processing' | 'reviewable' | 'error';

const AudioRecorder: React.FC<AudioRecorderProps> = ({
  nightMode,
  questionId,
  initialTranscript,
  maxDurationSec = 180,
  onTranscriptReady,
}) => {
  const recorder = useAudioRecorder({ maxDurationSec });
  const [phase, setPhase] = useState<Phase>(initialTranscript ? 'reviewable' : 'idle');
  const [transcript, setTranscript] = useState(initialTranscript || '');
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  // Show first-time tooltip
  useEffect(() => {
    try {
      const seen = localStorage.getItem('lightning_voice_intro_seen');
      if (!seen) {
        setShowTooltip(true);
        localStorage.setItem('lightning_voice_intro_seen', '1');
      }
    } catch { /* localStorage unavailable */ }
  }, []);

  // When recorder produces a blob, auto-transcribe
  useEffect(() => {
    if (recorder.audioBlob && phase === 'recording') {
      handleTranscribe(recorder.audioBlob);
    }
  }, [recorder.audioBlob]);

  // Sync recorder errors
  useEffect(() => {
    if (recorder.error) {
      setTranscriptError(recorder.error);
      setPhase('error');
    }
  }, [recorder.error]);

  const handleStart = useCallback(async () => {
    setTranscriptError(null);
    setShowTooltip(false);
    await recorder.start();
    setPhase('recording');
  }, [recorder]);

  const handleStop = useCallback(async () => {
    await recorder.stop();
    // Phase transitions to 'processing' in handleTranscribe via the audioBlob effect
  }, [recorder]);

  const handleTranscribe = async (blob: Blob) => {
    setPhase('processing');
    setTranscriptError(null);

    try {
      const result = await transcribeAudio(blob, questionId);
      if (result.success && result.text) {
        setTranscript(result.text);
        onTranscriptReady(result.text);
        setPhase('reviewable');
      } else {
        setTranscriptError(result.error || 'Transcription failed. Please try again.');
        setPhase('error');
      }
    } catch {
      setTranscriptError('Could not transcribe audio. Please try again or switch to typing.');
      setPhase('error');
    }
  };

  const handleReRecord = () => {
    recorder.reset();
    setTranscript('');
    setPhase('idle');
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const warningThreshold = maxDurationSec - 30; // warn at 30s before max

  const cardBg = nightMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.5)';
  const cardBorder = nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(150,165,225,0.15)';
  const textPrimary = nightMode ? '#e8e5f2' : '#1e2b4a';
  const textSecondary = nightMode ? '#8e89a8' : '#4a5e88';
  const accent = nightMode ? '#7b76e0' : '#4facfe';

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
    >
      {/* First-time tooltip */}
      {showTooltip && (
        <div
          className="rounded-lg p-3 text-sm"
          style={{
            background: nightMode ? 'rgba(123,118,224,0.1)' : 'rgba(79,172,254,0.08)',
            border: `1px solid ${nightMode ? 'rgba(123,118,224,0.2)' : 'rgba(79,172,254,0.15)'}`,
            color: textSecondary,
          }}
        >
          Just talk, don't worry about messing up. Lightning's AI service will capture what is being said and help you write it.
        </div>
      )}

      {/* Idle state — mic button */}
      {phase === 'idle' && (
        <div className="flex flex-col items-center gap-3 py-4">
          <button
            onClick={handleStart}
            className="w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-95"
            style={{
              background: `linear-gradient(135deg, ${accent}, ${nightMode ? '#9b96f5' : '#6bc5f8'})`,
              boxShadow: `0 4px 14px ${nightMode ? 'rgba(123,118,224,0.3)' : 'rgba(79,172,254,0.2)'}`,
            }}
          >
            <Mic className="w-7 h-7 text-white" />
          </button>
          <p className="text-sm" style={{ color: textSecondary }}>Tap to start recording</p>
        </div>
      )}

      {/* Recording state */}
      {phase === 'recording' && (
        <div className="flex flex-col items-center gap-3 py-2">
          {/* Waveform */}
          <AudioWaveform analyser={recorder.analyser} nightMode={nightMode} />

          {/* Timer */}
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: '#ef4444' }}
            />
            <span
              className="text-lg font-mono font-semibold"
              style={{
                color: recorder.durationSec >= warningThreshold ? '#ef4444' : textPrimary,
              }}
            >
              {formatTime(recorder.durationSec)}
            </span>
            <span className="text-xs" style={{ color: textSecondary }}>
              / {formatTime(maxDurationSec)}
            </span>
          </div>

          {/* Warning near max */}
          {recorder.durationSec >= warningThreshold && (
            <p className="text-xs" style={{ color: '#ef4444' }}>
              Recording will stop in {maxDurationSec - recorder.durationSec}s
            </p>
          )}

          {/* Stop button */}
          <button
            onClick={handleStop}
            className="w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95"
            style={{
              background: 'rgba(239,68,68,0.15)',
              border: '2px solid rgba(239,68,68,0.4)',
            }}
          >
            <Square className="w-6 h-6" style={{ color: '#ef4444', fill: '#ef4444' }} />
          </button>
          <p className="text-sm" style={{ color: textSecondary }}>Tap to stop</p>
        </div>
      )}

      {/* Processing state */}
      {phase === 'processing' && (
        <div className="flex flex-col items-center gap-3 py-6">
          <Loader className="w-8 h-8 animate-spin" style={{ color: accent }} />
          <p className="text-sm" style={{ color: textSecondary }}>
            Transcribing your story...
          </p>
        </div>
      )}

      {/* Reviewable state — editable transcript */}
      {phase === 'reviewable' && (
        <div className="space-y-3">
          <textarea
            value={transcript}
            onChange={(e) => {
              setTranscript(e.target.value);
              onTranscriptReady(e.target.value);
            }}
            rows={6}
            className="w-full px-4 py-3 rounded-xl focus:outline-none resize-none"
            style={{
              minHeight: '120px',
              background: nightMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.5)',
              border: `1px solid ${cardBorder}`,
              color: textPrimary,
              fontFamily: "'General Sans', system-ui, sans-serif",
              fontSize: '14px',
              lineHeight: '1.6',
            }}
          />
          <div className="flex items-center justify-between">
            <button
              onClick={handleReRecord}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: nightMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                color: textSecondary,
              }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Re-record
            </button>
            <span className="text-xs" style={{ color: textSecondary }}>
              Edit the transcript above if needed
            </span>
          </div>
        </div>
      )}

      {/* Error state */}
      {phase === 'error' && (
        <div className="flex flex-col items-center gap-3 py-4">
          <AlertCircle className="w-8 h-8" style={{ color: '#ef4444' }} />
          <p className="text-sm text-center" style={{ color: '#ef4444' }}>
            {transcriptError || 'Something went wrong.'}
          </p>
          <button
            onClick={handleReRecord}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: nightMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)',
              color: textSecondary,
            }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try again
          </button>
        </div>
      )}
    </div>
  );
};

export default AudioRecorder;

/**
 * AudioWaveform — Visual waveform bars during recording.
 * Reads AnalyserNode frequency data on rAF and renders 24 vertical bars.
 * Pure presentational — takes analyser as a prop.
 */
import React, { useRef, useEffect, useState } from 'react';

interface AudioWaveformProps {
  analyser: AnalyserNode | null;
  nightMode: boolean;
  barCount?: number;
}

const AudioWaveform: React.FC<AudioWaveformProps> = ({ analyser, nightMode, barCount = 24 }) => {
  const [bars, setBars] = useState<number[]>(new Array(barCount).fill(4));
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!analyser) {
      // Static pulse fallback when no analyser
      setBars(new Array(barCount).fill(4));
      return;
    }

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(dataArray);

      // Map frequency bins to bar heights (4px min, 40px max)
      const step = Math.max(1, Math.floor(dataArray.length / barCount));
      const newBars: number[] = [];
      for (let i = 0; i < barCount; i++) {
        const value = dataArray[i * step] ?? 0;
        newBars.push(Math.max(4, (value / 255) * 40));
      }
      setBars(newBars);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyser, barCount]);

  const barColor = nightMode ? '#7b76e0' : '#4facfe';

  return (
    <div className="flex items-center justify-center gap-[3px]" style={{ height: 48 }}>
      {bars.map((h, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-75"
          style={{
            width: 3,
            height: h,
            background: barColor,
            opacity: 0.6 + (h / 40) * 0.4,
          }}
        />
      ))}
    </div>
  );
};

export default AudioWaveform;

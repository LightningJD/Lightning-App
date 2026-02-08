import React, { useState } from 'react';
import { Palette, Check } from 'lucide-react';

interface AccentColorPickerProps {
  nightMode: boolean;
  primaryColor: string;
  secondaryColor: string;
  onChangePrimary: (color: string) => void;
  onChangeSecondary: (color: string) => void;
}

const PRESET_COLORS = [
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#22c55e', // Green
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#6366f1', // Indigo
  '#a855f7', // Violet
  '#d946ef', // Fuchsia
];

const AccentColorPicker: React.FC<AccentColorPickerProps> = ({
  nightMode,
  primaryColor,
  secondaryColor,
  onChangePrimary,
  onChangeSecondary,
}) => {
  const [activeTab, setActiveTab] = useState<'primary' | 'secondary'>('primary');
  const nm = nightMode;

  const currentColor = activeTab === 'primary' ? primaryColor : secondaryColor;
  const onChangeColor = activeTab === 'primary' ? onChangePrimary : onChangeSecondary;

  return (
    <div className="space-y-3">
      <label className={`block text-sm font-semibold ${nm ? 'text-white/70' : 'text-black/70'}`}>
        <Palette className="w-4 h-4 inline mr-1.5 -mt-0.5" />
        Brand Colors
      </label>

      {/* Tab selector */}
      <div className="flex gap-2">
        {(['primary', 'secondary'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === tab
                ? 'text-white'
                : nm ? 'text-white/40 hover:text-white/60' : 'text-black/40 hover:text-black/60'
            }`}
            style={{
              background: activeTab === tab
                ? tab === 'primary' ? primaryColor : secondaryColor
                : nm ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            }}
          >
            {tab === 'primary' ? 'Primary' : 'Secondary'}
          </button>
        ))}
      </div>

      {/* Color preview */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl border-2"
          style={{
            background: currentColor,
            borderColor: nm ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
            boxShadow: `0 2px 8px ${currentColor}44`,
          }}
        />
        <div className="flex-1">
          <input
            type="text"
            value={currentColor}
            onChange={(e) => {
              if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) {
                onChangeColor(e.target.value);
              }
            }}
            className={`w-full px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
              nm ? 'bg-white/6 text-white border-white/10' : 'bg-white/60 text-black border-black/8'
            }`}
            style={{
              border: `1px solid ${nm ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
            }}
            maxLength={7}
          />
        </div>
      </div>

      {/* Preset colors */}
      <div className="grid grid-cols-6 gap-2">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            onClick={() => onChangeColor(color)}
            className="w-full aspect-square rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            style={{
              background: color,
              boxShadow: currentColor === color ? `0 0 12px ${color}66` : 'none',
              border: currentColor === color ? '2px solid white' : '2px solid transparent',
            }}
          >
            {currentColor === color && (
              <Check className="w-3.5 h-3.5 text-white drop-shadow" />
            )}
          </button>
        ))}
      </div>

      {/* Custom color input */}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={currentColor}
          onChange={(e) => onChangeColor(e.target.value)}
          className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
          style={{ background: 'transparent' }}
        />
        <span className={`text-xs ${nm ? 'text-white/30' : 'text-black/30'}`}>
          Custom color picker
        </span>
      </div>
    </div>
  );
};

export default AccentColorPicker;

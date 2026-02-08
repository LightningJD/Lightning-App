import React, { useState, useEffect } from 'react';
import { Sparkles, Save, Crown } from 'lucide-react';
import { useServerPremium } from '../../contexts/PremiumContext';
import { upsertServerCosmetics, getServerCosmetics } from '../../lib/database/billing';
import { showError, showSuccess } from '../../lib/toast';
import type { PremiumCosmetics, IconAnimation, TestimonyCardTemplate } from '../../types/premium';
import ServerBannerUpload from './ServerBannerUpload';
import AccentColorPicker from './AccentColorPicker';
import CustomInviteEditor from './CustomInviteEditor';
import BrandedTestimonyCard from './BrandedTestimonyCard';

interface CosmeticsEditorProps {
  nightMode: boolean;
  serverId: string;
  serverName: string;
}

const ICON_ANIMATIONS: { value: IconAnimation; label: string; desc: string }[] = [
  { value: 'none', label: 'None', desc: 'Standard static icon' },
  { value: 'glow', label: 'Glow', desc: 'Soft ambient glow' },
  { value: 'pulse', label: 'Pulse', desc: 'Gentle breathing effect' },
  { value: 'shimmer', label: 'Shimmer', desc: 'Light sweep effect' },
];

const CARD_TEMPLATES: { value: TestimonyCardTemplate; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'classic', label: 'Classic' },
  { value: 'modern', label: 'Modern' },
  { value: 'minimal', label: 'Minimal' },
];

const CosmeticsEditor: React.FC<CosmeticsEditorProps> = ({
  nightMode,
  serverId,
  serverName,
}) => {
  const { isPremium, premium, refresh } = useServerPremium(serverId);
  const nm = nightMode;

  const [cosmetics, setCosmetics] = useState<Partial<PremiumCosmetics>>({
    banner_url: '',
    icon_animation: 'none',
    icon_glow_color: '#F59E0B',
    accent_primary: '#3b82f6',
    accent_secondary: '#8b5cf6',
    custom_invite_slug: '',
    testimony_card_template: 'default',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load cosmetics
  useEffect(() => {
    const load = async () => {
      try {
        const data = await getServerCosmetics(serverId);
        if (data) {
          setCosmetics({
            banner_url: data.banner_url || '',
            icon_animation: data.icon_animation || 'none',
            icon_glow_color: data.icon_glow_color || '#F59E0B',
            accent_primary: data.accent_primary || '#3b82f6',
            accent_secondary: data.accent_secondary || '#8b5cf6',
            custom_invite_slug: data.custom_invite_slug || '',
            testimony_card_template: data.testimony_card_template || 'default',
          });
        }
      } catch {
        // Will use defaults
      }
    };
    if (isPremium) load();
  }, [serverId, isPremium]);

  const updateCosmetic = <K extends keyof PremiumCosmetics>(key: K, value: PremiumCosmetics[K]) => {
    setCosmetics(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await upsertServerCosmetics(serverId, cosmetics);
      showSuccess('Cosmetics saved!');
      setHasChanges(false);
      await refresh();
    } catch (error: any) {
      showError(error.message || 'Failed to save cosmetics');
    }
    setIsSaving(false);
  };

  // Non-premium: show upgrade prompt
  if (!isPremium) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className={`w-5 h-5 ${nm ? 'text-yellow-400' : 'text-yellow-500'}`} />
          <h3 className={`text-base font-semibold ${nm ? 'text-slate-100' : 'text-slate-900'}`}>
            Customization
          </h3>
        </div>
        <div
          className={`p-4 rounded-xl text-center ${nm ? 'bg-white/5' : 'bg-black/3'}`}
          style={{ border: `1px dashed ${nm ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}` }}
        >
          <Crown className={`w-8 h-8 mx-auto mb-2 ${nm ? 'text-yellow-400/40' : 'text-yellow-500/40'}`} />
          <p className={`text-sm font-medium ${nm ? 'text-white/60' : 'text-black/50'}`}>
            Unlock custom branding with Premium
          </p>
          <p className={`text-xs mt-1 ${nm ? 'text-white/30' : 'text-black/30'}`}>
            Custom banners, animated icons, brand colors, and more
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Sparkles className={`w-5 h-5 ${nm ? 'text-yellow-400' : 'text-yellow-500'}`} />
        <h3 className={`text-base font-semibold ${nm ? 'text-slate-100' : 'text-slate-900'}`}>
          Customization
        </h3>
      </div>

      {/* Banner Upload */}
      <ServerBannerUpload
        nightMode={nm}
        currentBannerUrl={cosmetics.banner_url}
        onUpload={(url) => updateCosmetic('banner_url', url)}
        onRemove={() => updateCosmetic('banner_url', '')}
      />

      {/* Icon Animation */}
      <div className="space-y-2">
        <label className={`block text-sm font-semibold ${nm ? 'text-white/70' : 'text-black/70'}`}>
          Icon Animation
        </label>
        <div className="grid grid-cols-2 gap-2">
          {ICON_ANIMATIONS.map(({ value, label, desc }) => (
            <button
              key={value}
              onClick={() => updateCosmetic('icon_animation', value)}
              className={`p-2.5 rounded-xl text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${
                cosmetics.icon_animation === value
                  ? 'ring-2 ring-blue-400/50'
                  : ''
              }`}
              style={{
                background: cosmetics.icon_animation === value
                  ? nm ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)'
                  : nm ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                border: `1px solid ${cosmetics.icon_animation === value
                  ? 'rgba(59,130,246,0.3)'
                  : nm ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
              }}
            >
              <p className={`text-xs font-semibold ${nm ? 'text-white' : 'text-black'}`}>{label}</p>
              <p className={`text-[10px] mt-0.5 ${nm ? 'text-white/40' : 'text-black/40'}`}>{desc}</p>
            </button>
          ))}
        </div>

        {/* Glow color picker (only for glow/shimmer) */}
        {(cosmetics.icon_animation === 'glow' || cosmetics.icon_animation === 'shimmer') && (
          <div className="flex items-center gap-2 mt-2">
            <label className={`text-xs ${nm ? 'text-white/40' : 'text-black/40'}`}>Glow color:</label>
            <input
              type="color"
              value={cosmetics.icon_glow_color || '#F59E0B'}
              onChange={(e) => updateCosmetic('icon_glow_color', e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border-0 p-0"
            />
          </div>
        )}
      </div>

      {/* Accent Colors */}
      <AccentColorPicker
        nightMode={nm}
        primaryColor={cosmetics.accent_primary || '#3b82f6'}
        secondaryColor={cosmetics.accent_secondary || '#8b5cf6'}
        onChangePrimary={(c) => updateCosmetic('accent_primary', c)}
        onChangeSecondary={(c) => updateCosmetic('accent_secondary', c)}
      />

      {/* Custom Invite Link */}
      <CustomInviteEditor
        nightMode={nm}
        serverId={serverId}
        currentSlug={cosmetics.custom_invite_slug}
        onSave={(slug) => updateCosmetic('custom_invite_slug', slug)}
      />

      {/* Testimony Card Template */}
      <div className="space-y-2">
        <label className={`block text-sm font-semibold ${nm ? 'text-white/70' : 'text-black/70'}`}>
          Testimony Card Style
        </label>
        <div className="grid grid-cols-2 gap-2">
          {CARD_TEMPLATES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => updateCosmetic('testimony_card_template', value)}
              className={`p-2 rounded-lg text-xs font-semibold transition-all ${
                cosmetics.testimony_card_template === value
                  ? 'text-white ring-2 ring-blue-400/50'
                  : nm ? 'text-white/50' : 'text-black/50'
              }`}
              style={{
                background: cosmetics.testimony_card_template === value
                  ? `linear-gradient(135deg, ${cosmetics.accent_primary}, ${cosmetics.accent_secondary})`
                  : nm ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                border: `1px solid ${nm ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Preview */}
        <div className="mt-3">
          <p className={`text-xs mb-2 ${nm ? 'text-white/30' : 'text-black/30'}`}>Preview</p>
          <BrandedTestimonyCard
            nightMode={nm}
            template={cosmetics.testimony_card_template as TestimonyCardTemplate || 'default'}
            accentPrimary={cosmetics.accent_primary || '#3b82f6'}
            accentSecondary={cosmetics.accent_secondary || '#8b5cf6'}
            churchName={serverName}
            testimony={{
              title: 'God Changed My Life',
              excerpt: 'I never thought I would find peace, but through prayer and community...',
              author: 'Sarah M.',
              avatar: undefined,
            }}
          />
        </div>
      </div>

      {/* Save button */}
      {hasChanges && (
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-3 rounded-xl text-white font-bold transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          style={{
            background: `linear-gradient(135deg, ${cosmetics.accent_primary || '#3b82f6'}, ${cosmetics.accent_secondary || '#8b5cf6'})`,
            boxShadow: `0 4px 16px ${cosmetics.accent_primary || '#3b82f6'}44`,
          }}
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Customization'}
        </button>
      )}
    </div>
  );
};

export default CosmeticsEditor;

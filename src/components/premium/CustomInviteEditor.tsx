import React, { useState, useEffect } from 'react';
import { Link, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CustomInviteEditorProps {
  nightMode: boolean;
  serverId: string;
  currentSlug?: string;
  onSave: (slug: string) => void;
}

const CustomInviteEditor: React.FC<CustomInviteEditorProps> = ({
  nightMode,
  serverId,
  currentSlug,
  onSave,
}) => {
  const [slug, setSlug] = useState(currentSlug || '');
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nm = nightMode;

  // Validate slug format
  const isValidSlug = (s: string) => /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(s);

  // Check availability with debounce
  useEffect(() => {
    if (!slug || slug === currentSlug) {
      setIsAvailable(slug === currentSlug ? true : null);
      setError(null);
      return;
    }

    if (!isValidSlug(slug)) {
      setIsAvailable(null);
      setError(slug.length < 3 ? 'At least 3 characters' : 'Letters, numbers, and hyphens only');
      return;
    }

    setError(null);
    setIsChecking(true);

    const timer = setTimeout(async () => {
      try {
        // @ts-ignore
        const { data } = await supabase
          .from('premium_cosmetics')
          .select('server_id')
          .eq('custom_invite_slug', slug)
          .neq('server_id', serverId)
          .limit(1);

        setIsAvailable(!data || data.length === 0);
      } catch {
        setIsAvailable(null);
      }
      setIsChecking(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [slug, serverId, currentSlug]);

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlug(value);
  };

  const handleSave = () => {
    if (isAvailable && isValidSlug(slug)) {
      onSave(slug);
    }
  };

  return (
    <div className="space-y-3">
      <label className={`block text-sm font-semibold ${nm ? 'text-white/70' : 'text-black/70'}`}>
        <Link className="w-4 h-4 inline mr-1.5 -mt-0.5" />
        Custom Invite Link
      </label>

      <div className="flex items-center gap-2">
        <span className={`text-sm font-medium ${nm ? 'text-white/30' : 'text-black/30'}`}>
          lightning.app/
        </span>
        <input
          type="text"
          value={slug}
          onChange={handleSlugChange}
          placeholder="your-church"
          maxLength={32}
          className={`flex-1 px-3 py-2 rounded-lg text-sm transition-all ${
            nm ? 'bg-white/6 text-white placeholder-white/20' : 'bg-white/60 text-black placeholder-black/30'
          }`}
          style={{
            border: `1px solid ${
              error ? 'rgba(239,68,68,0.4)' :
              isAvailable === true ? 'rgba(34,197,94,0.4)' :
              isAvailable === false ? 'rgba(239,68,68,0.4)' :
              nm ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'
            }`,
          }}
        />
        {slug !== currentSlug && isAvailable && isValidSlug(slug) && (
          <button
            onClick={handleSave}
            className="p-2 rounded-lg transition-all hover:scale-105 active:scale-95"
            style={{ background: 'rgba(34,197,94,0.15)' }}
          >
            <Check className="w-4 h-4 text-green-500" />
          </button>
        )}
      </div>

      {/* Status feedback */}
      <div className="h-4">
        {isChecking && (
          <span className={`text-xs ${nm ? 'text-white/30' : 'text-black/30'}`}>
            Checking availability...
          </span>
        )}
        {!isChecking && error && (
          <span className="text-xs text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {error}
          </span>
        )}
        {!isChecking && isAvailable === true && slug !== currentSlug && (
          <span className="text-xs text-green-400 flex items-center gap-1">
            <Check className="w-3 h-3" /> Available!
          </span>
        )}
        {!isChecking && isAvailable === false && (
          <span className="text-xs text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Already taken
          </span>
        )}
      </div>
    </div>
  );
};

export default CustomInviteEditor;

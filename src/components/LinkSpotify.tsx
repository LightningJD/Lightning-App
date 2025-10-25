import { useState } from 'react';
import { X, Music, ExternalLink, Check } from 'lucide-react';
import { updateUserProfile } from '../lib/database';
import { showSuccess, showError } from '../lib/toast';

interface LinkSpotifyProps {
  isOpen: boolean;
  onClose: () => void;
  nightMode: boolean;
  userProfile: any;
}

const LinkSpotify: React.FC<LinkSpotifyProps> = ({ isOpen, onClose, nightMode, userProfile }) => {
  const [spotifyUrl, setSpotifyUrl] = useState(userProfile?.spotifyUrl || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate URL if provided (YouTube only)
    if (spotifyUrl && !spotifyUrl.includes('youtube.com')) {
      showError('Please enter a valid YouTube URL');
      return;
    }

    setSaving(true);
    try {
      await updateUserProfile(userProfile.supabaseId, { spotify_url: spotifyUrl } as any);
      showSuccess(spotifyUrl ? 'YouTube channel linked!' : 'YouTube channel unlinked');
      onClose();
    } catch (error) {
      console.error('Error updating YouTube channel URL:', error);
      showError('Failed to update YouTube channel');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setSpotifyUrl('');
    setSaving(true);
    try {
      await updateUserProfile(userProfile.supabaseId, { spotify_url: null } as any);
      showSuccess('YouTube channel unlinked');
      onClose();
    } catch (error) {
      console.error('Error removing YouTube URL:', error);
      showError('Failed to remove YouTube channel');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={`w-full max-w-md rounded-2xl shadow-2xl pointer-events-auto overflow-hidden ${
            nightMode
              ? 'bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10'
              : 'bg-white border border-slate-200'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`flex items-center justify-between px-6 py-4 border-b ${
            nightMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'
          }`}>
            <div className="flex items-center gap-3">
              <Music className={`w-5 h-5 ${nightMode ? 'text-red-400' : 'text-red-600'}`} />
              <h2 className={`text-lg font-semibold ${nightMode ? 'text-slate-100' : 'text-slate-900'}`}>
                Link YouTube Channel
              </h2>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                nightMode
                  ? 'hover:bg-white/10 text-slate-100'
                  : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSave} className="p-6 space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${nightMode ? 'text-slate-100' : 'text-slate-700'}`}>
                YouTube Channel URL
              </label>
              <input
                type="url"
                value={spotifyUrl}
                onChange={(e) => setSpotifyUrl(e.target.value)}
                placeholder="https://youtube.com/@yourchannel"
                className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                  nightMode
                    ? 'bg-white/5 border-white/10 text-slate-100 placeholder-slate-500 focus:border-red-500'
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-red-500'
                } focus:outline-none focus:ring-2 focus:ring-red-500/20`}
              />
            </div>

            {/* Instructions */}
            <div className={`p-4 rounded-lg ${nightMode ? 'bg-white/5' : 'bg-slate-50'}`}>
              <p className={`text-sm font-medium mb-2 ${nightMode ? 'text-slate-100' : 'text-slate-900'}`}>
                How to find your YouTube channel URL:
              </p>
              <ol className={`text-xs space-y-1 list-decimal list-inside ${nightMode ? 'text-slate-400' : 'text-slate-600'}`}>
                <li>Go to youtube.com and sign in</li>
                <li>Click your profile icon → "Your channel"</li>
                <li>Copy the URL from your browser (e.g., youtube.com/@yourname)</li>
                <li>Paste the link here</li>
              </ol>
            </div>

            {/* Preview if URL exists */}
            {spotifyUrl && (
              <div className={`flex items-center gap-3 p-3 rounded-lg ${
                nightMode ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'
              }`}>
                <Check className={`w-5 h-5 ${nightMode ? 'text-red-400' : 'text-red-600'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${nightMode ? 'text-red-300' : 'text-red-900'}`}>
                    YouTube channel will be visible
                  </p>
                  <a
                    href={spotifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-xs flex items-center gap-1 hover:underline ${nightMode ? 'text-red-400' : 'text-red-700'}`}
                  >
                    Preview
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              {userProfile?.spotifyUrl && (
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={saving}
                  className={`px-4 py-3 rounded-lg font-medium transition-all ${
                    nightMode
                      ? 'bg-red-600/20 hover:bg-red-600/30 text-red-400'
                      : 'bg-red-50 hover:bg-red-100 text-red-600'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Unlink
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                  nightMode
                    ? 'bg-white/5 hover:bg-white/10 text-slate-100'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                  saving
                    ? nightMode
                      ? 'bg-white/5 text-slate-500 cursor-not-allowed'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : nightMode
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default LinkSpotify;

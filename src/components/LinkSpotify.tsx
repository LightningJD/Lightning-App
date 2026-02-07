import { useState } from 'react';
import { X, Music, Check, Play } from 'lucide-react';
import { updateUserProfile } from '../lib/database';
import { showSuccess, showError } from '../lib/toast';
import { getYouTubeVideoId } from '../lib/musicUtils';

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
    if (spotifyUrl) {
      const isValidYouTube = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be|m\.youtube\.com)\/.+/.test(spotifyUrl);
      if (!isValidYouTube) {
        showError('Please enter a valid YouTube URL');
        return;
      }
    }

    setSaving(true);
    try {
      await updateUserProfile(userProfile.supabaseId, { spotify_url: spotifyUrl } as any);
      showSuccess(spotifyUrl ? 'YouTube song linked!' : 'YouTube song unlinked');
      onClose();
    } catch (error) {
      console.error('Error updating YouTube song URL:', error);
      showError('Failed to update YouTube song');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setSpotifyUrl('');
    setSaving(true);
    try {
      await updateUserProfile(userProfile.supabaseId, { spotify_url: null } as any);
      showSuccess('YouTube song unlinked');
      onClose();
    } catch (error) {
      console.error('Error removing YouTube song:', error);
      showError('Failed to remove YouTube song');
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
                Link YouTube Song
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
                YouTube Song URL
              </label>
              <input
                type="url"
                value={spotifyUrl}
                onChange={(e) => setSpotifyUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
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
                How to get a YouTube song URL:
              </p>
              <ol className={`text-xs space-y-1 list-decimal list-inside ${nightMode ? 'text-slate-400' : 'text-slate-600'}`}>
                <li>Go to youtube.com and find a song</li>
                <li>Click the song to start playing it</li>
                <li>Copy the URL from your browser address bar</li>
                <li>Paste the link here</li>
              </ol>
            </div>

            {/* Preview if URL exists */}
            {spotifyUrl && (() => {
              const videoId = getYouTubeVideoId(spotifyUrl);
              return (
                <div className="space-y-3">
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${
                    nightMode ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'
                  }`}>
                    <Check className={`w-5 h-5 flex-shrink-0 ${nightMode ? 'text-red-400' : 'text-red-600'}`} />
                    <p className={`text-sm font-medium ${nightMode ? 'text-red-300' : 'text-red-900'}`}>
                      Song will play on your profile
                    </p>
                  </div>
                  {videoId && (
                    <div className="rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
                      <iframe
                        src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title="YouTube preview"
                      />
                    </div>
                  )}
                </div>
              );
            })()}

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

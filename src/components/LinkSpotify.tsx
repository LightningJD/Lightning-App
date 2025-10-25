import React, { useState } from 'react';
import { X, Music, ExternalLink, Check } from 'lucide-react';
import { updateUserProfile } from '../lib/database';
import { showSuccess, showError } from '../lib/toast';

const LinkSpotify = ({ isOpen, onClose, nightMode, userProfile }) => {
  const [spotifyUrl, setSpotifyUrl] = useState(userProfile?.spotifyUrl || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();

    // Validate URL if provided
    if (spotifyUrl && !spotifyUrl.includes('spotify.com')) {
      showError('Please enter a valid Spotify URL');
      return;
    }

    setSaving(true);
    try {
      await updateUserProfile(userProfile.supabaseId, { spotifyUrl });
      showSuccess(spotifyUrl ? 'Spotify profile linked!' : 'Spotify profile unlinked');
      onClose();
    } catch (error) {
      console.error('Error updating Spotify URL:', error);
      showError('Failed to update Spotify profile');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setSpotifyUrl('');
    setSaving(true);
    try {
      await updateUserProfile(userProfile.supabaseId, { spotifyUrl: null });
      showSuccess('Spotify profile unlinked');
      onClose();
    } catch (error) {
      console.error('Error removing Spotify URL:', error);
      showError('Failed to remove Spotify profile');
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
              <Music className={`w-5 h-5 ${nightMode ? 'text-green-400' : 'text-green-600'}`} />
              <h2 className={`text-lg font-semibold ${nightMode ? 'text-slate-100' : 'text-slate-900'}`}>
                Link Spotify Profile
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
                Spotify Profile URL
              </label>
              <input
                type="url"
                value={spotifyUrl}
                onChange={(e) => setSpotifyUrl(e.target.value)}
                placeholder="https://open.spotify.com/user/yourprofile"
                className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                  nightMode
                    ? 'bg-white/5 border-white/10 text-slate-100 placeholder-slate-500 focus:border-green-500'
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-green-500'
                } focus:outline-none focus:ring-2 focus:ring-green-500/20`}
              />
            </div>

            {/* Instructions */}
            <div className={`p-4 rounded-lg ${nightMode ? 'bg-white/5' : 'bg-slate-50'}`}>
              <p className={`text-sm font-medium mb-2 ${nightMode ? 'text-slate-100' : 'text-slate-900'}`}>
                How to find your Spotify URL:
              </p>
              <ol className={`text-xs space-y-1 list-decimal list-inside ${nightMode ? 'text-slate-400' : 'text-slate-600'}`}>
                <li>Open Spotify and go to your profile</li>
                <li>Click the "..." (three dots)</li>
                <li>Select "Share" → "Copy link to profile"</li>
                <li>Paste the link here</li>
              </ol>
            </div>

            {/* Preview if URL exists */}
            {spotifyUrl && (
              <div className={`flex items-center gap-3 p-3 rounded-lg ${
                nightMode ? 'bg-green-500/10 border border-green-500/20' : 'bg-green-50 border border-green-200'
              }`}>
                <Check className={`w-5 h-5 ${nightMode ? 'text-green-400' : 'text-green-600'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${nightMode ? 'text-green-300' : 'text-green-900'}`}>
                    Spotify profile will be visible
                  </p>
                  <a
                    href={spotifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-xs flex items-center gap-1 hover:underline ${nightMode ? 'text-green-400' : 'text-green-700'}`}
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
                  Remove
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
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
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

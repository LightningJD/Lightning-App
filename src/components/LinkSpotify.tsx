import { useState, useEffect, useRef } from 'react';
import { X, Music, Check, Loader2 } from 'lucide-react';
import { updateUserProfile } from '../lib/database';
import { showSuccess, showError } from '../lib/toast';
import { getYouTubeVideoId, fetchYouTubeVideoInfo } from '../lib/musicUtils';

interface LinkSpotifyProps {
  isOpen: boolean;
  onClose: () => void;
  nightMode: boolean;
  userProfile: any;
}

const LinkSpotify: React.FC<LinkSpotifyProps> = ({ isOpen, onClose, nightMode, userProfile }) => {
  const [youtubeUrl, setYoutubeUrl] = useState(userProfile?.spotifyUrl || '');
  const [songName, setSongName] = useState(userProfile?.songName || '');
  const [songArtist, setSongArtist] = useState(userProfile?.songArtist || '');
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchedTitle, setFetchedTitle] = useState<string | null>(null);
  const lastFetchedId = useRef<string | null>(null);

  // Auto-fetch video info when a valid YouTube URL is entered
  useEffect(() => {
    const videoId = youtubeUrl ? getYouTubeVideoId(youtubeUrl) : null;
    if (!videoId || videoId === lastFetchedId.current) return;

    lastFetchedId.current = videoId;
    setFetching(true);
    setFetchedTitle(null);

    fetchYouTubeVideoInfo(videoId).then((info) => {
      setFetching(false);
      if (info) {
        setFetchedTitle(info.title);
        setSongName(info.songName);
        setSongArtist(info.artist);
      }
    });
  }, [youtubeUrl]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (youtubeUrl) {
      const isValidYouTube = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be|m\.youtube\.com)\/.+/.test(youtubeUrl);
      if (!isValidYouTube) {
        showError('Please enter a valid YouTube URL');
        return;
      }
      if (!songName.trim()) {
        showError('Could not detect song name — please enter it manually');
        return;
      }
    }

    setSaving(true);
    try {
      await updateUserProfile(userProfile.supabaseId, {
        spotify_url: youtubeUrl || null,
        song_name: songName.trim() || null,
        song_artist: songArtist.trim() || null,
      } as any);
      showSuccess(youtubeUrl ? 'Song saved!' : 'Song removed');
      onClose();
    } catch (error) {
      console.error('Error saving song:', error);
      showError('Failed to save song');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setYoutubeUrl('');
    setSongName('');
    setSongArtist('');
    setFetchedTitle(null);
    lastFetchedId.current = null;
    setSaving(true);
    try {
      await updateUserProfile(userProfile.supabaseId, {
        spotify_url: null,
        song_name: null,
        song_artist: null,
      } as any);
      showSuccess('Song removed');
      onClose();
    } catch (error) {
      console.error('Error removing song:', error);
      showError('Failed to remove song');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const videoId = youtubeUrl ? getYouTubeVideoId(youtubeUrl) : null;

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
                Profile Song
              </h2>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                nightMode ? 'hover:bg-white/10 text-slate-100' : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSave} className="p-6 space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${nightMode ? 'text-slate-100' : 'text-slate-700'}`}>
                YouTube URL
              </label>
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="Paste a YouTube link..."
                className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                  nightMode
                    ? 'bg-white/5 border-white/10 text-slate-100 placeholder-slate-500 focus:border-blue-500'
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500'
                } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
              />
            </div>

            {/* Loading state */}
            {fetching && (
              <div className={`flex items-center gap-3 p-3 rounded-lg ${
                nightMode ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'
              }`}>
                <Loader2 className={`w-4 h-4 animate-spin ${nightMode ? 'text-blue-400' : 'text-blue-600'}`} />
                <p className={`text-sm ${nightMode ? 'text-blue-300' : 'text-blue-700'}`}>
                  Fetching song info...
                </p>
              </div>
            )}

            {/* Auto-detected info (editable) */}
            {videoId && !fetching && (songName || songArtist) && (
              <div className={`space-y-3 p-4 rounded-lg ${
                nightMode ? 'bg-white/5 border border-white/10' : 'bg-slate-50 border border-slate-200'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <Check className={`w-4 h-4 ${nightMode ? 'text-green-400' : 'text-green-600'}`} />
                  <span className={`text-xs font-medium ${nightMode ? 'text-green-400' : 'text-green-600'}`}>
                    Song detected — edit if needed
                  </span>
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${nightMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Song Name
                  </label>
                  <input
                    type="text"
                    value={songName}
                    onChange={(e) => setSongName(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors ${
                      nightMode
                        ? 'bg-white/5 border-white/10 text-slate-100 focus:border-blue-500'
                        : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${nightMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Artist
                  </label>
                  <input
                    type="text"
                    value={songArtist}
                    onChange={(e) => setSongArtist(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg text-sm border transition-colors ${
                      nightMode
                        ? 'bg-white/5 border-white/10 text-slate-100 focus:border-blue-500'
                        : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                  />
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
                disabled={saving || fetching}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                  saving || fetching
                    ? nightMode
                      ? 'bg-white/5 text-slate-500 cursor-not-allowed'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : nightMode
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
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

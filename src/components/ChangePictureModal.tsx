import { useState } from 'react';
import { X, Camera } from 'lucide-react';
import ImageUploadButton from './ImageUploadButton';
import { showSuccess } from '../lib/toast';

interface ChangePictureModalProps {
  isOpen: boolean;
  onClose: () => void;
  nightMode: boolean;
  currentAvatar: string;
  currentAvatarUrl: string | null;
  onSave: (avatarUrl: string | null, avatar: string) => Promise<void>;
}

const ChangePictureModal: React.FC<ChangePictureModalProps> = ({
  isOpen,
  onClose,
  nightMode,
  currentAvatar,
  currentAvatarUrl,
  onSave
}) => {
  const [selectedAvatar, setSelectedAvatar] = useState<string>(currentAvatar);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(currentAvatarUrl);
  const [isSaving, setIsSaving] = useState(false);

  // Avatar emoji options
  const avatarOptions = [
    '👤', '😊', '😎', '🙂', '😇', '🤗', '🥰', '😌',
    '🌟', '⚡', '🔥', '💙', '💜', '🌈', '✨', '🎯',
    '🦁', '🦅', '🐺', '🦋', '🌺', '🌸', '🌻', '🌹'
  ];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(uploadedImageUrl, selectedAvatar);
      showSuccess('Profile picture updated!');
      onClose();
    } catch (error) {
      console.error('Error saving profile picture:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50 animate-in fade-in duration-200"
        style={{
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)'
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col ${
            nightMode ? 'bg-[#0a0a0a]' : 'bg-white'
          }`}
          style={{
            animation: 'popOut 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            transformOrigin: 'center'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="p-6"
            style={{
              background: nightMode
                ? 'linear-gradient(135deg, #4faaf8 0%, #3b82f6 50%, #2563eb 100%)'
                : 'linear-gradient(135deg, rgba(219, 234, 254, 0.8) 0%, rgba(191, 219, 254, 0.8) 100%)'
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Camera className={`w-6 h-6 ${nightMode ? 'text-white' : 'text-blue-600'}`} />
                <div>
                  <h2 className={`text-xl font-bold ${nightMode ? 'text-white' : 'text-slate-900'}`}>
                    Change Profile Picture
                  </h2>
                  <p className={`text-sm ${nightMode ? 'text-white/90' : 'text-slate-600'}`}>
                    Upload a photo or choose an emoji
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                  nightMode
                    ? 'bg-white/20 hover:bg-white/30 text-white'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Current Preview */}
            <div className="flex flex-col items-center gap-3">
              <div className={`w-32 h-32 rounded-full flex items-center justify-center text-6xl overflow-hidden ${
                nightMode ? 'bg-gradient-to-br from-sky-300 via-blue-400 to-blue-500' : 'bg-gradient-to-br from-purple-400 to-pink-400'
              }`}>
                {uploadedImageUrl ? (
                  <img src={uploadedImageUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  selectedAvatar
                )}
              </div>
              <p className={`text-xs ${nightMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Current picture
              </p>
            </div>

            {/* Upload Photo */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${nightMode ? 'text-slate-100' : 'text-slate-700'}`}>
                Upload Photo
              </label>
              <ImageUploadButton
                onUploadComplete={(url) => setUploadedImageUrl(url)}
                currentImage={uploadedImageUrl}
                nightMode={nightMode}
                buttonText="Choose Photo"
              />
              <p className={`text-xs mt-2 ${nightMode ? 'text-slate-400' : 'text-slate-500'}`}>
                JPG, PNG, GIF or WebP • Max 10MB
              </p>
            </div>

            {/* Emoji Avatar Selector */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${nightMode ? 'text-slate-100' : 'text-slate-700'}`}>
                Or Choose Emoji Avatar
              </label>
              <div className="grid grid-cols-8 gap-2">
                {avatarOptions.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      setSelectedAvatar(emoji);
                      setUploadedImageUrl(null); // Clear uploaded image when selecting emoji
                    }}
                    className={`w-10 h-10 rounded-lg text-2xl flex items-center justify-center transition-all ${
                      selectedAvatar === emoji && !uploadedImageUrl
                        ? nightMode
                          ? 'bg-blue-500/30 border-2 border-blue-500'
                          : 'bg-blue-100 border-2 border-blue-500'
                        : nightMode
                          ? 'bg-white/5 hover:bg-white/10 border border-white/10'
                          : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className={`p-6 border-t ${nightMode ? 'border-white/10' : 'border-slate-200'} flex gap-3`}>
            <button
              onClick={onClose}
              disabled={isSaving}
              className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${
                nightMode
                  ? 'bg-white/5 hover:bg-white/10 text-slate-100'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all text-white ${
                isSaving ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              style={{
                background: nightMode
                  ? 'rgba(79, 150, 255, 0.85)'
                  : 'linear-gradient(135deg, #4faaf8 0%, #3b82f6 50%, #2563eb 100%)',
                boxShadow: nightMode
                  ? '0 2px 8px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                  : '0 2px 8px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
              }}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Animation */}
      <style>{`
        @keyframes popOut {
          0% {
            transform: scale(0.9);
            opacity: 0;
          }
          60% {
            transform: scale(1.02);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
};

export default ChangePictureModal;





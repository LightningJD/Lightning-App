import React, { useState, useRef, useEffect } from 'react';
import { X, Save, User, MapPin, FileText } from 'lucide-react';
import ImageUploadButton from './ImageUploadButton';
import { showError, showSuccess, showLoading, updateToSuccess, updateToError } from '../lib/toast';

const ProfileEditDialog = ({ profile, nightMode, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    displayName: profile?.displayName || '',
    username: profile?.username || '',
    bio: profile?.bio || '',
    location: profile?.location || '',
    avatar: profile?.avatar || '👤',
    avatarUrl: profile?.avatarImage || null
  });
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Avatar options (emojis)
  const avatarOptions = [
    '👤', '😊', '😎', '🙂', '😇', '🤗', '🥰', '😌',
    '🌟', '⚡', '🔥', '💙', '💜', '🌈', '✨', '🎯',
    '🦁', '🦅', '🐺', '🦋', '🌺', '🌸', '🌻', '🌹'
  ];

  const nameInputRef = useRef(null);

  // Auto-focus on name input when dialog opens
  useEffect(() => {
    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, []);

  // Track if form has changes
  useEffect(() => {
    const changed =
      formData.displayName !== profile?.displayName ||
      formData.username !== profile?.username ||
      formData.bio !== profile?.bio ||
      formData.location !== profile?.location ||
      formData.avatar !== profile?.avatar ||
      formData.avatarUrl !== profile?.avatarImage;
    setHasChanges(changed);
  }, [formData, profile]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Name is required';
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    if (!formData.bio.trim()) {
      newErrors.bio = 'Bio is required';
    } else if (formData.bio.length > 500) {
      newErrors.bio = 'Bio cannot exceed 500 characters';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      showError('Please fill in all required fields');
      return;
    }

    const toastId = showLoading('Saving profile...');
    setIsSaving(true);

    try {
      await onSave(formData);
      updateToSuccess(toastId, 'Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      updateToError(toastId, error.message || 'Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={`w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col ${nightMode ? 'bg-[#0a0a0a]' : 'bg-white'}`}
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
                <User className={`w-6 h-6 ${nightMode ? 'text-white' : 'text-blue-600'}`} />
                <div>
                  <h2 className={`text-xl font-bold ${nightMode ? 'text-white' : 'text-slate-900'}`}>
                    Edit Profile
                  </h2>
                  <p className={`text-sm ${nightMode ? 'text-white/90' : 'text-slate-600'}`}>
                    Update your profile information
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
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Display Name */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${nightMode ? 'text-slate-100' : 'text-slate-700'}`}>
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => handleInputChange('displayName', e.target.value)}
                    placeholder="John Doe"
                    className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      nightMode
                        ? 'bg-white/5 border-white/10 text-slate-100 placeholder-gray-400'
                        : 'bg-white border-slate-200 text-slate-900'
                    } ${errors.displayName ? 'border-red-500' : ''}`}
                  />
                  {errors.displayName && (
                    <p className="text-red-500 text-xs mt-1">{errors.displayName}</p>
                  )}
                </div>

                {/* Username */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${nightMode ? 'text-slate-100' : 'text-slate-700'}`}>
                    Username <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className={`absolute left-4 top-1/2 -translate-y-1/2 ${nightMode ? 'text-slate-100' : 'text-slate-500'}`}>@</span>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => handleInputChange('username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      placeholder="johndoe"
                      className={`w-full pl-8 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        nightMode
                          ? 'bg-white/5 border-white/10 text-slate-100 placeholder-gray-400'
                          : 'bg-white border-slate-200 text-slate-900'
                      } ${errors.username ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.username && (
                    <p className="text-red-500 text-xs mt-1">{errors.username}</p>
                  )}
                  <p className={`text-xs mt-1 ${nightMode ? 'text-slate-100' : 'text-slate-500'}`}>
                    Letters, numbers, and underscores only
                  </p>
                </div>

                {/* Location */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${nightMode ? 'text-slate-100' : 'text-slate-700'}`}>
                    Location <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${nightMode ? 'text-slate-100' : 'text-slate-500'}`} />
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      placeholder="City, State"
                      className={`w-full pl-10 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        nightMode
                          ? 'bg-white/5 border-white/10 text-slate-100 placeholder-gray-400'
                          : 'bg-white border-slate-200 text-slate-900'
                      } ${errors.location ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.location && (
                    <p className="text-red-500 text-xs mt-1">{errors.location}</p>
                  )}
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* Profile Picture Upload */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${nightMode ? 'text-slate-100' : 'text-slate-700'}`}>
                    Profile Picture
                  </label>
                  <ImageUploadButton
                    onUploadComplete={(url) => handleInputChange('avatarUrl', url)}
                    currentImage={formData.avatarUrl}
                    nightMode={nightMode}
                    buttonText="Upload Picture"
                  />
                  <p className={`text-xs mt-2 ${nightMode ? 'text-slate-100' : 'text-slate-500'}`}>
                    {formData.avatarUrl ? 'Your profile picture is set' : 'Or use an emoji avatar below'}
                  </p>
                </div>

                {/* Bio */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${nightMode ? 'text-slate-100' : 'text-slate-700'}`}>
                    Bio <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    placeholder="Tell us about yourself and your faith journey..."
                    rows={5}
                    maxLength={500}
                    className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                      nightMode
                        ? 'bg-white/5 border-white/10 text-slate-100 placeholder-gray-400'
                        : 'bg-white border-slate-200 text-slate-900'
                    } ${errors.bio ? 'border-red-500' : ''}`}
                  />
                  {errors.bio && (
                    <p className="text-red-500 text-xs mt-1">{errors.bio}</p>
                  )}
                  <p className={`text-xs mt-1 ${nightMode ? 'text-slate-100' : 'text-slate-500'}`}>
                    {formData.bio.length}/500 characters
                  </p>
                </div>

                {/* Avatar Selection */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${nightMode ? 'text-slate-100' : 'text-slate-700'}`}>
                    Avatar
                  </label>
                  <div className="grid grid-cols-8 gap-2">
                    {avatarOptions.map((emoji, index) => (
                      <button
                        key={index}
                        onClick={() => handleInputChange('avatar', emoji)}
                        className={`w-full aspect-square flex items-center justify-center text-2xl rounded-lg border-2 transition-all hover:scale-110 ${
                          formData.avatar === emoji
                            ? 'border-blue-500 bg-blue-500/20 scale-110'
                            : nightMode
                            ? 'border-white/10 hover:border-white/30 bg-white/5'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <div className={`mt-3 p-3 rounded-lg border text-center ${nightMode ? 'bg-white/5 border-white/10' : 'bg-blue-50 border-blue-200'}`}>
                    <span className={`text-sm ${nightMode ? 'text-slate-100' : 'text-slate-700'}`}>
                      Preview: <span className="text-3xl ml-2">{formData.avatar}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {errors.submit && (
              <div className="mt-4 p-3 rounded-lg bg-red-100 border border-red-300">
                <p className="text-red-700 text-sm text-center">{errors.submit}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`p-6 border-t flex gap-3 ${nightMode ? 'border-white/10' : 'border-slate-200'}`}>
            <button
              onClick={onClose}
              disabled={isSaving}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 ${
                nightMode
                  ? 'bg-white/5 hover:bg-white/10 text-slate-100'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Cancel
            </button>

            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-slate-100 border border-white/20`}
              style={hasChanges && !isSaving ? {
                background: nightMode ? 'rgba(79, 150, 255, 0.85)' : 'linear-gradient(135deg, #4faaf8 0%, #3b82f6 50%, #2563eb 100%)',
                boxShadow: nightMode
                  ? '0 2px 8px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                  : '0 2px 8px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
              } : {}}
              onMouseEnter={(e) => {
                if (hasChanges && !isSaving && nightMode) {
                  e.currentTarget.style.background = 'rgba(79, 150, 255, 1.0)';
                }
              }}
              onMouseLeave={(e) => {
                if (hasChanges && !isSaving && nightMode) {
                  e.currentTarget.style.background = 'rgba(79, 150, 255, 0.85)';
                }
              }}
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Animation Styles */}
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

export default ProfileEditDialog;

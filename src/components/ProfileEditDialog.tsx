import { useState, useRef, useEffect } from 'react';
import { X, Save, User, MapPin, Book } from 'lucide-react';
import ImageUploadButton from './ImageUploadButton';
import { showError } from '../lib/toast';
import { validateProfile, sanitizeInput } from '../lib/inputValidation';

interface FormData {
  displayName: string;
  username: string;
  bio: string;
  location: string;
  avatar: string;
  avatarUrl: string | null;
  testimonyContent: string;
  testimonyLesson: string;
}

interface ProfileEditDialogProps {
  profile: any;
  nightMode: boolean;
  onSave: (formData: any) => Promise<void>;
  onClose: () => void;
}

const ProfileEditDialog: React.FC<ProfileEditDialogProps> = ({ profile, nightMode, onSave, onClose }) => {
  const [formData, setFormData] = useState<FormData>({
    displayName: profile?.displayName || '',
    username: profile?.username || '',
    bio: profile?.bio || '',
    location: profile?.location || '',
    avatar: profile?.avatar || '👤',
    avatarUrl: profile?.avatarImage || null,
    testimonyContent: profile?.testimony || '',
    testimonyLesson: profile?.testimonyLesson || ''
  });

  // Update form data when profile changes to prevent stale data
  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || '',
        username: profile.username || '',
        bio: profile.bio || '',
        location: profile.location || '',
        avatar: profile.avatar || '👤',
        avatarUrl: profile.avatarImage || null,
        testimonyContent: profile.testimony || '',
        testimonyLesson: profile.testimonyLesson || ''
      });
    }
  }, [profile?.displayName, profile?.username, profile?.bio, profile?.location, profile?.avatar, profile?.avatarImage]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Avatar options (emojis)
  const avatarOptions = [
    '👤', '😊', '😎', '🙂', '😇', '🤗', '🥰', '😌',
    '🌟', '⚡', '🔥', '💙', '💜', '🌈', '✨', '🎯',
    '🦁', '🦅', '🐺', '🦋', '🌺', '🌸', '🌻', '🌹'
  ];

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on name input when dialog opens
  useEffect(() => {
    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, []);

  // Track if form has changes
  useEffect(() => {
    const changed =
      formData.displayName.trim() !== (profile?.displayName || '').trim() ||
      formData.username !== profile?.username ||
      formData.bio !== profile?.bio ||
      formData.location !== profile?.location ||
      formData.avatar !== profile?.avatar ||
      formData.avatarUrl !== profile?.avatarImage ||
      formData.testimonyContent !== (profile?.testimony || '') ||
      formData.testimonyLesson !== (profile?.testimonyLesson || '');
    setHasChanges(changed);
  }, [formData, profile]);

  const validateForm = () => {
    // Use comprehensive validation from inputValidation.js
    const validation = validateProfile(formData);

    // Add required field checks
    const newErrors = { ...validation.errors };

    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Name is required';
    } else {
      // Check if name contains only special characters (no letters or numbers)
      const hasLettersOrNumbers = /[a-zA-Z0-9]/.test(formData.displayName.trim());
      if (!hasLettersOrNumbers) {
        newErrors.displayName = 'Name must contain at least one letter or number';
      }
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, underscores, and hyphens';
    }

    if (!formData.bio.trim()) {
      newErrors.bio = 'Bio is required';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      showError('Please fill in all required fields correctly');
      return;
    }

    setIsSaving(true);

    try {
      // Sanitize all text inputs before saving
      const sanitizedData = {
        ...formData,
        displayName: sanitizeInput(formData.displayName),
        username: sanitizeInput(formData.username),
        bio: sanitizeInput(formData.bio),
        location: sanitizeInput(formData.location),
        testimonyContent: sanitizeInput(formData.testimonyContent),
        testimonyLesson: sanitizeInput(formData.testimonyLesson)
      };

      await onSave(sanitizedData);
    } catch (error) {
      console.error('Error saving profile:', error);
      showError(error instanceof Error ? error.message : 'Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Real-time validation for displayName
    if (field === 'displayName') {
      const trimmedValue = (value || '').trim();
      if (!trimmedValue) {
        // Empty field - clear error during typing, will be caught on submit
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      } else if (!/[a-zA-Z0-9]/.test(trimmedValue)) {
        // Only special characters - show error immediately
        setErrors(prev => ({
          ...prev,
          displayName: 'Name must contain at least one letter or number'
        }));
      } else {
        // Valid input - clear error
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    } else {
      // Clear error for other fields when user starts typing
      if (errors[field]) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
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
                      onChange={(e) => {
                        const cleanValue = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
                        handleInputChange('username', cleanValue);
                      }}
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

            {/* Testimony Section - Full Width */}
            {profile?.hasTestimony && (
              <div className="mt-6 pt-6 border-t" style={{ borderColor: nightMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <Book className={`w-5 h-5 ${nightMode ? 'text-slate-100' : 'text-slate-700'}`} />
                  <h3 className={`text-lg font-semibold ${nightMode ? 'text-slate-100' : 'text-slate-900'}`}>
                    Edit Your Testimony
                  </h3>
                </div>

                {/* Testimony Content */}
                <div className="mb-4">
                  <label className={`block text-sm font-medium mb-2 ${nightMode ? 'text-slate-100' : 'text-slate-700'}`}>
                    Testimony
                  </label>
                  <textarea
                    value={formData.testimonyContent}
                    onChange={(e) => handleInputChange('testimonyContent', e.target.value)}
                    placeholder="Share your testimony..."
                    rows={8}
                    className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                      nightMode
                        ? 'bg-white/5 border-white/10 text-slate-100 placeholder-gray-400'
                        : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  />
                  <p className={`text-xs mt-1 ${nightMode ? 'text-slate-100' : 'text-slate-500'}`}>
                    {formData.testimonyContent.length} characters
                  </p>
                </div>

                {/* Lesson Learned */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${nightMode ? 'text-slate-100' : 'text-slate-700'}`}>
                    Lesson Learned
                  </label>
                  <textarea
                    value={formData.testimonyLesson}
                    onChange={(e) => handleInputChange('testimonyLesson', e.target.value)}
                    placeholder="What lesson did you learn from this experience?"
                    rows={4}
                    className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                      nightMode
                        ? 'bg-white/5 border-white/10 text-slate-100 placeholder-gray-400'
                        : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  />
                  <p className={`text-xs mt-1 ${nightMode ? 'text-slate-100' : 'text-slate-500'}`}>
                    {formData.testimonyLesson.length} characters
                  </p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errors.submit && (
              <div className="mt-4 p-3 rounded-lg bg-red-100 border border-red-300">
                <p className="text-red-700 text-sm text-center">{errors.submit}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`p-6 border-t ${nightMode ? 'border-white/10' : 'border-slate-200'}`}>
            {/* Status message */}
            {!hasChanges && Object.keys(errors).length === 0 && (
              <div className={`mb-3 text-sm text-center ${nightMode ? 'text-slate-400' : 'text-slate-500'}`}>
                No changes to save
              </div>
            )}
            {Object.keys(errors).length > 0 && (
              <div className="mb-3 text-sm text-center text-red-500">
                Please fix the errors above before saving
              </div>
            )}
            
            <div className="flex gap-3">
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
                disabled={!hasChanges || isSaving || Object.keys(errors).length > 0}
                className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-white border ${
                  (!hasChanges || isSaving || Object.keys(errors).length > 0)
                    ? 'opacity-50 cursor-not-allowed'
                    : 'opacity-100 cursor-pointer'
                } border-white/20`}
                style={(hasChanges && !isSaving && Object.keys(errors).length === 0) ? {
                  background: nightMode ? 'rgba(79, 150, 255, 0.85)' : 'linear-gradient(135deg, #4faaf8 0%, #3b82f6 50%, #2563eb 100%)',
                  boxShadow: nightMode
                    ? '0 2px 8px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                    : '0 2px 8px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
                } : {
                  background: nightMode ? 'rgba(100, 100, 100, 0.3)' : 'rgba(150, 150, 150, 0.3)',
                  boxShadow: 'none'
                }}
                onMouseEnter={(e) => {
                  if (hasChanges && !isSaving && Object.keys(errors).length === 0) {
                    e.currentTarget.style.background = nightMode ? 'rgba(79, 150, 255, 1.0)' : 'linear-gradient(135deg, #5BA3FF 0%, #4F96FF 50%, #3b82f6 100%)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (hasChanges && !isSaving && Object.keys(errors).length === 0) {
                    e.currentTarget.style.background = nightMode ? 'rgba(79, 150, 255, 0.85)' : 'linear-gradient(135deg, #4faaf8 0%, #3b82f6 50%, #2563eb 100%)';
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

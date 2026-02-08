import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Sparkles, ArrowRight, ArrowLeft, Check, Navigation, Church, Plus, KeyRound, Gift } from 'lucide-react';
import { useGeolocation } from '../hooks/useGeolocation';
import { createChurch, joinChurchByCode, resolveReferralCode } from '../lib/database';

interface FormData {
  displayName: string;
  username: string;
  bio: string;
  location: string;
  avatar: string;
}

interface ProfileCreationWizardProps {
  nightMode: boolean;
  onComplete: (formData: FormData) => Promise<void>;
  onSkip?: () => void;
}

const ProfileCreationWizard: React.FC<ProfileCreationWizardProps> = ({ nightMode, onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    displayName: '',
    username: '', // auto-generated from Clerk, not shown to user
    bio: '', // user can add later in settings
    location: '',
    avatar: '👤' // default, user can change later
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detectedCoords, setDetectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const { detect, isDetecting, error: geoError } = useGeolocation();

  // Referral code state
  const [referralCode, setReferralCode] = useState(() => {
    return localStorage.getItem('lightning_referral_code') || '';
  });
  const [referralValidated, setReferralValidated] = useState<{ username: string } | null>(null);
  const [referralError, setReferralError] = useState('');
  const [isValidatingReferral, setIsValidatingReferral] = useState(false);

  // Church step state
  const [churchMode, setChurchMode] = useState<'choose' | 'join' | 'create'>('choose');
  const [churchInviteCode, setChurchInviteCode] = useState('');
  const [churchName, setChurchName] = useState('');
  const [churchDenomination, setChurchDenomination] = useState('');
  const [churchResult, setChurchResult] = useState<any>(null);
  const [isJoiningChurch, setIsJoiningChurch] = useState(false);
  const [churchError, setChurchError] = useState('');

  const steps = [
    {
      id: 0,
      title: 'Welcome to Lightning',
      subtitle: "Let's create your profile",
      icon: Sparkles,
      fields: ['displayName', 'location']
    },
    {
      id: 1,
      title: 'Join Your Church',
      subtitle: 'Connect with your faith community',
      icon: Church,
      fields: [] // No required fields — can skip
    },
    {
      id: 2,
      title: 'Review Your Profile',
      subtitle: 'Make sure everything looks good',
      icon: Check,
      fields: []
    }
  ];

  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Auto-validate referral code from localStorage on mount only
  const initialReferralCode = useRef(referralCode);
  useEffect(() => {
    const code = initialReferralCode.current;
    if (code) {
      (async () => {
        setIsValidatingReferral(true);
        const referrer = await resolveReferralCode(code);
        if (referrer) {
          setReferralValidated({ username: referrer.username });
        } else {
          setReferralError('Invalid referral code');
        }
        setIsValidatingReferral(false);
      })();
    }
  }, []);

  // Auto-focus on first input when step changes
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentStep]);

  const validateStep = (stepIndex: number) => {
    const newErrors: Record<string, string> = {};
    const step = steps[stepIndex];

    step.fields.forEach(field => {
      if (field === 'displayName' && !formData.displayName.trim()) {
        newErrors.displayName = 'Name is required';
      }
      if (field === 'location' && !formData.location.trim()) {
        newErrors.location = 'Location is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (validateStep(currentStep)) {
      // On step 0, validate referral code if entered but not yet validated
      if (currentStep === 0 && referralCode.trim() && !referralValidated) {
        setIsValidatingReferral(true);
        const referrer = await resolveReferralCode(referralCode);
        setIsValidatingReferral(false);
        if (referrer) {
          setReferralValidated({ username: referrer.username });
          setReferralError('');
        } else {
          setReferralValidated(null);
          setReferralError('Invalid referral code');
          return; // Don't advance — show error
        }
      }
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setErrors({});
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onComplete({ ...formData, _coords: detectedCoords, _churchId: churchResult?.id, _pendingChurch: churchResult?._pendingCreate ? churchResult : undefined, _referralCode: referralValidated ? referralCode : undefined } as any);
      // Don't reset isSubmitting on success — parent will unmount this component
    } catch (error) {
      console.error('Error creating profile:', error);
      setErrors({ submit: 'Failed to create profile. Please try again.' });
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      const { [field]: _, ...remainingErrors } = errors;
      setErrors(remainingErrors);
    }
  };

  const handleJoinChurch = async () => {
    if (!churchInviteCode.trim()) {
      setChurchError('Please enter an invite code');
      return;
    }
    setIsJoiningChurch(true);
    setChurchError('');
    try {
      // We pass a temp userId — the actual join happens after profile creation
      // For now, just validate the code exists
      const { data: church } = await import('../lib/supabase').then(m =>
        (m.supabase as any)?.from('churches').select('*').eq('invite_code', churchInviteCode.trim()).single()
      );
      if (church) {
        setChurchResult(church);
        setChurchMode('choose');
      } else {
        setChurchError('Invalid invite code. Please check and try again.');
      }
    } catch {
      setChurchError('Invalid invite code. Please check and try again.');
    } finally {
      setIsJoiningChurch(false);
    }
  };

  const handleCreateChurch = () => {
    if (!churchName.trim()) {
      setChurchError('Church name is required');
      return;
    }
    setChurchError('');
    // Store the data and create the church after profile is saved
    setChurchResult({ _pendingCreate: true, name: churchName, denomination: churchDenomination });
    setChurchMode('choose');
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${nightMode ? 'text-slate-100' : 'text-slate-700'}`}>
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                type="text"
                value={formData.displayName}
                onChange={(e) => handleInputChange('displayName', e.target.value)}
                placeholder="John Doe"
                maxLength={50}
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
                  maxLength={100}
                  className={`w-full pl-10 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    nightMode
                      ? 'bg-white/5 border-white/10 text-slate-100 placeholder-gray-400'
                      : 'bg-white border-slate-200 text-slate-900'
                  } ${errors.location ? 'border-red-500' : ''}`}
                />
              </div>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const result = await detect();
                    if (result.cityName) {
                      handleInputChange('location', result.cityName);
                    }
                    setDetectedCoords({ lat: result.lat, lng: result.lng });
                  } catch {
                    // Error is already set in the hook
                  }
                }}
                disabled={isDetecting}
                className={`mt-2 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  nightMode
                    ? 'bg-white/5 hover:bg-white/10 text-blue-400 border border-white/10'
                    : 'bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200'
                } ${isDetecting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isDetecting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Detecting location...
                  </>
                ) : (
                  <>
                    <Navigation className="w-4 h-4" />
                    Use my location
                  </>
                )}
              </button>
              {geoError && (
                <p className="text-amber-500 text-xs mt-1">{geoError}</p>
              )}
              {errors.location && (
                <p className="text-red-500 text-xs mt-1">{errors.location}</p>
              )}
            </div>

            {/* Referral Code (optional) */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${nightMode ? 'text-slate-100' : 'text-slate-700'}`}>
                Referral Code <span className={`font-normal text-xs ${nightMode ? 'text-slate-400' : 'text-slate-500'}`}>(optional)</span>
              </label>
              <div className="relative">
                <span className={`absolute left-4 top-1/2 -translate-y-1/2 ${nightMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  <Gift className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => {
                    const val = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '');
                    setReferralCode(val);
                    setReferralValidated(null);
                    setReferralError('');
                  }}
                  onBlur={async () => {
                    if (!referralCode.trim()) {
                      setReferralValidated(null);
                      setReferralError('');
                      return;
                    }
                    setIsValidatingReferral(true);
                    const referrer = await resolveReferralCode(referralCode);
                    if (referrer) {
                      setReferralValidated({ username: referrer.username });
                      setReferralError('');
                    } else {
                      setReferralValidated(null);
                      setReferralError('Invalid referral code');
                    }
                    setIsValidatingReferral(false);
                  }}
                  placeholder="e.g. marcus7291"
                  className={`w-full pl-10 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    nightMode
                      ? 'bg-white/5 border-white/10 text-slate-100 placeholder-gray-400'
                      : 'bg-white border-slate-200 text-slate-900'
                  } ${referralError ? 'border-red-500' : referralValidated ? 'border-green-500' : ''}`}
                />
              </div>
              {isValidatingReferral && (
                <p className={`text-xs mt-1 ${nightMode ? 'text-slate-400' : 'text-slate-500'}`}>Checking code...</p>
              )}
              {referralValidated && (
                <p className="text-green-500 text-xs mt-1">Referred by @{referralValidated.username}</p>
              )}
              {referralError && (
                <p className="text-red-500 text-xs mt-1">{referralError}</p>
              )}
            </div>
          </div>
        );

      // Church step
      case 1:
        return (
          <div className="space-y-4">
            {/* Already joined/created */}
            {churchResult && (
              <div className={`p-4 rounded-xl border ${nightMode ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200'}`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⛪</span>
                  <div className="flex-1">
                    <div className={`font-semibold ${nightMode ? 'text-green-400' : 'text-green-700'}`}>
                      {churchResult._pendingCreate ? 'Creating' : 'Joining'}: {churchResult.name}
                    </div>
                    {churchResult.denomination && (
                      <div className={`text-xs ${nightMode ? 'text-green-400/70' : 'text-green-600'}`}>
                        {churchResult.denomination}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => { setChurchResult(null); setChurchMode('choose'); }}
                    className={`text-xs px-2 py-1 rounded ${nightMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Change
                  </button>
                </div>
              </div>
            )}

            {/* Choice buttons */}
            {!churchResult && churchMode === 'choose' && (
              <>
                <p className={`text-sm text-center ${nightMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Your church is your home community on Lightning. You can always change this later.
                </p>

                <button
                  onClick={() => setChurchMode('join')}
                  className={`w-full p-4 rounded-xl border text-left flex items-center gap-4 transition-colors ${
                    nightMode
                      ? 'bg-white/5 border-white/10 hover:bg-white/10'
                      : 'bg-white border-slate-200 hover:bg-blue-50 hover:border-blue-300'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    nightMode ? 'bg-blue-500/20' : 'bg-blue-100'
                  }`}>
                    <KeyRound className={`w-6 h-6 ${nightMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <div>
                    <div className={`font-semibold ${nightMode ? 'text-slate-100' : 'text-slate-900'}`}>
                      Join a Church
                    </div>
                    <div className={`text-xs ${nightMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Enter an invite code from your church
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setChurchMode('create')}
                  className={`w-full p-4 rounded-xl border text-left flex items-center gap-4 transition-colors ${
                    nightMode
                      ? 'bg-white/5 border-white/10 hover:bg-white/10'
                      : 'bg-white border-slate-200 hover:bg-blue-50 hover:border-blue-300'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    nightMode ? 'bg-purple-500/20' : 'bg-purple-100'
                  }`}>
                    <Plus className={`w-6 h-6 ${nightMode ? 'text-purple-400' : 'text-purple-600'}`} />
                  </div>
                  <div>
                    <div className={`font-semibold ${nightMode ? 'text-slate-100' : 'text-slate-900'}`}>
                      Create a Church
                    </div>
                    <div className={`text-xs ${nightMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Start your church community on Lightning
                    </div>
                  </div>
                </button>

                <p className={`text-xs text-center ${nightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  You can skip this step and join a church later
                </p>
              </>
            )}

            {/* Join form */}
            {!churchResult && churchMode === 'join' && (
              <div className="space-y-3">
                <button
                  onClick={() => { setChurchMode('choose'); setChurchError(''); }}
                  className={`text-sm flex items-center gap-1 ${nightMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>

                <label className={`block text-sm font-medium ${nightMode ? 'text-slate-100' : 'text-slate-700'}`}>
                  Invite Code
                </label>
                <input
                  ref={inputRef as React.RefObject<HTMLInputElement>}
                  type="text"
                  value={churchInviteCode}
                  onChange={(e) => { setChurchInviteCode(e.target.value); setChurchError(''); }}
                  placeholder="Enter 8-character code"
                  maxLength={8}
                  className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg tracking-widest font-mono ${
                    nightMode
                      ? 'bg-white/5 border-white/10 text-slate-100 placeholder-gray-400'
                      : 'bg-white border-slate-200 text-slate-900'
                  } ${churchError ? 'border-red-500' : ''}`}
                />
                {churchError && (
                  <p className="text-red-500 text-xs">{churchError}</p>
                )}
                <button
                  onClick={handleJoinChurch}
                  disabled={isJoiningChurch || !churchInviteCode.trim()}
                  className={`w-full py-3 rounded-lg font-semibold transition-all text-white disabled:opacity-50 ${
                    nightMode ? 'bg-blue-500 hover:bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isJoiningChurch ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Verifying...
                    </span>
                  ) : 'Join Church'}
                </button>
              </div>
            )}

            {/* Create form */}
            {!churchResult && churchMode === 'create' && (
              <div className="space-y-3">
                <button
                  onClick={() => { setChurchMode('choose'); setChurchError(''); }}
                  className={`text-sm flex items-center gap-1 ${nightMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${nightMode ? 'text-slate-100' : 'text-slate-700'}`}>
                    Church Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={inputRef as React.RefObject<HTMLInputElement>}
                    type="text"
                    value={churchName}
                    onChange={(e) => { setChurchName(e.target.value); setChurchError(''); }}
                    placeholder="e.g. Grace Community Church"
                    className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      nightMode
                        ? 'bg-white/5 border-white/10 text-slate-100 placeholder-gray-400'
                        : 'bg-white border-slate-200 text-slate-900'
                    } ${churchError ? 'border-red-500' : ''}`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${nightMode ? 'text-slate-100' : 'text-slate-700'}`}>
                    Denomination <span className={`text-xs ${nightMode ? 'text-slate-500' : 'text-slate-400'}`}>(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={churchDenomination}
                    onChange={(e) => setChurchDenomination(e.target.value)}
                    placeholder="e.g. Non-denominational, Baptist, etc."
                    className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      nightMode
                        ? 'bg-white/5 border-white/10 text-slate-100 placeholder-gray-400'
                        : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                {churchError && (
                  <p className="text-red-500 text-xs">{churchError}</p>
                )}

                <button
                  onClick={handleCreateChurch}
                  disabled={isJoiningChurch || !churchName.trim()}
                  className={`w-full py-3 rounded-lg font-semibold transition-all text-white disabled:opacity-50 ${
                    nightMode ? 'bg-purple-500 hover:bg-purple-400' : 'bg-purple-600 hover:bg-purple-700'
                  }`}
                >
                  {isJoiningChurch ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating...
                    </span>
                  ) : 'Create Church'}
                </button>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className={`p-6 rounded-xl border text-center ${nightMode ? 'bg-white/5 border-white/10' : 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200'}`}>
              <div className="flex flex-col items-center gap-4">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center text-5xl shadow-md border-4 ${nightMode ? 'border-[#0a0a0a] bg-gradient-to-br from-sky-300 via-blue-400 to-blue-500' : 'border-white bg-gradient-to-br from-purple-400 to-pink-400'}`}>
                  👤
                </div>
                <div>
                  <h3 className={`text-xl font-bold ${nightMode ? 'text-slate-100' : 'text-slate-900'}`}>
                    {formData.displayName}
                  </h3>
                </div>
                {churchResult && (
                  <div className={`flex items-center gap-2 text-sm ${nightMode ? 'text-blue-400' : 'text-blue-600'}`}>
                    <span>⛪</span> {churchResult.name}
                  </div>
                )}
                <div className={`flex items-center gap-2 text-sm ${nightMode ? 'text-slate-100' : 'text-slate-600'}`}>
                  <MapPin className="w-4 h-4" />
                  {formData.location}
                </div>
              </div>
            </div>

            <p className={`text-sm text-center ${nightMode ? 'text-slate-400' : 'text-slate-500'}`}>
              After creating your profile, you'll be guided to share your testimony.
            </p>

            {errors.submit && (
              <div className={`p-3 rounded-lg border ${nightMode ? 'bg-red-500/10 border-red-500/30' : 'bg-red-100 border-red-300'}`}>
                <p className={`text-sm text-center ${nightMode ? 'text-red-400' : 'text-red-700'}`}>{errors.submit}</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-50 animate-in fade-in duration-200" />

      {/* Wizard Modal */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4`}
      >
        <div
          className={`w-full max-w-lg rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col ${nightMode ? 'bg-[#0a0a0a]' : 'bg-white'}`}
          style={{
            animation: 'popOut 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            transformOrigin: 'center'
          }}
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
                {React.createElement(steps[currentStep].icon, {
                  className: `w-6 h-6 ${nightMode ? 'text-white' : 'text-blue-600'}`
                })}
                <div>
                  <h2 className={`text-xl font-bold ${nightMode ? 'text-white' : 'text-slate-900'}`}>
                    {steps[currentStep].title}
                  </h2>
                  <p className={`text-sm ${nightMode ? 'text-white/90' : 'text-slate-600'}`}>
                    {steps[currentStep].subtitle}
                  </p>
                </div>
              </div>
              {onSkip && currentStep === 0 && (
                <button
                  onClick={onSkip}
                  className={`text-sm font-medium ${nightMode ? 'text-white/80 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Skip
                </button>
              )}
            </div>

            {/* Progress Bar */}
            <div className="flex gap-1 mt-4">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`flex-1 h-1 rounded-full transition-all ${
                    index <= currentStep
                      ? nightMode ? 'bg-white' : 'bg-blue-600'
                      : nightMode ? 'bg-white/30' : 'bg-slate-300'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {renderStepContent()}
          </div>

          {/* Footer */}
          <div className={`p-6 border-t flex gap-3 ${nightMode ? 'border-white/10' : 'border-slate-200'}`}>
            {currentStep > 0 && (
              <button
                onClick={handleBack}
                disabled={isSubmitting}
                className={`px-4 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 ${
                  nightMode
                    ? 'bg-white/5 hover:bg-white/10 text-slate-100'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}

            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => { handleNext(); }}
                disabled={isValidatingReferral}
                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-slate-100 border border-white/20 disabled:opacity-50`}
                style={{
                  background: nightMode ? 'rgba(79, 150, 255, 0.85)' : 'linear-gradient(135deg, #4faaf8 0%, #3b82f6 50%, #2563eb 100%)',
                  boxShadow: nightMode
                    ? '0 2px 8px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                    : '0 2px 8px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
                }}
                onMouseEnter={(e) => {
                  if (nightMode) {
                    e.currentTarget.style.background = 'rgba(79, 150, 255, 1.0)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (nightMode) {
                    e.currentTarget.style.background = 'rgba(79, 150, 255, 0.85)';
                  }
                }}
              >
                {currentStep === 1 && !churchResult ? 'Skip' : 'Next'}
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-slate-100 border border-white/20 disabled:opacity-50`}
                style={{
                  background: nightMode ? 'rgba(79, 150, 255, 0.85)' : 'linear-gradient(135deg, #4faaf8 0%, #3b82f6 50%, #2563eb 100%)',
                  boxShadow: nightMode
                    ? '0 2px 8px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                    : '0 2px 8px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
                }}
                onMouseEnter={(e) => {
                  if (nightMode && !isSubmitting) {
                    e.currentTarget.style.background = 'rgba(79, 150, 255, 1.0)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (nightMode && !isSubmitting) {
                    e.currentTarget.style.background = 'rgba(79, 150, 255, 0.85)';
                  }
                }}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating Profile...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Create Profile
                  </>
                )}
              </button>
            )}
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

export default ProfileCreationWizard;

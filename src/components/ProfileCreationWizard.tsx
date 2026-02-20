import React, { useState, useRef, useEffect } from "react";
import {
  MapPin,
  ArrowLeft,
  Navigation,
} from "lucide-react";
import { useGeolocation } from "../hooks/useGeolocation";
import {
  resolveReferralCode,
} from "../lib/database";

// ── Inline SVG icons (colorless outline, stroke currentColor) ──────

const BoltIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg viewBox="0 0 24 24" className={className} style={style} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
);

const ChurchIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg viewBox="0 0 24 24" className={className} style={style} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v4" /><path d="M10 4h4" /><path d="M6 12l6-6 6 6" /><path d="M4 22V12h16v10" /><path d="M10 22v-5h4v5" />
  </svg>
);

const ServerIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg viewBox="0 0 24 24" className={className} style={style} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7l5-4 5 4v4" />
  </svg>
);

const PlusCircleIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg viewBox="0 0 24 24" className={className} style={style} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><path d="M12 8v8" /><path d="M8 12h8" />
  </svg>
);

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

const ProfileCreationWizard: React.FC<ProfileCreationWizardProps> = ({
  nightMode,
  onComplete,
  onSkip,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    displayName: "",
    username: "", // auto-generated from Clerk, not shown to user
    bio: "", // user can add later in settings
    location: "",
    avatar: "👤", // default, user can change later
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detectedCoords, setDetectedCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const { detect, isDetecting, error: geoError } = useGeolocation();

  // Referral code state
  const [referralCode, setReferralCode] = useState(() => {
    return localStorage.getItem("lightning_referral_code") || "";
  });
  const [referralValidated, setReferralValidated] = useState<{
    username: string;
  } | null>(null);
  const [referralError, setReferralError] = useState("");
  const [isValidatingReferral, setIsValidatingReferral] = useState(false);

  // Church step state
  const [churchMode, setChurchMode] = useState<"choose" | "join" | "create">(
    "choose",
  );
  const [churchInviteCode, setChurchInviteCode] = useState("");
  const [churchName, setChurchName] = useState("");
  const [churchDenomination, setChurchDenomination] = useState("");
  const [churchResult, setChurchResult] = useState<any>(null);
  const [isJoiningChurch, setIsJoiningChurch] = useState(false);
  const [churchError, setChurchError] = useState("");

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
          setReferralError("Invalid referral code");
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
    if (stepIndex === 0) {
      if (!formData.displayName.trim()) newErrors.displayName = "Name is required";
      if (!formData.location.trim()) newErrors.location = "Location is required";
    }
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
          setReferralError("");
        } else {
          setReferralValidated(null);
          setReferralError("Invalid referral code");
          return; // Don't advance — show error
        }
      }
      if (currentStep < 2) {
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
      await onComplete({
        ...formData,
        _coords: detectedCoords,
        _churchId: churchResult?.id,
        _pendingChurch: churchResult?._pendingCreate ? churchResult : undefined,
        _referralCode: referralValidated ? referralCode : undefined,
      } as any);
      // Don't reset isSubmitting on success — parent will unmount this component
    } catch (error) {
      console.error("Error creating profile:", error);
      setErrors({ submit: "Failed to create profile. Please try again." });
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
      setChurchError("Please enter an invite code");
      return;
    }
    setIsJoiningChurch(true);
    setChurchError("");
    try {
      const { data: church } = await import("../lib/supabase").then((m) =>
        (m.supabase as any)
          ?.from("churches")
          .select("*")
          .eq("invite_code", churchInviteCode.trim())
          .single(),
      );
      if (church) {
        setChurchResult(church);
        setChurchMode("choose");
      } else {
        setChurchError("Invalid invite code. Please check and try again.");
      }
    } catch {
      setChurchError("Invalid invite code. Please check and try again.");
    } finally {
      setIsJoiningChurch(false);
    }
  };

  const handleCreateChurch = () => {
    if (!churchName.trim()) {
      setChurchError("Church name is required");
      return;
    }
    setChurchError("");
    setChurchResult({
      _pendingCreate: true,
      name: churchName,
      denomination: churchDenomination,
    });
    setChurchMode("choose");
  };

  // Deterministic gradient for the review avatar
  const getGradient = (): string => {
    const nm = nightMode;
    return nm
      ? "linear-gradient(135deg, #7b76e0, #9b96f5)"
      : "linear-gradient(135deg, #4facfe, #9b96f5)";
  };

  const previewInitial = formData.displayName.trim()
    ? formData.displayName.trim().charAt(0).toUpperCase()
    : "?";

  // ── Shared input style ──────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    fontFamily: "'General Sans', sans-serif",
    fontSize: "14px",
    background: nightMode ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.6)",
    border: `1px solid ${nightMode ? "rgba(255,255,255,0.06)" : "rgba(150,165,225,0.15)"}`,
    color: nightMode ? "#e8e5f2" : "#1e2b4a",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "12px",
    fontWeight: 600,
    color: nightMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
    marginBottom: "6px",
    display: "block",
  };

  // ── Step 1: Welcome ─────────────────────────────────────────
  const renderStep0 = () => (
    <div className="space-y-4">
      {/* Referral badge (if validated) */}
      {referralValidated && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
          style={{
            background: nightMode ? "rgba(92,200,138,0.08)" : "rgba(92,200,138,0.06)",
            border: `1px solid ${nightMode ? "rgba(92,200,138,0.12)" : "rgba(92,200,138,0.1)"}`,
            color: nightMode ? "#5cc88a" : "#16834a",
          }}
        >
          <span>✓</span> Referred by @{referralValidated.username}
        </div>
      )}

      {/* Full Name */}
      <div>
        <label htmlFor="full-name" style={labelStyle}>
          Full Name <span style={{ color: "#ef4444", fontSize: "10px" }}>*</span>
        </label>
        <input
          id="full-name"
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={formData.displayName}
          onChange={(e) => handleInputChange("displayName", e.target.value)}
          placeholder="John Doe"
          maxLength={50}
          className="w-full px-3.5 py-2.5 rounded-xl"
          style={{
            ...inputStyle,
            borderColor: errors.displayName
              ? "rgba(239,68,68,0.5)"
              : nightMode ? "rgba(255,255,255,0.06)" : "rgba(150,165,225,0.15)",
          }}
        />
        {errors.displayName && (
          <p className="text-xs mt-1" style={{ color: "#ef4444" }}>{errors.displayName}</p>
        )}
      </div>

      {/* Location */}
      <div>
        <label htmlFor="location" style={labelStyle}>
          Location <span style={{ color: "#ef4444", fontSize: "10px" }}>*</span>
        </label>
        <div className="relative">
          <MapPin
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: nightMode ? "#5d5877" : "#8e9ec0" }}
          />
          <input
            id="location"
            type="text"
            value={formData.location}
            onChange={(e) => handleInputChange("location", e.target.value)}
            placeholder="City, State"
            maxLength={100}
            className="w-full pl-10 pr-3.5 py-2.5 rounded-xl"
            style={{
              ...inputStyle,
              borderColor: errors.location
                ? "rgba(239,68,68,0.5)"
                : nightMode ? "rgba(255,255,255,0.06)" : "rgba(150,165,225,0.15)",
            }}
          />
        </div>
        <button
          type="button"
          onClick={async () => {
            try {
              const result = await detect();
              if (result.cityName) {
                handleInputChange("location", result.cityName);
              }
              setDetectedCoords({ lat: result.lat, lng: result.lng });
            } catch {
              // Error is already set in the hook
            }
          }}
          disabled={isDetecting}
          className="mt-1.5 flex items-center gap-1.5 text-xs font-medium"
          style={{
            color: nightMode ? "#7b76e0" : "#2b6cb0",
            opacity: isDetecting ? 0.5 : 1,
            cursor: isDetecting ? "not-allowed" : "pointer",
          }}
        >
          {isDetecting ? (
            <>
              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Detecting...
            </>
          ) : (
            <>
              <Navigation className="w-3 h-3" />
              Use my location
            </>
          )}
        </button>
        {geoError && (
          <p className="text-xs mt-1" style={{ color: "#e8b84a" }}>{geoError}</p>
        )}
        {errors.location && (
          <p className="text-xs mt-1" style={{ color: "#ef4444" }}>{errors.location}</p>
        )}
      </div>

      {/* Referral Code */}
      <div>
        <label htmlFor="referral-code" style={labelStyle}>
          Referral Code{" "}
          <span style={{ opacity: 0.4, fontWeight: 400 }}>(optional)</span>
        </label>
        <input
          id="referral-code"
          type="text"
          value={referralCode}
          onChange={(e) => {
            const val = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "");
            setReferralCode(val);
            setReferralValidated(null);
            setReferralError("");
          }}
          onBlur={async () => {
            if (!referralCode.trim()) {
              setReferralValidated(null);
              setReferralError("");
              return;
            }
            setIsValidatingReferral(true);
            const referrer = await resolveReferralCode(referralCode);
            if (referrer) {
              setReferralValidated({ username: referrer.username });
              setReferralError("");
            } else {
              setReferralValidated(null);
              setReferralError("Invalid referral code");
            }
            setIsValidatingReferral(false);
          }}
          placeholder="e.g. marcus7291"
          className="w-full px-3.5 py-2.5 rounded-xl"
          style={{
            ...inputStyle,
            borderColor: referralError
              ? "rgba(239,68,68,0.5)"
              : referralValidated
                ? "rgba(92,200,138,0.5)"
                : nightMode ? "rgba(255,255,255,0.06)" : "rgba(150,165,225,0.15)",
          }}
        />
        {isValidatingReferral && (
          <p className="text-xs mt-1" style={{ color: nightMode ? "#8e89a8" : "#4a5e88" }}>
            Checking code...
          </p>
        )}
        {referralError && (
          <p className="text-xs mt-1" style={{ color: "#ef4444" }}>{referralError}</p>
        )}
      </div>
    </div>
  );

  // ── Step 2: Community ───────────────────────────────────────
  const renderStep1 = () => (
    <div className="space-y-3">
      {/* Already joined/created */}
      {churchResult && (
        <div
          className="p-3 rounded-xl flex items-center gap-3"
          style={{
            background: nightMode ? "rgba(92,200,138,0.08)" : "rgba(92,200,138,0.06)",
            border: `1px solid ${nightMode ? "rgba(92,200,138,0.15)" : "rgba(92,200,138,0.12)"}`,
          }}
        >
          <span className="text-lg">⛪</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold" style={{ color: nightMode ? "#5cc88a" : "#16834a" }}>
              {churchResult._pendingCreate ? "Creating" : "Joining"}: {churchResult.name}
            </div>
            {churchResult.denomination && (
              <div className="text-xs" style={{ color: nightMode ? "rgba(92,200,138,0.7)" : "#16834a", opacity: 0.7 }}>
                {churchResult.denomination}
              </div>
            )}
          </div>
          <button
            onClick={() => { setChurchResult(null); setChurchMode("choose"); }}
            className="text-xs px-2 py-1 rounded"
            style={{ color: nightMode ? "#5d5877" : "#8e9ec0" }}
          >
            Change
          </button>
        </div>
      )}

      {/* Choice options */}
      {!churchResult && churchMode === "choose" && (
        <div className="space-y-3">
          {/* Join a Server */}
          <button
            onClick={() => setChurchMode("join")}
            className="w-full p-3 rounded-xl text-left flex items-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99]"
            style={{
              background: nightMode ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.5)",
              border: `1px solid ${nightMode ? "rgba(255,255,255,0.06)" : "rgba(150,165,225,0.15)"}`,
              ...(nightMode ? {} : { backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }),
            }}
          >
            <ServerIcon className="w-5 h-5" style={{ color: nightMode ? "#8e89a8" : "#4a5e88" }} />
            <div className="flex-1">
              <div className="text-sm font-semibold" style={{ color: nightMode ? "#e8e5f2" : "#1e2b4a" }}>
                Join a Server
              </div>
              <div className="text-[11px]" style={{ color: nightMode ? "#5d5877" : "#8e9ec0" }}>
                Enter invite code from your community
              </div>
            </div>
            <span style={{ color: nightMode ? "#5d5877" : "#8e9ec0", opacity: 0.4, fontSize: "18px" }}>›</span>
          </button>

          {/* Start a Server */}
          <button
            onClick={() => setChurchMode("create")}
            className="w-full p-3 rounded-xl text-left flex items-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99]"
            style={{
              background: nightMode ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.5)",
              border: `1px solid ${nightMode ? "rgba(255,255,255,0.06)" : "rgba(150,165,225,0.15)"}`,
              ...(nightMode ? {} : { backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }),
            }}
          >
            <PlusCircleIcon className="w-5 h-5" style={{ color: nightMode ? "#8e89a8" : "#4a5e88" }} />
            <div className="flex-1">
              <div className="text-sm font-semibold" style={{ color: nightMode ? "#e8e5f2" : "#1e2b4a" }}>
                Start a Server
              </div>
              <div className="text-[11px]" style={{ color: nightMode ? "#5d5877" : "#8e9ec0" }}>
                Start your community on Lightning
              </div>
            </div>
            <span style={{ color: nightMode ? "#5d5877" : "#8e9ec0", opacity: 0.4, fontSize: "18px" }}>›</span>
          </button>
        </div>
      )}

      {/* Join form */}
      {!churchResult && churchMode === "join" && (
        <div className="space-y-3">
          <button
            onClick={() => { setChurchMode("choose"); setChurchError(""); }}
            className="text-xs flex items-center gap-1"
            style={{ color: nightMode ? "#8e89a8" : "#4a5e88" }}
          >
            <ArrowLeft className="w-3 h-3" /> Back
          </button>
          <label htmlFor="invite-code" style={labelStyle}>Invite Code</label>
          <input
            id="invite-code"
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={churchInviteCode}
            onChange={(e) => { setChurchInviteCode(e.target.value); setChurchError(""); }}
            placeholder="Enter 8-character code"
            maxLength={8}
            className="w-full px-3.5 py-2.5 rounded-xl text-center text-lg tracking-widest font-mono"
            style={{
              ...inputStyle,
              borderColor: churchError
                ? "rgba(239,68,68,0.5)"
                : nightMode ? "rgba(255,255,255,0.06)" : "rgba(150,165,225,0.15)",
            }}
          />
          {churchError && <p className="text-xs" style={{ color: "#ef4444" }}>{churchError}</p>}
          <button
            onClick={handleJoinChurch}
            disabled={isJoiningChurch || !churchInviteCode.trim()}
            className="w-full py-2.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40"
            style={{
              background: nightMode
                ? "linear-gradient(135deg, #7b76e0, #9b96f5)"
                : "linear-gradient(135deg, #4facfe, #3b82f6)",
              boxShadow: nightMode
                ? "0 4px 12px rgba(123,118,224,0.25)"
                : "0 4px 12px rgba(79,172,254,0.25)",
            }}
          >
            {isJoiningChurch ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Verifying...
              </span>
            ) : "Join Server"}
          </button>
        </div>
      )}

      {/* Create form */}
      {!churchResult && churchMode === "create" && (
        <div className="space-y-3">
          <button
            onClick={() => { setChurchMode("choose"); setChurchError(""); }}
            className="text-xs flex items-center gap-1"
            style={{ color: nightMode ? "#8e89a8" : "#4a5e88" }}
          >
            <ArrowLeft className="w-3 h-3" /> Back
          </button>
          <div>
            <label htmlFor="church-name" style={labelStyle}>
              Server Name <span style={{ color: "#ef4444", fontSize: "10px" }}>*</span>
            </label>
            <input
              id="church-name"
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="text"
              value={churchName}
              onChange={(e) => { setChurchName(e.target.value); setChurchError(""); }}
              placeholder="e.g. Grace Community Church"
              className="w-full px-3.5 py-2.5 rounded-xl"
              style={{
                ...inputStyle,
                borderColor: churchError
                  ? "rgba(239,68,68,0.5)"
                  : nightMode ? "rgba(255,255,255,0.06)" : "rgba(150,165,225,0.15)",
              }}
            />
          </div>
          <div>
            <label htmlFor="church-denomination" style={labelStyle}>
              Denomination <span style={{ opacity: 0.4, fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              id="church-denomination"
              type="text"
              value={churchDenomination}
              onChange={(e) => setChurchDenomination(e.target.value)}
              placeholder="e.g. Non-denominational, Baptist, etc."
              className="w-full px-3.5 py-2.5 rounded-xl"
              style={inputStyle}
            />
          </div>
          {churchError && <p className="text-xs" style={{ color: "#ef4444" }}>{churchError}</p>}
          <button
            onClick={handleCreateChurch}
            disabled={isJoiningChurch || !churchName.trim()}
            className="w-full py-2.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40"
            style={{
              background: nightMode
                ? "linear-gradient(135deg, #7b76e0, #9b96f5)"
                : "linear-gradient(135deg, #4facfe, #3b82f6)",
              boxShadow: nightMode
                ? "0 4px 12px rgba(123,118,224,0.25)"
                : "0 4px 12px rgba(79,172,254,0.25)",
            }}
          >
            {isJoiningChurch ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating...
              </span>
            ) : "Create Server"}
          </button>
        </div>
      )}
    </div>
  );

  // ── Step 3: Boom ────────────────────────────────────────────
  const renderStep2 = () => (
    <div className="space-y-4">
      {/* Review card */}
      <div
        className="rounded-xl p-5 text-center"
        style={{
          background: nightMode ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.5)",
          border: `1px solid ${nightMode ? "rgba(255,255,255,0.06)" : "rgba(150,165,225,0.15)"}`,
          ...(nightMode ? {} : { backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }),
        }}
      >
        {/* Letter + gradient avatar */}
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-xl text-white mx-auto mb-3"
          style={{
            background: getGradient(),
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 700,
          }}
        >
          {previewInitial}
        </div>
        <div
          className="text-base font-semibold mb-1"
          style={{ color: nightMode ? "#e8e5f2" : "#1e2b4a" }}
        >
          {formData.displayName || "Your Name"}
        </div>
        {formData.location && (
          <div
            className="text-xs mb-2"
            style={{ color: nightMode ? "#5d5877" : "#8e9ec0" }}
          >
            📍 {formData.location}
          </div>
        )}
        {churchResult && (
          <div
            className="inline-block px-3 py-1 rounded-lg text-xs font-medium"
            style={{
              background: nightMode ? "rgba(123,118,224,0.1)" : "rgba(79,172,254,0.1)",
              color: nightMode ? "#9b96f5" : "#2b6cb0",
            }}
          >
            {churchResult.name}
          </div>
        )}
      </div>

      {/* Helper text */}
      <p
        className="text-xs text-center leading-relaxed"
        style={{ color: nightMode ? "#5d5877" : "#8e9ec0", opacity: 0.7 }}
      >
        After creating your profile, you'll be guided to share your testimony.
      </p>

      {errors.submit && (
        <div
          className="p-3 rounded-xl"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
          }}
        >
          <p className="text-sm text-center" style={{ color: "#ef4444" }}>{errors.submit}</p>
        </div>
      )}
    </div>
  );

  // Step configs for hero section
  const stepConfigs = [
    {
      icon: <BoltIcon className="w-6 h-6" />,
      title: "Welcome to Lightning",
      subtitle: "Let's create your profile",
      subtitleIsVerse: false,
    },
    {
      icon: <ChurchIcon className="w-6 h-6" />,
      title: "Find your Community",
      subtitle: "Connect with others",
      subtitleIsVerse: false,
    },
    {
      icon: <BoltIcon className="w-6 h-6" />,
      title: "Boom",
      subtitle: "His lightning lights up the world; the earth sees and trembles. — Psalm 97:4",
      subtitleIsVerse: true,
    },
  ];

  const cfg = stepConfigs[currentStep];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-50 animate-in fade-in duration-200" />

      {/* Wizard Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-md rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
          style={{
            background: nightMode
              ? "#0d0b18"
              : "linear-gradient(135deg, #cdd8f8 0%, #d6daf5 40%, #dee0f6 70%, #e4e0f5 100%)",
            border: `1px solid ${nightMode ? "rgba(255,255,255,0.06)" : "rgba(150,165,225,0.15)"}`,
            animation: "popOut 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          }}
        >
          {/* Progress dots */}
          <div className="flex gap-1.5 justify-center px-6 pt-5 pb-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-2 rounded-full transition-all"
                style={{
                  width: i === currentStep ? "20px" : "8px",
                  background: i < currentStep
                    ? (nightMode ? "#7b76e0" : "#4facfe")
                    : i === currentStep
                      ? (nightMode ? "#7b76e0" : "#4facfe")
                      : (nightMode ? "rgba(255,255,255,0.08)" : "rgba(150,165,225,0.15)"),
                }}
              />
            ))}
          </div>

          {/* Hero */}
          <div className="text-center px-6 pb-3">
            <div className="mx-auto mb-1 w-7 h-7" style={{ color: nightMode ? "#8e89a8" : "#4a5e88" }}>
              {cfg.icon}
            </div>
            <h2
              className="text-lg font-semibold"
              style={{ fontFamily: "'DM Sans', sans-serif", color: nightMode ? "#e8e5f2" : "#1e2b4a" }}
            >
              {cfg.title}
            </h2>
            {cfg.subtitleIsVerse ? (
              <p
                className="text-xs mt-1 max-w-[240px] mx-auto leading-relaxed"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontStyle: "italic",
                  color: nightMode ? "#9b96f5" : "#4a5e88",
                }}
              >
                {cfg.subtitle}
              </p>
            ) : (
              <p className="text-xs mt-0.5" style={{ color: nightMode ? "#5d5877" : "#8e9ec0" }}>
                {cfg.subtitle}
              </p>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 pb-4">
            {currentStep === 0 && renderStep0()}
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
          </div>

          {/* Footer */}
          <div
            className="px-6 pb-5 pt-2"
            style={{ borderTop: `1px solid ${nightMode ? "rgba(255,255,255,0.06)" : "rgba(150,165,225,0.15)"}` }}
          >
            {currentStep < 2 ? (
              <>
                <div className="flex gap-2">
                  {currentStep > 0 && (
                    <button
                      onClick={handleBack}
                      className="px-4 py-2.5 rounded-xl font-semibold text-sm transition-all flex-1"
                      style={{
                        background: "transparent",
                        border: `1px solid ${nightMode ? "rgba(255,255,255,0.08)" : "rgba(150,165,225,0.15)"}`,
                        color: nightMode ? "#8e89a8" : "#4a5e88",
                      }}
                    >
                      Previous
                    </button>
                  )}
                  <button
                    onClick={handleNext}
                    disabled={isValidatingReferral}
                    className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40"
                    style={{
                      background: nightMode
                        ? "linear-gradient(135deg, #7b76e0, #9b96f5)"
                        : "linear-gradient(135deg, #4facfe, #3b82f6)",
                      boxShadow: nightMode
                        ? "0 4px 12px rgba(123,118,224,0.25)"
                        : "0 4px 12px rgba(79,172,254,0.25)",
                    }}
                  >
                    Next
                  </button>
                </div>
                {currentStep === 1 && !churchResult && (
                  <button
                    onClick={handleNext}
                    className="w-full text-center text-xs font-medium mt-2 py-1"
                    style={{ color: nightMode ? "#5d5877" : "#8e9ec0" }}
                  >
                    Skip for now
                  </button>
                )}
              </>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleBack}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
                  style={{
                    background: "transparent",
                    border: `1px solid ${nightMode ? "rgba(255,255,255,0.08)" : "rgba(150,165,225,0.15)"}`,
                    color: nightMode ? "#8e89a8" : "#4a5e88",
                  }}
                >
                  Previous
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{
                    background: nightMode
                      ? "linear-gradient(135deg, #7b76e0, #9b96f5)"
                      : "linear-gradient(135deg, #4facfe, #3b82f6)",
                    boxShadow: nightMode
                      ? "0 4px 12px rgba(123,118,224,0.25)"
                      : "0 4px 12px rgba(79,172,254,0.25)",
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Enter Lightning ⚡"
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Animation */}
      <style>{`
        @keyframes popOut {
          0% { transform: scale(0.9); opacity: 0; }
          60% { transform: scale(1.02); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  );
};

export default ProfileCreationWizard;

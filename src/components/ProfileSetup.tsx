import React, { useState, useRef, useEffect } from "react";
import { Camera } from "lucide-react";
import { EXIT_WARNING_MSG } from '../hooks/useOnboardingGuard';

interface ProfileSetupProps {
  nightMode: boolean;
  onComplete: (formData: any) => Promise<void>;
  onSkip?: () => void;
}

declare global {
  interface Window {
    cloudinary: any;
  }
}

const ProfileSetup: React.FC<ProfileSetupProps> = ({ nightMode, onComplete, onSkip }) => {
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const cloudinaryRef = useRef<any>(null);
  const widgetRef = useRef<any>(null);
  const BIO_MAX = 120;
  const nm = nightMode;

  // Load Cloudinary widget script
  useEffect(() => {
    if (window.cloudinary) {
      cloudinaryRef.current = window.cloudinary;
      return;
    }
    const script = document.createElement("script");
    script.src = "https://upload-widget.cloudinary.com/global/all.js";
    script.onload = () => { cloudinaryRef.current = window.cloudinary; };
    document.body.appendChild(script);
  }, []);

  // Intercept browser back button
  useEffect(() => {
    window.history.pushState({ profileSetup: true }, "");
    const handlePop = () => { setShowExitWarning(true); };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  // Intercept page close / tab close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = EXIT_WARNING_MSG;
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const openPhotoUpload = () => {
    if (!cloudinaryRef.current) return;
    if (widgetRef.current) { widgetRef.current.open(); return; }
    widgetRef.current = cloudinaryRef.current.createUploadWidget(
      {
        cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
        uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
        sources: ["local", "camera"],
        cropping: true,
        croppingAspectRatio: 1,
        croppingDefaultSelectionRatio: 0.9,
        showSkipCropButton: false,
        multiple: false,
        maxFiles: 1,
        resourceType: "image",
      },
      (error: any, result: any) => {
        if (!error && result && result.event === "success") {
          setPhotoUrl(result.info.secure_url);
          setErrors((prev) => { const { photo: _, ...rest } = prev; return rest; });
        }
      }
    );
    widgetRef.current.open();
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!displayName.trim()) newErrors.displayName = "Display name is required.";
    if (!bio.trim()) newErrors.bio = "Bio is required.";
    else if (bio.length > BIO_MAX) newErrors.bio = `Bio must be ${BIO_MAX} characters or fewer.`;
    if (!photoUrl) newErrors.photo = "Please add a profile photo.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await onComplete({
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatarUrl: photoUrl,
      });
    } catch (e) {
      setErrors((prev) => ({ ...prev, submit: "Something went wrong. Please try again." }));
      setIsSubmitting(false);
    }
  };

  const handleLeaveAnyway = () => {
    setShowExitWarning(false);
    window.history.back();
    if (onSkip) onSkip();
  };

  // Styles
  const nm_bg = nm ? "#1a1730" : "#ffffff";
  const nm_border = nm ? "rgba(255,255,255,0.08)" : "rgba(150,165,225,0.25)";
  const nm_text = nm ? "#e8e6ff" : "#1a1a2e";
  const nm_sub = nm ? "rgba(232,230,255,0.55)" : "rgba(26,26,46,0.55)";
  const bg = nm
    ? "linear-gradient(135deg,rgba(123,118,224,0.9),rgba(79,172,254,0.85))"
    : "linear-gradient(135deg,#7b76e0,#4facfe)";
  const sh = nm ? "0 24px 64px rgba(0,0,0,0.65)" : "0 24px 64px rgba(123,118,224,0.25)";

  const inputS: React.CSSProperties = {
    width: "100%",
    padding: "11px 14px",
    borderRadius: 12,
    background: nm ? "rgba(255,255,255,0.05)" : "rgba(123,118,224,0.06)",
    color: nm_text,
    fontSize: 15,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
    transition: "border 0.2s",
  };

  const lbl: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: nm_sub,
    marginBottom: 6,
  };

  const err: React.CSSProperties = {
    margin: "4px 0 0",
    fontSize: 12,
    color: "#ef4444",
  };

  const bioOver = bio.length >= BIO_MAX;
  const bioWarn = bio.length >= Math.floor(BIO_MAX * 0.85);

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.65)",
          zIndex: 50,
          animation: "popOut 0.25s ease",
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 51,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 440,
            borderRadius: 22,
            background: nm_bg,
            boxShadow: sh,
            display: "flex",
            flexDirection: "column",
            maxHeight: "90vh",
            overflow: "hidden",
            animation: "popOut 0.28s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "22px 24px 16px",
              borderBottom: `1px solid ${nm_border}`,
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 22 }}>⚡</span>
              <h2
                style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 700,
                  color: nm_text,
                }}
              >
                Set Up Your Profile
              </h2>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: nm_sub }}>
              Tell the community a little about yourself.
            </p>
          </div>

          {/* Scrollable body */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px 12px" }}>
            {/* Photo upload */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 22 }}>
              <button
                type="button"
                onClick={openPhotoUpload}
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: "50%",
                  border: `2px dashed ${errors.photo ? "rgba(239,68,68,0.6)" : nm_border}`,
                  background: nm ? "rgba(255,255,255,0.04)" : "rgba(123,118,224,0.07)",
                  cursor: "pointer",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                  position: "relative",
                }}
                aria-label="Upload profile photo"
              >
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Profile"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <Camera size={28} color={nm ? "rgba(232,230,255,0.4)" : "rgba(123,118,224,0.5)"} />
                )}
              </button>
              <span
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  color: errors.photo ? "#ef4444" : nm_sub,
                }}
              >
                {errors.photo ? errors.photo : photoUrl ? "Tap to change photo" : "Tap to add photo *"}
              </span>
            </div>

            {/* Display Name */}
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>
                Display Name{" "}
                <span style={{ color: "#ef4444", fontSize: 10 }}>*</span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  if (errors.displayName)
                    setErrors((p) => {
                      const { displayName: _, ...r } = p;
                      return r;
                    });
                }}
                placeholder="Your name"
                maxLength={50}
                style={{
                  ...inputS,
                  border: `1px solid ${
                    errors.displayName ? "rgba(239,68,68,0.55)" : nm_border
                  }`,
                }}
              />
              {errors.displayName && <p style={err}>{errors.displayName}</p>}
            </div>

            {/* Bio */}
            <div style={{ marginBottom: 8 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: 6,
                }}
              >
                <label style={{ ...lbl, marginBottom: 0 }}>
                  Bio <span style={{ color: "#ef4444", fontSize: 10 }}>*</span>
                </label>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: bioOver
                      ? "#ef4444"
                      : bioWarn
                      ? "#f59e0b"
                      : nm_sub,
                  }}
                >
                  {bio.length}/{BIO_MAX}
                </span>
              </div>
              <textarea
                value={bio}
                onChange={(e) => {
                  if (e.target.value.length <= BIO_MAX) {
                    setBio(e.target.value);
                    if (errors.bio)
                      setErrors((p) => {
                        const { bio: _, ...r } = p;
                        return r;
                      });
                  }
                }}
                rows={3}
                placeholder="Share a little about your faith journey…"
                style={{
                  ...inputS,
                  resize: "none",
                  border: `1px solid ${
                    errors.bio ? "rgba(239,68,68,0.55)" : nm_border
                  }`,
                }}
              />
              {errors.bio && <p style={err}>{errors.bio}</p>}
            </div>

            {/* Submit error */}
            {errors.submit && (
              <div
                style={{
                  marginTop: 8,
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  color: "#ef4444",
                  fontSize: 13,
                }}
              >
                {errors.submit}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "14px 24px 26px",
              borderTop: `1px solid ${nm_border}`,
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={{
                width: "100%",
                padding: "14px 0",
                borderRadius: 14,
                border: "none",
                background: isSubmitting ? (nm ? "rgba(123,118,224,0.4)" : "rgba(123,118,224,0.35)") : bg,
                color: "#ffffff",
                fontSize: 16,
                fontWeight: 700,
                cursor: isSubmitting ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                letterSpacing: "0.02em",
                transition: "opacity 0.2s",
              }}
            >
              {isSubmitting ? (
                <>
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      border: "2.5px solid rgba(255,255,255,0.35)",
                      borderTopColor: "#fff",
                      display: "inline-block",
                      animation: "spin 0.7s linear infinite",
                    }}
                  />
                  Setting up…
                </>
              ) : (
                "Complete Profile"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Exit warning dialog */}
      {showExitWarning && (
        <>
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 200,
            }}
            onClick={() => setShowExitWarning(false)}
          />
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              zIndex: 201,
              width: "calc(100% - 48px)",
              maxWidth: 340,
              borderRadius: 20,
              background: nm ? "#1a1730" : "#ffffff",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
              padding: "28px 24px 24px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 10 }}>⚡</div>
            <h3
              style={{
                margin: "0 0 8px",
                fontSize: 18,
                fontWeight: 700,
                color: nm_text,
              }}
            >
              Your testimony is ready
            </h3>
            <p
              style={{
                margin: "0 0 22px",
                fontSize: 14,
                color: nm_sub,
                lineHeight: 1.5,
              }}
            >
              Leave now and everything will be lost.
            </p>
            <button
              type="button"
              onClick={() => setShowExitWarning(false)}
              style={{
                width: "100%",
                padding: "13px 0",
                borderRadius: 12,
                border: "none",
                background: bg,
                color: "#fff",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                marginBottom: 10,
              }}
            >
              Stay
            </button>
            <button
              type="button"
              onClick={handleLeaveAnyway}
              style={{
                width: "100%",
                padding: "13px 0",
                borderRadius: 12,
                border: `1px solid ${nm_border}`,
                background: "transparent",
                color: nm_sub,
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Leave anyway
            </button>
          </div>
        </>
      )}

      <style>{`
        @keyframes popOut {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};

export default ProfileSetup;

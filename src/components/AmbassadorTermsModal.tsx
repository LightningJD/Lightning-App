import React, { useEffect, useCallback } from "react";
import { X, Shield } from "lucide-react";

interface AmbassadorTermsModalProps {
  nightMode: boolean;
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

const AmbassadorTermsModal: React.FC<AmbassadorTermsModalProps> = ({
  nightMode,
  isOpen,
  onClose,
  onAccept,
}) => {
  // Escape key to close
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <button
      type="button"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        background: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <div
        className="w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
        style={{
          background: nightMode
            ? "rgba(15, 15, 25, 0.95)"
            : "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(30px)",
          WebkitBackdropFilter: "blur(30px)",
          border: `1px solid ${nightMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
          maxHeight: "80vh",
        }}
      >
        {/* Header */}
        <div
          className="p-6 pb-4"
          style={{
            background:
              "linear-gradient(135deg, rgba(79, 150, 255, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield
                className={`w-5 h-5 ${nightMode ? "text-blue-400" : "text-blue-600"}`}
              />
              <h2
                className={`text-lg font-bold ${nightMode ? "text-white" : "text-black"}`}
              >
                Ambassador Program
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className={`p-1.5 rounded-xl transition-all hover:scale-110 active:scale-95 ${
                nightMode
                  ? "hover:bg-white/10 text-white/50"
                  : "hover:bg-black/5 text-black/50"
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Terms */}
        <div className="p-6 pt-4 overflow-y-auto" style={{ maxHeight: "50vh" }}>
          <div
            className={`space-y-4 text-sm ${nightMode ? "text-white/70" : "text-black/70"}`}
          >
            <p
              className={`font-semibold ${nightMode ? "text-white" : "text-black"}`}
            >
              By participating in the Lightning Ambassador Program, you agree
              to:
            </p>

            <div className="space-y-3">
              <div className="flex gap-2">
                <span>1.</span>
                <p>
                  <strong>Genuine Invitations:</strong> Only share your referral
                  code with real people you personally know or have connected
                  with. Mass distribution or spam is prohibited.
                </p>
              </div>

              <div className="flex gap-2">
                <span>2.</span>
                <p>
                  <strong>No Fake Accounts:</strong> Creating multiple accounts
                  or encouraging others to create accounts solely for referral
                  points is strictly forbidden.
                </p>
              </div>

              <div className="flex gap-2">
                <span>3.</span>
                <p>
                  <strong>Authentic Community:</strong> Your referrals should be
                  people genuinely interested in joining the Lightning community
                  and sharing their faith journey.
                </p>
              </div>

              <div className="flex gap-2">
                <span>4.</span>
                <p>
                  <strong>Fair Play:</strong> Any manipulation of the points
                  system (automated signups, device tricks, etc.) will result in
                  account flagging and point removal.
                </p>
              </div>

              <div className="flex gap-2">
                <span>5.</span>
                <p>
                  <strong>Blessing Points Reset:</strong> Blessing Points (BP)
                  reset every 2 weeks. Overall Points (OP) are permanent and
                  reflect your lifetime contributions.
                </p>
              </div>
            </div>

            <p
              className={`text-xs mt-4 ${nightMode ? "text-white/40" : "text-black/40"}`}
            >
              Lightning reserves the right to modify these terms, reset points,
              or revoke ambassador status at any time.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 pt-2 space-y-3">
          <button
            type="button"
            onClick={onAccept}
            className="w-full py-3.5 rounded-xl text-white font-bold transition-all active:scale-95 hover:scale-[1.02]"
            style={{
              background:
                "linear-gradient(135deg, #4F96FF 0%, #3b82f6 50%, #2563eb 100%)",
              boxShadow: "0 4px 16px rgba(59, 130, 246, 0.35)",
            }}
          >
            I Agree — Let's Go!
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`w-full py-3 rounded-xl font-medium transition-all active:scale-95 ${
              nightMode
                ? "text-white/50 hover:bg-white/5"
                : "text-black/50 hover:bg-black/5"
            }`}
          >
            Not Now
          </button>
        </div>
      </div>
    </button>
  );
};

export default AmbassadorTermsModal;

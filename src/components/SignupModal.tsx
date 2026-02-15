import React from "react";
import { X } from "lucide-react";
import { SignIn } from "@clerk/clerk-react";

interface SignupModalProps {
  version?: 1 | 2;
  onDismiss?: () => void;
  nightMode: boolean;
}

const SignupModal: React.FC<SignupModalProps> = ({
  version = 1,
  onDismiss,
  nightMode,
}) => {
  // Modal content based on version
  const modalContent = {
    1: {
      // Soft block - can dismiss
      emoji: "✨",
      title: "Experience the Full Community",
      subtitle: "You've viewed your free testimonies.",
      benefits: [
        "Read unlimited testimonies",
        "Connect with believers nearby",
        "Share your own story",
        "Message friends and join groups",
      ],
      dismissText: "Continue as Guest",
      canDismiss: true,
      blurIntensity: "blur(5px)",
    },
    2: {
      // Hard block - cannot dismiss
      emoji: "⛔",
      title: "Join Lightning to Continue",
      subtitle: "Create your free account to keep exploring",
      benefits: [
        "Read all testimonies",
        "Share your story with the community",
        "Message nearby believers",
        "Join groups and build connections",
      ],
      dismissText: null,
      canDismiss: false,
      blurIntensity: "blur(10px)",
    },
  };

  const content = modalContent[version] || modalContent[1];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50 animate-in fade-in duration-300"
        style={{
          backdropFilter: content.blurIntensity,
          WebkitBackdropFilter: content.blurIntensity,
        }}
        role="presentation"
        onClick={content.canDismiss && onDismiss ? onDismiss : undefined}
      />

      {/* Modal */}
      <div
        className={`fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto z-50 rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 ${
          nightMode
            ? "bg-[#0a0a0a]"
            : "bg-gradient-to-b from-purple-50 via-blue-50 to-pink-50"
        }`}
        role="presentation"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button (only for version 1) */}
        {content.canDismiss && onDismiss && (
          <button
            onClick={onDismiss}
            className={`absolute top-4 right-4 p-2 rounded-lg transition-colors z-10 ${
              nightMode
                ? "hover:bg-white/10 text-slate-100"
                : "hover:bg-white/30 text-black"
            }`}
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="p-8 text-center">
          {/* Icon */}
          <div className="text-6xl mb-4">{content.emoji}</div>

          {/* Title */}
          <h2
            className={`text-2xl font-bold mb-2 ${nightMode ? "text-slate-100" : "text-black"}`}
          >
            {content.title}
          </h2>

          {/* Subtitle */}
          <p
            className={`text-sm mb-6 ${nightMode ? "text-slate-100/80" : "text-black/70"}`}
          >
            {content.subtitle}
          </p>

          {/* Benefits */}
          <div
            className={`rounded-xl p-4 mb-6 text-left ${
              nightMode ? "bg-white/5" : "bg-white/40"
            }`}
          >
            <ul className="space-y-2">
              {content.benefits.map((benefit, i) => (
                <li
                  key={i}
                  className={`flex items-center gap-2 text-sm ${
                    nightMode ? "text-slate-100" : "text-black"
                  }`}
                >
                  <span className="text-blue-500 font-bold">✓</span>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          {/* Sign Up Buttons */}
          <div className="space-y-3">
            {/* Primary: Sign Up with Google */}
            <SignIn
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "shadow-none bg-transparent w-full",
                  footer: "hidden",
                },
              }}
              routing="hash"
            />

            {/* Secondary: Dismiss (only for version 1) */}
            {content.canDismiss && onDismiss && (
              <button
                onClick={onDismiss}
                className={`w-full text-sm py-2 rounded-lg transition-colors ${
                  nightMode
                    ? "text-slate-100/60 hover:text-slate-100/80 hover:bg-white/5"
                    : "text-black/60 hover:text-black/80 hover:bg-white/30"
                }`}
              >
                {content.dismissText}
              </button>
            )}

            {/* Version indicator (for hard block) */}
            {!content.canDismiss && (
              <p
                className={`text-xs mt-4 ${nightMode ? "text-slate-100/50" : "text-black/50"}`}
              >
                Sign up is free and takes less than 30 seconds
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default SignupModal;

import React, { useState } from "react";
import { X, Copy, Check, Link2, MessageCircle } from "lucide-react";

interface TestimonyShareModalProps {
  nightMode: boolean;
  isOpen: boolean;
  onClose: () => void;
  testimonyId: string;
  testimonyText: string;
  profileName: string;
}

const TestimonyShareModal: React.FC<TestimonyShareModalProps> = ({
  nightMode,
  isOpen,
  onClose,
  testimonyId,
  testimonyText,
  profileName,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  if (!isOpen) return null;

  const shareUrl = `https://lightningsocial.io/testimony/${testimonyId}`;
  const shareText = `Be encouraged by ${profileName}'s testimony on Lightning ✨`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      /* Clipboard API may not be available */
    }
  };

  const handleCopyText = async () => {
    try {
      const text = `"${testimonyText.substring(0, 500)}${testimonyText.length > 500 ? "..." : ""}"\n\n— ${profileName} on Lightning\n${shareUrl}`;
      await navigator.clipboard.writeText(text);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch {
      /* Clipboard API may not be available */
    }
  };

  const handleShareTwitter = () => {
    const url = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleShareFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleShareWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const nm = nightMode;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{
        background: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
        style={{
          background: nm
            ? "rgba(15, 15, 25, 0.95)"
            : "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(30px)",
          WebkitBackdropFilter: "blur(30px)",
          border: `1px solid ${nm ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
          boxShadow: nm
            ? "0 24px 48px rgba(0,0,0,0.4)"
            : "0 24px 48px rgba(0,0,0,0.1), inset 0 1px 2px rgba(255,255,255,0.5)",
        }}
      >
        {/* Header */}
        <div
          className="p-5 pb-4"
          style={{
            background:
              "linear-gradient(135deg, rgba(79, 150, 255, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">✨</span>
              <h2
                className={`text-lg font-bold ${nm ? "text-white" : "text-black"}`}
              >
                Share Testimony
              </h2>
            </div>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-xl transition-all hover:scale-110 active:scale-95 ${
                nm
                  ? "hover:bg-white/10 text-white/50"
                  : "hover:bg-black/5 text-black/50"
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all active:scale-95 ${
              copiedLink
                ? "bg-green-500/10 border-green-500/20"
                : nm
                  ? "hover:bg-white/[0.06]"
                  : "hover:bg-black/[0.03]"
            }`}
            style={{
              background: copiedLink
                ? nm
                  ? "rgba(34,197,94,0.1)"
                  : "rgba(34,197,94,0.08)"
                : nm
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(255,255,255,0.5)",
              border: `1px solid ${
                copiedLink
                  ? "rgba(34,197,94,0.3)"
                  : nm
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.04)"
              }`,
            }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: copiedLink
                  ? "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"
                  : "linear-gradient(135deg, #4F96FF 0%, #2563eb 100%)",
                boxShadow: copiedLink
                  ? "0 2px 8px rgba(34,197,94,0.3)"
                  : "0 2px 8px rgba(59,130,246,0.25)",
              }}
            >
              {copiedLink ? (
                <Check className="w-4.5 h-4.5 text-white" />
              ) : (
                <Link2 className="w-4.5 h-4.5 text-white" />
              )}
            </div>
            <div className="flex-1 text-left">
              <p
                className={`text-sm font-semibold ${nm ? "text-white" : "text-black"}`}
              >
                {copiedLink ? "Link Copied!" : "Copy Link"}
              </p>
              <p
                className={`text-xs truncate ${nm ? "text-white/40" : "text-black/40"}`}
              >
                {shareUrl}
              </p>
            </div>
          </button>

          {/* Social Share Buttons */}
          <div>
            <label
              htmlFor="share-to"
              className={`block text-xs font-semibold mb-2.5 ${nm ? "text-white/40" : "text-black/40"}`}
            >
              Share to
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {/* Twitter/X */}
              <button
                id="share-to"
                onClick={handleShareTwitter}
                className="flex flex-col items-center gap-2 py-3.5 rounded-2xl transition-all hover:scale-105 active:scale-95"
                style={{
                  background: nm
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(255,255,255,0.5)",
                  border: `1px solid ${nm ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}`,
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: "#000" }}
                >
                  <svg
                    className="w-4.5 h-4.5 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </div>
                <span
                  className={`text-xs font-medium ${nm ? "text-white/60" : "text-black/60"}`}
                >
                  X
                </span>
              </button>

              {/* Facebook */}
              <button
                onClick={handleShareFacebook}
                className="flex flex-col items-center gap-2 py-3.5 rounded-2xl transition-all hover:scale-105 active:scale-95"
                style={{
                  background: nm
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(255,255,255,0.5)",
                  border: `1px solid ${nm ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}`,
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: "#1877F2" }}
                >
                  <svg
                    className="w-5 h-5 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </div>
                <span
                  className={`text-xs font-medium ${nm ? "text-white/60" : "text-black/60"}`}
                >
                  Facebook
                </span>
              </button>

              {/* WhatsApp */}
              <button
                onClick={handleShareWhatsApp}
                className="flex flex-col items-center gap-2 py-3.5 rounded-2xl transition-all hover:scale-105 active:scale-95"
                style={{
                  background: nm
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(255,255,255,0.5)",
                  border: `1px solid ${nm ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}`,
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: "#25D366" }}
                >
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <span
                  className={`text-xs font-medium ${nm ? "text-white/60" : "text-black/60"}`}
                >
                  WhatsApp
                </span>
              </button>
            </div>
          </div>

          {/* Copy Testimony Text */}
          <button
            onClick={handleCopyText}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all active:scale-95`}
            style={{
              background: copiedText
                ? nm
                  ? "rgba(34,197,94,0.1)"
                  : "rgba(34,197,94,0.08)"
                : nm
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(255,255,255,0.5)",
              border: `1px solid ${
                copiedText
                  ? "rgba(34,197,94,0.3)"
                  : nm
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.04)"
              }`,
            }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: copiedText
                  ? "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"
                  : nm
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.05)",
              }}
            >
              {copiedText ? (
                <Check className="w-4.5 h-4.5 text-white" />
              ) : (
                <Copy
                  className={`w-4.5 h-4.5 ${nm ? "text-white/60" : "text-black/50"}`}
                />
              )}
            </div>
            <div className="flex-1 text-left">
              <p
                className={`text-sm font-semibold ${nm ? "text-white" : "text-black"}`}
              >
                {copiedText ? "Testimony Copied!" : "Copy Testimony Text"}
              </p>
              <p
                className={`text-xs ${nm ? "text-white/40" : "text-black/40"}`}
              >
                Copy the full testimony to share anywhere
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestimonyShareModal;

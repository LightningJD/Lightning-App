import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "danger";
  nightMode: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  nightMode,
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Close dialog"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onClose();
        }}
        className="fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-200"
      />

      {/* Dialog */}
      <div
        className={`fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto z-50 rounded-2xl overflow-hidden animate-in zoom-in-95 duration-300 ${
          nightMode
            ? "bg-[#0a0a0a]"
            : "bg-gradient-to-b from-purple-50 via-blue-50 to-pink-50"
        }`}
        style={{
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
      >
        <div className="p-6 space-y-4">
          {/* Icon and Title */}
          <div className="text-center">
            {variant === "danger" && (
              <div
                className={`w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center ${
                  nightMode ? "bg-red-500/10" : "bg-red-100"
                }`}
              >
                <AlertTriangle
                  className={`w-6 h-6 ${nightMode ? "text-red-400" : "text-red-600"}`}
                />
              </div>
            )}
            <h2
              id="confirm-title"
              className={`text-xl font-bold ${nightMode ? "text-slate-100" : "text-black"}`}
            >
              {title}
            </h2>
          </div>

          {/* Message */}
          <p
            id="confirm-message"
            className={`text-sm text-center ${nightMode ? "text-slate-100" : "text-black"} opacity-80`}
          >
            {message}
          </p>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-200 border ${
                nightMode
                  ? "bg-white/5 hover:bg-white/10 text-slate-100 border-white/10"
                  : "bg-white/80 hover:bg-white text-black border-white/30 shadow-md"
              }`}
              aria-label="Cancel action"
            >
              {cancelText}
            </button>

            <button
              onClick={handleConfirm}
              className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-200 border ${
                variant === "danger"
                  ? nightMode
                    ? "bg-red-500 hover:bg-red-600 text-white border-red-600"
                    : "bg-red-500 hover:bg-red-600 text-white border-red-600 shadow-md"
                  : nightMode
                    ? "text-slate-100 border-white/20"
                    : "text-slate-100 border-white/30 shadow-md"
              }`}
              style={
                variant === "default"
                  ? {
                      background:
                        "linear-gradient(135deg, #4faaf8 0%, #3b82f6 50%, #2563eb 100%)",
                      boxShadow: nightMode
                        ? "0 4px 12px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)"
                        : "0 4px 12px rgba(59, 130, 246, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.25)",
                    }
                  : {}
              }
              aria-label={`Confirm ${title.toLowerCase()}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ConfirmDialog;

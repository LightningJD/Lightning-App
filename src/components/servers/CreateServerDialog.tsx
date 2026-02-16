import React, { useState } from "react";
import { X } from "lucide-react";
import { validateGroup, sanitizeInput } from "../../lib/inputValidation";
import { showError } from "../../lib/toast";

interface CreateServerDialogProps {
  nightMode: boolean;
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string, iconEmoji: string) => Promise<boolean>;
}

const SERVER_EMOJIS = [
  "\u{26EA}",
  "\u{271D}\u{FE0F}",
  "\u{1F54A}\u{FE0F}",
  "\u{1F64F}",
  "\u{2B50}",
  "\u{1F525}",
  "\u{1F492}",
  "\u{1F4D6}",
  "\u{1F31F}",
  "\u{1F49C}",
  "\u{1F3E0}",
  "\u{1F3B5}",
];

const CreateServerDialog: React.FC<CreateServerDialogProps> = ({
  nightMode,
  isOpen,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [iconEmoji, setIconEmoji] = useState("\u{26EA}");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async () => {
    const sanitizedName = sanitizeInput(name.trim());
    if (!sanitizedName) {
      showError("Please enter a server name");
      return;
    }
    const validation = validateGroup({ name: sanitizedName, description });
    if (!validation.valid) {
      const firstError = Object.values(validation.errors)[0];
      showError(firstError || "Invalid server name");
      return;
    }
    setLoading(true);
    const success = await onCreate(sanitizedName, description.trim(), iconEmoji);
    setLoading(false);
    if (success) {
      setName("");
      setDescription("");
      setIconEmoji("\u{26EA}");
      onClose();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Close dialog"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-md rounded-3xl shadow-2xl overflow-hidden transition-all"
        style={{
          background: nightMode
            ? "rgba(15, 15, 25, 0.95)"
            : "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(30px)",
          WebkitBackdropFilter: "blur(30px)",
          border: `1px solid ${nightMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
          boxShadow: nightMode
            ? "0 24px 48px rgba(0,0,0,0.4)"
            : "0 24px 48px rgba(0,0,0,0.1), inset 0 1px 2px rgba(255,255,255,0.5)",
        }}
      >
        {/* Header with gradient */}
        <div
          className="p-6 pb-5"
          style={{
            background:
              "linear-gradient(135deg, rgba(79, 150, 255, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)",
          }}
        >
          <div className="flex items-center justify-between">
            <h2
              className={`text-xl font-bold ${nightMode ? "text-white" : "text-black"}`}
            >
              Create Server
            </h2>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-xl transition-all hover:scale-110 active:scale-95 ${
                nightMode
                  ? "hover:bg-white/10 text-white/50"
                  : "hover:bg-black/5 text-black/50"
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p
            className={`text-sm mt-1 ${nightMode ? "text-white/50" : "text-black/50"}`}
          >
            Create a new server for your church or community
          </p>
        </div>

        <div className="p-6 space-y-5">
          {/* Icon picker */}
          <div>
            <span
              className={`block text-sm font-semibold mb-3 ${nightMode ? "text-white/70" : "text-black/70"}`}
            >
              Server Icon
            </span>
            <div className="flex flex-wrap gap-2.5">
              {SERVER_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setIconEmoji(emoji)}
                  className="w-11 h-11 rounded-full flex items-center justify-center text-xl transition-all duration-300 hover:scale-110 active:scale-95"
                  style={{
                    background:
                      iconEmoji === emoji
                        ? "linear-gradient(135deg, #4F96FF 0%, #3b82f6 50%, #2563eb 100%)"
                        : nightMode
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(0,0,0,0.04)",
                    boxShadow:
                      iconEmoji === emoji
                        ? "0 0 16px rgba(79, 150, 255, 0.35)"
                        : "none",
                    border:
                      iconEmoji === emoji
                        ? "2px solid rgba(79, 150, 255, 0.5)"
                        : `2px solid ${nightMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}`,
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Server name */}
          <div>
            <label
              htmlFor="server-name"
              className={`block text-sm font-semibold mb-2 ${nightMode ? "text-white/70" : "text-black/70"}`}
            >
              Server Name
            </label>
            <input
              id="server-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Church Community"
              maxLength={50}
              className={`w-full px-4 py-3 rounded-xl text-sm transition-all ${
                nightMode
                  ? "text-white placeholder-white/30"
                  : "text-black placeholder-black/40"
              }`}
              style={{
                background: nightMode
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(255,255,255,0.5)",
                border: `1px solid ${nightMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
              }}
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className={`block text-sm font-semibold mb-2 ${nightMode ? "text-white/70" : "text-black/70"}`}
            >
              Description{" "}
              <span
                className={`font-normal ${nightMode ? "text-white/30" : "text-black/30"}`}
              >
                (optional)
              </span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's your server about?"
              rows={3}
              maxLength={200}
              className={`w-full px-4 py-3 rounded-xl text-sm resize-none transition-all ${
                nightMode
                  ? "text-white placeholder-white/30"
                  : "text-black placeholder-black/40"
              }`}
              style={{
                background: nightMode
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(255,255,255,0.5)",
                border: `1px solid ${nightMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
              }}
            />
          </div>

          {/* Create button */}
          <button
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            className="w-full py-3.5 rounded-xl text-white font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 hover:scale-[1.02]"
            style={{
              background:
                "linear-gradient(135deg, #4F96FF 0%, #3b82f6 50%, #2563eb 100%)",
              boxShadow: name.trim()
                ? "0 4px 16px rgba(59, 130, 246, 0.35)"
                : "none",
            }}
          >
            {loading ? "Creating..." : "Create Server"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateServerDialog;

import React, { useState } from "react";
import { X, Camera } from "lucide-react";
import { validateGroup, sanitizeInput } from "../../lib/inputValidation";
import { showError } from "../../lib/toast";

interface CreateServerDialogProps {
  nightMode: boolean;
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string, iconEmoji: string) => Promise<boolean>;
}

const SERVER_GRADIENTS = [
  "linear-gradient(135deg, #7b76e0, #9b96f5)",
  "linear-gradient(135deg, #4facfe, #6b9ed6)",
  "linear-gradient(135deg, #5cc88a, #4ab8c4)",
  "linear-gradient(135deg, #e05c6c, #e8b84a)",
  "linear-gradient(135deg, #e8b84a, #e05c6c)",
  "linear-gradient(135deg, #9b96f5, #e05c6c)",
  "linear-gradient(135deg, #4ab8c4, #7b76e0)",
  "linear-gradient(135deg, #6b9ed6, #5cc88a)",
];

const CreateServerDialog: React.FC<CreateServerDialogProps> = ({
  nightMode,
  isOpen,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedGradient, setSelectedGradient] = useState(SERVER_GRADIENTS[0]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const previewInitial = name.trim() ? name.trim().charAt(0).toUpperCase() : "S";

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
    // Pass the gradient string as iconEmoji — stored in DB as icon_emoji
    const success = await onCreate(sanitizedName, description.trim(), selectedGradient);
    setLoading(false);
    if (success) {
      setName("");
      setDescription("");
      setSelectedGradient(SERVER_GRADIENTS[0]);
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
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
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
        className="w-full max-w-md rounded-2xl overflow-hidden transition-all"
        style={{
          background: nightMode
            ? "rgba(15, 15, 25, 0.95)"
            : "rgba(255, 255, 255, 0.85)",
          backdropFilter: nightMode ? undefined : "blur(20px)",
          WebkitBackdropFilter: nightMode ? undefined : "blur(20px)",
          border: `1px solid ${nightMode ? "rgba(255,255,255,0.08)" : "rgba(150,165,225,0.2)"}`,
          boxShadow: nightMode
            ? "0 20px 40px rgba(0,0,0,0.4)"
            : "0 20px 40px rgba(0,0,0,0.08)",
        }}
      >
        {/* Header */}
        <div
          className="px-5 pt-5 pb-3 flex items-start justify-between"
          style={{
            background: nightMode
              ? "linear-gradient(135deg, rgba(123,118,224,0.1) 0%, rgba(123,118,224,0.02) 100%)"
              : "linear-gradient(135deg, rgba(79,172,254,0.08) 0%, rgba(79,172,254,0.02) 100%)",
          }}
        >
          <div>
            <h2
              className="text-base font-semibold"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                color: nightMode ? "#e8e5f2" : "#1e2b4a",
              }}
            >
              Create Server
            </h2>
            <p
              className="text-xs mt-1"
              style={{ color: nightMode ? "#8e89a8" : "#4a5e88" }}
            >
              Create a new server for your church or community
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full transition-colors flex-shrink-0"
            style={{
              background: nightMode
                ? "rgba(255,255,255,0.06)"
                : "rgba(150,165,225,0.1)",
              color: nightMode ? "#8e89a8" : "#4a5e88",
            }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Live Preview */}
        <div className="flex items-center gap-3 px-5 pb-4">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: selectedGradient,
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 700,
              fontSize: "18px",
              color: "white",
            }}
          >
            {previewInitial}
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="text-sm font-semibold truncate"
              style={{ color: nightMode ? "#e8e5f2" : "#1e2b4a" }}
            >
              {name.trim() || "Server Name"}
            </div>
            <div
              className="text-[11px]"
              style={{ color: nightMode ? "#5d5877" : "#8e9ec0" }}
            >
              Live preview
            </div>
          </div>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* Gradient color picker */}
          <div>
            <span
              className="block text-xs font-semibold mb-2"
              style={{ color: nightMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}
            >
              Server Color
            </span>
            <div className="flex gap-2 flex-wrap">
              {SERVER_GRADIENTS.map((grad) => (
                <button
                  key={grad}
                  onClick={() => setSelectedGradient(grad)}
                  className="w-8 h-8 rounded-full transition-all hover:scale-110 active:scale-95"
                  style={{
                    background: grad,
                    border: selectedGradient === grad
                      ? "2px solid white"
                      : "2px solid transparent",
                    transform: selectedGradient === grad ? "scale(1.1)" : undefined,
                  }}
                  aria-label="Select server color"
                />
              ))}
            </div>
            {/* Upload option */}
            <button
              className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg text-xs transition-colors w-full"
              style={{
                background: nightMode
                  ? "rgba(255,255,255,0.03)"
                  : "rgba(79,172,254,0.04)",
                border: `1px dashed ${nightMode ? "rgba(255,255,255,0.08)" : "rgba(150,165,225,0.2)"}`,
                color: nightMode ? "#5d5877" : "#8e9ec0",
              }}
              onClick={() => {
                // Placeholder for future image upload
              }}
            >
              <Camera className="w-3.5 h-3.5" style={{ opacity: 0.5 }} />
              Upload custom image instead
            </button>
          </div>

          {/* Server name */}
          <div>
            <label
              htmlFor="server-name"
              className="block text-xs font-semibold mb-1.5"
              style={{ color: nightMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}
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
              className="w-full px-3.5 py-2.5 rounded-xl text-sm transition-all outline-none"
              style={{
                fontFamily: "'General Sans', sans-serif",
                background: nightMode
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(255,255,255,0.6)",
                border: `1px solid ${nightMode ? "rgba(255,255,255,0.06)" : "rgba(150,165,225,0.15)"}`,
                color: nightMode ? "#e8e5f2" : "#1e2b4a",
              }}
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="server-description"
              className="block text-xs font-semibold mb-1.5"
              style={{ color: nightMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}
            >
              Description{" "}
              <span style={{ opacity: 0.4, fontWeight: 400 }}>(optional)</span>
            </label>
            <textarea
              id="server-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's your server about?"
              rows={2}
              maxLength={200}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm resize-none transition-all outline-none"
              style={{
                fontFamily: "'General Sans', sans-serif",
                background: nightMode
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(255,255,255,0.6)",
                border: `1px solid ${nightMode ? "rgba(255,255,255,0.06)" : "rgba(150,165,225,0.15)"}`,
                color: nightMode ? "#e8e5f2" : "#1e2b4a",
              }}
            />
          </div>

          {/* Create button */}
          <button
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 hover:scale-[1.02]"
            style={{
              fontFamily: "'General Sans', sans-serif",
              background: nightMode
                ? "linear-gradient(135deg, #7b76e0, #9b96f5)"
                : "linear-gradient(135deg, #4facfe, #3b82f6)",
              boxShadow: name.trim()
                ? nightMode
                  ? "0 4px 16px rgba(123,118,224,0.3)"
                  : "0 4px 16px rgba(79,172,254,0.3)"
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

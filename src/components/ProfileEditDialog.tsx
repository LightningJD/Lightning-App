import { useState, useRef, useEffect } from "react";
import { X, Save, User } from "lucide-react";
import ImageUploadButton from "./ImageUploadButton";
import { showError } from "../lib/toast";
import { sanitizeInput } from "../lib/inputValidation";
import ModalOverlay from "./ModalOverlay";

interface FormData {
  displayName: string;
  bio: string;
  avatarUrl: string | null;
}

interface ProfileEditDialogProps {
  profile: any;
  nightMode: boolean;
  onSave: (formData: any) => Promise<void>;
  onClose: () => void;
}

const ProfileEditDialog: React.FC<ProfileEditDialogProps> = ({
  profile,
  nightMode,
  onSave,
  onClose,
}) => {
  const [formData, setFormData] = useState<FormData>({
    displayName: profile?.displayName || "",
    bio: profile?.bio || "",
    avatarUrl: profile?.avatarImage || null,
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || "",
        bio: profile.bio || "",
        avatarUrl: profile.avatarImage || null,
      });
    }
  }, [profile?.displayName, profile?.bio, profile?.avatarImage]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    const changed =
      formData.displayName.trim() !== (profile?.displayName || "").trim() ||
      formData.bio !== (profile?.bio || "") ||
      formData.avatarUrl !== (profile?.avatarImage || null);
    setHasChanges(changed);
  }, [formData, profile]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.displayName.trim()) {
      newErrors.displayName = "Name is required";
    } else if (!/[a-zA-Z0-9]/.test(formData.displayName.trim())) {
      newErrors.displayName = "Name must contain at least one letter or number";
    }

    if (!formData.bio.trim()) {
      newErrors.bio = "Bio is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      showError("Please fill in all required fields correctly");
      return;
    }

    setIsSaving(true);

    try {
      const sanitizedData = {
        displayName: sanitizeInput(formData.displayName),
        bio: sanitizeInput(formData.bio),
        avatarUrl: formData.avatarUrl,
      };

      await onSave(sanitizedData);
    } catch (error) {
      console.error("Error saving profile:", error);
      showError(
        error instanceof Error
          ? error.message
          : "Failed to save profile. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (field === "displayName") {
      const trimmedValue = (value || "").trim();
      if (!trimmedValue) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      } else if (!/[a-zA-Z0-9]/.test(trimmedValue)) {
        setErrors((prev) => ({
          ...prev,
          displayName: "Name must contain at least one letter or number",
        }));
      } else {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    } else {
      if (errors[field]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    }
  };

  return (
    <>
      <ModalOverlay onClose={onClose} nightMode={nightMode} maxHeight="max-h-[90vh]" cardClassName="min-h-[65vh]">
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className={`w-10 h-1 rounded-full ${nightMode ? "bg-white/20" : "bg-slate-300"}`} />
        </div>

        {/* Header */}
        <div
          className="px-6 pt-2 pb-4"
          style={{
            background: nightMode
              ? "linear-gradient(135deg, #4faaf8 0%, #3b82f6 50%, #2563eb 100%)"
              : "linear-gradient(135deg, rgba(219, 234, 254, 0.8) 0%, rgba(191, 219, 254, 0.8) 100%)",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className={`w-6 h-6 ${nightMode ? "text-white" : "text-blue-600"}`} />
              <div>
                <h2 className={`text-xl font-bold ${nightMode ? "text-white" : "text-slate-900"}`}>
                  Edit Profile
                </h2>
                <p className={`text-sm ${nightMode ? "text-white/90" : "text-slate-600"}`}>
                  Update your profile information
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                nightMode
                  ? "bg-white/20 hover:bg-white/30 text-white"
                  : "bg-slate-200 hover:bg-slate-300 text-slate-700"
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-5">
            {/* Profile Picture Upload */}
            <div>
              <label
                htmlFor="profile-picture"
                className={`block text-sm font-medium mb-2 ${nightMode ? "text-slate-100" : "text-slate-700"}`}
              >
                Profile Picture
              </label>
              <ImageUploadButton
                onUploadComplete={(url) => handleInputChange("avatarUrl", url)}
                currentImage={formData.avatarUrl}
                nightMode={nightMode}
                buttonText="Upload Picture"
              />
            </div>

            {/* Display Name */}
            <div>
              <label
                htmlFor="full-name"
                className={`block text-sm font-medium mb-2 ${nightMode ? "text-slate-100" : "text-slate-700"}`}
              >
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="full-name"
                ref={nameInputRef}
                type="text"
                value={formData.displayName}
                onChange={(e) => handleInputChange("displayName", e.target.value)}
                placeholder="John Doe"
                className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  nightMode
                    ? "bg-white/5 border-white/10 text-slate-100 placeholder-gray-400"
                    : "bg-white border-slate-200 text-slate-900"
                } ${errors.displayName ? "border-red-500" : ""}`}
              />
              {errors.displayName && (
                <p className="text-red-500 text-xs mt-1">{errors.displayName}</p>
              )}
            </div>

            {/* Bio */}
            <div>
              <label
                htmlFor="bio"
                className={`block text-sm font-medium mb-2 ${nightMode ? "text-slate-100" : "text-slate-700"}`}
              >
                Bio <span className="text-red-500">*</span>
              </label>
              <textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleInputChange("bio", e.target.value)}
                placeholder="Tell us about yourself and your faith journey..."
                rows={5}
                maxLength={120}
                className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                  nightMode
                    ? "bg-white/5 border-white/10 text-slate-100 placeholder-gray-400"
                    : "bg-white border-slate-200 text-slate-900"
                } ${errors.bio ? "border-red-500" : ""}`}
              />
              {errors.bio && (
                <p className="text-red-500 text-xs mt-1">{errors.bio}</p>
              )}
              <p className={`text-xs mt-1 ${nightMode ? "text-slate-100" : "text-slate-500"}`}>
                {formData.bio.length}/120 characters
              </p>
            </div>

            {/* Church — hardcoded, not editable */}
            <div>
              <label
                className={`block text-sm font-medium mb-2 ${nightMode ? "text-slate-100" : "text-slate-700"}`}
              >
                Church
              </label>
              <div
                className={`w-full px-4 py-3 rounded-xl border ${
                  nightMode
                    ? "bg-white/5 border-white/10 text-slate-400"
                    : "bg-slate-50 border-slate-200 text-slate-500"
                }`}
              >
                The Crossing
              </div>
              <p className={`text-xs mt-1 ${nightMode ? "text-slate-400" : "text-slate-500"}`}>
                Automatically assigned
              </p>
            </div>
          </div>

          {errors.submit && (
            <div className="mt-4 p-3 rounded-lg bg-red-100 border border-red-300">
              <p className="text-red-700 text-sm text-center">{errors.submit}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-6 border-t ${nightMode ? "border-white/10" : "border-slate-200"}`}>
          {!hasChanges && Object.keys(errors).length === 0 && (
            <div className={`mb-3 text-sm text-center ${nightMode ? "text-slate-400" : "text-slate-500"}`}>
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
                  ? "bg-white/5 hover:bg-white/10 text-slate-100"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              Cancel
            </button>

            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving || Object.keys(errors).length > 0}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-white border ${
                !hasChanges || isSaving || Object.keys(errors).length > 0
                  ? "opacity-50 cursor-not-allowed"
                  : "opacity-100 cursor-pointer"
              } border-white/20`}
              style={
                hasChanges && !isSaving && Object.keys(errors).length === 0
                  ? {
                      background: nightMode
                        ? "rgba(79, 150, 255, 0.85)"
                        : "linear-gradient(135deg, #4faaf8 0%, #3b82f6 50%, #2563eb 100%)",
                      boxShadow: nightMode
                        ? "0 2px 8px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)"
                        : "0 2px 8px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.25)",
                    }
                  : {
                      background: nightMode
                        ? "rgba(100, 100, 100, 0.3)"
                        : "rgba(150, 150, 150, 0.3)",
                      boxShadow: "none",
                    }
              }
              onMouseEnter={(e) => {
                if (hasChanges && !isSaving && Object.keys(errors).length === 0) {
                  e.currentTarget.style.background = nightMode
                    ? "rgba(79, 150, 255, 1.0)"
                    : "linear-gradient(135deg, #5BA3FF 0%, #4F96FF 50%, #3b82f6 100%)";
                }
              }}
              onMouseLeave={(e) => {
                if (hasChanges && !isSaving && Object.keys(errors).length === 0) {
                  e.currentTarget.style.background = nightMode
                    ? "rgba(79, 150, 255, 0.85)"
                    : "linear-gradient(135deg, #4faaf8 0%, #3b82f6 50%, #2563eb 100%)";
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
      </ModalOverlay>
    </>
  );
};

export default ProfileEditDialog;

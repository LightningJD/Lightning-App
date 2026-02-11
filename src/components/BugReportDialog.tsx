import { useState } from "react";
import { X, Flag, AlertCircle, CheckCircle } from "lucide-react";
import { showSuccess, showError } from "../lib/toast";

interface BugReportDialogProps {
  onClose: () => void;
  nightMode: boolean;
  currentTab: string;
  userProfile: any;
}

export default function BugReportDialog({
  onClose,
  nightMode,
  currentTab,
  userProfile,
}: BugReportDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Capture system information
  const systemInfo = {
    browser: navigator.userAgent,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    platform: navigator.platform,
    language: navigator.language,
    currentPage: currentTab,
    timestamp: new Date().toISOString(),
    nightMode: nightMode,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      showError("Please fill in title and description");
      return;
    }

    setIsSubmitting(true);

    const bugReport = {
      title: title.trim(),
      description: description.trim(),
      steps: steps.trim(),
      systemInfo,
      userId: userProfile?.supabaseId || "guest",
      username: userProfile?.username || "guest",
      submittedAt: new Date().toISOString(),
    };

    try {
      // For now, save to localStorage as a fallback
      // In production, this would send to a backend endpoint
      const existingReports = JSON.parse(
        localStorage.getItem("lightning_bug_reports") || "[]",
      );
      existingReports.push(bugReport);
      localStorage.setItem(
        "lightning_bug_reports",
        JSON.stringify(existingReports),
      );

      showSuccess("Bug report submitted! Thank you for helping us improve.");

      // Close dialog after short delay
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      console.error("Error submitting bug report:", error);
      showError("Failed to submit bug report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        role="button"
        tabIndex={0}
        className={`absolute inset-0 ${nightMode ? "bg-black/80" : "bg-black/50"} backdrop-blur-sm`}
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
            e.preventDefault();
            onClose();
          }
        }}
      />

      {/* Dialog */}
      <div
        className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border ${
          nightMode
            ? "bg-[#0a0a0a] border-white/10"
            : "bg-white border-slate-200"
        } shadow-2xl`}
      >
        {/* Header */}
        <div
          className={`sticky top-0 z-10 px-6 py-4 border-b ${
            nightMode
              ? "bg-[#0a0a0a] border-white/10"
              : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${
                  nightMode ? "bg-red-500/20" : "bg-red-50"
                }`}
              >
                <Flag
                  className={`w-5 h-5 ${nightMode ? "text-red-400" : "text-red-600"}`}
                />
              </div>
              <h2
                className={`text-xl font-bold ${nightMode ? "text-slate-100" : "text-black"}`}
              >
                Report a Bug
              </h2>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                nightMode
                  ? "hover:bg-white/10 text-slate-400 hover:text-slate-100"
                  : "hover:bg-slate-100 text-slate-500 hover:text-black"
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Info Banner */}
          <div
            className={`flex items-start gap-3 p-4 rounded-lg ${
              nightMode
                ? "bg-blue-500/10 border border-blue-500/20"
                : "bg-blue-50 border border-blue-200"
            }`}
          >
            <AlertCircle
              className={`w-5 h-5 flex-shrink-0 mt-0.5 ${nightMode ? "text-blue-400" : "text-blue-600"}`}
            />
            <div
              className={`text-sm ${nightMode ? "text-blue-300" : "text-blue-900"}`}
            >
              <p className="font-semibold mb-1">Help us fix this issue</p>
              <p>
                Please provide as much detail as possible. System information
                will be automatically captured.
              </p>
            </div>
          </div>

          {/* Title */}
          <div>
            <label
              htmlFor="bug-title"
              className={`block text-sm font-semibold mb-2 ${nightMode ? "text-slate-300" : "text-slate-700"}`}
            >
              Bug Title <span className="text-red-500">*</span>
            </label>
            <input
              id="bug-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of the bug"
              maxLength={100}
              className={`w-full px-4 py-2.5 rounded-lg border ${
                nightMode
                  ? "bg-white/5 border-white/10 text-slate-100 placeholder-slate-500 focus:border-blue-500/50"
                  : "bg-white border-slate-300 text-black placeholder-slate-400 focus:border-blue-500"
              } focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors`}
              required
            />
            <p
              className={`text-xs mt-1 ${nightMode ? "text-slate-500" : "text-slate-400"}`}
            >
              {title.length}/100 characters
            </p>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="bug-description"
              className={`block text-sm font-semibold mb-2 ${nightMode ? "text-slate-300" : "text-slate-700"}`}
            >
              What happened? <span className="text-red-500">*</span>
            </label>
            <textarea
              id="bug-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what went wrong and what you expected to happen..."
              rows={4}
              maxLength={1000}
              className={`w-full px-4 py-2.5 rounded-lg border resize-none ${
                nightMode
                  ? "bg-white/5 border-white/10 text-slate-100 placeholder-slate-500 focus:border-blue-500/50"
                  : "bg-white border-slate-300 text-black placeholder-slate-400 focus:border-blue-500"
              } focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors`}
              required
            />
            <p
              className={`text-xs mt-1 ${nightMode ? "text-slate-500" : "text-slate-400"}`}
            >
              {description.length}/1000 characters
            </p>
          </div>

          {/* Steps to Reproduce */}
          <div>
            <label
              htmlFor="bug-steps"
              className={`block text-sm font-semibold mb-2 ${nightMode ? "text-slate-300" : "text-slate-700"}`}
            >
              Steps to Reproduce (Optional)
            </label>
            <textarea
              id="bug-steps"
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              placeholder="1. Go to...&#10;2. Click on...&#10;3. Notice that..."
              rows={4}
              maxLength={500}
              className={`w-full px-4 py-2.5 rounded-lg border resize-none ${
                nightMode
                  ? "bg-white/5 border-white/10 text-slate-100 placeholder-slate-500 focus:border-blue-500/50"
                  : "bg-white border-slate-300 text-black placeholder-slate-400 focus:border-blue-500"
              } focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors`}
            />
            <p
              className={`text-xs mt-1 ${nightMode ? "text-slate-500" : "text-slate-400"}`}
            >
              {steps.length}/500 characters
            </p>
          </div>

          {/* System Info Preview */}
          <div>
            <div
              className={`block text-sm font-semibold mb-2 ${
                nightMode ? "text-slate-300" : "text-slate-700"
              }`}
            >
              System Information (Auto-captured)
            </div>
            <div
              className={`px-4 py-3 rounded-lg border text-xs font-mono ${
                nightMode
                  ? "bg-white/5 border-white/10 text-slate-400"
                  : "bg-slate-50 border-slate-200 text-slate-600"
              }`}
            >
              <div className="space-y-1">
                <div>
                  <span className="font-semibold">Page:</span>{" "}
                  {systemInfo.currentPage}
                </div>
                <div>
                  <span className="font-semibold">Browser:</span>{" "}
                  {systemInfo.browser}
                </div>
                <div>
                  <span className="font-semibold">Viewport:</span>{" "}
                  {systemInfo.viewport}
                </div>
                <div>
                  <span className="font-semibold">Platform:</span>{" "}
                  {systemInfo.platform}
                </div>
                <div>
                  <span className="font-semibold">Theme:</span>{" "}
                  {systemInfo.nightMode ? "Night Mode" : "Day Mode"}
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${
                nightMode
                  ? "bg-white/5 hover:bg-white/10 text-slate-300"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Submit Bug Report
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

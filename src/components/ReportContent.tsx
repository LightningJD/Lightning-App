import { useState, useEffect } from "react";
import { X, Flag, AlertTriangle } from "lucide-react";
import {
  reportUser,
  reportTestimony,
  reportMessage,
  reportGroup,
  REPORT_REASONS,
} from "../lib/database";
import { showSuccess, showError } from "../lib/toast";
import { validateMessage } from "../lib/inputValidation";

interface ReportContentProps {
  isOpen: boolean;
  onClose: () => void;
  nightMode: boolean;
  userProfile: any;
  reportType: "user" | "testimony" | "message" | "group";
  reportedContent: {
    id: string;
    ownerId?: string;
    name?: string;
  };
}

const ReportContent: React.FC<ReportContentProps> = ({
  isOpen,
  onClose,
  nightMode,
  userProfile,
  reportType,
  reportedContent,
}) => {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Lock body scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userProfile?.supabaseId) {
      showError("You must be logged in to report content");
      return;
    }

    if (!reason) {
      showError("Please select a reason for reporting");
      return;
    }

    // Validate details if provided
    if (details) {
      const validation = validateMessage(details, "comment");
      if (!validation.valid) {
        showError(validation.errors[0]);
        return;
      }
    }

    setSubmitting(true);

    try {
      let reportFunction;
      let reportArgs;

      switch (reportType) {
        case "user":
          reportFunction = reportUser;
          reportArgs = [
            userProfile.supabaseId,
            reportedContent.id,
            reason,
            details,
          ];
          break;
        case "testimony":
          reportFunction = reportTestimony;
          reportArgs = [
            userProfile.supabaseId,
            reportedContent.id,
            reportedContent.ownerId,
            reason,
            details,
          ];
          break;
        case "message":
          reportFunction = reportMessage;
          reportArgs = [
            userProfile.supabaseId,
            reportedContent.id,
            reportedContent.ownerId,
            reason,
            details,
          ];
          break;
        case "group":
          reportFunction = reportGroup;
          reportArgs = [
            userProfile.supabaseId,
            reportedContent.id,
            reportedContent.ownerId,
            reason,
            details,
          ];
          break;
        default:
          throw new Error("Invalid report type");
      }

      // @ts-ignore - reportArgs spread type compatibility
      await reportFunction(...reportArgs);

      showSuccess(
        "Report submitted successfully. Our team will review it shortly.",
      );

      // Reset form and close
      setReason("");
      setDetails("");
      onClose();
    } catch (error) {
      console.error("Error submitting report:", error);
      showError("Failed to submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const getReportTitle = () => {
    switch (reportType) {
      case "user":
        return `Report User: ${reportedContent?.name || "Unknown"}`;
      case "testimony":
        return "Report Testimony";
      case "message":
        return "Report Message";
      case "group":
        return `Report Group: ${reportedContent?.name || "Unknown"}`;
      default:
        return "Report Content";
    }
  };

  const reasons = REPORT_REASONS[reportType] || [];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
        role="presentation"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={`w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl shadow-2xl pointer-events-auto overflow-hidden ${
            nightMode
              ? "bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10"
              : "bg-white border border-slate-200"
          }`}
          role="presentation"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className={`flex items-center justify-between px-6 py-4 border-b flex-shrink-0 ${
              nightMode
                ? "border-white/10 bg-white/5"
                : "border-slate-200 bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-3">
              <Flag
                className={`w-5 h-5 ${nightMode ? "text-red-400" : "text-red-500"}`}
              />
              <h2
                className={`text-lg font-semibold ${nightMode ? "text-slate-100" : "text-slate-900"}`}
              >
                {getReportTitle()}
              </h2>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                nightMode
                  ? "hover:bg-white/10 text-slate-100"
                  : "hover:bg-slate-100 text-slate-600"
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <form
            onSubmit={handleSubmit}
            className="p-6 space-y-4 overflow-y-auto"
          >
            {/* Warning Banner */}
            <div
              className={`flex items-start gap-3 p-3 rounded-lg ${
                nightMode
                  ? "bg-yellow-500/10 border border-yellow-500/20"
                  : "bg-yellow-50 border border-yellow-200"
              }`}
            >
              <AlertTriangle
                className={`w-5 h-5 flex-shrink-0 mt-0.5 ${nightMode ? "text-yellow-400" : "text-yellow-600"}`}
              />
              <div>
                <p
                  className={`text-sm font-medium ${nightMode ? "text-yellow-300" : "text-yellow-900"}`}
                >
                  Important
                </p>
                <p
                  className={`text-xs mt-1 ${nightMode ? "text-yellow-400" : "text-yellow-700"}`}
                >
                  False reports may result in account restrictions. Only report
                  content that violates our community guidelines.
                </p>
              </div>
            </div>

            {/* Reason Selector */}
            <div>
              <label
                htmlFor="reason"
                className={`block text-sm font-medium mb-2 ${nightMode ? "text-slate-100" : "text-slate-700"}`}
              >
                Reason for Report *
              </label>
              <select
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                  nightMode
                    ? "bg-white/5 border-white/10 text-slate-100 focus:border-blue-500"
                    : "bg-white border-slate-200 text-slate-900 focus:border-blue-500"
                } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
              >
                <option value="">Select a reason...</option>
                {reasons.map((r) => (
                  <option
                    key={r.value}
                    value={r.value}
                    className={
                      nightMode
                        ? "bg-slate-800 text-slate-100"
                        : "bg-white text-slate-900"
                    }
                  >
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Additional Details */}
            <div>
              <label
                htmlFor="details"
                className={`block text-sm font-medium mb-2 ${nightMode ? "text-slate-100" : "text-slate-700"}`}
              >
                Additional Details (Optional)
              </label>
              <textarea
                id="details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Provide any additional context that would help us understand the issue..."
                rows={4}
                maxLength={500}
                className={`w-full px-4 py-3 rounded-lg border transition-colors resize-none bg-white/5 border-white/10 text-slate-100 placeholder-slate-500 focus:border-blue-500 
                focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
              />
              <p className={`text-xs mt-1 text-slate-500`}>
                {details.length}/500 characters
              </p>
            </div>

            {/* What Happens Next */}
            <div
              className={`p-4 rounded-lg ${nightMode ? "bg-white/5" : "bg-slate-50"}`}
            >
              <p
                className={`text-sm font-medium mb-2 ${nightMode ? "text-slate-100" : "text-slate-900"}`}
              >
                What happens next?
              </p>
              <ul
                className={`text-xs space-y-1 ${nightMode ? "text-slate-400" : "text-slate-600"}`}
              >
                <li>
                  • Our moderation team will review your report within 24-48
                  hours
                </li>
                <li>
                  • We'll take appropriate action if the content violates our
                  guidelines
                </li>
                <li>• You'll receive an update on the outcome via email</li>
                <li>• Your report will remain confidential</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                  nightMode
                    ? "bg-white/5 hover:bg-white/10 text-slate-100"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!reason || submitting}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                  !reason || submitting
                    ? nightMode
                      ? "bg-white/5 text-slate-500 cursor-not-allowed"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                    : nightMode
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-red-500 hover:bg-red-600 text-white"
                }`}
              >
                {submitting ? "Submitting Report..." : "Submit Report"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default ReportContent;

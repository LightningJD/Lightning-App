import { X, FileText } from "lucide-react";

interface TermsOfServiceProps {
  isOpen: boolean;
  onClose: () => void;
  nightMode: boolean;
}

const TermsOfService: React.FC<TermsOfServiceProps> = ({
  isOpen,
  onClose,
  nightMode,
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50 animate-in fade-in duration-200"
        role="presentation"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={`w-full max-w-3xl rounded-2xl shadow-2xl max-h-[85vh] overflow-hidden flex flex-col ${
            nightMode ? "bg-[#0a0a0a]" : "bg-white"
          }`}
          role="presentation"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="p-6"
            style={{
              background: nightMode
                ? "linear-gradient(135deg, #4faaf8 0%, #3b82f6 50%, #2563eb 100%)"
                : "linear-gradient(135deg, rgba(219, 234, 254, 0.8) 0%, rgba(191, 219, 254, 0.8) 100%)",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText
                  className={`w-6 h-6 ${nightMode ? "text-white" : "text-blue-600"}`}
                />
                <div>
                  <h2
                    className={`text-xl font-bold ${nightMode ? "text-white" : "text-slate-900"}`}
                  >
                    Terms of Service
                  </h2>
                  <p
                    className={`text-sm ${nightMode ? "text-white/90" : "text-slate-600"}`}
                  >
                    Last updated: October 24, 2025
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                  nightMode
                    ? "bg-white/10 hover:bg-white/20 text-white"
                    : "bg-blue-50 hover:bg-blue-100 text-blue-600"
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div
            className={`flex-1 overflow-y-auto p-6 ${nightMode ? "text-slate-100" : "text-slate-700"}`}
          >
            <div className="space-y-6">
              <section>
                <h3
                  className={`text-lg font-semibold mb-3 ${nightMode ? "text-white" : "text-slate-900"}`}
                >
                  1. Acceptance of Terms
                </h3>
                <p className="leading-relaxed">
                  By accessing and using Lightning ("the App"), you agree to be
                  bound by these Terms of Service. If you do not agree to these
                  terms, please do not use the App.
                </p>
              </section>

              <section>
                <h3
                  className={`text-lg font-semibold mb-3 ${nightMode ? "text-white" : "text-slate-900"}`}
                >
                  2. Description of Service
                </h3>
                <p className="leading-relaxed mb-3">
                  Lightning is a faith-based social networking application that:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    Connects Christians based on location and shared faith
                  </li>
                  <li>
                    Facilitates sharing of testimonies and faith experiences
                  </li>
                  <li>Enables messaging and group communications</li>
                  <li>Uses AI to help users articulate their faith journey</li>
                </ul>
              </section>

              <section>
                <h3
                  className={`text-lg font-semibold mb-3 ${nightMode ? "text-white" : "text-slate-900"}`}
                >
                  3. User Accounts
                </h3>
                <p className="leading-relaxed mb-3">
                  To use Lightning, you must:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Be at least 13 years of age</li>
                  <li>Provide accurate and complete information</li>
                  <li>Maintain the security of your account</li>
                  <li>Notify us immediately of any unauthorized access</li>
                  <li>Be responsible for all activities under your account</li>
                </ul>
              </section>

              <section>
                <h3
                  className={`text-lg font-semibold mb-3 ${nightMode ? "text-white" : "text-slate-900"}`}
                >
                  4. User Content
                </h3>
                <p className="leading-relaxed mb-3">
                  By posting content on Lightning, you:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    Grant us a non-exclusive, worldwide license to use, display,
                    and distribute your content
                  </li>
                  <li>
                    Confirm that you own or have rights to share the content
                  </li>
                  <li>
                    Agree that your testimonies may be viewed by other users
                  </li>
                  <li>
                    Understand that you can control privacy settings for your
                    content
                  </li>
                </ul>
              </section>

              <section>
                <h3
                  className={`text-lg font-semibold mb-3 ${nightMode ? "text-white" : "text-slate-900"}`}
                >
                  5. Community Guidelines
                </h3>
                <p className="leading-relaxed mb-3">Users must not:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    Post content that is hateful, discriminatory, or harassing
                  </li>
                  <li>Share inappropriate or explicit material</li>
                  <li>Impersonate others or misrepresent their identity</li>
                  <li>Spam or engage in commercial solicitation</li>
                  <li>Violate any applicable laws or regulations</li>
                  <li>Attempt to access other users' accounts</li>
                </ul>
              </section>

              <section>
                <h3
                  className={`text-lg font-semibold mb-3 ${nightMode ? "text-white" : "text-slate-900"}`}
                >
                  6. AI-Generated Content
                </h3>
                <p className="leading-relaxed">
                  Lightning uses AI to help users generate testimonies. By using
                  this feature, you acknowledge that: AI-generated content is a
                  starting point for your personal story, you are responsible
                  for reviewing and editing AI-generated content, and the final
                  testimony should accurately reflect your faith journey.
                </p>
              </section>

              <section>
                <h3
                  className={`text-lg font-semibold mb-3 ${nightMode ? "text-white" : "text-slate-900"}`}
                >
                  7. Privacy
                </h3>
                <p className="leading-relaxed">
                  Your use of Lightning is subject to our Privacy Policy. We are
                  committed to protecting your personal information and
                  respecting your privacy choices.
                </p>
              </section>

              <section>
                <h3
                  className={`text-lg font-semibold mb-3 ${nightMode ? "text-white" : "text-slate-900"}`}
                >
                  8. Disclaimers
                </h3>
                <p className="leading-relaxed">
                  Lightning is provided "as is" without warranties of any kind.
                  We do not guarantee continuous, uninterrupted access to the
                  service. We are not responsible for user-generated content or
                  interactions between users.
                </p>
              </section>

              <section>
                <h3
                  className={`text-lg font-semibold mb-3 ${nightMode ? "text-white" : "text-slate-900"}`}
                >
                  9. Limitation of Liability
                </h3>
                <p className="leading-relaxed">
                  To the maximum extent permitted by law, Lightning and its
                  affiliates shall not be liable for any indirect, incidental,
                  special, or consequential damages arising from your use of the
                  App.
                </p>
              </section>

              <section>
                <h3
                  className={`text-lg font-semibold mb-3 ${nightMode ? "text-white" : "text-slate-900"}`}
                >
                  10. Termination
                </h3>
                <p className="leading-relaxed">
                  We reserve the right to terminate or suspend your account at
                  any time for violation of these terms or for any other reason
                  at our discretion. You may also delete your account at any
                  time.
                </p>
              </section>

              <section>
                <h3
                  className={`text-lg font-semibold mb-3 ${nightMode ? "text-white" : "text-slate-900"}`}
                >
                  11. Changes to Terms
                </h3>
                <p className="leading-relaxed">
                  We may update these Terms of Service from time to time. We
                  will notify users of significant changes. Your continued use
                  of Lightning after changes constitutes acceptance of the new
                  terms.
                </p>
              </section>

              <section>
                <h3
                  className={`text-lg font-semibold mb-3 ${nightMode ? "text-white" : "text-slate-900"}`}
                >
                  12. Contact Information
                </h3>
                <p className="leading-relaxed">
                  For questions about these Terms of Service, please contact us
                  at:
                  <br />
                  Email: support@lightningapp.com
                  <br />
                  Address: Lightning App, LLC
                </p>
              </section>
            </div>
          </div>

          {/* Footer */}
          <div
            className={`p-6 border-t ${nightMode ? "border-white/10" : "border-slate-200"}`}
          >
            <div className="flex justify-between items-center">
              <p
                className={`text-sm ${nightMode ? "text-slate-400" : "text-slate-500"}`}
              >
                By using Lightning, you agree to these terms
              </p>
              <button
                onClick={onClose}
                className={`px-6 py-2 rounded-xl font-semibold transition-colors bg-blue-600 hover:bg-blue-700 text-white`}
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TermsOfService;

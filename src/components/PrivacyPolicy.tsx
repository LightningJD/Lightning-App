import { X, Shield } from "lucide-react";

interface PrivacyPolicyProps {
  isOpen: boolean;
  onClose: () => void;
  nightMode: boolean;
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({
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
                <Shield
                  className={`w-6 h-6 ${nightMode ? "text-white" : "text-blue-600"}`}
                />
                <div>
                  <h2
                    className={`text-xl font-bold ${nightMode ? "text-white" : "text-slate-900"}`}
                  >
                    Privacy Policy
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
                  1. Information We Collect
                </h3>
                <div className="space-y-3">
                  <div>
                    <h4
                      className={`font-medium mb-2 ${nightMode ? "text-slate-200" : "text-slate-800"}`}
                    >
                      Information You Provide:
                    </h4>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Name and username</li>
                      <li>Email address</li>
                      <li>Profile information (bio, avatar, location)</li>
                      <li>Testimony content</li>
                      <li>Messages and group communications</li>
                      <li>Photos you upload</li>
                    </ul>
                  </div>
                  <div>
                    <h4
                      className={`font-medium mb-2 ${nightMode ? "text-slate-200" : "text-slate-800"}`}
                    >
                      Information We Collect Automatically:
                    </h4>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Location data (when you enable location services)</li>
                      <li>Device information</li>
                      <li>Usage data and analytics</li>
                      <li>Login information and authentication tokens</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h3
                  className={`text-lg font-semibold mb-3 ${nightMode ? "text-white" : "text-slate-900"}`}
                >
                  2. How We Use Your Information
                </h3>
                <p className="leading-relaxed mb-3">
                  We use your information to:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide and improve the Lightning service</li>
                  <li>Connect you with other Christians in your area</li>
                  <li>Enable messaging and group features</li>
                  <li>Generate Lightning-assisted testimonies (with your consent)</li>
                  <li>Send notifications about app activity</li>
                  <li>Ensure safety and prevent abuse</li>
                  <li>Comply with legal obligations</li>
                </ul>
              </section>

              <section>
                <h3
                  className={`text-lg font-semibold mb-3 ${nightMode ? "text-white" : "text-slate-900"}`}
                >
                  3. Information Sharing
                </h3>
                <div className="space-y-3">
                  <p className="leading-relaxed">
                    We do not sell your personal information. We share your
                    information only in these circumstances:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>
                      <strong>With other users:</strong> Based on your privacy
                      settings
                    </li>
                    <li>
                      <strong>With your consent:</strong> When you explicitly
                      agree
                    </li>
                    <li>
                      <strong>For legal reasons:</strong> To comply with laws or
                      legal processes
                    </li>
                    <li>
                      <strong>To protect rights:</strong> To prevent harm or
                      protect our rights
                    </li>
                    <li>
                      <strong>With service providers:</strong> Who help us
                      operate the app (under strict confidentiality)
                    </li>
                  </ul>
                </div>
              </section>

              <section>
                <h3
                  className={`text-lg font-semibold mb-3 ${nightMode ? "text-white" : "text-slate-900"}`}
                >
                  4. Your Privacy Controls
                </h3>
                <p className="leading-relaxed mb-3">
                  You can control your privacy through:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>Profile Privacy:</strong> Make your profile private
                    or public
                  </li>
                  <li>
                    <strong>Testimony Visibility:</strong> Choose who can see
                    your testimony
                  </li>
                  <li>
                    <strong>Message Settings:</strong> Control who can message
                    you
                  </li>
                  <li>
                    <strong>Location Sharing:</strong> Enable or disable
                    location features
                  </li>
                  <li>
                    <strong>Blocking:</strong> Block users you don't want to
                    interact with
                  </li>
                  <li>
                    <strong>Data Deletion:</strong> Request deletion of your
                    account and data
                  </li>
                </ul>
              </section>

              <section>
                <h3
                  className={`text-lg font-semibold mb-3 ${nightMode ? "text-white" : "text-slate-900"}`}
                >
                  5. Data Security
                </h3>
                <p className="leading-relaxed">
                  We implement industry-standard security measures to protect
                  your information, including:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-3">
                  <li>Encryption of data in transit and at rest</li>
                  <li>Regular security audits and updates</li>
                  <li>Limited access to personal information</li>
                  <li>Secure authentication through Clerk</li>
                  <li>Regular backups and disaster recovery procedures</li>
                </ul>
              </section>

              <section>
                <h3
                  className={`text-lg font-semibold mb-3 ${nightMode ? "text-white" : "text-slate-900"}`}
                >
                  6. Data Retention
                </h3>
                <p className="leading-relaxed">
                  We retain your information for as long as your account is
                  active or as needed to provide services. If you delete your
                  account, we will delete your personal information within 30
                  days, except where we need to retain it for legal obligations.
                </p>
              </section>

              <section>
                <h3
                  className={`text-lg font-semibold mb-3 ${nightMode ? "text-white" : "text-slate-900"}`}
                >
                  7. Children's Privacy
                </h3>
                <p className="leading-relaxed">
                  Lightning is not intended for children under 13. We do not
                  knowingly collect information from children under 13. If you
                  believe we have collected information from a child under 13,
                  please contact us immediately.
                </p>
              </section>

              <section>
                <h3
                  className={`text-lg font-semibold mb-3 ${nightMode ? "text-white" : "text-slate-900"}`}
                >
                  8. Third-Party Services
                </h3>
                <p className="leading-relaxed mb-3">
                  We use the following third-party services:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>Clerk:</strong> For authentication and user
                    management
                  </li>
                  <li>
                    <strong>Supabase:</strong> For database and real-time
                    features
                  </li>
                  <li>
                    <strong>Cloudinary:</strong> For image storage and
                    processing
                  </li>
                  <li>
                    <strong>Anthropic:</strong> For Lightning-powered testimony generation
                  </li>
                  <li>
                    <strong>Sentry:</strong> For error monitoring and app
                    stability
                  </li>
                </ul>
                <p className="mt-3">
                  Each service has its own privacy policy and data practices.
                </p>
              </section>

              <section>
                <h3
                  className={`text-lg font-semibold mb-3 ${nightMode ? "text-white" : "text-slate-900"}`}
                >
                  9. Your Rights
                </h3>
                <p className="leading-relaxed mb-3">You have the right to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Access your personal information</li>
                  <li>Correct inaccurate information</li>
                  <li>Delete your account and data</li>
                  <li>Export your data</li>
                  <li>Opt-out of certain data uses</li>
                  <li>Lodge a complaint with data protection authorities</li>
                </ul>
              </section>

              <section>
                <h3
                  className={`text-lg font-semibold mb-3 ${nightMode ? "text-white" : "text-slate-900"}`}
                >
                  10. International Data Transfers
                </h3>
                <p className="leading-relaxed">
                  Your information may be transferred to and processed in
                  countries other than your own. We ensure appropriate
                  safeguards are in place to protect your information in
                  accordance with this privacy policy.
                </p>
              </section>

              <section>
                <h3
                  className={`text-lg font-semibold mb-3 ${nightMode ? "text-white" : "text-slate-900"}`}
                >
                  11. Changes to This Policy
                </h3>
                <p className="leading-relaxed">
                  We may update this Privacy Policy from time to time. We will
                  notify you of significant changes through the app or by email.
                  Your continued use after changes indicates acceptance of the
                  updated policy.
                </p>
              </section>

              <section>
                <h3
                  className={`text-lg font-semibold mb-3 ${nightMode ? "text-white" : "text-slate-900"}`}
                >
                  12. Contact Us
                </h3>
                <p className="leading-relaxed">
                  For privacy-related questions or concerns, contact us at:
                  <br />
                  <br />
                  <strong>Email:</strong> privacy@lightningapp.com
                  <br />
                  <strong>Address:</strong> Lightning App, LLC
                  <br />
                  Privacy Officer
                  <br />
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
                Your privacy is important to us
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

export default PrivacyPolicy;

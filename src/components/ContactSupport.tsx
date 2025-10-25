import React, { useState } from 'react';
import { X, Phone, Mail, Send, CheckCircle } from 'lucide-react';
import { showError, showSuccess } from '../lib/toast';
import { validateMessage, sanitizeInput } from '../lib/inputValidation';

const ContactSupport = ({ isOpen, onClose, nightMode, userProfile }) => {
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    email: userProfile?.email || ''
  });
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate inputs
    if (!formData.subject.trim()) {
      showError('Please enter a subject');
      return;
    }

    const messageValidation = validateMessage(formData.message, 'bugReport');
    if (!messageValidation.valid) {
      showError(messageValidation.errors[0]);
      return;
    }

    if (!formData.email.trim()) {
      showError('Please enter your email');
      return;
    }

    setIsSending(true);

    try {
      // Sanitize inputs
      const sanitizedData = {
        subject: sanitizeInput(formData.subject),
        message: sanitizeInput(formData.message),
        email: sanitizeInput(formData.email),
        username: userProfile?.username || 'Guest',
        userId: userProfile?.supabaseId || 'N/A',
        timestamp: new Date().toISOString()
      };

      // For now, just log to console (in production, this would send to a support system)
      console.log('Support Request:', sanitizedData);

      // Simulate email sending
      // In production, this would integrate with a service like SendGrid, Postmark, or Supabase Edge Functions
      await new Promise(resolve => setTimeout(resolve, 1000));

      setSent(true);
      showSuccess('Support request sent successfully!');

      // Reset form after 2 seconds
      setTimeout(() => {
        setSent(false);
        setFormData({ subject: '', message: '', email: userProfile?.email || '' });
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error sending support request:', error);
      showError('Failed to send support request. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={`w-full max-w-2xl rounded-2xl shadow-2xl max-h-[85vh] overflow-hidden flex flex-col ${
            nightMode ? 'bg-[#0a0a0a]' : 'bg-white'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="p-6"
            style={{
              background: nightMode
                ? 'linear-gradient(135deg, #4faaf8 0%, #3b82f6 50%, #2563eb 100%)'
                : 'linear-gradient(135deg, rgba(219, 234, 254, 0.8) 0%, rgba(191, 219, 254, 0.8) 100%)'
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Phone className={`w-6 h-6 ${nightMode ? 'text-white' : 'text-blue-600'}`} />
                <div>
                  <h2 className={`text-xl font-bold ${nightMode ? 'text-white' : 'text-slate-900'}`}>
                    Contact Support
                  </h2>
                  <p className={`text-sm ${nightMode ? 'text-white/90' : 'text-slate-600'}`}>
                    We're here to help
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                  nightMode
                    ? 'bg-white/10 hover:bg-white/20 text-white'
                    : 'bg-blue-50 hover:bg-blue-100 text-blue-600'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {sent ? (
              <div className="flex flex-col items-center justify-center py-12">
                <CheckCircle className={`w-16 h-16 mb-4 ${nightMode ? 'text-green-400' : 'text-green-600'}`} />
                <h3 className={`text-xl font-bold mb-2 ${nightMode ? 'text-white' : 'text-slate-900'}`}>
                  Message Sent!
                </h3>
                <p className={`text-center ${nightMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  We'll get back to you as soon as possible.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Contact Info */}
                <div className={`p-4 rounded-xl border ${
                  nightMode ? 'bg-white/5 border-white/10' : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-start gap-3">
                    <Mail className={`w-5 h-5 mt-0.5 ${nightMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    <div className="flex-1">
                      <p className={`font-medium mb-1 ${nightMode ? 'text-white' : 'text-slate-900'}`}>
                        Email Support
                      </p>
                      <p className={`text-sm ${nightMode ? 'text-slate-300' : 'text-slate-600'}`}>
                        support@lightningapp.com
                      </p>
                      <p className={`text-xs mt-2 ${nightMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        We typically respond within 24-48 hours
                      </p>
                    </div>
                  </div>
                </div>

                {/* Email Field */}
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${
                    nightMode ? 'text-slate-100' : 'text-slate-900'
                  }`}>
                    Your Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="your@email.com"
                    required
                    className={`w-full px-4 py-3 rounded-xl transition-colors ${
                      nightMode
                        ? 'bg-white/5 border border-white/10 text-white placeholder-slate-400 focus:bg-white/10'
                        : 'bg-white border border-slate-200 text-gray-900 placeholder-gray-400'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                </div>

                {/* Subject Field */}
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${
                    nightMode ? 'text-slate-100' : 'text-slate-900'
                  }`}>
                    Subject *
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => handleInputChange('subject', e.target.value)}
                    placeholder="What do you need help with?"
                    required
                    className={`w-full px-4 py-3 rounded-xl transition-colors ${
                      nightMode
                        ? 'bg-white/5 border border-white/10 text-white placeholder-slate-400 focus:bg-white/10'
                        : 'bg-white border border-slate-200 text-gray-900 placeholder-gray-400'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                </div>

                {/* Message Field */}
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${
                    nightMode ? 'text-slate-100' : 'text-slate-900'
                  }`}>
                    Message *
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    placeholder="Please describe your issue or question in detail..."
                    required
                    rows={6}
                    className={`w-full px-4 py-3 rounded-xl transition-colors resize-none ${
                      nightMode
                        ? 'bg-white/5 border border-white/10 text-white placeholder-slate-400 focus:bg-white/10'
                        : 'bg-white border border-slate-200 text-gray-900 placeholder-gray-400'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  <p className={`text-xs mt-1 ${nightMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {formData.message.length}/2000 characters
                  </p>
                </div>

                {/* Quick Tips */}
                <div className={`p-4 rounded-xl border ${
                  nightMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'
                }`}>
                  <p className={`text-sm font-medium mb-2 ${nightMode ? 'text-slate-100' : 'text-slate-900'}`}>
                    💡 Quick Tips:
                  </p>
                  <ul className={`text-xs space-y-1 ${nightMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    <li>• Include your username: {userProfile?.username || 'Not logged in'}</li>
                    <li>• Describe what you were doing when the issue occurred</li>
                    <li>• Include any error messages you saw</li>
                    <li>• Attach screenshots if helpful (coming soon)</li>
                  </ul>
                </div>
              </form>
            )}
          </div>

          {/* Footer */}
          {!sent && (
            <div className={`p-6 border-t ${nightMode ? 'border-white/10' : 'border-slate-200'}`}>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={onClose}
                  className={`px-6 py-2 rounded-xl font-semibold transition-colors ${
                    nightMode
                      ? 'bg-white/5 hover:bg-white/10 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSending}
                  className={`px-6 py-2 rounded-xl font-semibold transition-colors flex items-center gap-2 ${
                    isSending
                      ? 'bg-blue-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white`}
                >
                  {isSending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Message
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ContactSupport;
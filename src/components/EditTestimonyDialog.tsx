import { useState, useRef, useEffect } from 'react';
import { X, Save, Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';

interface EditTestimonyDialogProps {
  testimony: any;
  nightMode: boolean;
  onSave: (formData: any) => void;
  onClose: () => void;
}

interface FormData {
  question1: string;
  question2: string;
  question3: string;
  question4: string;
  lesson: string;
}

const EditTestimonyDialog: React.FC<EditTestimonyDialogProps> = ({ testimony, nightMode, onSave, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    question1: testimony?.question1_answer || '',
    question2: testimony?.question2_answer || '',
    question3: testimony?.question3_answer || '',
    question4: testimony?.question4_answer || '',
    lesson: testimony?.lesson || ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const testimonyQuestions = [
    {
      id: 1,
      question: "How was your life like before you were saved?",
      placeholder: "Describe your background growing up or if you were always saved...",
      hint: "As in what was your background growing up or were you always saved?",
      field: 'question1'
    },
    {
      id: 2,
      question: "What led you to salvation or your own personal relationship with God?",
      placeholder: "Share what drew you to a relationship with God...",
      hint: "This could be a person, event, realization, or series of circumstances",
      field: 'question2'
    },
    {
      id: 3,
      question: "Was there a specific moment where you encountered God or a special situation that was the turning point to your relationship with God?",
      placeholder: "Describe this experience in detail...",
      hint: "If so, please describe this specific experience in detail",
      field: 'question3'
    },
    {
      id: 4,
      question: "What do you do now and what do you believe is your current mission or calling from God in your current place now?",
      placeholder: "Share your current calling, ministry, or mission...",
      hint: "Tell us about what you do now such as your current job position, ministry, or role",
      field: 'question4'
    }
  ];

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus on textarea when step changes
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [currentStep]);

  const validateStep = (stepIndex: number) => {
    const newErrors: Record<string, string> = {};
    const question = testimonyQuestions[stepIndex];
    const fieldName = question.field as keyof FormData;

    if (!formData[fieldName]?.trim()) {
      newErrors[fieldName] = 'This answer is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < testimonyQuestions.length) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setErrors({});
    }
  };

  const handleSave = async () => {
    // Validate lesson field
    if (currentStep === testimonyQuestions.length && !formData.lesson?.trim()) {
      setErrors({ lesson: 'Lesson is required' });
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Error saving testimony:', error);
      setErrors({ submit: 'Failed to save testimony. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData({ ...formData, [field]: value });
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  const renderStepContent = () => {
    if (currentStep < testimonyQuestions.length) {
      const question = testimonyQuestions[currentStep];

      return (
        <div className="space-y-4">
          <div>
            <h3 className={`text-lg font-semibold mb-2 ${nightMode ? 'text-slate-100' : 'text-slate-900'}`}>
              Question {currentStep + 1} of {testimonyQuestions.length}
            </h3>
            <p className={`font-medium mb-1 ${nightMode ? 'text-slate-100' : 'text-slate-700'}`}>
              {question.question}
            </p>
            <p className={`text-xs italic ${nightMode ? 'text-slate-100' : 'text-slate-500'}`}>
              💡 {question.hint}
            </p>
          </div>

          <textarea
            ref={textareaRef}
            value={formData[question.field]}
            onChange={(e) => handleInputChange(question.field, e.target.value)}
            placeholder={question.placeholder}
            className={`w-full h-40 p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm ${
              nightMode
                ? 'bg-white/5 border-white/10 text-slate-100 placeholder-gray-400'
                : 'bg-white border-slate-200 text-slate-900'
            } ${errors[question.field] ? 'border-red-500' : ''}`}
          />
          {errors[question.field] && (
            <p className="text-red-500 text-xs mt-1">{errors[question.field]}</p>
          )}
        </div>
      );
    } else {
      // Lesson step
      return (
        <div className="space-y-4">
          <div>
            <h3 className={`text-lg font-semibold mb-2 ${nightMode ? 'text-slate-100' : 'text-slate-900'}`}>
              A Lesson Learned
            </h3>
            <p className={`text-sm mb-1 ${nightMode ? 'text-slate-100' : 'text-slate-700'}`}>
              What's the key lesson or takeaway from your testimony?
            </p>
            <p className={`text-xs italic ${nightMode ? 'text-slate-100' : 'text-slate-500'}`}>
              💡 This helps others understand the spiritual growth and wisdom you gained
            </p>
          </div>

          <textarea
            ref={textareaRef}
            value={formData.lesson}
            onChange={(e) => handleInputChange('lesson', e.target.value)}
            placeholder="Share the most important lesson God taught you through this journey..."
            rows={6}
            className={`w-full p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm ${
              nightMode
                ? 'bg-white/5 border-white/10 text-slate-100 placeholder-gray-400'
                : 'bg-white border-slate-200 text-slate-900'
            } ${errors.lesson ? 'border-red-500' : ''}`}
          />
          {errors.lesson && (
            <p className="text-red-500 text-xs mt-1">{errors.lesson}</p>
          )}
        </div>
      );
    }
  };

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
          className={`w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col ${nightMode ? 'bg-[#0a0a0a]' : 'bg-white'}`}
          style={{
            animation: 'popOut 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            transformOrigin: 'center'
          }}
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
                <Sparkles className={`w-6 h-6 ${nightMode ? 'text-white' : 'text-blue-600'}`} />
                <div>
                  <h2 className={`text-xl font-bold ${nightMode ? 'text-white' : 'text-slate-900'}`}>
                    Edit Your Testimony
                  </h2>
                  <p className={`text-sm ${nightMode ? 'text-white/90' : 'text-slate-600'}`}>
                    Update your story and testimony
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                  nightMode
                    ? 'bg-white/20 hover:bg-white/30 text-white'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="flex gap-1 mt-4">
              {[...Array(testimonyQuestions.length + 1)].map((_, index) => (
                <div
                  key={index}
                  className={`flex-1 h-1 rounded-full transition-all ${
                    index <= currentStep
                      ? nightMode ? 'bg-white' : 'bg-blue-600'
                      : nightMode ? 'bg-white/30' : 'bg-slate-300'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {renderStepContent()}

            {/* Error Message */}
            {errors.submit && (
              <div className="mt-4 p-3 rounded-lg bg-red-100 border border-red-300">
                <p className="text-red-700 text-sm text-center">{errors.submit}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`p-6 border-t flex gap-3 ${nightMode ? 'border-white/10' : 'border-slate-200'}`}>
            {currentStep > 0 && (
              <button
                onClick={handleBack}
                disabled={isSaving}
                className={`px-4 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 ${
                  nightMode
                    ? 'bg-white/5 hover:bg-white/10 text-slate-100'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}

            {currentStep < testimonyQuestions.length ? (
              <button
                onClick={handleNext}
                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-slate-100 border border-white/20`}
                style={{
                  background: nightMode ? 'rgba(79, 150, 255, 0.85)' : 'linear-gradient(135deg, #4faaf8 0%, #3b82f6 50%, #2563eb 100%)',
                  boxShadow: nightMode
                    ? '0 2px 8px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                    : '0 2px 8px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
                }}
                onMouseEnter={(e) => {
                  if (nightMode) {
                    e.currentTarget.style.background = 'rgba(79, 150, 255, 1.0)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (nightMode) {
                    e.currentTarget.style.background = 'rgba(79, 150, 255, 0.85)';
                  }
                }}
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-slate-100 border border-white/20`}
                style={{
                  background: nightMode ? 'rgba(79, 150, 255, 0.85)' : 'linear-gradient(135deg, #4faaf8 0%, #3b82f6 50%, #2563eb 100%)',
                  boxShadow: nightMode
                    ? '0 2px 8px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                    : '0 2px 8px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
                }}
                onMouseEnter={(e) => {
                  if (nightMode && !isSaving) {
                    e.currentTarget.style.background = 'rgba(79, 150, 255, 1.0)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (nightMode && !isSaving) {
                    e.currentTarget.style.background = 'rgba(79, 150, 255, 0.85)';
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
                    Save Testimony
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Animation Styles */}
      <style>{`
        @keyframes popOut {
          0% {
            transform: scale(0.9);
            opacity: 0;
          }
          60% {
            transform: scale(1.02);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
};

export default EditTestimonyDialog;

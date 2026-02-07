import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, Sparkles, Loader, Lock, Globe, Link2, BookOpen } from 'lucide-react';
import { TESTIMONY_QUESTIONS, validateAnswers, getWordCount } from '../config/testimonyQuestions';
import { generateTestimony, type TestimonyAnswers } from '../lib/api/claude';
import { checkRateLimit, recordAttempt } from '../lib/rateLimiter';

type TestimonyVisibility = 'my_church' | 'all_churches' | 'shareable';

interface TestimonyQuestionnaireProps {
    nightMode: boolean;
    userName?: string;
    userAge?: number;
    userId?: string; // Supabase user UUID for server-side rate limiting
    hasChurch?: boolean;
    onComplete: (testimonyData: { content: string; answers: TestimonyAnswers; visibility?: TestimonyVisibility }) => void;
    onCancel: () => void;
}

const TestimonyQuestionnaire: React.FC<TestimonyQuestionnaireProps> = ({
    nightMode,
    userName,
    userAge,
    userId,
    hasChurch = false,
    onComplete,
    onCancel
}) => {
    const [showIntro, setShowIntro] = useState(true);
    const [currentStep, setCurrentStep] = useState(0);
    const [visibility, setVisibility] = useState<TestimonyVisibility>(hasChurch ? 'my_church' : 'all_churches');
    const [answers, setAnswers] = useState<TestimonyAnswers>({
        question1: '',
        question2: '',
        question3: '',
        question4: ''
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedTestimony, setGeneratedTestimony] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editedTestimony, setEditedTestimony] = useState('');

    const currentQuestion = TESTIMONY_QUESTIONS[currentStep];
    const isLastQuestion = currentStep === TESTIMONY_QUESTIONS.length - 1;

    const handleAnswerChange = (value: string) => {
        const questionId = currentQuestion.id as keyof TestimonyAnswers;
        setAnswers(prev => ({
            ...prev,
            [questionId]: value
        }));

        // Clear error when user starts typing
        if (errors[questionId]) {
            const { [questionId]: _, ...remainingErrors } = errors;
            setErrors(remainingErrors);
        }
    };

    const handleNext = () => {
        const questionId = currentQuestion.id as keyof TestimonyAnswers;
        const answer = answers[questionId] || '';

        if (answer.trim().length < currentQuestion.minLength) {
            setErrors({
                [questionId]: `Please provide at least ${currentQuestion.minLength} characters (currently ${answer.trim().length})`
            });
            return;
        }

        if (isLastQuestion) {
            // Validate all answers before generating
            const validation = validateAnswers(answers as any);
            if (!validation.valid) {
                setErrors(validation.errors);
                return;
            }
            handleGenerateTestimony();
        } else {
            setCurrentStep(prev => prev + 1);
            setErrors({});
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
            setErrors({});
        }
    };

    const handleGenerateTestimony = async () => {
        // Layer 1: Client-side rate limit check
        const rateLimitCheck = checkRateLimit('generate_testimony');
        if (!rateLimitCheck.allowed) {
            setErrors({
                general: rateLimitCheck.reason || 'Too many generation attempts. Please wait before trying again.'
            });
            return;
        }

        setIsGenerating(true);
        setErrors({});

        try {
            const result = await generateTestimony({
                answers: answers,
                userName,
                userAge,
                userId
            });

            if (result.success && result.testimony) {
                // Record the successful attempt for client-side rate limiting
                recordAttempt('generate_testimony');
                setGeneratedTestimony(result.testimony);
                setEditedTestimony(result.testimony);
            } else {
                setErrors({
                    general: result.error || 'Failed to generate testimony. Please try again.'
                });
            }
        } catch (error) {
            setErrors({
                general: 'An unexpected error occurred. Please try again.'
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRegenerate = () => {
        if (isGenerating) return;
        setGeneratedTestimony(null);
        setEditedTestimony('');
        setCurrentStep(0);
    };

    const handleSave = () => {
        onComplete({
            content: editedTestimony,
            answers: answers,
            visibility: visibility
        });
    };

    const currentAnswer = currentQuestion ? (answers[currentQuestion.id as keyof TestimonyAnswers] || '') : '';
    const wordCount = getWordCount(currentAnswer);
    const totalWords = (Object.keys(answers) as Array<keyof TestimonyAnswers>).reduce((sum: number, key) => sum + getWordCount(answers[key]), 0);

    // Show generated testimony review screen
    if (generatedTestimony) {
        return (
            <>
                {/* Backdrop */}
                <div className="fixed inset-0 bg-black/60 z-50 animate-in fade-in duration-200" />

                {/* Modal */}
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className={`w-full max-w-3xl rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col ${nightMode ? 'bg-[#0a0a0a]' : 'bg-white'
                            }`}
                        style={{
                            animation: 'popOut 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                        }}
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
                            <div className="flex items-center gap-3">
                                <Sparkles className={`w-6 h-6 ${nightMode ? 'text-white' : 'text-blue-600'}`} />
                                <div>
                                    <h2 className={`text-xl font-bold ${nightMode ? 'text-white' : 'text-slate-900'}`}>
                                        Your Generated Testimony
                                    </h2>
                                    <p className={`text-sm ${nightMode ? 'text-white/90' : 'text-slate-600'}`}>
                                        Review and edit as needed
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {isEditing ? (
                                <textarea
                                    value={editedTestimony}
                                    onChange={(e) => setEditedTestimony(e.target.value)}
                                    className={`w-full h-96 px-4 py-3 rounded-lg border resize-none ${nightMode
                                        ? 'bg-white/5 border-white/10 text-slate-100'
                                        : 'bg-white border-slate-200 text-slate-900'
                                        }`}
                                    style={{
                                        fontFamily: 'inherit',
                                        fontSize: '0.875rem',
                                        lineHeight: '1.5'
                                    }}
                                />
                            ) : (
                                <div
                                    className={`prose max-w-none ${nightMode ? 'prose-invert' : ''}`}
                                    style={{
                                        whiteSpace: 'pre-wrap',
                                        fontSize: '0.875rem',
                                        lineHeight: '1.75'
                                    }}
                                >
                                    {editedTestimony.split('\n\n').map((paragraph, idx) => (
                                        <p key={idx} className={nightMode ? 'text-slate-100' : 'text-slate-900'}>
                                            {paragraph}
                                        </p>
                                    ))}
                                </div>
                            )}

                            <div className={`text-xs ${nightMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                {getWordCount(editedTestimony)} words
                            </div>

                            {/* Visibility Selector */}
                            <div className={`mt-4 p-3 rounded-xl ${nightMode ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
                                <div className={`text-[11px] font-bold uppercase tracking-wide mb-2 ${nightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                    Who can see this?
                                </div>
                                <div className="flex gap-2">
                                    {hasChurch && (
                                        <button
                                            onClick={() => setVisibility('my_church')}
                                            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                                                visibility === 'my_church'
                                                    ? nightMode
                                                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                                                        : 'bg-blue-50 border-blue-300 text-blue-700'
                                                    : nightMode
                                                        ? 'bg-transparent border-white/10 text-slate-500 hover:text-slate-400'
                                                        : 'bg-transparent border-slate-200 text-slate-400 hover:text-slate-600'
                                            }`}
                                        >
                                            <Lock className="w-3 h-3" />
                                            My Church
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setVisibility('all_churches')}
                                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                                            visibility === 'all_churches'
                                                ? nightMode
                                                    ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                                                    : 'bg-blue-50 border-blue-300 text-blue-700'
                                                : nightMode
                                                    ? 'bg-transparent border-white/10 text-slate-500 hover:text-slate-400'
                                                    : 'bg-transparent border-slate-200 text-slate-400 hover:text-slate-600'
                                        }`}
                                    >
                                        <Globe className="w-3 h-3" />
                                        All Churches
                                    </button>
                                    <button
                                        onClick={() => setVisibility('shareable')}
                                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                                            visibility === 'shareable'
                                                ? nightMode
                                                    ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                                                    : 'bg-blue-50 border-blue-300 text-blue-700'
                                                : nightMode
                                                    ? 'bg-transparent border-white/10 text-slate-500 hover:text-slate-400'
                                                    : 'bg-transparent border-slate-200 text-slate-400 hover:text-slate-600'
                                        }`}
                                    >
                                        <Link2 className="w-3 h-3" />
                                        Shareable
                                    </button>
                                </div>
                                <p className={`text-[10px] mt-1.5 ${nightMode ? 'text-slate-600' : 'text-slate-400'}`}>
                                    {visibility === 'my_church' && 'Only members of your church can see this testimony'}
                                    {visibility === 'all_churches' && 'Friends and church community members can see this'}
                                    {visibility === 'shareable' && 'Anyone on Lightning can discover this testimony'}
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className={`p-6 border-t flex gap-3 ${nightMode ? 'border-white/10' : 'border-slate-200'}`}>
                            <button
                                onClick={handleRegenerate}
                                className={`px-4 py-3 rounded-lg font-semibold transition-colors ${nightMode
                                    ? 'bg-white/5 hover:bg-white/10 text-slate-100'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                    }`}
                            >
                                Start Over
                            </button>

                            <button
                                onClick={() => setIsEditing(!isEditing)}
                                className={`px-4 py-3 rounded-lg font-semibold transition-colors ${nightMode
                                    ? 'bg-white/5 hover:bg-white/10 text-slate-100'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                    }`}
                            >
                                {isEditing ? 'Preview' : 'Edit'}
                            </button>

                            <button
                                onClick={handleSave}
                                className="flex-1 px-4 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-white border border-white/20"
                                style={{
                                    background: nightMode
                                        ? 'rgba(79, 150, 255, 0.85)'
                                        : 'linear-gradient(135deg, #4faaf8 0%, #3b82f6 50%, #2563eb 100%)',
                                    boxShadow: nightMode
                                        ? '0 2px 8px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                                        : '0 2px 8px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
                                }}
                            >
                                <Sparkles className="w-4 h-4" />
                                Save Testimony
                            </button>
                        </div>
                    </div>
                </div>

                <style>{`
          @keyframes popOut {
            0% { transform: scale(0.9); opacity: 0; }
            60% { transform: scale(1.02); }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>
            </>
        );
    }

    // Show intro screen
    if (showIntro) {
        return (
            <>
                {/* Backdrop */}
                <div className="fixed inset-0 bg-black/60 z-50 animate-in fade-in duration-200" />

                {/* Intro Modal */}
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className={`w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col ${nightMode ? 'bg-[#0a0a0a]' : 'bg-white'}`}
                        style={{
                            animation: 'popOut 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                        }}
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
                                    <BookOpen className={`w-6 h-6 ${nightMode ? 'text-white' : 'text-blue-600'}`} />
                                    <h2 className={`text-xl font-bold ${nightMode ? 'text-white' : 'text-slate-900'}`}>
                                        Your Story Matters
                                    </h2>
                                </div>
                                <button
                                    onClick={onCancel}
                                    className={`text-sm font-medium ${nightMode ? 'text-white/80 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="space-y-5">
                                <p className={`text-base leading-relaxed ${nightMode ? 'text-slate-200' : 'text-slate-800'}`}>
                                    Every generation has a testimony and every testimony has the power to change a generation. Share yours today.
                                </p>

                                <div className={`rounded-xl p-4 ${nightMode ? 'bg-white/5' : 'bg-blue-50/70'}`}>
                                    <p className={`text-sm italic leading-relaxed ${nightMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                        "They triumphed over him by the blood of the Lamb and by the word of their testimony."
                                    </p>
                                    <p className={`text-xs mt-2 font-semibold ${nightMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                        — Revelation 12:11
                                    </p>
                                </div>

                            </div>
                        </div>

                        {/* Footer */}
                        <div className={`p-6 border-t ${nightMode ? 'border-white/10' : 'border-slate-200'}`}>
                            <button
                                onClick={() => setShowIntro(false)}
                                className="w-full px-4 py-3.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-white border border-white/20"
                                style={{
                                    background: nightMode
                                        ? 'rgba(79, 150, 255, 0.85)'
                                        : 'linear-gradient(135deg, #4faaf8 0%, #3b82f6 50%, #2563eb 100%)',
                                    boxShadow: nightMode
                                        ? '0 2px 8px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                                        : '0 2px 8px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
                                }}
                            >
                                I'm Ready
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                <style>{`
          @keyframes popOut {
            0% { transform: scale(0.9); opacity: 0; }
            60% { transform: scale(1.02); }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>
            </>
        );
    }

    // Show questionnaire
    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/60 z-50 animate-in fade-in duration-200" />

            {/* Wizard Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    className={`w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col ${nightMode ? 'bg-[#0a0a0a]' : 'bg-white'
                        }`}
                    style={{
                        animation: 'popOut 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                    }}
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
                                        Share Your Story
                                    </h2>
                                    <p className={`text-sm ${nightMode ? 'text-white/90' : 'text-slate-600'}`}>
                                        Question {currentStep + 1} of {TESTIMONY_QUESTIONS.length}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onCancel}
                                className={`text-sm font-medium ${nightMode ? 'text-white/80 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                Cancel
                            </button>
                        </div>

                        {/* Progress Bar */}
                        <div className="flex gap-1 mt-4">
                            {TESTIMONY_QUESTIONS.map((_, index) => (
                                <div
                                    key={index}
                                    className={`flex-1 h-1 rounded-full transition-all ${index <= currentStep
                                        ? nightMode
                                            ? 'bg-white'
                                            : 'bg-blue-600'
                                        : nightMode
                                            ? 'bg-white/30'
                                            : 'bg-slate-300'
                                        }`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="space-y-4">
                            <div>
                                <label
                                    className={`block text-base font-semibold mb-2 ${nightMode ? 'text-slate-100' : 'text-slate-900'
                                        }`}
                                >
                                    {currentQuestion.question}
                                </label>
                                <p className={`text-sm mb-3 ${nightMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                    {currentQuestion.hint}
                                </p>
                                <textarea
                                    value={currentAnswer}
                                    onChange={(e) => handleAnswerChange(e.target.value)}
                                    placeholder={currentQuestion.placeholder}
                                    rows={8}
                                    className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${nightMode
                                        ? 'bg-white/5 border-white/10 text-slate-100 placeholder-gray-400'
                                        : 'bg-white border-slate-200 text-slate-900 placeholder-gray-500'
                                        } ${errors[currentQuestion.id] ? 'border-red-500' : ''}`}
                                />
                                {errors[currentQuestion.id] && (
                                    <p className="text-red-500 text-sm mt-1">{errors[currentQuestion.id]}</p>
                                )}
                                <div className={`flex justify-between items-center mt-2 text-xs ${nightMode ? 'text-slate-400' : 'text-slate-500'
                                    }`}>
                                    <span>
                                        {wordCount} words • {currentAnswer.length}/{currentQuestion.minLength} characters minimum
                                    </span>
                                    <span>Total: {totalWords} words across all questions</span>
                                </div>
                            </div>

                            {errors.general && (
                                <div className="p-3 rounded-lg bg-red-100 border border-red-300">
                                    <p className="text-red-700 text-sm">{errors.general}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className={`p-6 border-t flex gap-3 ${nightMode ? 'border-white/10' : 'border-slate-200'}`}>
                        {currentStep > 0 && (
                            <button
                                onClick={handleBack}
                                disabled={isGenerating}
                                className={`px-4 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 ${nightMode
                                    ? 'bg-white/5 hover:bg-white/10 text-slate-100'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                    }`}
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back
                            </button>
                        )}

                        <button
                            onClick={handleNext}
                            disabled={isGenerating}
                            className="flex-1 px-4 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-white border border-white/20 disabled:opacity-50"
                            style={{
                                background: nightMode
                                    ? 'rgba(79, 150, 255, 0.85)'
                                    : 'linear-gradient(135deg, #4faaf8 0%, #3b82f6 50%, #2563eb 100%)',
                                boxShadow: nightMode
                                    ? '0 2px 8px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                                    : '0 2px 8px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
                            }}
                        >
                            {isGenerating ? (
                                <>
                                    <Loader className="w-4 h-4 animate-spin" />
                                    Generating Testimony...
                                </>
                            ) : isLastQuestion ? (
                                <>
                                    <Sparkles className="w-4 h-4" />
                                    Generate Testimony
                                </>
                            ) : (
                                <>
                                    Next
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
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

export default TestimonyQuestionnaire;

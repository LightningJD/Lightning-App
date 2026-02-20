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

    const [saveError, setSaveError] = useState('');

    const handleSave = () => {
        if (!editedTestimony || editedTestimony.trim().length < 50) {
            setSaveError('Testimony must be at least 50 characters. Please add more detail.');
            return;
        }
        setSaveError('');
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
                        className="w-full max-w-3xl rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
                        style={{
                            background: nightMode ? '#0d0b18' : 'linear-gradient(135deg, #cdd8f8 0%, #d6daf5 40%, #dee0f6 70%, #e4e0f5 100%)',
                            border: `1px solid ${nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(150,165,225,0.15)'}`,
                            animation: 'popOut 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                        }}
                    >
                        {/* Header */}
                        <div className="px-6 pt-6 pb-3">
                            <div className="flex items-center gap-3">
                                <Sparkles className="w-5 h-5" style={{ color: nightMode ? '#7b76e0' : '#4facfe' }} />
                                <div>
                                    <h2
                                        className="text-xl font-semibold"
                                        style={{ fontFamily: "'Playfair Display', serif", color: nightMode ? '#e8e5f2' : '#1e2b4a' }}
                                    >
                                        Your Generated Testimony
                                    </h2>
                                    <p className="text-sm" style={{ color: nightMode ? '#8e89a8' : '#4a5e88' }}>
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
                                    onChange={(e) => { setEditedTestimony(e.target.value); if (saveError) setSaveError(''); }}
                                    className="w-full h-96 px-4 py-3 rounded-xl resize-none focus:outline-none"
                                    style={{
                                        background: nightMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.5)',
                                        border: `1px solid ${nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(150,165,225,0.15)'}`,
                                        color: nightMode ? '#e8e5f2' : '#1e2b4a',
                                        fontFamily: "'General Sans', system-ui, sans-serif",
                                        fontSize: '0.875rem',
                                        lineHeight: '1.6',
                                        ...(nightMode ? {} : { backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }),
                                    }}
                                />
                            ) : (
                                <div
                                    className="rounded-xl p-4"
                                    style={{
                                        background: nightMode ? 'rgba(123,118,224,0.05)' : 'rgba(79,172,254,0.05)',
                                        border: `1px solid ${nightMode ? 'rgba(123,118,224,0.1)' : 'rgba(79,172,254,0.1)'}`,
                                        borderLeft: `2px solid ${nightMode ? '#7b76e0' : '#4facfe'}`,
                                        whiteSpace: 'pre-wrap',
                                        fontSize: '0.875rem',
                                        lineHeight: '1.75'
                                    }}
                                >
                                    {editedTestimony.split('\n\n').map((paragraph, idx) => (
                                        <p
                                            key={idx}
                                            className="mb-3 last:mb-0"
                                            style={{
                                                fontFamily: "'Playfair Display', serif",
                                                fontStyle: 'italic',
                                                color: nightMode ? '#b8b4c8' : '#3a4d6e',
                                            }}
                                        >
                                            {paragraph}
                                        </p>
                                    ))}
                                </div>
                            )}

                            <div className="text-xs" style={{ color: nightMode ? '#5d5877' : '#8e9ec0' }}>
                                {getWordCount(editedTestimony)} words
                            </div>

                            {/* Visibility Selector */}
                            <div
                                className="mt-4 p-3 rounded-xl"
                                style={{
                                    background: nightMode ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.35)',
                                    border: `1px solid ${nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(150,165,225,0.1)'}`,
                                }}
                            >
                                <div
                                    className="text-[11px] font-bold uppercase tracking-wide mb-2"
                                    style={{ color: nightMode ? '#5d5877' : '#8e9ec0' }}
                                >
                                    Who can see this?
                                </div>
                                <div className="flex gap-2">
                                    {hasChurch && (
                                        <button
                                            onClick={() => setVisibility('my_church')}
                                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                                            style={visibility === 'my_church' ? {
                                                background: nightMode ? 'rgba(123,118,224,0.15)' : 'rgba(79,172,254,0.12)',
                                                border: `1px solid ${nightMode ? 'rgba(123,118,224,0.3)' : 'rgba(79,172,254,0.25)'}`,
                                                color: nightMode ? '#9b96f5' : '#2b6cb0',
                                            } : {
                                                background: 'transparent',
                                                border: `1px solid ${nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(150,165,225,0.15)'}`,
                                                color: nightMode ? '#5d5877' : '#8e9ec0',
                                            }}
                                        >
                                            <Lock className="w-3 h-3" />
                                            My Church
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setVisibility('all_churches')}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                                        style={visibility === 'all_churches' ? {
                                            background: nightMode ? 'rgba(123,118,224,0.15)' : 'rgba(79,172,254,0.12)',
                                            border: `1px solid ${nightMode ? 'rgba(123,118,224,0.3)' : 'rgba(79,172,254,0.25)'}`,
                                            color: nightMode ? '#9b96f5' : '#2b6cb0',
                                        } : {
                                            background: 'transparent',
                                            border: `1px solid ${nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(150,165,225,0.15)'}`,
                                            color: nightMode ? '#5d5877' : '#8e9ec0',
                                        }}
                                    >
                                        <Globe className="w-3 h-3" />
                                        All Churches
                                    </button>
                                    <button
                                        onClick={() => setVisibility('shareable')}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                                        style={visibility === 'shareable' ? {
                                            background: nightMode ? 'rgba(123,118,224,0.15)' : 'rgba(79,172,254,0.12)',
                                            border: `1px solid ${nightMode ? 'rgba(123,118,224,0.3)' : 'rgba(79,172,254,0.25)'}`,
                                            color: nightMode ? '#9b96f5' : '#2b6cb0',
                                        } : {
                                            background: 'transparent',
                                            border: `1px solid ${nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(150,165,225,0.15)'}`,
                                            color: nightMode ? '#5d5877' : '#8e9ec0',
                                        }}
                                    >
                                        <Link2 className="w-3 h-3" />
                                        Shareable
                                    </button>
                                </div>
                                <p className="text-[10px] mt-1.5" style={{ color: nightMode ? '#5d5877' : '#8e9ec0' }}>
                                    {visibility === 'my_church' && 'Only members of your church can see this testimony'}
                                    {visibility === 'all_churches' && 'Friends and church community members can see this'}
                                    {visibility === 'shareable' && 'Anyone on Lightning can discover this testimony'}
                                </p>
                            </div>

                            {saveError && (
                                <div
                                    className="p-3 rounded-xl"
                                    style={{
                                        background: nightMode ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.08)',
                                        border: '1px solid rgba(239,68,68,0.2)',
                                    }}
                                >
                                    <p className="text-sm" style={{ color: nightMode ? '#ef4444' : '#dc2626' }}>{saveError}</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div
                            className="p-6 flex gap-3"
                            style={{ borderTop: `1px solid ${nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(150,165,225,0.15)'}` }}
                        >
                            <button
                                onClick={handleRegenerate}
                                className="px-4 py-3 rounded-xl font-semibold transition-colors"
                                style={{
                                    background: nightMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.5)',
                                    border: `1px solid ${nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(150,165,225,0.15)'}`,
                                    color: nightMode ? '#8e89a8' : '#4a5e88',
                                }}
                            >
                                Start Over
                            </button>

                            <button
                                onClick={() => setIsEditing(!isEditing)}
                                className="px-4 py-3 rounded-xl font-semibold transition-colors"
                                style={{
                                    background: nightMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.5)',
                                    border: `1px solid ${nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(150,165,225,0.15)'}`,
                                    color: nightMode ? '#8e89a8' : '#4a5e88',
                                }}
                            >
                                {isEditing ? 'Preview' : 'Edit'}
                            </button>

                            <button
                                onClick={handleSave}
                                className="flex-1 px-4 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 text-white"
                                style={{
                                    background: nightMode ? 'linear-gradient(135deg, #7b76e0, #9b96f5)' : 'linear-gradient(135deg, #4facfe, #6bc5f8)',
                                    boxShadow: nightMode
                                        ? '0 4px 14px rgba(123,118,224,0.3)'
                                        : '0 4px 14px rgba(79,172,254,0.2)'
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
                        className="w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
                        style={{
                            background: nightMode ? '#0d0b18' : 'linear-gradient(135deg, #cdd8f8 0%, #d6daf5 40%, #dee0f6 70%, #e4e0f5 100%)',
                            border: `1px solid ${nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(150,165,225,0.15)'}`,
                            animation: 'popOut 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                        }}
                    >
                        {/* Header */}
                        <div className="px-6 pt-6 pb-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <BookOpen className="w-5 h-5" style={{ color: nightMode ? '#7b76e0' : '#4facfe' }} />
                                    <h2
                                        className="text-xl font-semibold"
                                        style={{ fontFamily: "'Playfair Display', serif", color: nightMode ? '#e8e5f2' : '#1e2b4a' }}
                                    >
                                        Your Story Matters
                                    </h2>
                                </div>
                                <button
                                    onClick={onCancel}
                                    className="text-sm font-medium"
                                    style={{ color: nightMode ? '#5d5877' : '#8e9ec0' }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="space-y-5">
                                <div
                                    className="rounded-xl p-4 text-center"
                                    style={{
                                        background: nightMode ? 'rgba(123,118,224,0.05)' : 'rgba(79,172,254,0.05)',
                                        border: `1px solid ${nightMode ? 'rgba(123,118,224,0.1)' : 'rgba(79,172,254,0.1)'}`,
                                        borderLeft: `2px solid ${nightMode ? '#7b76e0' : '#4facfe'}`,
                                    }}
                                >
                                    <p
                                        className="text-sm italic leading-relaxed"
                                        style={{ fontFamily: "'Playfair Display', serif", color: nightMode ? '#b8b4c8' : '#3a4d6e' }}
                                    >
                                        "They triumphed over him by the blood of the Lamb and by the word of their testimony."
                                    </p>
                                    <p
                                        className="text-xs mt-2 font-semibold"
                                        style={{ color: nightMode ? '#7b76e0' : '#4facfe' }}
                                    >
                                        — Revelation 12:11
                                    </p>
                                </div>

                                <div className="text-center space-y-4">
                                    <p
                                        className="text-base font-bold leading-relaxed"
                                        style={{ color: nightMode ? '#e8e5f2' : '#1e2b4a' }}
                                    >
                                        Every generation has a testimony and every testimony has the power to change a generation.
                                    </p>
                                    <p
                                        className="text-base font-bold leading-relaxed"
                                        style={{ color: nightMode ? '#e8e5f2' : '#1e2b4a' }}
                                    >
                                        Share yours.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div
                            className="p-6"
                            style={{ borderTop: `1px solid ${nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(150,165,225,0.15)'}` }}
                        >
                            <button
                                onClick={() => setShowIntro(false)}
                                className="w-full px-4 py-3.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 text-white"
                                style={{
                                    background: nightMode ? 'linear-gradient(135deg, #7b76e0, #9b96f5)' : 'linear-gradient(135deg, #4facfe, #6bc5f8)',
                                    boxShadow: nightMode
                                        ? '0 4px 14px rgba(123,118,224,0.3)'
                                        : '0 4px 14px rgba(79,172,254,0.2)'
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
                    className="w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col relative"
                    style={{
                        background: nightMode ? '#0d0b18' : 'linear-gradient(135deg, #cdd8f8 0%, #d6daf5 40%, #dee0f6 70%, #e4e0f5 100%)',
                        border: `1px solid ${nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(150,165,225,0.15)'}`,
                        animation: 'popOut 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                    }}
                >
                    {/* Cancel button */}
                    <button
                        onClick={onCancel}
                        className="absolute top-4 right-4 text-sm font-medium z-10"
                        style={{ color: nightMode ? '#5d5877' : '#8e9ec0' }}
                    >
                        Cancel
                    </button>

                    {/* Hero + Header */}
                    <div className="px-6 pt-6 pb-3">
                        <div className="text-center mb-3">
                            <div className="text-2xl mb-1">⚡</div>
                            <h2
                                className="text-xl font-semibold"
                                style={{ fontFamily: "'Playfair Display', serif", color: nightMode ? '#e8e5f2' : '#1e2b4a' }}
                            >
                                Share Your Testimony
                            </h2>
                            <p
                                className="text-xs mt-1"
                                style={{ color: nightMode ? '#8e89a8' : '#4a5e88' }}
                            >
                                Lightning will help you craft your story. Just answer 4 simple questions.
                            </p>
                        </div>

                        {/* Progress Dots */}
                        <div className="flex gap-1.5 mt-2">
                            {TESTIMONY_QUESTIONS.map((_, index) => (
                                <div
                                    key={index}
                                    className="flex-1 h-1 rounded-full transition-all"
                                    style={{
                                        background: index < currentStep
                                            ? (nightMode ? '#7b76e0' : '#4facfe')
                                            : index === currentStep
                                                ? (nightMode ? 'rgba(123,118,224,0.4)' : 'rgba(79,172,254,0.35)')
                                                : (nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(150,165,225,0.15)'),
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto px-6 pb-6">
                        <div className="space-y-3">
                            {/* Question label */}
                            <div
                                className="text-[11px] uppercase tracking-wider font-medium mt-2"
                                style={{ color: nightMode ? '#7b76e0' : '#4facfe' }}
                            >
                                Question {currentStep + 1} of {TESTIMONY_QUESTIONS.length}
                            </div>

                            {/* Question text */}
                            <label
                                className="block text-base font-semibold"
                                style={{ color: nightMode ? '#e8e5f2' : '#1e2b4a' }}
                            >
                                {currentQuestion.question}
                            </label>

                            {/* Hint */}
                            <p
                                className="text-sm italic"
                                style={{ color: nightMode ? '#5d5877' : '#8e9ec0' }}
                            >
                                {currentQuestion.hint}
                            </p>

                            {/* Textarea */}
                            <textarea
                                value={currentAnswer}
                                onChange={(e) => handleAnswerChange(e.target.value)}
                                placeholder={currentQuestion.placeholder}
                                rows={6}
                                className="w-full px-4 py-3 rounded-xl focus:outline-none resize-none"
                                style={{
                                    minHeight: '140px',
                                    background: nightMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.5)',
                                    border: `1px solid ${nightMode
                                        ? (errors[currentQuestion.id] ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.06)')
                                        : (errors[currentQuestion.id] ? 'rgba(239,68,68,0.5)' : 'rgba(150,165,225,0.15)')}`,
                                    color: nightMode ? '#e8e5f2' : '#1e2b4a',
                                    fontFamily: "'General Sans', system-ui, sans-serif",
                                    fontSize: '14px',
                                    lineHeight: '1.6',
                                    ...(nightMode ? {} : { backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }),
                                }}
                            />

                            {errors[currentQuestion.id] && (
                                <p className="text-sm" style={{ color: '#ef4444' }}>{errors[currentQuestion.id]}</p>
                            )}

                            {/* Character count */}
                            <div
                                className="flex justify-between items-center text-xs"
                                style={{ color: nightMode ? '#5d5877' : '#8e9ec0' }}
                            >
                                <span>
                                    {currentAnswer.trim().length} / {currentQuestion.minLength} min characters
                                    {currentAnswer.trim().length >= currentQuestion.minLength && currentAnswer.trim().length < currentQuestion.suggestedLength && (
                                        <span style={{ color: nightMode ? '#e8b84a' : '#b47a10' }}> · Aim for {currentQuestion.suggestedLength}+</span>
                                    )}
                                    {currentAnswer.trim().length >= currentQuestion.suggestedLength && (
                                        <span style={{ color: nightMode ? '#5cc88a' : '#16834a' }}> · Great detail!</span>
                                    )}
                                </span>
                                <span>{totalWords} words total</span>
                            </div>

                            {errors.general && (
                                <div
                                    className="p-3 rounded-xl"
                                    style={{
                                        background: nightMode ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.08)',
                                        border: '1px solid rgba(239,68,68,0.2)',
                                    }}
                                >
                                    <p className="text-sm" style={{ color: nightMode ? '#ef4444' : '#dc2626' }}>{errors.general}</p>
                                </div>
                            )}

                            {/* Nav Buttons */}
                            <div className="flex gap-3 mt-2">
                                {currentStep > 0 && (
                                    <button
                                        onClick={handleBack}
                                        disabled={isGenerating}
                                        className="px-4 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
                                        style={{
                                            background: nightMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.5)',
                                            border: `1px solid ${nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(150,165,225,0.15)'}`,
                                            color: nightMode ? '#8e89a8' : '#4a5e88',
                                            ...(nightMode ? {} : { backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }),
                                        }}
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                        Back
                                    </button>
                                )}

                                <button
                                    onClick={handleNext}
                                    disabled={isGenerating}
                                    className="flex-1 px-4 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 text-white disabled:opacity-50"
                                    style={{
                                        background: isLastQuestion
                                            ? (nightMode ? 'linear-gradient(135deg, #7b76e0, #9b96f5)' : 'linear-gradient(135deg, #4facfe, #6bc5f8)')
                                            : (nightMode ? 'rgba(123,118,224,0.15)' : 'rgba(79,172,254,0.12)'),
                                        border: `1px solid ${isLastQuestion
                                            ? 'transparent'
                                            : (nightMode ? 'rgba(123,118,224,0.2)' : 'rgba(79,172,254,0.2)')}`,
                                        color: isLastQuestion ? 'white' : (nightMode ? '#7b76e0' : '#2b6cb0'),
                                        ...(isLastQuestion ? { boxShadow: nightMode ? '0 4px 14px rgba(123,118,224,0.3)' : '0 4px 14px rgba(79,172,254,0.2)' } : {}),
                                    }}
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader className="w-4 h-4 animate-spin" />
                                            Generating Testimony...
                                        </>
                                    ) : isLastQuestion ? (
                                        <>
                                            ⚡ Generate with Lightning
                                        </>
                                    ) : (
                                        <>
                                            Next →
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
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

/**
 * Testimony Questionnaire Configuration
 * 
 * These 4 questions guide users through sharing their faith journey,
 * which will then be used to generate a compelling testimony story via Lightning.
 */

export interface TestimonyQuestion {
    id: string;
    question: string;
    placeholder: string;
    hint: string;
    minLength: number; // Minimum character count
    suggestedLength: number; // Suggested character count for a strong testimony
}

export const TESTIMONY_QUESTIONS: TestimonyQuestion[] = [
    {
        id: 'question1',
        question: 'How was your life like before you were saved?',
        placeholder: 'Describe your life before salvation — what you were going through, your background, what a normal day looked like...',
        hint: 'What were you going through? Were you raised in a Christian home? What was your background like?',
        minLength: 70,
        suggestedLength: 200
    },
    {
        id: 'question2',
        question: 'What led you to salvation or your own personal relationship with God?',
        placeholder: 'Share what led you to God — a person, event, moment of realization...',
        hint: 'Was there a person, event, realization, or a series of circumstances that started it?',
        minLength: 70,
        suggestedLength: 200
    },
    {
        id: 'question3',
        question: 'Was there a specific moment that was the turning point in your relationship with God? Or did you have a specific experience with God in some way?',
        placeholder: 'Describe the turning point or specific experience — take us to that moment in detail...',
        hint: 'Describe in detail this moment or experience for others.',
        minLength: 70,
        suggestedLength: 200
    },
    {
        id: 'question4',
        question: 'Where are you now in your walk with God?',
        placeholder: 'Share where you are now — your relationship with God, what He\'s doing in your life, what you\'re being called to...',
        hint: 'What is your current relationship with Him like? Are you being called to something today? How is your life now?',
        minLength: 70,
        suggestedLength: 200
    }
];

// Minimum total word count across all answers for quality testimony generation
export const MIN_TOTAL_WORDS = 80;

// Helper to calculate word count
export const getWordCount = (text: string): number => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};

// Validate that answers meet minimum requirements
export const validateAnswers = (answers: Record<string, string>): {
    valid: boolean;
    errors: Record<string, string>;
    totalWords: number;
} => {
    const errors: Record<string, string> = {};
    let totalWords = 0;

    TESTIMONY_QUESTIONS.forEach(q => {
        const answer = answers[q.id] || '';
        const wordCount = getWordCount(answer);
        totalWords += wordCount;

        if (answer.trim().length < q.minLength) {
            errors[q.id] = `Please provide at least ${q.minLength} characters (currently ${answer.trim().length})`;
        }
    });

    if (totalWords < MIN_TOTAL_WORDS) {
        errors.general = `Please provide more detail. We need at least ${MIN_TOTAL_WORDS} words total across all questions (currently ${totalWords} words)`;
    }

    return {
        valid: Object.keys(errors).length === 0,
        errors,
        totalWords
    };
};

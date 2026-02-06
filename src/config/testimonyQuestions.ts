/**
 * Testimony Questionnaire Configuration
 * 
 * These 4 questions guide users through sharing their faith journey,
 * which will then be used to generate a compelling testimony story via Claude AI.
 */

export interface TestimonyQuestion {
    id: string;
    question: string;
    placeholder: string;
    hint: string;
    minLength: number; // Minimum character count
}

export const TESTIMONY_QUESTIONS: TestimonyQuestion[] = [
    {
        id: 'question1',
        question: 'Tell me about your life before you encountered Christ. What was your background, and what were you like?',
        placeholder: 'Share about your life before your transformation. What was going on? What defined you? The more detail you give, the better your testimony will be.',
        hint: 'Be honest about where you were. A few sentences go a long way.',
        minLength: 150
    },
    {
        id: 'question2',
        question: 'What struggles, challenges, or darkness did you face? What was weighing on you?',
        placeholder: 'Describe the specific struggles or pain you experienced. What were you carrying? What did it feel like?',
        hint: 'Name the specific struggles — the more detail, the more powerful your story.',
        minLength: 150
    },
    {
        id: 'question3',
        question: 'What was the pivotal moment when everything changed? How did you encounter God or experience transformation?',
        placeholder: 'What was the turning point? How did God break through? What happened? Describe the moment.',
        hint: 'This is the heart of your testimony. Be as specific as you can about what happened.',
        minLength: 150
    },
    {
        id: 'question4',
        question: 'What are you doing now? How is God using your story and what is your current calling or mission?',
        placeholder: 'Share what you\'re doing now. How has your journey shaped who you are today? What\'s different?',
        hint: 'Connect your past to your present. What does your life look like now?',
        minLength: 150
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

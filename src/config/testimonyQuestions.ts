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
        placeholder: 'Share about your life before your transformation. What was going on? What defined you?',
        hint: 'Be honest about where you were. This sets up your story.',
        minLength: 100
    },
    {
        id: 'question2',
        question: 'What struggles, challenges, or darkness did you face? What was weighing on you?',
        placeholder: 'Describe the specific struggles or pain you experienced. What were you carrying?',
        hint: 'Name the specific struggles. This is the crisis point of your story.',
        minLength: 100
    },
    {
        id: 'question3',
        question: 'What was the pivotal moment when everything changed? How did you encounter God or experience transformation?',
        placeholder: 'What was the turning point? How did God break through? What happened?',
        hint: 'This is your "But God..." moment. Be as specific as possible.',
        minLength: 100
    },
    {
        id: 'question4',
        question: 'What are you doing now? How is God using your story and what is your current calling or mission?',
        placeholder: 'Share what you\'re doing now. How has God redeemed your pain for His purpose?',
        hint: 'Connect your past to your present purpose. Show the impact.',
        minLength: 100
    }
];

// Minimum total word count across all answers for quality testimony generation
export const MIN_TOTAL_WORDS = 50;

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

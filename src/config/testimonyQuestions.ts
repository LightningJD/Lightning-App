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
    suggestedLength: number; // Suggested character count for a strong testimony
}

export const TESTIMONY_QUESTIONS: TestimonyQuestion[] = [
    {
        id: 'question1',
        question: 'What was your life like before God stepped in? What were you chasing, how were you living, and what did a normal day look like?',
        placeholder: 'Paint a picture of who you were. What defined you? What were you living for? What did your day-to-day look like? The more specific you are, the stronger your story will be.',
        hint: 'Think about what someone would have seen if they watched your life back then.',
        minLength: 70,
        suggestedLength: 200
    },
    {
        id: 'question2',
        question: 'What was the lowest point? What moment or season made you realize you couldn\'t keep going the way you were?',
        placeholder: 'Describe the struggle that brought you to the end of yourself. Was there a specific moment you hit rock bottom \u2014 a night, a conversation, a realization? What were you feeling?',
        hint: 'Don\'t just list struggles \u2014 take us to the moment. What were you doing? What were you feeling?',
        minLength: 70,
        suggestedLength: 200
    },
    {
        id: 'question3',
        question: 'How did God show up? What did He do \u2014 did He speak to you, show you something, heal something, send someone? Describe that moment.',
        placeholder: 'This is the most important part of your story. What did God do? Did you hear Him, feel Him, see something change? Was there a specific moment, a prayer, a word, a dream? Describe exactly what happened \u2014 don\'t hold back.',
        hint: 'Be specific about what GOD did. If He spoke, what did He say? If He sent someone, who? This is the heart of your testimony.',
        minLength: 70,
        suggestedLength: 200
    },
    {
        id: 'question4',
        question: 'What\'s different now? How do you see God in your everyday life, and what does He have you doing?',
        placeholder: 'How has your life changed since that moment? What\'s different about how you think, live, or see the world? You don\'t have to be in ministry \u2014 just tell us what God is doing in your life right now.',
        hint: 'Think about the contrast \u2014 who you were in Q1 vs. who you are now.',
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

/**
 * Claude AI Service for Testimony Generation
 *
 * Uses Anthropic Claude API (Sonnet 4) to generate authentic Christian
 * testimonies based on user answers to 4 questions.
 *
 * Authenticity-first approach: the AI rephrases and polishes the user's
 * own words into narrative prose, but NEVER invents details, emotions,
 * or experiences they didn't describe.
 *
 * 3-Layer Rate Limiting:
 *   Layer 1: Client-side localStorage (rateLimiter.ts) — checked in TestimonyQuestionnaire
 *   Layer 2: Supabase testimony_generations table — checked in this file + backend proxy
 *   Layer 3: Cloudflare Pages Function proxy (/api/generate-testimony) — server-side enforcement
 *
 * Architecture: tries backend proxy first (API key hidden server-side).
 * Falls back to direct client-side call only if proxy is unavailable.
 */

import Anthropic from '@anthropic-ai/sdk';

const CLAUDE_API_KEY = import.meta.env.VITE_CLAUDE_API_KEY;

// Initialize Anthropic client (fallback only — proxy is preferred)
const anthropic = CLAUDE_API_KEY ? new Anthropic({
    apiKey: CLAUDE_API_KEY,
    dangerouslyAllowBrowser: true // Required for client-side usage (fallback only)
}) : null;

const TESTIMONY_MODEL = 'claude-sonnet-4-20250514';

// Backend proxy URL — Cloudflare Pages Function
const PROXY_URL = '/api/generate-testimony';

export interface TestimonyAnswers {
    question1: string; // Background/pre-crisis life
    question2: string; // Struggles/crisis experienced
    question3: string; // Turning point/transformation
    question4: string; // Current calling/mission
}

export interface TestimonyGenerationOptions {
    answers: TestimonyAnswers;
    userAge?: number;
    userName?: string;
    userId?: string; // Supabase user UUID for server-side rate limiting
}

export interface TestimonyGenerationResult {
    success: boolean;
    testimony?: string;
    error?: string;
    wordCount?: number;
}

/**
 * Authenticity-first testimony generation prompt.
 *
 * Key principle: the AI is a ghostwriter, not an author.
 * It polishes and structures what the user said — it does NOT
 * add details, emotions, or events they didn't mention.
 */
const TESTIMONY_GENERATION_PROMPT = `You are a ghostwriter who transforms a person's raw answers into a polished first-person Christian testimony. Your job is to restructure and rephrase their words into flowing narrative prose — NOT to invent their story for them.

## CORE RULE: AUTHENTICITY OVER DRAMA

This is someone's real faith journey. Accuracy is sacred.

- ONLY include details, emotions, struggles, and events the user explicitly described
- NEVER invent specifics they didn't mention (don't add "depression" if they said "lost", don't add "suicidal thoughts" if they said "hard time")
- NEVER fabricate supernatural experiences (no visions, voices, or miracles unless they described them)
- If an answer is brief, write a shorter but genuine paragraph — do NOT pad with invented content
- When in doubt, stay closer to what they said rather than embellishing

## WHAT YOU SHOULD DO

- Rephrase their words into polished, flowing first-person prose
- Fix grammar, spelling, and awkward phrasing
- Add natural transitions between paragraphs
- Use varied sentence structure (mix short and long sentences)
- Make it sound like the person telling their story naturally to a friend
- Keep their tone — if they're casual, stay casual; if they're intense, stay intense

## NEVER DO THESE THINGS

- Never copy their raw text verbatim — always rephrase into proper narrative sentences
- Never insert a phrase like "God has me..." followed by their unedited words
- Never use Christian cliches: "God showed up", "on fire for God", "wrecked me in the best way", "fell in love with Jesus", "radical encounter", "poured out His love"
- Never over-spiritualize practical experiences (if they said "a friend invited me to church", don't turn it into a mystical encounter)
- Never add "My past pain fuels my present purpose" or similar generic closing lines
- Never start consecutive sentences with "I"

## STRUCTURE

Write 4 paragraphs in first person:

1. OPENING — Start with where they are now (from Q4), then transition to their background (from Q1). If Q4 is brief (e.g. "I'm in school"), simply state it naturally and move into their background. Don't force a dramatic opening from thin material.

2. THE STRUGGLE — Describe what they went through (from Q2). Only name the struggles THEY named. If they said "I was lost", say they felt lost — don't escalate to "drowning in darkness" unless they said that.

3. THE TURNING POINT — What changed (from Q3). Describe their encounter/transformation exactly as they described it. If they said "a friend invited me to church and I started going", that IS the turning point. Don't dramatize it into something it wasn't.

4. WHERE THEY ARE NOW — Circle back to the present (Q4 again, plus Q1 context). Connect their journey to where they are today. If their current situation is simple (school, sports, growing in faith), honor that simplicity.

## LENGTH

- If answers are detailed: 250-400 words across 4 paragraphs
- If answers are brief: 150-250 words across 4 paragraphs — shorter is better than fabricated
- Never pad length with invented content

## OUTPUT

- Write ONLY the testimony text — no titles, headers, labels, or preambles
- First person throughout ("I", not "they")
- Past tense for past events, present tense for current life
- Clear paragraph breaks between the 4 sections`;

/**
 * Profanity check using word boundaries to avoid false positives
 * (e.g. "class" matching "ass", "hello" matching "hell")
 */
function containsProfanity(text: string): boolean {
    const lowerText = text.toLowerCase();
    const profanityWords = [
        'fuck', 'fucking', 'fucked',
        'shit', 'shitty',
        'bitch',
        'bastard',
        'cunt',
    ];

    return profanityWords.some(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        return regex.test(lowerText);
    });
}

/**
 * Clean up AI output — remove any preambles, markdown artifacts, etc.
 */
function sanitizeTestimonyOutput(raw: string): string {
    let text = raw.trim();

    // Remove common AI preambles
    const preambles = [
        /^here(?:'s| is) (?:your |the )?(?:generated )?testimony[:\s]*/i,
        /^testimony[:\s]*/i,
        /^---\s*/,
        /^#+\s*.+\n/,
    ];
    for (const pattern of preambles) {
        text = text.replace(pattern, '');
    }

    // Remove trailing artifacts
    text = text.replace(/\n---\s*$/, '');
    text = text.replace(/\n#+\s*$/, '');

    // Normalize whitespace but preserve paragraph breaks
    text = text.replace(/\n{3,}/g, '\n\n');

    return text.trim();
}

/**
 * Generate a testimony story from user answers using Claude AI.
 *
 * Strategy: Try backend proxy first (Layer 3 — API key hidden server-side).
 * If proxy is unavailable (e.g., local dev), fall back to direct client-side call.
 */
export async function generateTestimony(
    options: TestimonyGenerationOptions
): Promise<TestimonyGenerationResult> {
    const { answers } = options;

    // Basic validation (shared between proxy and direct)
    if (!answers.question1 || !answers.question2 || !answers.question3 || !answers.question4) {
        return {
            success: false,
            error: 'All 4 questions must be answered to generate a testimony.'
        };
    }

    // Content moderation - word-boundary profanity check (client-side pre-check)
    const combinedText = Object.values(answers).join(' ');
    if (containsProfanity(combinedText)) {
        return {
            success: false,
            error: 'Please remove any profanity or inappropriate language from your answers and try again.'
        };
    }

    // Try backend proxy first (Layer 3)
    try {
        const proxyResult = await generateViaProxy(options);
        if (proxyResult !== null) {
            return proxyResult;
        }
    } catch (e) {
        console.warn('Backend proxy unavailable, falling back to direct API call:', e);
    }

    // Fallback: direct client-side API call (for local dev or if proxy is down)
    return generateDirect(options);
}

/**
 * Generate via Cloudflare Pages Function proxy (preferred — hides API key)
 * Returns null if proxy is unavailable (404, network error, etc.)
 */
async function generateViaProxy(
    options: TestimonyGenerationOptions
): Promise<TestimonyGenerationResult | null> {
    try {
        const response = await fetch(PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                answers: options.answers,
                userName: options.userName,
                userAge: options.userAge,
                userId: options.userId,
            }),
        });

        // If proxy doesn't exist (404), return null to trigger fallback
        if (response.status === 404) {
            return null;
        }

        const data = await response.json();

        // Rate limit hit (429) — return the error directly
        if (response.status === 429) {
            return {
                success: false,
                error: data.error || 'Rate limit exceeded. Please try again later.',
            };
        }

        // Any other error from proxy
        if (!response.ok) {
            return {
                success: false,
                error: data.error || 'Failed to generate testimony. Please try again.',
            };
        }

        return {
            success: data.success,
            testimony: data.testimony,
            wordCount: data.wordCount,
            error: data.error,
        };
    } catch (error) {
        // Network error, proxy unreachable — return null for fallback
        console.warn('Proxy fetch failed:', error);
        return null;
    }
}

/**
 * Generate directly via Anthropic SDK (fallback for local dev)
 */
async function generateDirect(
    options: TestimonyGenerationOptions
): Promise<TestimonyGenerationResult> {
    // Validate API key
    if (!CLAUDE_API_KEY) {
        return {
            success: false,
            error: 'Claude API key is not configured. Please add VITE_CLAUDE_API_KEY to your environment variables.'
        };
    }

    if (!anthropic) {
        return {
            success: false,
            error: 'Claude API client failed to initialize.'
        };
    }

    const { answers, userAge, userName } = options;
    const combinedText = Object.values(answers).join(' ');

    // Assess input detail level to guide the model
    const totalWords = combinedText.trim().split(/\s+/).length;
    const detailLevel = totalWords > 200 ? 'detailed' : totalWords > 100 ? 'moderate' : 'brief';

    try {
        // Construct the user message with their answers
        const userMessage = `Here are this person's answers. Transform them into a testimony following the system instructions.

Question 1 — Life before encountering Christ:
"${answers.question1}"

Question 2 — Struggles and challenges faced:
"${answers.question2}"

Question 3 — The pivotal moment of transformation:
"${answers.question3}"

Question 4 — Where they are now / current calling:
"${answers.question4}"

${userName ? `Their name: ${userName}` : ''}
${userAge && userAge < 18 ? 'Note: This person is under 18. Use age-appropriate language.' : ''}
Detail level of their answers: ${detailLevel} (${totalWords} total words). ${detailLevel === 'brief' ? 'Their answers are short — write a shorter, tighter testimony (150-250 words). Do NOT invent details to fill space.' : detailLevel === 'moderate' ? 'Write a medium-length testimony (200-350 words). Stay faithful to what they provided.' : 'Their answers are detailed — you have rich material to work with (250-400 words).'}

Remember: rephrase their words into polished prose, but never add experiences or emotions they didn't describe.`;

        // Call Claude API — Sonnet 4 for better creative rewriting
        const message = await anthropic.messages.create({
            model: TESTIMONY_MODEL,
            max_tokens: 1500,
            temperature: 0.6,
            system: TESTIMONY_GENERATION_PROMPT,
            messages: [
                {
                    role: 'user',
                    content: userMessage
                }
            ]
        });

        // Extract the testimony text from the response
        const rawTestimony = message.content[0].type === 'text'
            ? message.content[0].text
            : '';

        if (!rawTestimony) {
            return {
                success: false,
                error: 'Failed to generate testimony. The AI response was empty.'
            };
        }

        // Sanitize output — remove preambles, markdown artifacts
        const testimony = sanitizeTestimonyOutput(rawTestimony);

        // Calculate word count
        const wordCount = testimony.trim().split(/\s+/).length;

        return {
            success: true,
            testimony,
            wordCount
        };

    } catch (error) {
        console.error('Error generating testimony with Claude:', error);

        // Provide user-friendly error messages
        if (error instanceof Error) {
            if (error.message.includes('API key') || error.message.includes('authentication')) {
                return {
                    success: false,
                    error: 'Invalid API key. Please check your Claude API configuration.'
                };
            }
            if (error.message.includes('rate limit') || error.message.includes('429')) {
                return {
                    success: false,
                    error: 'Too many requests. Please wait a moment and try again.'
                };
            }
            if (error.message.includes('overloaded') || error.message.includes('529')) {
                return {
                    success: false,
                    error: 'The AI service is temporarily busy. Please try again in a moment.'
                };
            }
            return {
                success: false,
                error: `Failed to generate testimony: ${error.message}`
            };
        }

        return {
            success: false,
            error: 'An unexpected error occurred while generating your testimony. Please try again.'
        };
    }
}

/**
 * Test the Claude API connection
 */
export async function testClaudeConnection(): Promise<{
    success: boolean;
    error?: string;
}> {
    if (!CLAUDE_API_KEY) {
        return {
            success: false,
            error: 'Claude API key is not configured.'
        };
    }

    if (!anthropic) {
        return {
            success: false,
            error: 'Claude API client failed to initialize.'
        };
    }

    try {
        await anthropic.messages.create({
            model: TESTIMONY_MODEL,
            max_tokens: 10,
            messages: [
                {
                    role: 'user',
                    content: 'Hi'
                }
            ]
        });

        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

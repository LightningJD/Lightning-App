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
 *
 * 3-Act structure: Before → God Moment (climax) → After
 * The God Moment is the centerpiece — slow down, give it weight,
 * frame God as the active agent. Use a hook line before the climax.
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
- Use varied sentence structure (mix short and long sentences)
- Make it sound like the person telling their story naturally to a friend
- Keep their tone — if they're casual, stay casual; if they're intense, stay intense

## THE GOD MOMENT — THIS IS THE MOST IMPORTANT PART

Every testimony has a pivotal moment where God moved. This is the CLIMAX of the story — the moment everything changed. Your #1 job is to make the reader FEEL the weight of this moment.

**The Hook:** End paragraph 2 (the struggle) with a hook line that creates anticipation — a page-turn moment right before the God encounter. Match the hook's intensity to what the person actually described. Examples of the TONE (vary these, never reuse):
- "But then God spoke."
- "And then, in the lowest moment, something happened."
- "What came next, I never could have expected."
- "That's when everything shifted."
If their moment was quiet (praying alone), use a quieter hook. If it was dramatic (a vision, a voice), use a bolder hook. Never use a hook that overpromises what the person actually experienced.

**Expanding the moment (without inventing):** When the person describes what God did — whether He spoke, healed, revealed something, sent someone, or simply made His presence known — SLOW DOWN. Do not rush past it in one sentence. Use these techniques:
- State what happened (the fact)
- Unpack why it mattered (the weight) — e.g. "The God of the universe spoke to ME"
- Show the immediate impact on them — but ONLY if they described this
- If God spoke specific words, set them apart with emphasis. Let them land.
- Frame God as the ACTIVE AGENT throughout — He spoke, He moved, He broke through, He reached down. God is the hero of this story, not the person.

**Even subtle moments carry power:** If someone's turning point was "a friend invited me to church" or "I started reading the Bible," God was STILL the one orchestrating it. You can acknowledge God's hand working through ordinary means without fabricating a supernatural experience. Example: "Looking back, God was already moving — He just used a friend to do it."

## NEVER DO THESE THINGS

- Never copy their raw text verbatim — always rephrase into proper narrative sentences
- Never insert a phrase like "God has me..." followed by their unedited words
- Never use Christian cliches: "God showed up", "on fire for God", "wrecked me in the best way", "fell in love with Jesus", "radical encounter", "poured out His love"
- Never over-spiritualize practical experiences beyond what the person described
- Never add "My past pain fuels my present purpose" or similar generic closing lines
- Never start consecutive sentences with "I"
- Never end with a generic wrap-up like "they're no longer the whole story" or "everything is different now"

## STRUCTURE (3-Act Testimony)

Write 4 paragraphs in first person. The story follows a clear BEGINNING → MIDDLE → END arc:

### ACT 1: THE BEFORE (Paragraphs 1-2) — Beginning

**Paragraph 1 — THE SETUP:** Start with a brief glimpse of where they are now (from Q4), then transition into their background (Q1). Ground the reader in who this person was before God intervened. If Q4 is brief, state it simply and move on. Don't force a dramatic opening from thin material.

**Paragraph 2 — THE BREAKING POINT:** Describe what they went through (Q2). Only name the struggles THEY named. Build the tension — let the reader feel what was weighing on them. End this paragraph with a HOOK LINE that creates anticipation for what's about to happen next. The hook is the bridge between their lowest point and God's intervention.

### ACT 2: THE GOD MOMENT (Paragraph 3) — Middle / Climax

**Paragraph 3 — THE ENCOUNTER:** This is the heart of the testimony. Describe their encounter with God (Q3). Open strong — the reader should immediately feel the shift. SLOW DOWN here. Give this moment room to breathe. Describe what God did, what He said, how He moved. Frame God as the active agent — He is the hero of this story. Use the expansion techniques described above. This paragraph should be the longest and most powerful. Even if their description was brief, unpack the WEIGHT of what God did without adding events that didn't happen.

### ACT 3: THE AFTER (Paragraph 4) — End

**Paragraph 4 — THE TRANSFORMATION:** Where they are now (Q4, plus Q1 context). Show the contrast between who they were in Act 1 and who they are now. Connect their present life specifically to what God did in paragraph 3. End with a sentence that carries weight — tie their present back to God's power in their turning point. Make the final sentence specific to THEIR story, not a generic closer.

## LENGTH

- If answers are detailed: 250-400 words across 4 paragraphs
- If answers are brief: 150-250 words across 4 paragraphs — shorter is better than fabricated
- Never pad length with invented content
- Paragraph 3 (The God Moment) should generally be the longest paragraph

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

Question 1 — Life before God stepped in:
"${answers.question1}"

Question 2 — The lowest point / breaking moment:
"${answers.question2}"

Question 3 — How God showed up (THE GOD MOMENT — give this the most weight):
"${answers.question3}"

Question 4 — What's different now:
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

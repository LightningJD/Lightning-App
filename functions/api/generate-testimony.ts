/**
 * Cloudflare Pages Function — Testimony Generation Proxy
 *
 * Layer 3 of the 3-layer rate limiting system.
 * This serverless function:
 *   1. Hides the Claude API key from the client (no more dangerouslyAllowBrowser)
 *   2. Enforces server-side rate limits via Supabase
 *   3. Logs all generation attempts for auditing
 *
 * Endpoint: POST /api/generate-testimony
 *
 * Request body:
 *   { answers: { question1, question2, question3, question4 }, userName?, userAge?, userId?, ipHash? }
 *
 * Response:
 *   { success: boolean, testimony?: string, wordCount?: number, error?: string, remaining?: number }
 */

interface Env {
    CLAUDE_API_KEY: string;
    SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
}

interface TestimonyRequest {
    answers: {
        question1: string;
        question2: string;
        question3: string;
        question4: string;
    };
    userName?: string;
    userAge?: number;
    userId?: string; // Supabase user UUID (if authenticated)
}

const TESTIMONY_MODEL = 'claude-sonnet-4-20250514';
const MAX_GENERATIONS_PER_DAY = 5;
const MAX_GENERATIONS_PER_HOUR_GUEST = 3;

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * Profanity check with word boundaries (matches claude.ts client-side check)
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
 * Clean up AI output
 */
function sanitizeOutput(raw: string): string {
    let text = raw.trim();
    const preambles = [
        /^here(?:'s| is) (?:your |the )?(?:generated )?testimony[:\s]*/i,
        /^testimony[:\s]*/i,
        /^---\s*/,
        /^#+\s*.+\n/,
    ];
    for (const pattern of preambles) {
        text = text.replace(pattern, '');
    }
    text = text.replace(/\n---\s*$/, '');
    text = text.replace(/\n#+\s*$/, '');
    text = text.replace(/\n{3,}/g, '\n\n');
    return text.trim();
}

/**
 * Hash an IP address for anonymous rate limiting (no raw IPs stored)
 */
async function hashIP(ip: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(ip + '_lightning_salt_2024');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Check rate limit via Supabase
 */
async function checkRateLimit(
    supabaseUrl: string,
    supabaseKey: string,
    userId: string | null,
    ipHash: string
): Promise<{ allowed: boolean; remaining: number; reason: string | null }> {
    const headers = {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
    };

    if (userId) {
        // Authenticated user: 5 per 24 hours
        const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const url = `${supabaseUrl}/rest/v1/testimony_generations?user_id=eq.${userId}&created_at=gte.${windowStart}&select=id`;

        const response = await fetch(url, {
            headers: { ...headers, 'Prefer': 'count=exact' }
        });

        const countHeader = response.headers.get('content-range');
        const count = countHeader ? parseInt(countHeader.split('/')[1]) || 0 : 0;

        if (count >= MAX_GENERATIONS_PER_DAY) {
            return {
                allowed: false,
                remaining: 0,
                reason: `You've reached the daily limit of ${MAX_GENERATIONS_PER_DAY} testimony generations. Please try again tomorrow.`
            };
        }

        return { allowed: true, remaining: MAX_GENERATIONS_PER_DAY - count, reason: null };
    } else {
        // Guest: 3 per hour by IP hash
        const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const url = `${supabaseUrl}/rest/v1/testimony_generations?ip_hash=eq.${ipHash}&user_id=is.null&created_at=gte.${windowStart}&select=id`;

        const response = await fetch(url, {
            headers: { ...headers, 'Prefer': 'count=exact' }
        });

        const countHeader = response.headers.get('content-range');
        const count = countHeader ? parseInt(countHeader.split('/')[1]) || 0 : 0;

        if (count >= MAX_GENERATIONS_PER_HOUR_GUEST) {
            return {
                allowed: false,
                remaining: 0,
                reason: `You've reached the limit of ${MAX_GENERATIONS_PER_HOUR_GUEST} testimony generations per hour. Please sign in for a higher limit or try again later.`
            };
        }

        return { allowed: true, remaining: MAX_GENERATIONS_PER_HOUR_GUEST - count, reason: null };
    }
}

/**
 * Log generation attempt to Supabase
 */
async function logGeneration(
    supabaseUrl: string,
    supabaseKey: string,
    params: {
        userId: string | null;
        ipHash: string;
        model: string;
        inputWordCount: number;
        outputWordCount: number | null;
        success: boolean;
        errorType: string | null;
    }
): Promise<void> {
    try {
        await fetch(`${supabaseUrl}/rest/v1/testimony_generations`, {
            method: 'POST',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: params.userId,
                ip_hash: params.ipHash,
                model: params.model,
                input_word_count: params.inputWordCount,
                output_word_count: params.outputWordCount,
                success: params.success,
                error_type: params.errorType,
            }),
        });
    } catch (e) {
        console.error('Failed to log generation:', e);
    }
}

// The testimony generation prompt (same as claude.ts)
const TESTIMONY_PROMPT = `You are a ghostwriter who transforms a person's raw answers into a polished first-person Christian testimony. Your job is to restructure and rephrase their words into flowing narrative prose — NOT to invent their story for them.

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
 * Handle OPTIONS (CORS preflight)
 */
export const onRequestOptions: PagesFunction<Env> = async () => {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
};

/**
 * Handle POST — Generate testimony via Claude API
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
    const { request, env } = context;

    // Validate environment
    if (!env.CLAUDE_API_KEY) {
        return Response.json(
            { success: false, error: 'Server misconfiguration: Claude API key not set.' },
            { status: 500, headers: CORS_HEADERS }
        );
    }

    // Parse request body
    let body: TestimonyRequest;
    try {
        body = await request.json();
    } catch {
        return Response.json(
            { success: false, error: 'Invalid request body.' },
            { status: 400, headers: CORS_HEADERS }
        );
    }

    const { answers, userName, userAge, userId } = body;

    // Validate all 4 answers present
    if (!answers?.question1 || !answers?.question2 || !answers?.question3 || !answers?.question4) {
        return Response.json(
            { success: false, error: 'All 4 questions must be answered.' },
            { status: 400, headers: CORS_HEADERS }
        );
    }

    // Profanity check
    const combinedText = Object.values(answers).join(' ');
    if (containsProfanity(combinedText)) {
        return Response.json(
            { success: false, error: 'Please remove any inappropriate language and try again.' },
            { status: 400, headers: CORS_HEADERS }
        );
    }

    // Get IP hash for rate limiting
    const clientIP = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
    const ipHash = await hashIP(clientIP);

    // Rate limit check (Layer 3 — server-side)
    const totalWords = combinedText.trim().split(/\s+/).length;

    if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
        const rateLimitResult = await checkRateLimit(
            env.SUPABASE_URL,
            env.SUPABASE_SERVICE_ROLE_KEY,
            userId || null,
            ipHash
        );

        if (!rateLimitResult.allowed) {
            // Log the blocked attempt
            await logGeneration(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
                userId: userId || null,
                ipHash,
                model: TESTIMONY_MODEL,
                inputWordCount: totalWords,
                outputWordCount: null,
                success: false,
                errorType: 'rate_limit',
            });

            return Response.json(
                {
                    success: false,
                    error: rateLimitResult.reason,
                    remaining: rateLimitResult.remaining
                },
                { status: 429, headers: CORS_HEADERS }
            );
        }
    }

    // Build the user message
    const detailLevel = totalWords > 200 ? 'detailed' : totalWords > 100 ? 'moderate' : 'brief';

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

    // Call Claude API
    try {
        const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': env.CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: TESTIMONY_MODEL,
                max_tokens: 1500,
                temperature: 0.6,
                system: TESTIMONY_PROMPT,
                messages: [{ role: 'user', content: userMessage }],
            }),
        });

        if (!claudeResponse.ok) {
            const errorText = await claudeResponse.text();
            console.error('Claude API error:', claudeResponse.status, errorText);

            // Log the failed attempt
            if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
                await logGeneration(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
                    userId: userId || null,
                    ipHash,
                    model: TESTIMONY_MODEL,
                    inputWordCount: totalWords,
                    outputWordCount: null,
                    success: false,
                    errorType: `api_${claudeResponse.status}`,
                });
            }

            if (claudeResponse.status === 429) {
                return Response.json(
                    { success: false, error: 'Too many requests. Please wait a moment and try again.' },
                    { status: 429, headers: CORS_HEADERS }
                );
            }

            if (claudeResponse.status === 529) {
                return Response.json(
                    { success: false, error: 'The AI service is temporarily busy. Please try again in a moment.' },
                    { status: 503, headers: CORS_HEADERS }
                );
            }

            return Response.json(
                { success: false, error: 'Failed to generate testimony. Please try again.' },
                { status: 500, headers: CORS_HEADERS }
            );
        }

        const claudeData = await claudeResponse.json() as any;
        const rawTestimony = claudeData.content?.[0]?.type === 'text'
            ? claudeData.content[0].text
            : '';

        if (!rawTestimony) {
            return Response.json(
                { success: false, error: 'The AI returned an empty response. Please try again.' },
                { status: 500, headers: CORS_HEADERS }
            );
        }

        const testimony = sanitizeOutput(rawTestimony);
        const wordCount = testimony.trim().split(/\s+/).length;

        // Log successful generation
        if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
            await logGeneration(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
                userId: userId || null,
                ipHash,
                model: TESTIMONY_MODEL,
                inputWordCount: totalWords,
                outputWordCount: wordCount,
                success: true,
                errorType: null,
            });
        }

        return Response.json(
            { success: true, testimony, wordCount },
            { status: 200, headers: CORS_HEADERS }
        );

    } catch (error) {
        console.error('Unexpected error:', error);

        return Response.json(
            { success: false, error: 'An unexpected error occurred. Please try again.' },
            { status: 500, headers: CORS_HEADERS }
        );
    }
};

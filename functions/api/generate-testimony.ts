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

const TESTIMONY_MODEL = "claude-sonnet-4-20250514";
const MAX_GENERATIONS_PER_DAY = 5;
const MAX_GENERATIONS_PER_HOUR_GUEST = 3;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://lightning-dni.pages.dev",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/**
 * Profanity check with word boundaries (matches claude.ts client-side check)
 */
function containsProfanity(text: string): boolean {
  const lowerText = text.toLowerCase();
  const profanityWords = [
    "fuck",
    "fucking",
    "fucked",
    "shit",
    "shitty",
    "bitch",
    "bastard",
    "cunt",
  ];
  return profanityWords.some((word) => {
    const regex = new RegExp(`\\b${word}\\b`, "i");
    return regex.test(lowerText);
  });
}

/**
 * Clean up generated output
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
    text = text.replace(pattern, "");
  }
  text = text.replace(/\n---\s*$/, "");
  text = text.replace(/\n#+\s*$/, "");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

/**
 * Hash an IP address for anonymous rate limiting (no raw IPs stored)
 */
async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + "_lightning_salt_2024");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Check rate limit via Supabase
 */
async function checkRateLimit(
  supabaseUrl: string,
  supabaseKey: string,
  userId: string | null,
  ipHash: string,
): Promise<{ allowed: boolean; remaining: number; reason: string | null }> {
  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    "Content-Type": "application/json",
  };

  if (userId) {
    // Authenticated user: 5 per 24 hours
    const windowStart = new Date(
      Date.now() - 24 * 60 * 60 * 1000,
    ).toISOString();
    const url = `${supabaseUrl}/rest/v1/testimony_generations?user_id=eq.${userId}&created_at=gte.${windowStart}&select=id`;

    const response = await fetch(url, {
      headers: { ...headers, Prefer: "count=exact" },
    });

    const countHeader = response.headers.get("content-range");
    const count = countHeader
      ? Number.parseInt(countHeader.split("/")[1]) || 0
      : 0;

    if (count >= MAX_GENERATIONS_PER_DAY) {
      return {
        allowed: false,
        remaining: 0,
        reason: `You've reached the daily limit of ${MAX_GENERATIONS_PER_DAY} testimony generations. Please try again tomorrow.`,
      };
    }

    return {
      allowed: true,
      remaining: MAX_GENERATIONS_PER_DAY - count,
      reason: null,
    };
  } else {
    // Guest: 3 per hour by IP hash
    const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const url = `${supabaseUrl}/rest/v1/testimony_generations?ip_hash=eq.${ipHash}&user_id=is.null&created_at=gte.${windowStart}&select=id`;

    const response = await fetch(url, {
      headers: { ...headers, Prefer: "count=exact" },
    });

    const countHeader = response.headers.get("content-range");
    const count = countHeader
      ? Number.parseInt(countHeader.split("/")[1]) || 0
      : 0;

    if (count >= MAX_GENERATIONS_PER_HOUR_GUEST) {
      return {
        allowed: false,
        remaining: 0,
        reason: `You've reached the limit of ${MAX_GENERATIONS_PER_HOUR_GUEST} testimony generations per hour. Please sign in for a higher limit or try again later.`,
      };
    }

    return {
      allowed: true,
      remaining: MAX_GENERATIONS_PER_HOUR_GUEST - count,
      reason: null,
    };
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
  },
): Promise<void> {
  try {
    await fetch(`${supabaseUrl}/rest/v1/testimony_generations`, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
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
    console.error("Failed to log generation:", e);
  }
}

// The testimony generation prompt (same as claude.ts — 3-Act structure with God Moment emphasis)
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

  // Rate limit: 10 requests per minute per IP (Layer 3 supplement)
  const { checkRateLimit, getClientIP, rateLimitResponse } =
    await import("./_rateLimit");
  const ip = getClientIP(request);
  const rl = checkRateLimit(ip, "generate-testimony", 10, 60_000);
  if (!rl.allowed) {
    return rateLimitResponse(rl.retryAfterMs, CORS_HEADERS);
  }

  // Validate environment
  if (!env.CLAUDE_API_KEY) {
    return Response.json(
      {
        success: false,
        error: "Server misconfiguration: Claude API key not set.",
      },
      { status: 500, headers: CORS_HEADERS },
    );
  }

  // Parse request body
  let body: TestimonyRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, error: "Invalid request body." },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const { answers, userName, userAge, userId } = body;

  // Validate all 4 answers present
  if (
    !answers?.question1 ||
    !answers?.question2 ||
    !answers?.question3 ||
    !answers?.question4
  ) {
    return Response.json(
      { success: false, error: "All 4 questions must be answered." },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  // Profanity check
  const combinedText = Object.values(answers).join(" ");
  if (containsProfanity(combinedText)) {
    return Response.json(
      {
        success: false,
        error: "Please remove any inappropriate language and try again.",
      },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  // Get IP hash for rate limiting
  const clientIP =
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For") ||
    "unknown";
  const ipHash = await hashIP(clientIP);

  // Rate limit check (Layer 3 — server-side)
  const totalWords = combinedText.trim().split(/\s+/).length;

  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    const rateLimitResult = await checkRateLimit(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      userId || null,
      ipHash,
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
        errorType: "rate_limit",
      });

      return Response.json(
        {
          success: false,
          error: rateLimitResult.reason,
          remaining: rateLimitResult.remaining,
        },
        { status: 429, headers: CORS_HEADERS },
      );
    }
  }

  // Build the user message
  const detailLevel =
    totalWords > 200 ? "detailed" : totalWords > 100 ? "moderate" : "brief";

  const userMessage = `Here are this person's answers. Transform them into a testimony following the system instructions.

Question 1 — Life before God stepped in:
"${answers.question1}"

Question 2 — The lowest point / breaking moment:
"${answers.question2}"

Question 3 — How God showed up (THE GOD MOMENT — give this the most weight):
"${answers.question3}"

Question 4 — What's different now:
"${answers.question4}"

${userName ? `Their name: ${userName}` : ""}
${userAge && userAge < 18 ? "Note: This person is under 18. Use age-appropriate language." : ""}
Detail level of their answers: ${detailLevel} (${totalWords} total words). ${detailLevel === "brief" ? "Their answers are short — write a shorter, tighter testimony (150-250 words). Do NOT invent details to fill space." : detailLevel === "moderate" ? "Write a medium-length testimony (200-350 words). Stay faithful to what they provided." : "Their answers are detailed — you have rich material to work with (250-400 words)."}

Remember: rephrase their words into polished prose, but never add experiences or emotions they didn't describe.`;

  // Call Claude API with retry logic for transient errors (429/529)
  const MAX_RETRIES = 3;
  const claudeRequestBody = JSON.stringify({
    model: TESTIMONY_MODEL,
    max_tokens: 1500,
    temperature: 0.6,
    system: TESTIMONY_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  try {
    let claudeResponse: Response | null = null;
    let lastStatus = 0;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      claudeResponse = await fetch(
        "https://api.anthropic.com/v1/messages",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": env.CLAUDE_API_KEY,
            "anthropic-version": "2023-06-01",
          },
          body: claudeRequestBody,
        },
      );

      lastStatus = claudeResponse.status;

      // Retry on overloaded (529) or rate-limited (429)
      if (
        (lastStatus === 529 || lastStatus === 429) &&
        attempt < MAX_RETRIES
      ) {
        // Exponential backoff: 1s, 2s, 4s
        const delayMs = 1000 * Math.pow(2, attempt);
        console.warn(
          `Claude API returned ${lastStatus}, retrying in ${delayMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      // Success or non-retryable error — stop retrying
      break;
    }

    if (!claudeResponse || !claudeResponse.ok) {
      const errorText = claudeResponse
        ? await claudeResponse.text()
        : "No response";
      console.error("Claude API error:", lastStatus, errorText);

      // Log the failed attempt
      if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
        await logGeneration(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
          userId: userId || null,
          ipHash,
          model: TESTIMONY_MODEL,
          inputWordCount: totalWords,
          outputWordCount: null,
          success: false,
          errorType: `api_${lastStatus}`,
        });
      }

      if (lastStatus === 429) {
        return Response.json(
          {
            success: false,
            error: "Too many requests. Please wait a moment and try again.",
          },
          { status: 429, headers: CORS_HEADERS },
        );
      }

      if (lastStatus === 529) {
        return Response.json(
          {
            success: false,
            error:
              "Lightning is temporarily busy. Please try again in a moment.",
          },
          { status: 503, headers: CORS_HEADERS },
        );
      }

      return Response.json(
        {
          success: false,
          error: "Failed to generate testimony. Please try again.",
        },
        { status: 500, headers: CORS_HEADERS },
      );
    }

    const claudeData = (await claudeResponse.json()) as any;
    const rawTestimony =
      claudeData.content?.[0]?.type === "text"
        ? claudeData.content[0].text
        : "";

    if (!rawTestimony) {
      return Response.json(
        {
          success: false,
          error: "Lightning returned an empty response. Please try again.",
        },
        { status: 500, headers: CORS_HEADERS },
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
      { status: 200, headers: CORS_HEADERS },
    );
  } catch (error) {
    console.error("Unexpected error:", error);

    return Response.json(
      {
        success: false,
        error: "An unexpected error occurred. Please try again.",
      },
      { status: 500, headers: CORS_HEADERS },
    );
  }
};

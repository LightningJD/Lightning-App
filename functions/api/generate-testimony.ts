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
 *   { success: boolean, testimony?: string, wordCount?: number, badgeColor?: string, badgeDoor?: number, error?: string, remaining?: number }
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
  userId?: string;
}

const TESTIMONY_MODEL = "claude-sonnet-4-5-20250929";
const MAX_GENERATIONS_PER_DAY = 5;
const MAX_GENERATIONS_PER_HOUR_GUEST = 3;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://lightningsocial.app",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/**
 * Profanity check with word boundaries
 */
function containsProfanity(text: string): boolean {
  const lowerText = text.toLowerCase();
  const profanityWords = [
    "fuck", "fucking", "fucked", "shit", "shitty", "bitch", "bastard", "cunt",
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
  text = text.replaceAll(/\n{3,}/g, "\n\n");
  return text.trim();
}

/**
 * Hash an IP address for anonymous rate limiting
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
    const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const url = `${supabaseUrl}/rest/v1/testimony_generations?user_id=eq.${userId}&created_at=gte.${windowStart}&select=id`;
    const response = await fetch(url, { headers: { ...headers, Prefer: "count=exact" } });
    const countHeader = response.headers.get("content-range");
    const count = countHeader ? Number.parseInt(countHeader.split("/")[1]) || 0 : 0;
    if (count >= MAX_GENERATIONS_PER_DAY) {
      return { allowed: false, remaining: 0, reason: `You've reached the daily limit of ${MAX_GENERATIONS_PER_DAY} testimony generations. Please try again tomorrow.` };
    }
    return { allowed: true, remaining: MAX_GENERATIONS_PER_DAY - count, reason: null };
  } else {
    const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const url = `${supabaseUrl}/rest/v1/testimony_generations?ip_hash=eq.${ipHash}&user_id=is.null&created_at=gte.${windowStart}&select=id`;
    const response = await fetch(url, { headers: { ...headers, Prefer: "count=exact" } });
    const countHeader = response.headers.get("content-range");
    const count = countHeader ? Number.parseInt(countHeader.split("/")[1]) || 0 : 0;
    if (count >= MAX_GENERATIONS_PER_HOUR_GUEST) {
      return { allowed: false, remaining: 0, reason: `You've reached the limit of ${MAX_GENERATIONS_PER_HOUR_GUEST} testimony generations per hour. Please sign in for a higher limit or try again later.` };
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

// ============================================
// BADGE CLASSIFICATION — 7 Colors, 14 Doors
// ============================================

const BADGE_CLASSIFICATION_PROMPT = `You are a testimony classifier for a Christian app called Lightning. You read a testimony and assign it ONE of 14 doors under 7 colors based on the person's origin story.

THE 7 COLORS AND 14 DOORS:

RED (doors 1-2) — The Blood Doorway (Isaiah 1:18 / Exodus 12)
Door 1: Life fell apart. Addiction, abuse, failure, collapse. Something shattered.
Door 2: Hit rock bottom. Last chance. God showed up at the final moment and pulled them out.
Signals: addiction, rock bottom, last chance, almost died, lost everything, intervention, rehab, overdose, suicide attempt

ORANGE (doors 3-4) — The Fire Doorway (Malachi 3:2-3 / Isaiah 48:10)
Door 3: Chronic illness, abuse, trauma, mental health battles, prolonged hardship. Pain was the door.
Door 4: Public failure, secret sin revealed, scandal, guilt that became unbearable. The fire of exposure.
Signals: chronic pain, illness, diagnosis, abuse, trauma, depression, anxiety, shame, secret exposed, scandal, guilt, caught

YELLOW (doors 5-6) — The Light Doorway (John 8:12 / Psalm 18:28)
Door 5: Life looked fine on paper but felt hollow. Material success without purpose. Something was missing.
Door 6: Saw someone else live out faith genuinely and wanted what they had.
Signals: had everything, successful, empty, hollow, meaningless, going through motions, watched a friend's faith, envied their peace, wanted what they had

GREEN (doors 7-8) — The Life Doorway (Psalm 23:2 / Ezekiel 47)
Door 7: Death, divorce, abandonment. Loss drove them to God because nothing else could carry it.
Door 8: Exposed to faith as a kid. May have walked away. Those seeds came back to life later.
Signals: death of loved one, funeral, divorce, lost my mom/dad/child, grandma used to pray, grew up going to church, seeds planted, came back to what I knew

BLUE (doors 9-10) — The Deep Doorway (Psalm 42:7 / Psalm 63:1)
Door 9: Intellectual and spiritual hunger. Tried other beliefs, philosophy, religions. Kept seeking.
Door 10: Felt conditionally loved. The message of grace broke through. Longing for unconditional love.
Signals: searching, studying, reading, exploring religions, questions, philosophy, longing, thirst, unconditional love, grace, never felt loved, wanted real love

INDIGO (doors 11-12) — The Night Doorway (Psalm 30:5 / Genesis 32:24)
Door 11: Identity collapsed — prison, major life transition, lost everything that defined them. Old self died.
Door 12: Did not want it. Pushed back against God, church, Christians. Hostile, skeptical, burned by religion. Something broke through anyway.
Signals: identity crisis, prison, lost everything that defined me, atheist, fought against God, hated church, burned by religion, skeptic, argued, resistant, hostile

VIOLET (doors 13-14) — The Crown Doorway (Revelation 3:11 / 2 Timothy 4:8)
Door 13: Raised in faith. Knew the culture. At some point it shifted from inherited to personal.
Door 14: Persistent invitation from a trusted person. A friend kept inviting, a family member kept praying. Drawn in through people.
Signals: raised in church, PK, worship team, always went, inherited, never questioned until, friend kept inviting, community, belonging, felt like home, finally walked in

RULES:
- Assign the ONE door that most closely matches the person's origin story
- If the testimony clearly walks through two doors, pick the primary (strongest) one
- Respond with ONLY valid JSON: {"color":"<color>","door":<number>}
- No explanation. No extra text. Just the JSON.`;

/**
 * Classify a testimony into one of 7 colors / 14 doors.
 * Best-effort — testimony is still saved if classification fails.
 */
async function classifyTestimonyBadge(
  apiKey: string,
  testimony: string,
): Promise<{ color: string; door: number } | null> {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: TESTIMONY_MODEL,
        max_tokens: 50,
        temperature: 0,
        system: BADGE_CLASSIFICATION_PROMPT,
        messages: [{ role: "user", content: `Classify this testimony:\n\n${testimony}` }],
      }),
    });

    if (!response.ok) {
      console.warn("Badge classification API error:", response.status);
      return null;
    }

    const data = (await response.json()) as any;
    const raw = data.content?.[0]?.type === "text" ? data.content[0].text : "";
    const parsed = JSON.parse(raw.trim());
    const validColors = ["red", "orange", "yellow", "green", "blue", "indigo", "violet"];

    if (validColors.includes(parsed.color) && Number.isInteger(parsed.door) && parsed.door >= 1 && parsed.door <= 14) {
      return { color: parsed.color, door: parsed.door };
    }

    console.warn("Badge classification returned invalid data:", raw);
    return null;
  } catch (e) {
    console.warn("Badge classification failed:", e);
    return null;
  }
}

// The testimony generation prompt (3-Act structure with God Moment emphasis)
const TESTIMONY_PROMPT = `You are a ghostwriter who transforms a person's raw answers into a polished first-person Christian testimony. Your job is to restructure and rephrase their words into flowing narrative prose — NOT to invent their story for them.

## CORE RULE: AUTHENTICITY OVER DRAMA

This is someone's real faith journey. Accuracy is sacred.

- ONLY include details, emotions, struggles, and events the user explicitly described
- NEVER invent specifics they didn't mention
- NEVER fabricate supernatural experiences unless they described them
- If an answer is brief, write a shorter but genuine paragraph
- When in doubt, stay closer to what they said

## WHAT YOU SHOULD DO

- Rephrase their words into polished, flowing first-person prose
- Fix grammar, spelling, and awkward phrasing
- Use varied sentence structure
- Make it sound like the person telling their story naturally to a friend
- Keep their tone

## THE GOD MOMENT — THIS IS THE MOST IMPORTANT PART

Every testimony has a pivotal moment where God moved. This is the CLIMAX of the story.

**The Hook:** End paragraph 2 with a hook line that creates anticipation before the God encounter. Match intensity to what the person described.

**Expanding the moment:** When the person describes what God did — SLOW DOWN. Do not rush past it in one sentence. Frame God as the ACTIVE AGENT throughout.

## NEVER DO THESE THINGS

- Never copy their raw text verbatim
- Never use Christian cliches
- Never over-spiritualize beyond what the person described
- Never start consecutive sentences with "I"
- Never end with a generic wrap-up

## STRUCTURE (3-Act Testimony)

Write 4 paragraphs in first person:

### ACT 1: THE BEFORE (Paragraphs 1-2)
**Paragraph 1 — THE SETUP:** Brief glimpse of where they are now (Q4), then background (Q1).
**Paragraph 2 — THE BREAKING POINT:** What they went through (Q2). End with a HOOK LINE.

### ACT 2: THE GOD MOMENT (Paragraph 3)
**Paragraph 3 — THE ENCOUNTER:** The heart of the testimony. Describe their encounter with God (Q3). This should be the longest and most powerful paragraph.

### ACT 3: THE AFTER (Paragraph 4)
**Paragraph 4 — THE TRANSFORMATION:** Where they are now (Q4). Show the contrast. End with a specific, powerful sentence.

## LENGTH

- Detailed answers: 250-400 words
- Brief answers: 150-250 words
- Never pad with invented content
- Paragraph 3 should generally be the longest

## OUTPUT

- Write ONLY the testimony text — no titles, headers, labels, or preambles
- First person throughout
- Past tense for past events, present tense for current life
- Clear paragraph breaks`;

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

  // Rate limit: 10 requests per minute per IP
  const { checkRateLimit: checkIpRateLimit, getClientIP, rateLimitResponse } =
    await import("./_rateLimit");
  const ip = getClientIP(request);
  const rl = checkIpRateLimit(ip, "generate-testimony", 10, 60_000);
  if (!rl.allowed) {
    return rateLimitResponse(rl.retryAfterMs, CORS_HEADERS);
  }

  if (!env.CLAUDE_API_KEY) {
    return Response.json(
      { success: false, error: "Server misconfiguration: Claude API key not set." },
      { status: 500, headers: CORS_HEADERS },
    );
  }

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

  if (!answers?.question1 || !answers?.question2 || !answers?.question3 || !answers?.question4) {
    return Response.json(
      { success: false, error: "All 4 questions must be answered." },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const combinedText = Object.values(answers).join(" ");
  if (containsProfanity(combinedText)) {
    return Response.json(
      { success: false, error: "Please remove any inappropriate language and try again." },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const clientIP = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "unknown";
  const ipHash = await hashIP(clientIP);
  const totalWords = combinedText.trim().split(/\s+/).length;

  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    const rateLimitResult = await checkRateLimit(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, userId || null, ipHash);
    if (!rateLimitResult.allowed) {
      await logGeneration(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        userId: userId || null, ipHash, model: TESTIMONY_MODEL,
        inputWordCount: totalWords, outputWordCount: null, success: false, errorType: "rate_limit",
      });
      return Response.json(
        { success: false, error: rateLimitResult.reason, remaining: rateLimitResult.remaining },
        { status: 429, headers: CORS_HEADERS },
      );
    }
  }

  const detailLevel = totalWords > 200 ? "detailed" : totalWords > 100 ? "moderate" : "brief";

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
      claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.CLAUDE_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: claudeRequestBody,
      });

      lastStatus = claudeResponse.status;

      if ((lastStatus === 529 || lastStatus === 429) && attempt < MAX_RETRIES) {
        const delayMs = 1000 * Math.pow(2, attempt);
        console.warn(`Claude API returned ${lastStatus}, retrying in ${delayMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      break;
    }

    if (!claudeResponse || !claudeResponse.ok) {
      const errorText = claudeResponse ? await claudeResponse.text() : "No response";
      console.error("Claude API error:", lastStatus, errorText);

      if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
        await logGeneration(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
          userId: userId || null, ipHash, model: TESTIMONY_MODEL,
          inputWordCount: totalWords, outputWordCount: null, success: false, errorType: `api_${lastStatus}`,
        });
      }

      if (lastStatus === 429) {
        return Response.json({ success: false, error: "Too many requests. Please wait a moment and try again." }, { status: 429, headers: CORS_HEADERS });
      }
      if (lastStatus === 529) {
        return Response.json({ success: false, error: "Lightning is temporarily busy. Please try again in a moment." }, { status: 503, headers: CORS_HEADERS });
      }
      return Response.json({ success: false, error: "Failed to generate testimony. Please try again." }, { status: 500, headers: CORS_HEADERS });
    }

    const claudeData = (await claudeResponse.json()) as any;
    const rawTestimony = claudeData.content?.[0]?.type === "text" ? claudeData.content[0].text : "";

    if (!rawTestimony) {
      return Response.json({ success: false, error: "Lightning returned an empty response. Please try again." }, { status: 500, headers: CORS_HEADERS });
    }

    const testimony = sanitizeOutput(rawTestimony);
    const wordCount = testimony.trim().split(/\s+/).length;

    // Classify testimony into a badge color/door (best-effort)
    const badge = await classifyTestimonyBadge(env.CLAUDE_API_KEY, testimony);

    if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
      await logGeneration(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        userId: userId || null, ipHash, model: TESTIMONY_MODEL,
        inputWordCount: totalWords, outputWordCount: wordCount, success: true, errorType: null,
      });
    }

    return Response.json(
      { success: true, testimony, wordCount, badgeColor: badge?.color ?? null, badgeDoor: badge?.door ?? null },
      { status: 200, headers: CORS_HEADERS },
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return Response.json({ success: false, error: "An unexpected error occurred. Please try again." }, { status: 500, headers: CORS_HEADERS });
  }
};

/**
 * Cloudflare Pages Function — Pull Quote Extraction
 *
 * Called after testimony generation. Reads the user's Q3 answer
 * ("Was there a specific moment that was the turning point...") and
 * extracts the single most powerful sentence where God directly showed up.
 * That sentence becomes the `lesson` / pull quote on the profile.
 *
 * Endpoint: POST /api/extract-pull-quote
 * Request body: { question3: string }
 * Response: { success: boolean, pullQuote?: string, error?: string }
 */

interface Env {
  CLAUDE_API_KEY: string;
}

const PULL_QUOTE_MODEL = "claude-haiku-4-5-20251001";
const MAX_INPUT_LENGTH = 5000;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://lightningsocial.app",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const { checkRateLimit, getClientIP, rateLimitResponse } =
    await import("./_rateLimit");
  const ip = getClientIP(request);
  const rl = checkRateLimit(ip, "extract-pull-quote", 20, 60_000);
  if (!rl.allowed) {
    return rateLimitResponse(rl.retryAfterMs, CORS_HEADERS);
  }

  if (!env.CLAUDE_API_KEY) {
    return Response.json(
      { success: false, error: "Server misconfiguration." },
      { status: 500, headers: CORS_HEADERS },
    );
  }

  let body: { question3?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, error: "Invalid request body." },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const { question3 } = body;
  if (!question3?.trim()) {
    return Response.json(
      { success: false, error: "question3 is required." },
      { status: 400, headers: CORS_HEADERS },
    );
  }
  if (question3.length > MAX_INPUT_LENGTH) {
    return Response.json(
      { success: false, error: "Input too long." },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const prompt = `From the text below, extract the single most powerful sentence where God directly showed up — His touch, His power, the exact turning point moment. Return ONLY that sentence, word for word as it appears in the text, with no preamble, no surrounding quotes, no commentary.

If no single sentence clearly captures a God moment, return the sentence that best captures the heart of the transformation.

Text:
${question3}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: PULL_QUOTE_MODEL,
        max_tokens: 150,
        temperature: 0.2,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      return Response.json(
        { success: false, error: "Extraction failed." },
        { status: 500, headers: CORS_HEADERS },
      );
    }

    const data = (await response.json()) as any;
    const pullQuote =
      data.content?.[0]?.type === "text"
        ? data.content[0].text.trim()
        : "";

    if (!pullQuote) {
      return Response.json(
        { success: false, error: "No pull quote extracted." },
        { status: 500, headers: CORS_HEADERS },
      );
    }

    return Response.json(
      { success: true, pullQuote },
      { status: 200, headers: CORS_HEADERS },
    );
  } catch (error) {
    console.error("Pull quote extraction error:", error);
    return Response.json(
      { success: false, error: "Unexpected error." },
      { status: 500, headers: CORS_HEADERS },
    );
  }
};

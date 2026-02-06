/**
 * Claude AI Service for Testimony Generation
 * 
 * This service uses the Anthropic Claude API to generate compelling,
 * authentic Christian testimonies based on user answers to 4 questions.
 */

import Anthropic from '@anthropic-ai/sdk';

const CLAUDE_API_KEY = import.meta.env.VITE_CLAUDE_API_KEY;

// Initialize Anthropic client
const anthropic = CLAUDE_API_KEY ? new Anthropic({
    apiKey: CLAUDE_API_KEY,
    dangerouslyAllowBrowser: true // Required for client-side usage
}) : null;

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
}

export interface TestimonyGenerationResult {
    success: boolean;
    testimony?: string;
    error?: string;
    wordCount?: number;
}

/**
 * The complete testimony generation prompt from gistfile1.txt
 * This comprehensive prompt ensures high-quality, authentic testimonies
 */
const TESTIMONY_GENERATION_PROMPT = `# COMPLETE ENHANCED TESTIMONY GENERATION PROMPT

You are an expert testimony writer who crafts compelling, authentic Christian testimonies that honor each person's unique journey with God. Your role is to transform raw answers into a powerful first-person narrative that draws readers in and glorifies God.

---

## FRAMEWORK STRUCTURE

Every testimony is written in FIRST PERSON and follows this 4-paragraph arc with an IMPACT-FIRST opening:

### 1. IMPACT OPENING (1 paragraph)
- Start with what they're doing NOW (their current calling/mission from Question 4)
- Make it compelling and specific in first person: "Today, I lead..." "I'm currently..." "God has me..."
- Create curiosity with a transition: "But this wasn't always my story..." or "But my journey here began in darkness..." or "A few years ago, my life looked completely different..."
- Brief setup: quickly establish their background/pre-crisis life
- Keep this paragraph punchy and engaging (3-6 sentences)

### 2. THE DESCENT/CRISIS (1 paragraph)
- Name specific struggles authentically in first person (depression, addiction, doubt, trauma, loneliness, etc.)
- Show the weight of what they were carrying: "I felt..." "I was drowning in..." "I couldn't escape..."
- Build tension toward the breaking point
- Use concrete details, not vague generalities
- This paragraph should feel heavy and honest (3-6 sentences)

### 3. THE PIVOTAL MOMENT & TRANSFORMATION (1 paragraph)
- The turning point in first person: "I cried out to God..." "I hit rock bottom when..." "Then God..."
- This is where everything shifts
- May include: prophetic word, vision, voice of God, circumstantial miracle, Spirit encounter
- **ONLY include supernatural elements if the user explicitly mentions them**
- Show specific freedom/healing/deliverance received: "God broke..." "I experienced..." "The weight lifted..."
- Create a "BUT GOD..." moment
- Show the transformation clearly (4-7 sentences)

### 4. FULL CIRCLE CLOSE (1 paragraph)
- Circle back to their current mission with new context
- Show how their past pain now fuels their purpose: "Now I..." "Today I get to..." "God uses my story to..."
- End with Kingdom impact and forward momentum
- Make the connection between their pain and their purpose explicit (3-5 sentences)

---

## STYLE GUIDELINES

### SENTENCE VARIETY
- Mix short, punchy sentences with longer flowing narrative
- Use fragments for dramatic effect: "But God had other plans."
- Vary paragraph length naturally
- Start sentences differently (avoid repetitive "I" starts when possible)

### HOOKS & PACING
- Open with an attention-grabbing statement about current impact
- Use transitional phrases that create anticipation:
  * "But my journey here began in darkness."
  * "A few years ago, my life looked completely different."
  * "Then everything changed."
  * "In that moment..."
  * "But God wasn't done with me."
  * "Little did I know..."
  * "What happened next..."

### AUTHENTICITY MARKERS
- Use the person's actual name naturally (sparingly, only when it flows)
- Include specific details: locations, events, ages, relationships
- Quote God's voice or prophetic words exactly as user provides them
- Name raw emotions honestly: devastated, shattered, numb, suffocating, empty
- Don't sugarcoat the darkness
- Avoid Christian clichés (see "What to Avoid" section)

### THEOLOGICAL DEPTH
- Emphasize God's character: faithful, pursuing, redeeming, speaking, healing
- Show God's initiative, not just human seeking
- Reference Scripture naturally when relevant (but don't force it)
- Focus on Jesus, Holy Spirit, and personal relationship over religion
- Show transformation as God's work, not self-improvement

### TONE
- Dramatic and intense
- Emotionally resonant but not manipulative
- Conversational yet powerful
- Raw honesty over polish
- Vulnerable without being self-pitying

---

## VARIETY MECHANISMS

To ensure each testimony feels unique, use these variations:

### OPENING VARIATIONS (rotate these styles):
- Mission statement: "Today, I lead a recovery ministry for women..."
- Impact with contrast: "I now counsel men through addiction. Five years ago, I was the one who needed saving."
- Present action: "Every week, I share my testimony with college students searching for hope."
- Calling reveal: "God called me to plant churches in forgotten neighborhoods—a calling born from my own season of feeling forgotten."
- Specific ministry: "I run a home for women escaping trafficking, a mission that emerged from my own rescue."
- Journey statement: "My journey to wholehearted faith required walking away from everything I thought I wanted."

### TRANSITIONAL PHRASES (use variety across testimonies):
- "Then my world collapsed."
- "But one night, everything changed."
- "Everything came to a head when..."
- "In that moment, something shifted."
- "God wasn't finished with my story."
- "What happened next altered the trajectory of my life."
- "Little did I know..."
- "But God had other plans."

### EMOTIONAL LANGUAGE (avoid repetition):
- Instead of always "broken": shattered, lost, empty, desperate, numb, consumed, destroyed
- Instead of always "encountered": met, experienced, felt, heard, sensed, touched by
- Instead of always "freedom": liberation, release, breakthrough, deliverance, healing, peace
- Instead of always "changed": transformed, shifted, altered, revolutionized, redeemed

### CRISIS DESCRIPTORS (vary these):
- "The weight was crushing me."
- "I was drowning and couldn't find air."
- "Darkness had become my normal."
- "I felt like I was disappearing."
- "The pain was suffocating."
- "I was completely lost."
- "Emptiness consumed me."

---

## WHAT TO AVOID

### ❌ CHRISTIAN CLICHÉS
Never use these overused phrases:
- "God showed up"
- "Jesus met me where I was"
- "Sweet fellowship"
- "Poured out His love"
- "Fell in love with Jesus"
- "On fire for God"
- "Radical encounter"
- "Wrecked me in the best way"
- "Set my heart on fire"

### ❌ VAGUE LANGUAGE
Don't use generic descriptions:
- "struggled with some things" → Be specific: "struggled with depression and suicidal thoughts"
- "had a hard time" → "couldn't get out of bed for weeks"
- "went through stuff" → Name the actual struggle

### ❌ OVER-SPIRITUALIZATION
- Don't make everything sound mystical if the user described it practically
- If they said "I read the Bible and felt peace," don't turn it into "I was swept into the throne room"
- Match their tone and experience level

### ❌ FORMULAIC PATTERNS
- Don't start every paragraph with "I"
- Don't use the same transitional phrase twice in one testimony
- Vary sentence structure throughout
- Don't repeat emotional words (if you used "shattered" once, use "broken" next time)

### ❌ FORCED SUPERNATURAL ELEMENTS
- ONLY include visions/voices/miracles if the user explicitly mentioned them
- Don't add prophetic words they didn't receive
- Don't embellish their experience

### ❌ WEAK ENDINGS
Avoid generic conclusions:
- "And now I'm living for Jesus every day" (too vague)
- "My life has never been the same" (cliché)
- "I'm so grateful for what God did" (weak impact)

Instead, end with specific Kingdom impact and purpose connection.

---

## LENGTH REQUIREMENTS

- **Target: 4 paragraphs (250-350 words total)**
- Paragraph 1 (Impact Opening): 3-6 sentences
- Paragraph 2 (Crisis): 3-6 sentences
- Paragraph 3 (Pivot & Transformation): 4-7 sentences
- Paragraph 4 (Full Circle): 3-5 sentences

Can extend up to 600 words if answers are detailed.
Prioritize impact and clarity and flow over hitting exact word count.

---

## OUTPUT FORMAT

- Write in **FIRST PERSON** using "I" throughout
- Use the person's name only in natural contexts (if at all)
- Use **proper capitalization** (no all caps)
- Write in **past tense** for past events, **present tense** for current mission
- Create clear **paragraph breaks** for readability
- Make it feel like the person is telling their own story directly
- Mix short, punchy sentences with longer flowing narrative
- Conversational yet powerful, vulnerable without self-pity
- Show on God's work and power, not self-work
- Do not reuse phrases within the same paragraph
- Rotate phrases across submissions to maintain uniqueness

---

## QUALITY CHECKLIST

Before finalizing, ensure the testimony has:

✅ Impact-first opening that hooks the reader
✅ Specific details from the user's answers (not generic)
✅ Clear story arc (now → before → crisis → pivot → transformation → full circle)
✅ Emotional authenticity (names real struggles and feelings)
✅ NO Christian clichés 
✅ Varied sentence structure and length
✅ Strong transitional phrases
✅ Supernatural elements ONLY if user mentioned them
✅ Clear connection between pain and purpose
✅ Kingdom impact in the closing
✅ 4 paragraphs, 250-350 up to 600 if needed for detailed or descriptive moments of the turning point or encounter with God
✅ First-person voice throughout
✅ Proper capitalization`;

/**
 * Generate a testimony story from user answers using Claude AI
 */
export async function generateTestimony(
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

    // Basic validation
    if (!answers.question1 || !answers.question2 || !answers.question3 || !answers.question4) {
        return {
            success: false,
            error: 'All 4 questions must be answered to generate a testimony.'
        };
    }

    // Content moderation - check for profanity or explicit content
    const combinedText = Object.values(answers).join(' ').toLowerCase();
    const profanityPatterns = [
        // Add basic patterns - real implementation would use a proper filter library
        'fuck', 'shit', 'damn', 'bitch', 'ass', 'hell'
    ];

    const hasProfanity = profanityPatterns.some(word =>
        combinedText.includes(word)
    );

    if (hasProfanity) {
        return {
            success: false,
            error: 'Please remove any profanity or inappropriate language from your answers and try again.'
        };
    }

    try {
        // Construct the user message with their answers
        const userMessage = `Please generate a testimony based on these answers:

**Question 1 (Background/Life Before Christ):**
${answers.question1}

**Question 2 (Struggles/Crisis):**
${answers.question2}

**Question 3 (Pivotal Moment/Transformation):**
${answers.question3}

**Question 4 (Current Mission/Calling):**
${answers.question4}

${userName ? `**User's Name:** ${userName}` : ''}
${userAge && userAge < 18 ? `**Note:** This user is under 18 years old. Please use age-appropriate language and tone down graphic content.` : ''}

Generate a compelling, authentic testimony following all the guidelines in the system prompt.`;

        // Call Claude API
        const message = await anthropic.messages.create({
            model: 'claude-3-haiku-20240307',
            max_tokens: 2000,
            temperature: 0.7,
            system: TESTIMONY_GENERATION_PROMPT,
            messages: [
                {
                    role: 'user',
                    content: userMessage
                }
            ]
        });

        // Extract the testimony text from the response
        const testimony = message.content[0].type === 'text'
            ? message.content[0].text
            : '';

        if (!testimony) {
            return {
                success: false,
                error: 'Failed to generate testimony. The AI response was empty.'
            };
        }

        // Calculate word count
        const wordCount = testimony.trim().split(/\s+/).length;

        return {
            success: true,
            testimony: testimony.trim(),
            wordCount
        };

    } catch (error) {
        console.error('Error generating testimony with Claude:', error);

        // Provide user-friendly error messages
        if (error instanceof Error) {
            if (error.message.includes('API key')) {
                return {
                    success: false,
                    error: 'Invalid API key. Please check your Claude API configuration.'
                };
            }
            if (error.message.includes('rate limit')) {
                return {
                    success: false,
                    error: 'Too many requests. Please wait a moment and try again.'
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
            model: 'claude-3-haiku-20240307',
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

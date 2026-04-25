# Voice Recording & Audio Conversation Mode for Testimony Questionnaire — Spec

**Status:** Proposal / not yet implemented
**Author:** Spec generated 2026-04-25
**Owner:** TBD
**Related files:**
- `src/components/TestimonyQuestionnaire.tsx`
- `src/contexts/AppContext.tsx` (`handleTestimonyQuestionnaireComplete`)
- `functions/api/generate-testimony.ts`
- `src/config/testimonyQuestions.ts`

---

## Spec at a glance — two phases

This spec covers two related but distinct features. They share infrastructure (recording, STT, the `/api/transcribe` endpoint) but differ sharply in UX and scope. Implementing them as separate phases lets us ship value early and de-risk the bigger one.

| | **Phase 1 — Voice Input** | **Phase 2 — Audio Conversation Mode** |
|---|---|---|
| **What** | Per-question toggle: type or speak your answer. Transcript appears for editing. | Hands-free podcast-style flow: app reads each question aloud, user responds verbally, app moves to next. |
| **User mode toggle** | Per-question (Type / Speak) | Top-level mode (Type / Talk) chosen at the start |
| **Inputs** | User's microphone | Microphone + speakers |
| **New tech** | `MediaRecorder`, STT API | + Pre-generated TTS audio files, audio player, voice activity heuristics |
| **Editing** | Always editable transcript | Transcript saved silently; review at the end before generation |
| **Risk** | Low — input-layer only | Medium — new flow state machine, accessibility complexity |
| **Estimated effort** | ~2–2.5 weeks | +1.5–2 weeks on top of Phase 1 |

Sections 1–9 cover Phase 1. Section 10 covers Phase 2. Sections 11–13 cover shared concerns, open questions, and acceptance criteria.

---

## 0. Note on the existing flow

The prompt for this spec described the questionnaire as a "3-question" flow. The current implementation has **4 questions** (`TESTIMONY_QUESTIONS` in `src/config/testimonyQuestions.ts`):

1. Life before being saved
2. What led to salvation
3. Specific turning-point moment / experience with God (THE GOD MOMENT)
4. What God is calling you to now

This spec assumes voice support applies to **all 4** questions. Whether to keep the toggle uniform across all four or only enable it for the longer-form middle questions is a UX call to settle in design review (recommendation: enable for all four, since users with literacy or accessibility constraints will want it everywhere).

Critically, the downstream code path is **input-format-agnostic**:

- `TestimonyQuestionnaire` collects strings into `answers: TestimonyAnswers`
- `generateTestimony()` in `src/lib/api/ai-service.ts` POSTs those strings to `/api/generate-testimony`
- `handleTestimonyQuestionnaireComplete` in `AppContext.tsx` receives the generated content + answers and persists it via `createTestimony` (or `saveGuestTestimony`)

Voice is therefore an **input-layer-only** feature. The Claude prompt, badge classification, rate limiting, and persistence layers do not need to change. This dramatically reduces blast radius and is the single most important architectural fact in this spec.

---

## 1. UX Flow (Phase 1 — Voice Input)

### 1.1 Toggle placement

Each question screen renders one textarea today. Add a **two-mode toggle** at the top of the answer area:

```
┌─────────────────────────────────────────┐
│ Question 2 of 4                         │
│ What led you to salvation...            │
│                                         │
│  [ ✏️ Type ] [ 🎤 Speak ]               │  ← segmented toggle
│                                         │
│   <textarea OR recorder UI>             │
│                                         │
│ 0 / 70 min characters                   │
│ [Back]            [Next →]              │
└─────────────────────────────────────────┘
```

The mode is **per-question state**, not global — a user can speak Q1, type Q2, speak Q3, etc. Default mode is `text` (preserves current behavior).

### 1.2 Recording states

The recorder pane has five visual states:

| State | Trigger | UI |
|---|---|---|
| **Idle** | Mode just switched to voice, no recording yet | Large mic button, helper text "Tap to start recording" |
| **Permission prompt** | First tap, browser asks for mic | Native browser dialog; recorder shows "Waiting for permission…" |
| **Recording** | Permission granted, capture in progress | Pulsing red dot, live timer (mm:ss), waveform bars, **Stop** button |
| **Processing** | Stop pressed, audio uploading + transcribing | Spinner, "Transcribing your story…" (typically 3–10s) |
| **Reviewable** | Transcript returned | Editable textarea pre-filled with transcript, "Re-record" button, "Looks good" → Next |

### 1.3 Critical UX rules

1. **Transcript is always editable.** STT will mishear names, scripture references, places. The user MUST be able to fix typos in a textarea before advancing. This also gracefully handles minLength validation when transcription is shorter than expected.
2. **No auto-advance.** After transcription completes, the user reviews and explicitly clicks Next. We never silently send unedited STT output to Claude.
3. **Re-record replaces, doesn't append.** If a user re-records, the prior transcript is discarded after a confirm step ("Replace your transcript?"). Appending creates more confusion than value.
4. **Recording cap: 3 minutes per question.** Hard stop at 3:00 with a soft warning at 2:30. Three minutes at typical speech (~150 wpm) yields ~450 words — far above the 200-char suggested length and below the 25 MB Whisper file cap with room to spare.
5. **Background tab safety.** If the page is hidden during recording, keep recording (modern browsers allow this). If the tab is closed, the in-flight audio is lost — same UX guarantee as the existing "leave this page?" guard.
6. **Permission denial is not fatal.** If mic access is denied, show a clear message ("Voice unavailable — microphone access denied. You can switch to typing instead.") and disable the voice toggle. The user can still complete the questionnaire by typing.
7. **Existing `useBeforeUnloadGuard`** must extend to abort active recordings on cancel — release the MediaRecorder + microphone tracks so the OS-level mic indicator turns off.

### 1.4 First-time onboarding

The first time a user opens the recorder in voice mode, show a 1-line tooltip emphasizing the "no pressure" philosophy (see section 11.4 for the full messaging principle):

> "Just talk naturally — Lightning's AI will shape your words into your testimony. Stumbles, pauses, even 'um' all get cleaned up."

Show once per user (localStorage flag, e.g. `lightning_voice_intro_seen`).

---

## 2. React Component Design

### 2.1 New components

**`src/components/AudioRecorder.tsx`** (the main new component)

```ts
interface AudioRecorderProps {
  nightMode: boolean;
  questionId: string;            // for telemetry / re-record key
  initialTranscript?: string;    // if user navigates Back then Forward
  maxDurationSec?: number;       // default 180
  onTranscriptReady: (text: string) => void;  // fires when STT returns
  onCancel?: () => void;         // user backed out / switched to text mode
}
```

Owns:
- `MediaRecorder` lifecycle (start, stop, error)
- Microphone permission state
- Local timer + max-duration cutoff
- Audio level meter feed for waveform
- POST to `/api/transcribe` and surfaces `{ text, durationSec, language }` to parent

Renders the five states in section 1.2 above.

**`src/components/AudioWaveform.tsx`** (visual only)

Reads `AnalyserNode.getByteFrequencyData()` on `requestAnimationFrame` and renders 24–32 vertical bars. Pure presentational; takes `analyser: AnalyserNode | null` as a prop. Falls back to a static "recording" pulse if `AudioContext` is unavailable.

**`src/hooks/useAudioRecorder.ts`** (logic-only hook)

Per CLAUDE.md (rule: hooks are the source of truth for state), all recording logic lives here. The component is thin.

```ts
function useAudioRecorder(opts: { maxDurationSec: number }) {
  return {
    state: 'idle' | 'requesting' | 'recording' | 'stopping' | 'error',
    permission: 'unknown' | 'granted' | 'denied',
    durationSec: number,
    analyser: AnalyserNode | null,   // for waveform
    audioBlob: Blob | null,           // populated after stop()
    error: string | null,
    start(): Promise<void>,
    stop(): Promise<void>,
    reset(): void,
  };
}
```

### 2.2 Permission handling (web)

Use `navigator.permissions.query({ name: 'microphone' })` where supported (Chrome, Edge, Firefox) to detect existing permission state without showing the prompt. Safari does not support that query — fall through to `getUserMedia()` directly. `getUserMedia` rejection codes:

- `NotAllowedError` → user denied
- `NotFoundError` → no microphone hardware
- `NotReadableError` → mic already in use by another app
- `OverconstrainedError` → constraint mismatch (very rare with default constraints)

Each maps to a distinct, non-technical user message.

### 2.3 Stream constraints

Record at the lowest quality that produces good transcription:

```ts
getUserMedia({
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 1,
    sampleRate: 16000,   // hint; browser may ignore
  },
});
```

16 kHz mono is the standard input for STT models — higher rates waste bandwidth without improving accuracy.

### 2.4 Integration with `TestimonyQuestionnaire`

Minimum changes (see section 6 for details):

```tsx
// Inside TestimonyQuestionnaire, replace the lone <textarea> with:
const [inputMode, setInputMode] = useState<Record<string, 'text' | 'voice'>>({});
const mode = inputMode[currentQuestion.id] ?? 'text';

// Toggle UI ...
{mode === 'text' ? (
  <textarea ... />  // existing code, unchanged
) : (
  <AudioRecorder
    nightMode={nightMode}
    questionId={currentQuestion.id}
    initialTranscript={currentAnswer}
    onTranscriptReady={(t) => handleAnswerChange(t)}
    onCancel={() => setInputMode(m => ({ ...m, [currentQuestion.id]: 'text' }))}
  />
)}
```

`handleAnswerChange` writes into the same `answers` state — so the existing min-length validation, character counter, error display, and Next-button gating all keep working unchanged.

---

## 3. Audio Format and Size

### 3.1 Web (browser)

Use `MediaRecorder` with the best supported codec, in this order:

| MIME type | Browsers | Notes |
|---|---|---|
| `audio/webm; codecs=opus` | Chrome, Firefox, Edge, Android Chrome | Excellent compression (~24 kbps), small files |
| `audio/mp4; codecs=mp4a.40.2` (AAC-LC) | Safari iOS 14.3+, Safari macOS | Larger files, but only choice on Safari |
| `audio/wav` | Universal fallback (rarely needed) | Uncompressed; ~1 MB per 10s mono 16-bit @ 16kHz |

Detect with `MediaRecorder.isTypeSupported(...)` at component mount. Both webm/opus and mp4/aac are accepted by Whisper, Deepgram, and Google STT — no transcoding needed.

### 3.2 Expected file sizes

At opus ~24 kbps mono:
- 30s clip ≈ 90 KB
- 60s clip ≈ 180 KB
- 180s clip (max) ≈ 540 KB

At AAC ~64 kbps mono (Safari):
- 180s clip ≈ 1.4 MB

All comfortably under the 25 MB Whisper limit and well within Cloudflare Pages' 100 MB request body limit. **No chunking or multi-part upload needed.** Single `POST` of a `Blob` is sufficient.

### 3.3 Capacitor (mobile native)

When the app ships in Capacitor, use **`@capacitor-community/voice-recorder`** or **`capacitor-plugin-microphone`**, both of which expose a uniform JS API and produce m4a/AAC on iOS, m4a/AAC on Android. Output is base64 — decode to a Blob before upload to keep the server contract identical.

Decision point during implementation: if the web `MediaRecorder` API works inside the Capacitor `WKWebView` on iOS (it does on iOS 14.5+), we can avoid the native plugin entirely and reuse the web code path. Verify this on a real device before committing to one approach.

---

## 4. Server Endpoint — `/api/transcribe`

New Cloudflare Pages Function: `functions/api/transcribe.ts`. Mirror the structure of `generate-testimony.ts`.

### 4.1 Contract

```
POST /api/transcribe
Content-Type: multipart/form-data

Body fields:
  audio: <File>          required, the audio blob
  questionId: <string>   required, one of question1..question4 (audit)
  userId: <string>       optional, Supabase user UUID for rate limiting

Response:
  200 { success: true, text: string, durationSec: number, language?: string }
  400 { success: false, error: "<reason>" }
  413 { success: false, error: "Recording too long" }
  429 { success: false, error: "Rate limit reached", retryAfterMs }
  500 { success: false, error: "Transcription failed" }
```

### 4.2 Server-side responsibilities

In order:

1. **CORS preflight** — same `CORS_HEADERS` constant pattern as `generate-testimony.ts`.
2. **IP rate limit** — reuse `_rateLimit.ts`. Suggest 20 transcriptions per IP per minute (more generous than testimony generation since users will re-record).
3. **Auth-aware quota** — separate from testimony generation. Suggest:
   - Authenticated: 30 transcriptions / 24h (handles 4 questions × multiple re-records)
   - Guest: 10 transcriptions / hour (by IP hash)
4. **File validation** — content-type prefix `audio/`, size < 10 MB hard cap, declared duration < 200s (declared in form field, recomputed server-side after transcription as a sanity check).
5. **Forward to STT provider** — see section 5.
6. **Strip leading/trailing whitespace + truncate** to 5,000 chars (3 min × 150 wpm × 5 chars/word ≈ 2,250 — 5,000 gives generous headroom).
7. **Profanity check** — same `containsProfanity` rule as `generate-testimony.ts`. If profanity is in the transcript, return the text anyway (the user will edit) but flag in the response so the UI can show a soft warning. Do NOT block at the transcribe step — the existing block already lives in `/api/generate-testimony`.
8. **Log to Supabase** — new table `transcription_attempts` with columns `(id, user_id, ip_hash, question_id, duration_sec, char_count, model, success, error_type, created_at)`. Same logging shape as `testimony_generations`.
9. **Return JSON.**

### 4.3 Environment variables

Add to Cloudflare Pages env (and document in `docs/DEPLOYMENT_GUIDE.md`):

- `STT_PROVIDER` — `whisper` | `deepgram` | `google` (so we can swap without redeploying client)
- `OPENAI_API_KEY` (if Whisper)
- `DEEPGRAM_API_KEY` (if Deepgram)
- `GOOGLE_STT_CREDENTIALS_JSON` (if Google)

The provider switch is a simple `if/else` in `functions/api/transcribe.ts` — keeps optionality without abstraction overhead.

### 4.4 Database migration

```sql
-- supabase/migrations/<timestamp>_add_transcription_attempts.sql
CREATE TABLE transcription_attempts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id),     -- nullable for guests
  ip_hash     TEXT NOT NULL,
  question_id TEXT,
  duration_sec INT,
  char_count  INT,
  model       TEXT,
  success     BOOLEAN NOT NULL,
  error_type  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX transcription_attempts_user_window
  ON transcription_attempts (user_id, created_at DESC);
CREATE INDEX transcription_attempts_ip_window
  ON transcription_attempts (ip_hash, created_at DESC);
```

No RLS policies needed — service-role-only access (matches `testimony_generations`).

---

## 5. STT Service Comparison

**Pricing/specs below are recorded as of spec authoring (April 2026). Re-verify before finalizing the contract — STT pricing changes frequently.**

### 5.1 OpenAI Whisper API (`whisper-1` and `gpt-4o-mini-transcribe`)

| Dimension | Notes |
|---|---|
| Cost | Whisper-1: ~$0.006/min. gpt-4o-mini-transcribe: ~$0.003/min input. |
| Accuracy | Strong on conversational English including faith vocabulary; weaker on rare proper names. |
| Latency | 3–10s for clips under 60s. No streaming on whisper-1; gpt-4o-transcribe supports streaming. |
| Languages | 90+ languages. Automatic language detection. |
| File limits | 25 MB / file. Single request. |
| Auth | Bearer token. Easiest possible setup. |
| Operational risk | Same vendor as Claude — single provider for two critical paths is a concentration risk. |

**Sample monthly cost at scale:**
- 10,000 testimonies/month × 4 questions × 60s avg × ~1.3 retries = ~520,000 minutes? No — 10,000 × 4 × 1 min × 1.3 = 52,000 min ≈ $312/mo at Whisper-1, ~$156/mo at gpt-4o-mini-transcribe.

### 5.2 Deepgram (Nova-3 or Nova-2)

| Dimension | Notes |
|---|---|
| Cost | Nova-3 pre-recorded: ~$0.0043/min ($0.26/hr). Streaming option ~$0.0077/min. Lowest of the three. |
| Accuracy | Very strong, often beats Whisper on noisy/accented audio in independent benchmarks. Custom vocabulary support (could whitelist "scripture", book names). |
| Latency | <1s for short clips on streaming; 1–3s pre-recorded. Fastest of the three. |
| Languages | 36+ languages on Nova. |
| File limits | Generous (no practical cap for our sizes). |
| Auth | API key in header. Simple. |
| Operational risk | Independent vendor. Solid uptime SLA. |

**Sample monthly cost at same scale:** 52,000 min × $0.0043 ≈ $224/mo.

### 5.3 Google Cloud Speech-to-Text v2 (Chirp 2)

| Dimension | Notes |
|---|---|
| Cost | ~$0.024/min for default models, ~$0.016/min with discounts. Highest of the three. |
| Accuracy | Comparable to Whisper / Deepgram on English. Excellent multilingual coverage. Strong for accented speech. |
| Latency | 1–4s pre-recorded; streaming available. |
| Languages | 125+ languages — best multilingual. |
| File limits | 480-min limit for batch; we'd use sync recognition (~60s sync limit). |
| Auth | GCP service account credentials (JSON). More setup than API-key vendors. |
| Operational risk | GCP project setup adds operational surface area unrelated to current stack (Cloudflare + Supabase). |

**Sample monthly cost at same scale:** 52,000 min × $0.016 ≈ $832/mo.

### 5.4 Recommendation

**Start with Deepgram Nova-3.** Cheapest, fastest, accurate, simple API-key auth, independent of Anthropic. The `STT_PROVIDER` env var keeps a 1-day swap to Whisper available if Deepgram has issues during rollout.

If multilingual support becomes a requirement (Lightning expanding to non-English-speaking churches), reassess in favor of Whisper or Google.

**Do not** call STT directly from the client under any circumstances — the API key would be exposed (CLAUDE.md security rule #1, #6). Always go through `/api/transcribe`.

---

## 6. Changes to Existing Files

Minimum necessary touches. Keeping each diff small per CLAUDE.md.

### 6.1 `src/components/TestimonyQuestionnaire.tsx`

- Add `inputMode` state (per-question text/voice flag).
- Render the `[Type | Speak]` toggle above the answer area.
- Conditionally render existing `<textarea>` OR the new `<AudioRecorder>`.
- When `AudioRecorder` returns a transcript, call existing `handleAnswerChange(text)` — the rest of the validation flow is untouched.

Estimated diff: ~60 lines added, 0 lines changed in existing logic.

### 6.2 `src/contexts/AppContext.tsx`

**No changes required.** `handleTestimonyQuestionnaireComplete` consumes the same `answers` shape.

### 6.3 `functions/api/generate-testimony.ts`

**No changes required.** The function receives string answers — origin (typed vs spoken) is invisible.

Optionally: extend the `testimony_generations` log to include `input_method: 'text' | 'voice' | 'mixed'` for analytics. Low priority — defer unless asked.

### 6.4 New files

| File | Purpose |
|---|---|
| `src/components/AudioRecorder.tsx` | New component (section 2.1) |
| `src/components/AudioWaveform.tsx` | New visual component (section 2.1) |
| `src/hooks/useAudioRecorder.ts` | Recording state hook (section 2.1) |
| `src/lib/api/transcription.ts` | Thin client wrapper that POSTs to `/api/transcribe`, mirrors `ai-service.ts` pattern |
| `functions/api/transcribe.ts` | Cloudflare Pages Function (section 4) |
| `supabase/migrations/<ts>_add_transcription_attempts.sql` | Logging table (section 4.4) |

### 6.5 Config / dependencies

- **No new npm packages** for the web path. `MediaRecorder` and `AudioContext` are built-in Web APIs.
- Tailwind classes only — no new styling system.
- For the Capacitor path (later): `@capacitor-community/voice-recorder` (single dep, when Capacitor is added).

This satisfies CLAUDE.md rule #5 (no dependency changes unless required).

---

## 7. Mobile Considerations (Capacitor)

### 7.1 Permissions

**iOS** (`ios/App/App/Info.plist`):
```xml
<key>NSMicrophoneUsageDescription</key>
<string>Lightning uses your microphone so you can speak your testimony instead of typing it. Audio is sent securely for transcription and never stored.</string>
```

The string is **user-visible** in the iOS permission dialog. The wording matters — make the privacy claim ("never stored") only if it's true (it is, per section 9).

**Android** (`android/app/src/main/AndroidManifest.xml`):
```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

Android 6+ also requires runtime permission via `Capacitor.requestPermissions()`. The `voice-recorder` plugin handles this.

### 7.2 Capacitor decision tree

1. **Try web `MediaRecorder` inside `WKWebView`/`WebView` first.** Works on iOS 14.5+ and modern Android WebView. If it works, no plugin needed — same code path as the browser build.
2. If it fails (older OS, codec issue, getUserMedia returns silence): fall back to `@capacitor-community/voice-recorder`. Wrap it in `useAudioRecorder` so the component contract is identical.

The hook abstraction (section 2.1) is the right boundary for this fork — `AudioRecorder` shouldn't know whether it's web or native.

### 7.3 Background behavior

iOS will pause recording when the app is backgrounded unless `UIBackgroundModes` includes `audio`. **Do not enable background audio recording** — it triggers extra App Store review scrutiny and isn't justified for a "press to record your testimony" flow. Recording stops on background; the partial audio is discarded with a "Recording stopped — please re-record" message.

### 7.4 Mic indicator

iOS shows an orange dot in the status bar whenever the mic is active. Make sure recording stops + the `MediaStreamTrack` is `.stop()`'d as soon as the user clicks Stop OR navigates away — leaving the mic open after Stop is a privacy red flag and a likely App Store reject reason.

### 7.5 File transfer

Native plugins emit base64 strings for the captured audio. Convert to a Blob client-side before `fetch`. Do not stream multi-part bodies via Capacitor's HTTP plugin — the regular `fetch` from the WebView works and is simpler.

---

## 8. Timeline Estimate

Tasks ordered for parallelizable work where possible. Single-developer estimates assuming familiarity with the codebase.

| # | Task | Est. | Dependencies |
|---|---|---|---|
| 1 | Set up STT provider account, generate API key, document in deployment guide | 0.5d | — |
| 2 | Write `supabase/migrations/...transcription_attempts.sql` and apply locally | 0.5d | — |
| 3 | Build `functions/api/transcribe.ts` with Deepgram integration + rate limiting + logging | 1.5d | 1, 2 |
| 4 | Build `useAudioRecorder` hook (web only first) with permission + start/stop/timeout | 1d | — |
| 5 | Build `AudioRecorder` and `AudioWaveform` components, all 5 visual states | 1.5d | 4 |
| 6 | Wire toggle into `TestimonyQuestionnaire`, validate end-to-end on web | 1d | 3, 5 |
| 7 | QA pass: Chrome, Firefox, Safari (macOS + iOS Safari), all 4 questions, edge cases | 1d | 6 |
| 8 | Edge cases: permission denied, no mic, timeout, network failure during upload, profanity flagging | 1d | 6 |
| 9 | Capacitor verification (web `MediaRecorder` inside WebView on a test device) | 0.5d | 7 |
| 10 | Capacitor native plugin fallback (only if step 9 reveals failure) | 1.5d | 9 |
| 11 | Telemetry: dashboard query for STT failure rate, average duration, retry rate | 0.5d | 3 |
| 12 | Documentation update + privacy policy revision (sections 9.5, 9.6) | 0.5d | 6 |

**Web-only MVP (steps 1–8, 11, 12): ~8 days.**
**With Capacitor confirmed working (+ step 9): ~8.5 days.**
**With Capacitor native fallback needed (+ step 10): ~10 days.**

Buffer: add 20% for review cycles and unexpected mobile issues. Realistic shipping window: **2–2.5 weeks** of focused work.

### 8.1 Suggested rollout sequence

1. Internal dogfood (admin-only feature flag) — 2 days observation
2. 10% authenticated rollout — monitor STT cost, error rate, transcript quality
3. 100% authenticated — guest rollout simultaneously if costs hold

A simple feature flag like `voice_recording_enabled` in `localProfile` or a Supabase config table is enough — no need to add a feature flag service.

---

## 9. Security & Privacy

### 9.1 API key isolation

- **STT API keys live server-side only** (Cloudflare Pages env vars), never bundled into the client. CLAUDE.md security rule #1.
- Audio is sent to `/api/transcribe`, which calls the STT vendor with the key — same shape as how Claude API calls flow through `/api/generate-testimony`.

### 9.2 Audio retention

**Default policy: do not store audio.**

- The Cloudflare Pages Function receives the audio blob, forwards it to the STT vendor, returns the transcript. The blob is not written to disk, R2, S3, Supabase Storage, or any persistent layer.
- Cloudflare Workers/Pages Functions have ephemeral memory — the audio buffer is GC'd at the end of the request.
- Only the transcript and metadata (`duration_sec`, `char_count`, `success`, `error_type`) are logged.

If audio retention becomes a product requirement later (e.g., "let me re-listen to my answer before generating") — that's a separate feature with its own privacy review, opt-in consent, and storage budget.

### 9.3 Transit security

- Web → Pages Function: HTTPS only (Cloudflare enforces).
- Pages Function → STT vendor: HTTPS only. Pin to vendor's documented endpoint.
- No audio in URLs or query params (CLAUDE.md security rule #10).

### 9.4 Auth & authorization

- **Authenticated users:** require Clerk session cookie like the rest of the app. The endpoint accepts `userId` for rate limiting; Clerk JWT validation should be added if/when other endpoints standardize on it. Today's `/api/generate-testimony` uses an unsigned `userId` from the body — the same model is acceptable here for parity, but flag this as tech debt for a future hardening pass.
- **Guests:** allowed (consistent with current testimony generation flow), bounded by IP-hash quota.
- **No cross-user contamination possible:** transcripts are returned in the response, never stored against another user's ID.

### 9.5 PII / sensitive content

Testimonies contain deeply personal content — addiction, abuse, mental health, trauma (per the badge classification in `generate-testimony.ts`). Privacy posture must reflect that:

- STT vendor selection should favor providers that **do not retain customer audio for model training**. Verify each vendor's policy at signup:
  - Deepgram: customer data is not used for training by default; can sign DPA for additional confidence.
  - OpenAI: API data is not used to train models by default; 30-day retention for abuse review.
  - Google: same default; configurable via DPA.
- All three offer a Data Processing Addendum — sign one before going to production.

### 9.6 Privacy policy update

The existing privacy policy (verify location during implementation) must be updated to disclose:

- Audio is captured when the user opts to record their answer.
- Audio is sent to a third-party transcription service for processing.
- Audio is not retained after transcription.
- Name the STT vendor by name (Deepgram or whatever is chosen).

This is required by CCPA/GDPR transparency rules and Apple App Store privacy nutrition labels.

### 9.7 Profanity and abuse

- The existing `containsProfanity` check in `/api/generate-testimony` continues to be the gate for AI generation.
- `/api/transcribe` returns the raw transcript regardless — the user can edit. If profanity is present, surface a soft inline warning.
- Rate limiting on `/api/transcribe` (section 4.2) prevents abuse via repeated automated requests.

### 9.8 Error message hygiene

CLAUDE.md security rule #8: never leak vendor errors. If Deepgram returns an error, log the detail server-side and return only "Transcription failed. Please try again." to the client.

### 9.9 Logging

`transcription_attempts` table stores **metadata only**: duration, char count, success/failure, error type, IP hash, user ID. **Never log the transcript text** to that table — transcripts go directly into `answers.questionN` if the user accepts them, and into `testimonies.questionN` only if the testimony is saved (already governed by existing RLS).

---

## 10. Phase 2 — Audio Conversation Mode

A hands-free, podcast-interview experience. The user picks "Talk" at the questionnaire intro, then never types or even reads the questions on screen — Lightning reads each question aloud, the user responds verbally, and the flow moves forward automatically. The product feel target is: **like being interviewed by a thoughtful friend on a podcast, not filling out a form.**

This phase builds **on top of** Phase 1 — it reuses `useAudioRecorder`, `AudioRecorder`, `AudioWaveform`, `/api/transcribe`, and the entire STT path. The new pieces are TTS playback, a flow state machine, and a podcast-styled UI.

### 10.1 Mode selection

The intro screen ("Your Story Matters", lines 346–457 in `TestimonyQuestionnaire.tsx`) gains a third primary button OR a mode picker before the first question:

```
┌─────────────────────────────────────────┐
│  How would you like to share?           │
│                                         │
│  ┌───────────────┐ ┌───────────────┐    │
│  │ ⌨️  Type       │ │ 🎙️  Talk       │    │
│  │  Write at     │ │  Just speak — │    │
│  │  your pace    │ │  AI shapes it │    │
│  └───────────────┘ └───────────────┘    │
│                                         │
│  Either way, Lightning's AI shapes      │
│  your words into your testimony. You    │
│  don't need to be perfect.              │
│                                         │
│            [I'm Ready →]                │
└─────────────────────────────────────────┘
```

The reassurance copy under the picker is mandatory, not optional — the most common reason users abandon a voice flow is the worry that they'll mess it up on tape. See section 11.4 for the full messaging principle.

Mode is chosen once and applies to all 4 questions. Inside Talk mode, the per-question Type/Speak toggle from Phase 1 is **hidden** — Talk is its own self-contained flow. The user can exit to Type mode at any time via a "Switch to typing" link in the corner (preserves answers gathered so far).

### 10.2 The flow state machine

Each question cycles through a finite set of states. The whole flow is one sequential state machine spanning all 4 questions:

```
[Intro tap]
   ↓
Q1 ─┬─→ playing-question      (TTS audio plays, waveform animates)
    │      ↓ on audio end
    ├─→ awaiting-response     (Respond button appears, idle)
    │      ↓ tap Respond
    ├─→ recording             (live timer, waveform, Stop button)
    │      ↓ tap Stop
    ├─→ transcribing          (spinner, "got it…")
    │      ↓ on transcript ready
    └─→ confirming            (1–2s pause, "Moving to question 2…")
           ↓
Q2 → playing-question → … (repeats)
   …
After Q4 confirming →
[review-screen]              (all 4 transcripts shown, editable, then Generate)
```

**State-by-state visual treatment:**

| State | UI |
|---|---|
| `playing-question` | Centered orb / waveform animation pulsing in time with TTS audio. Question text appears in subtitle below ("So you can read along if you'd like"). Mute / restart-question icons in corner. |
| `awaiting-response` | Animation calms to a gentle idle pulse. Big circular **Respond** button center-screen. Subtle "Take your time" helper text. |
| `recording` | Same orb shifts to red pulse. Timer mm:ss above. **Stop** button replaces Respond. Audio level meter feeds the orb size. |
| `transcribing` | Soft shimmer animation. "Got it — one moment…" |
| `confirming` | Brief affirmation: "Thanks. Question 3 coming up…" then auto-advance after ~1.5s. |

The screen is intentionally minimal — most users won't read text. Background uses the existing `popOut` modal styling.

### 10.3 The "podcast interview" feel

Concrete design rules to hit the conversational target:

1. **No question numbers, no progress bars during a turn.** Phase 1 shows `Question 2 of 4` and progress dots — those create form-anxiety. In Talk mode, hide them during play/record and only show a subtle 4-dot indicator on the confirmation transition.
2. **Voice persona is consistent.** Same TTS voice across all 4 questions. Warm, unhurried, pastoral — not corporate / news-anchor / hyper-energetic. (Voice recommendations in 10.5.)
3. **Conversational connectives.** The TTS recordings are NOT the exact textarea-style question strings. Re-author each question for spoken delivery — drop hints/placeholders, add gentle transitions:
   - Written Q2: *"What led you to salvation or your own personal relationship with God?"*
   - Spoken Q2: *"Take a moment and think about what led you to Him. Was it a person? An event? A series of moments? Tell me about it."*
4. **Natural pauses.** Insert 0.5–1s of silence at the end of each TTS clip so the moment lands before the Respond button appears. SSML `<break time="800ms"/>` tags give precise control if the vendor supports SSML.
5. **Affirmations between turns.** Pre-generate 3–4 short transition phrases ("Thanks for sharing.", "I appreciate that.", "Beautiful.") and randomly play one between questions. Users notice when something is identical every loop — variety sells the "interview" feel.
6. **Encourage open answers.** No min-length validation visible during Talk mode. Backend still enforces minLength on the transcript — if a user answers in 4 seconds, the flow gently re-prompts: *"Could you tell me a little more about that?"* — also a pre-generated TTS clip.
7. **"No pressure" framing throughout.** This is critical to Talk mode working at all — see section 11.4. The voice persona, the intro, the captions, and the silences all need to communicate that the user can ramble, restart, fumble, and trail off without hurting the result.

### 10.4 TTS strategy — pre-generate, don't stream

Per-user TTS API calls are unnecessary and expensive. The 4 questions, the transition affirmations, and the re-prompts are **fixed strings**. Generate them once, store the resulting MP3/OGG files as static assets, ship in the `public/audio/` bundle.

**Why pre-generation wins here:**
- Zero per-user TTS cost. Phase 2 adds zero ongoing TTS spend at any scale.
- Zero playback latency. Files are CDN-cached by Cloudflare Pages alongside the rest of the static assets.
- Reproducible voice. No vendor outage takes the feature down — once the files are in `public/`, they're permanent.
- Easy A/B testing. Swap the audio bundle to test a different voice without code changes.

**File layout:**

```
public/audio/talk-mode/
├── question-1.mp3        ~15s
├── question-1.ogg
├── question-2.mp3
├── question-2.ogg
├── question-3.mp3
├── question-3.ogg
├── question-4.mp3
├── question-4.ogg
├── intro.mp3             ~10s — "Take your time. There are no wrong answers."
├── reprompt-short.mp3    ~5s — for under-min answers
├── transition-1.mp3      ~2s — "Thanks for sharing."
├── transition-2.mp3      ~2s
├── transition-3.mp3      ~2s
├── transition-4.mp3      ~2s
├── outro.mp3             ~10s — "Beautiful. Generating your testimony now…"
└── manifest.json         { question1: "question-1.mp3", ... } — cache-busting hashes
```

Total budget: ~14 files, ~2–3 MB altogether. Trivial vs. the rest of the bundle.

Provide both **MP3** (universal) and **OGG/Opus** (smaller, preferred where supported). Use an `<audio>` element with `<source>` fallback — the browser picks automatically.

### 10.5 TTS vendor and voice selection

Two strong vendors for one-time generation. Pick by listening to samples — voice quality is subjective and matters here more than infrastructure cost (since this is a one-time bake).

**Recommendation: ElevenLabs.**

| Vendor | Cost (one-time bake) | Voice quality | Notes |
|---|---|---|---|
| **ElevenLabs** | ~$0.15 per 1,000 chars on Multilingual v2 / Eleven Turbo. The full bundle is ~600 chars × 14 clips ≈ 8,400 chars ≈ **$1.30 to generate the whole pack once.** | Best-in-class for warm, expressive English. Wide voice library. SSML supported. | Use **Voice Design** or pick a stock voice. Recommended stock voices to audition: *Rachel* (warm, pastoral), *Adam* (deep, calm male), *Charlotte* (gentle female), *Daniel* (British, thoughtful). For a faith-oriented product, audition both a male and female option and let stakeholders pick. |
| **OpenAI TTS** (`tts-1` / `tts-1-hd`) | $15 / 1M chars on `tts-1`, $30 / 1M on `tts-1-hd`. Bundle costs ~$0.13 / $0.25 once. | Solid; less expressive than ElevenLabs but very natural. 6 stock voices: alloy, echo, fable, onyx, nova, shimmer. | Recommended audition voices: *nova* (warm female), *fable* (British male, narrator quality), *onyx* (deep, calming male). HD model is worth the 2× cost for a one-time bake. |
| **Google Cloud TTS** | ~$16 / 1M chars (Studio voices) | Decent; less character. WaveNet/Neural2 voices are closer to ElevenLabs. | Skip unless already on GCP. |

**Voice selection criteria** (use during stakeholder audition):
1. Warmth — does it sound like someone who cares about the listener?
2. Pace — slow enough to give weight to the questions; not sluggish.
3. Faith-context appropriateness — neither overly religious-broadcaster nor secular-corporate.
4. Accent neutrality — broadly accessible to a US audience as the primary market; consider second voice for non-US later.
5. Recordability across all 4 questions — some voices are great for short utterances but feel uneven across longer scripts. Audition with the actual question text, not a generic test sentence.

Bake script (run once, manually, by a developer with the API key):

```
scripts/generate-talk-audio.ts   (one-off, NOT shipped to client)
  - Reads scripts from src/config/talkModeScripts.ts
  - Calls ElevenLabs API with chosen voice ID
  - Writes MP3 + OGG into public/audio/talk-mode/
  - Generates manifest.json with content hashes
```

The API key for the bake lives in a developer's local `.env` — never in CI, never in the client. Re-run the script only when scripts change or voice is replaced.

### 10.6 Audio player component

**`src/components/QuestionAudioPlayer.tsx`** (new)

```ts
interface QuestionAudioPlayerProps {
  src: string;                          // /audio/talk-mode/question-2.mp3
  autoPlay?: boolean;                   // true in Talk flow
  onEnded: () => void;                  // advance state machine
  onError: (err: Error) => void;        // fall back to text rendering
  showCaption?: boolean;                // accessibility caption underneath
  caption?: string;                     // the actual question text
}
```

Renders:
- Centered audio waveform (reuses `AudioWaveform` from Phase 1, fed from a `MediaElementAudioSourceNode` instead of a mic stream)
- Optional caption (always show in Talk mode for accessibility — see 13.3)
- Mute and replay icons (smaller, secondary)

Implementation note: chain the `<audio>` element through Web Audio API to feed the existing `AudioWaveform` analyser. Same visual component, different source — keeps the design consistent across question playback and user recording.

**`src/hooks/useTalkFlow.ts`** (new — orchestrates the state machine)

```ts
function useTalkFlow(opts: {
  questions: TestimonyQuestion[];
  onAllAnswersComplete: (answers: TestimonyAnswers) => void;
}) {
  return {
    state: 'idle' | 'intro' | 'playing-question' | 'awaiting-response'
         | 'recording' | 'transcribing' | 'confirming' | 'reviewing',
    currentQuestionIndex: number,
    answers: Partial<TestimonyAnswers>,
    currentQuestionAudioSrc: string,
    transitionAudioSrc: string | null,   // played between turns
    startTalkFlow(): void,
    onQuestionAudioEnded(): void,
    startRecording(): Promise<void>,
    stopRecording(): Promise<void>,
    skipToTextMode(): void,               // graceful exit
  };
}
```

This hook owns the entire conversation flow. It composes `useAudioRecorder` (mic) and a small playback hook (TTS) — neither should know about the other.

### 10.7 Review screen at the end

After Q4's transcription completes, **always** show a review screen before generation:

- All 4 transcripts displayed in cards, each editable
- A "Read it back to me" toggle that plays back the user's own recordings (we kept them in browser memory; they're never uploaded to storage — see 13.2)
- A primary "Generate my testimony" button that hands the answers to the existing `handleGenerateTestimony` flow

This is the only point in Talk mode where the user reads their own words. STT errors must have a chance to be caught — silently sending unedited STT to Claude in a fully-audio flow would compound errors badly.

### 10.8 Required files — Phase 2

| File | Purpose |
|---|---|
| `src/components/TalkMode.tsx` | Top-level Talk mode flow component — shown when user picks Talk |
| `src/components/QuestionAudioPlayer.tsx` | TTS playback + waveform |
| `src/components/TalkModeReviewScreen.tsx` | End-of-flow review/edit |
| `src/hooks/useTalkFlow.ts` | State machine |
| `src/hooks/useAudioPlayback.ts` | Audio element + Web Audio API analyser hook |
| `src/config/talkModeScripts.ts` | The 14 spoken-text strings (input to bake script) |
| `scripts/generate-talk-audio.ts` | **Dev-only** TTS bake script — not shipped |
| `public/audio/talk-mode/*` | The 14 generated MP3/OGG files + manifest |

Changes to `TestimonyQuestionnaire.tsx`: add the mode picker on the intro screen, branch to `<TalkMode />` when "Talk" is chosen. Existing typed flow is untouched.

### 10.9 Mobile considerations (Phase 2)

**Audio playback on mobile is constrained by browser autoplay policies.** Both iOS Safari and Android Chrome require a user gesture before any audio plays. Practical implications:

1. The "I'm Ready" / "Start" button **must directly trigger** the first `audio.play()` — don't put async work between the tap and the play call.
2. Subsequent audio (transitions, next question) is allowed to autoplay because the audio context was already unlocked by step 1.
3. If iOS Safari is in **silent mode**, HTML `<audio>` plays via the ringer-respecting category by default — meaning audio will be muted. Use the Web Audio API path (which uses the media category and ignores the silent switch) to ensure playback works regardless of the silent switch. This is a critical iOS gotcha.

**Capacitor specifics:**
- Use `@capacitor/filesystem` only if loading audio from native storage; for bundled `public/audio/` files, the WebView fetches them like any other static asset.
- iOS audio session category should be `playAndRecord` while in Talk mode (allows simultaneous mic + speaker). Set via `@capacitor-community/native-audio` or a small plugin if the WebView default doesn't suffice.
- Test with Bluetooth headsets — recording-while-playing flows often expose Bluetooth quirks (echo, dropped frames). Verify on at least one AirPods session and one Android Bluetooth set during QA.
- Speakerphone vs earpiece routing: iOS may default to the earpiece (small top speaker) when `playAndRecord` is active. Force speaker output explicitly so testimonies aren't whispered out the earpiece.
- The orange (mic) and green (mic+camera) iOS status indicators will flicker as the mode swaps between recording and playback. This is expected — but verify the mic indicator goes away during pure playback states. If it persists, we're holding the mic stream too long.

**Permissions copy** (extends Phase 1's Info.plist string): no change needed — same `NSMicrophoneUsageDescription` covers Talk mode. Audio playback requires no permission.

### 10.10 Phase 2 telemetry

Add events to the `transcription_attempts` table or a new `talk_flow_events` table:

- Mode chosen (typed | voice-input | talk)
- Talk-mode completion rate per question (drop-off curve)
- Re-prompt trigger rate (how often answers were too short)
- Switch-to-typing rate (how often users bail mid-flow)
- Average transcript length in Talk mode vs Voice Input vs Typed

Talk mode either dramatically increases testimony completion (the bet) or it confuses users — these metrics tell us which.

### 10.11 Phase 2 timeline

On top of Phase 1's ~2–2.5 weeks:

| # | Task | Est. | Dependencies |
|---|---|---|---|
| P2-1 | Author the 14 talk scripts — questions, intro, transitions, re-prompt, outro | 0.5d | — |
| P2-2 | Audition 4–6 voices across ElevenLabs + OpenAI; stakeholder pick | 0.5d | P2-1 |
| P2-3 | Write `scripts/generate-talk-audio.ts` bake script; produce final files | 0.5d | P2-2 |
| P2-4 | Build `useAudioPlayback` hook + `QuestionAudioPlayer` component | 1d | P2-3 |
| P2-5 | Build `useTalkFlow` state machine | 1.5d | P2-4 + Phase 1 done |
| P2-6 | Build `TalkMode` orchestrator component (intro / per-question / between-states) | 1.5d | P2-5 |
| P2-7 | Build `TalkModeReviewScreen` (review/edit before generation) | 1d | P2-5 |
| P2-8 | Mode picker on `TestimonyQuestionnaire` intro screen + handoff plumbing | 0.5d | P2-6 |
| P2-9 | Mobile QA: iOS Safari (incl. silent switch), Android Chrome, Bluetooth headset | 1d | P2-8 |
| P2-10 | Capacitor QA on real device(s) — only if/when Capacitor wired up | 0.5d | P2-9 |
| P2-11 | Accessibility QA: captions, screen reader interaction, keyboard escape | 0.5d | P2-8 |
| P2-12 | Telemetry wiring + dashboard | 0.5d | P2-8 |

**Phase 2 total: ~8–9 days on top of Phase 1, realistic shipping ~1.5–2 weeks** with buffer.

**Combined Phase 1 + Phase 2 shipping window: ~4–4.5 weeks of focused work.**

### 10.12 Phase 2 acceptance criteria

- [ ] Mode picker renders on the questionnaire intro and persists user's pick across the flow.
- [ ] First question audio plays within 500ms of tapping "I'm Ready" on iOS Safari (silent switch on AND off).
- [ ] State machine progresses without user input from `playing-question` → `awaiting-response` automatically.
- [ ] Tapping Respond starts recording immediately; tapping Stop ends it cleanly.
- [ ] After Stop, transcription completes and the next question's audio starts within 3s on a typical connection.
- [ ] Under-minimum answers trigger the re-prompt clip exactly once before allowing advance.
- [ ] User can switch to typing mid-flow without losing previously gathered transcripts.
- [ ] Review screen displays all 4 transcripts editable, with optional playback of own recordings.
- [ ] On Capacitor iOS, audio plays through the speaker (not earpiece) and the orange mic indicator clears between turns.
- [ ] No TTS API calls made at runtime — all audio served from `public/audio/talk-mode/` (verify in network tab).
- [ ] Accessibility: spoken question text is also rendered as a caption; "Switch to typing" is keyboard-reachable; ESC exits to typed mode.
- [ ] **"No pressure" messaging visible in all required surfaces** (per section 11.3): mode picker subtext, intro audio, Respond helper text, re-prompt audio, review screen header. Removing any of these is a regression.
- [ ] Intro audio explicitly references that the AI shapes the user's words — not just generic encouragement.

---

## 11. Shared Concerns Across Both Phases

### 11.1 Captioning and accessibility

Talk mode is voice-first, but it must remain usable by deaf and hard-of-hearing users. **Always render the question text as a visible caption** under the audio waveform — even when the audio is playing. The caption is also a fallback if audio fails to load.

For users who rely on screen readers: the mode picker on the intro screen must be properly labeled (`aria-label="Talk mode — hands-free, audio-guided"`). When in Talk mode, announce state transitions via `aria-live="polite"` regions.

### 11.2 Audio retention — recap and clarification

Phase 1 policy (section 9.2) extends to Phase 2 with one addition: in Talk mode the user's own recordings are held **in-browser memory only** for the optional "Read it back to me" toggle on the review screen. They are:
- Never uploaded to any storage layer
- Never persisted across page reload
- Released as soon as the user finishes generation OR navigates away

Pre-generated TTS files (the questions, transitions, etc.) are static assets — public, cacheable, no privacy concern.

### 11.3 Messaging philosophy — "you don't have to be perfect"

This is the single most important UX principle for both phases. Voice flows fail when users freeze up because they're worried about sounding articulate, fumbling, or "doing it wrong." The TestimonyQuestionnaire is asking people to speak about deeply personal moments — the bar for being "polished on the first take" is impossibly high.

**The core promise to the user:** *Just talk naturally. Lightning's AI shapes your words into your testimony. Stumbles, pauses, restarts — it all gets cleaned up.*

This is not marketing fluff — it's true. The existing `TESTIMONY_PROMPT` in `functions/api/generate-testimony.ts` (lines 332+) explicitly instructs Claude to "Rephrase their words into polished, flowing first-person prose," "Fix grammar, spelling, and awkward phrasing," and "Use varied sentence structure." The polishing is already happening for typed answers. Voice answers go through the exact same pipeline. The user's raw transcript IS the input the AI is designed to clean up.

**Where this messaging must appear (and not just once):**

| Surface | Copy direction |
|---|---|
| Phase 1 voice toggle first-tap tooltip | "Just talk naturally — Lightning's AI will shape your words into your testimony. Stumbles, pauses, even 'um' all get cleaned up." (already specified in 1.4) |
| Phase 2 mode picker subtext | "Either way, Lightning's AI shapes your words into your testimony. You don't need to be perfect." (already specified in 10.1) |
| Phase 2 intro audio (`intro.mp3`) | Spoken script: *"Take your time. There are no wrong answers here. Just talk like you're telling a friend — Lightning will shape it into your testimony."* |
| Phase 2 Respond button helper text | "Take your time. Pause, restart, ramble — it all comes out polished." |
| Phase 2 first-recording tooltip (one-time) | Same as Phase 1 tooltip, adapted for context. |
| Re-prompt clip (`reprompt-short.mp3`) | Spoken script: *"That's a great start. Tell me a little more — don't worry about it sounding perfect, just keep going."* |
| Review screen header (Phase 2) | "Here's what you said. The AI will polish this into your testimony — feel free to edit if anything's off." |

**Tone rules for all of this copy:**

1. **Casual, not clinical.** Avoid "do not worry about errors" — say "don't worry about messing up." Match the warm, friend-talking-to-friend register the testimony itself aims for.
2. **Specific reassurances beat generic ones.** "Stumbles, pauses, even 'um'" lands harder than "speak however you want" — naming the exact things people are anxious about ("am I going to say 'um' too much?") tells them you've thought about it.
3. **Show the mechanism, briefly.** "Lightning's AI shapes your words" — naming the AI as an active editor (not a passive recorder) is what makes the reassurance credible. Without that, "don't worry about being perfect" sounds like empty cheerleading.
4. **Never apologize for the AI.** Don't say "the AI will try its best to clean it up." Confidence: "the AI shapes your words." If we're not confident the polishing works, the feature isn't ready.
5. **Repeat in different surfaces.** Users skim. Saying it once is functionally the same as saying it never. Onboarding tooltip + intro audio + Respond helper text + review header = roughly the right repetition density.

**What NOT to say:**
- "Recording…" (technical and stiff — use "Listening…" or "Got it" or just the visual)
- "Please speak clearly" (it implies they could fail)
- "Maximum 3 minutes" as a banner (it implies they might run out — only show as a soft warning at 2:30)
- Anything about the transcript being "automatically generated" — emphasize the AI shaping/polishing, not the transcription step

**Why this section is at the architecture level, not just copy:**

The "no pressure" promise constrains design decisions throughout the spec:
- It's why the Respond button copy and the pre-Respond pause matter (sec 10.2 — `awaiting-response` state with "Take your time")
- It's why we don't show a live word counter during Talk recording (would create pressure)
- It's why the re-prompt clip is gentle, not corrective
- It's why we play random affirmations between questions (sec 10.3 #5)
- It's why all 4 transcripts are editable on the review screen (sec 10.7) — but framed as "feel free to edit," not "please review for errors"

Every contributor should treat this section as load-bearing. If a future change to copy or UX would dilute the "you don't have to be perfect" promise, it should be pushed back on.

### 11.4 Cost summary at scale

Assuming 10,000 testimonies/month × 4 questions × ~1.3 attempts (Phase 1 metric):

| Phase | Per-month cost driver | Estimated cost |
|---|---|---|
| Phase 1 STT (Deepgram) | ~52,000 minutes transcribed | **~$224/mo** |
| Phase 2 TTS | One-time bake of 14 files | **~$1.30 once, $0/mo ongoing** |
| Phase 2 STT | Same volume as Phase 1 (Talk mode users still transcribe) | $0 incremental — already counted above |

Phase 2 adds essentially zero ongoing variable cost. The investment is engineering time + a tiny one-off TTS bake.

---

## 12. Open Questions / Decisions Needed Before Implementation

1. **STT vendor selection** — recommendation is Deepgram, requires sign-off.
2. **Should voice be available for all 4 questions or only Q2/Q3?** Recommendation: all 4.
3. **Multilingual?** If yes, this changes the vendor recommendation toward Whisper or Google AND requires re-baking Phase 2 audio files for each language.
4. **Auth hardening** — should `/api/transcribe` (and `/api/generate-testimony`) start verifying Clerk JWTs in the body? This is the right move long-term but is out of scope for this feature.
5. **Capacitor timing** — the spec covers it, but actual native testing waits until Capacitor is wired up in the project (today there are no Capacitor deps in `package.json`).
6. **Cost ceiling** — at what monthly STT spend should we re-evaluate or add user quota? Recommend setting a billing alert at $300/mo on the chosen vendor.
7. **Phase 2 ship together or after Phase 1?** Recommendation: ship Phase 1 first, observe usage for 2 weeks, then ship Phase 2. Real Phase 1 data informs Phase 2 design.
8. **TTS vendor + voice** — needs a stakeholder audition session (P2-2 in the timeline). Recommendation: ElevenLabs, but the audition is the actual decision.
9. **Talk mode for guests?** — recommendation: yes. Same rate-limiting model as Phase 1 covers it.
10. **Re-prompting threshold** — at what transcript length should the re-prompt fire? Recommend < 30 chars OR < 5 words. Make it configurable in code, not hardcoded.

---

## 13. Phase 1 Acceptance Criteria

A feature reviewer should be able to verify each:

- [ ] Toggle between text and voice mode works on every question and persists per-question state.
- [ ] Recording captures audio, stops at user request, and stops automatically at 3:00.
- [ ] Permission denial shows a clear message and the user can still complete via typing.
- [ ] Transcript appears in an editable textarea after processing; user can edit before advancing.
- [ ] Re-record discards the prior transcript after a confirm prompt.
- [ ] Transcript is fed into the existing 4-answer object — generation flow is byte-identical to the typed path.
- [ ] No API keys are present in any client bundle (verify with bundle inspection).
- [ ] No audio is written to any storage layer (verify by inspecting `/api/transcribe` and the migrations).
- [ ] Rate limits trigger correctly at the configured thresholds.
- [ ] On iOS Safari, the orange mic indicator disappears immediately after Stop.
- [ ] Privacy policy is updated and references the chosen STT vendor.
- [ ] Telemetry dashboard shows STT success rate, average duration, retry rate.
- [ ] First-tap voice tooltip displays the section 1.4 / 11.3 "no pressure" copy and references that the AI shapes the user's words.

# Voice Recording for Testimony Questionnaire — Spec

**Status:** Proposal / not yet implemented
**Author:** Spec generated 2026-04-25
**Owner:** TBD
**Related files:**
- `src/components/TestimonyQuestionnaire.tsx`
- `src/contexts/AppContext.tsx` (`handleTestimonyQuestionnaireComplete`)
- `functions/api/generate-testimony.ts`
- `src/config/testimonyQuestions.ts`

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

## 1. UX Flow

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

The first time a user opens the recorder in voice mode, show a 1-line tooltip: "Speak naturally — you can edit the text after." This appears once per user (localStorage flag, e.g. `lightning_voice_intro_seen`).

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

## 10. Open Questions / Decisions Needed Before Implementation

1. **STT vendor selection** — recommendation is Deepgram, requires sign-off.
2. **Should voice be available for all 4 questions or only Q2/Q3?** Recommendation: all 4.
3. **Multilingual?** If yes, this changes the vendor recommendation toward Whisper or Google.
4. **Auth hardening** — should `/api/transcribe` (and `/api/generate-testimony`) start verifying Clerk JWTs in the body? This is the right move long-term but is out of scope for this feature.
5. **Capacitor timing** — the spec covers it, but actual native testing waits until Capacitor is wired up in the project (today there are no Capacitor deps in `package.json`).
6. **Cost ceiling** — at what monthly STT spend should we re-evaluate or add user quota? Recommend setting a billing alert at $300/mo on the chosen vendor.

---

## 11. Acceptance Criteria

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

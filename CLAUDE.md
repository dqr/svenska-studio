# CLAUDE.md — Svenska Studio

This file gives you the full context for this project. Read it before making any changes.

---

## What This Is

A browser-based tool for a Swedish language learner (Dave) who studies with an instructor
named Katrin via the "Speak Swedish with Katrin" Discord server. Katrin posts voice messages
(OGG format) to the Discord channel. This app makes it easy to:

1. Download those voice messages from Discord (bookmarklet)
2. Transcribe the Swedish audio (OpenAI Whisper)
3. Translate to English and extract vocabulary (Anthropic Claude)
4. Study with a synced audio player that highlights the active transcript segment
5. Save sessions for later review without re-running the APIs

## Running the App

```bash
python3 server.py        # serves at http://localhost:8765
```

The custom server is required — not optional. FFmpeg.wasm needs `Cross-Origin-Opener-Policy`
and `Cross-Origin-Embedder-Policy` headers to use SharedArrayBuffer. `server.py` adds these
to every response. Opening `index.html` directly as a file:// URL will not work once
transcoding is implemented.

## Architecture

Plain HTML + vanilla ES modules. No build step, no bundler, no framework. This is intentional
— the app needs to run on Mac, iPad, and iPhone from a single served URL. Keep it that way.

```
svenska-studio/
├── index.html              # Main app — wires all modules together via ES module imports
├── bookmarklet/
│   └── index.html          # Bookmarklet installer page (self-contained, no imports)
├── src/
│   ├── player.js           # Audio player UI, seek bar, segment sync/highlighting
│   ├── transcribe.js       # OpenAI Whisper API call
│   ├── translate.js        # Anthropic Claude — translation + vocab extraction
│   ├── transcode.js        # FFmpeg.wasm OGG→M4A — STUB, NOT YET IMPLEMENTED
│   ├── session.js          # Save/load .svenska session files (JSON + embedded base64 audio)
│   └── ui.js               # DOM helpers, tab switching, result rendering
├── server.py               # Local dev server with COOP/COEP headers
└── README.md               # User-facing setup instructions
```

## Module Status

| File | Status | Notes |
|------|--------|-------|
| `player.js` | ✅ Complete | Synced playback, seek bar, speed control, segment highlighting |
| `transcribe.js` | ✅ Complete | Whisper verbose_json, Swedish language hint, segment timestamps |
| `translate.js` | ✅ Complete | Per-segment translation + vocab extraction, both via Claude API |
| `session.js` | ✅ Complete | Save/load .svenska files with embedded base64 audio |
| `ui.js` | ✅ Complete | Step indicators, tab switching, segment/vocab/SRT rendering |
| `transcode.js` | ⚠️ Stub | API surface defined, FFmpeg.wasm not wired up — see below |
| `index.html` | ✅ Complete | Imports all modules, pipeline orchestration, event wiring |
| `bookmarklet/index.html` | ✅ Complete | Working — finds and downloads Discord voice-message.ogg files |

## The One Outstanding Task: transcode.js

### Why it matters

Discord voice messages are OGG format. Apple devices (Mac, iPad, iPhone) don't handle OGG
natively — Safari won't play it, and the audio player in the app may behave inconsistently.
M4A (AAC in MPEG-4 container) is Apple's native format and works perfectly everywhere.

The transcoding should happen in the browser, client-side, using FFmpeg compiled to
WebAssembly. No server required. The output M4A file should then be:
- Used by the in-app audio player (replacing the OGG)
- Sent to Whisper for transcription (Whisper accepts M4A fine)
- Embedded in the .svenska session file

### The stub

`src/transcode.js` already defines the full intended API:

```js
// Check if environment supports transcoding (needs SharedArrayBuffer)
export function isTranscodeSupported()

// Convert any audio File to M4A. Returns a Promise<File>.
export async function transcodeToM4A(inputFile, onProgress)
```

`transcodeToM4A` should:
1. Return early (no-op) if the file is already M4A
2. Load FFmpeg.wasm from CDN (cached after first load)
3. Run: ffmpeg -i input.ogg -c:a aac -b:a 128k -movflags +faststart output.m4a
4. Return a new `File` object with the M4A data

### Recommended implementation approach

Use `@ffmpeg/ffmpeg` v0.12 loaded from CDN as ESM (no npm install needed, consistent with
the no-build-step architecture):

```js
import { FFmpeg } from 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12/+esm';
import { fetchFile, toBlobURL } from 'https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12/+esm';
```

The core WASM files also need to be loaded as blob URLs to satisfy CORP headers:
```js
coreURL: await toBlobURL(
  'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12/dist/esm/ffmpeg-core.js',
  'text/javascript'
)
wasmURL: await toBlobURL(
  'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12/dist/esm/ffmpeg-core.wasm',
  'application/wasm'
)
```

FFmpeg.wasm is ~30MB on first load but cached by the browser. Show a progress message
via the `onProgress` callback during loading.

### Wiring transcode into the pipeline

In `index.html`, the pipeline in `runPipeline()` currently goes:
1. Transcribe → 2. Translate → 3. Vocab → 4. SRT

Transcoding should be inserted as **step 0**, before transcription:

```js
// In runPipeline(), before the Whisper call:
if (isTranscodeSupported() && needsTranscode(selectedFile)) {
  setStep('step-transcode', 'active', 'Converting audio to M4A…');
  selectedFile = await transcodeToM4A(selectedFile, msg =>
    setStep('step-transcode', 'active', msg)
  );
  setStep('step-transcode', 'done', 'Audio converted to M4A');
}
```

A new `step-transcode` step needs to be added to the HTML progress list before
`step-transcribe`.

`needsTranscode(file)` should return true if `file.type` is not `audio/mp4` and the
filename doesn't end in `.m4a`.

### Fallback behavior

If `isTranscodeSupported()` returns false (SharedArrayBuffer not available — e.g. the user
opened the file directly instead of via the server), skip transcoding silently and proceed
with the original file. Whisper handles OGG fine; the only issue is local playback on Apple
devices.

---

## Key Design Decisions (don't undo these)

**No build step.** The app uses ES modules loaded directly by the browser. No webpack,
no Vite, no npm. This keeps it deployable anywhere — local server, GitHub Pages, etc. —
and makes it easy to open and edit individual files.

**API keys in the browser.** Keys are entered by the user each session and used directly
from the browser. They are never stored (no localStorage, no server). This is intentional
for a personal single-user tool.

**Session files embed audio.** The `.svenska` format is a JSON file with the audio
embedded as base64. This makes sessions fully self-contained — one file to save, move,
or share. Size is manageable for short voice messages (typically 1–5MB).

**Bookmarklet over extension.** A Chrome/Safari extension would require developer accounts,
signing, and distribution. The bookmarklet is a single draggable link that works in any
browser with no installation friction.

**Swedish language hint to Whisper.** The `language: 'sv'` parameter is explicitly set in
the Whisper API call. This significantly improves accuracy for Swedish vs. letting Whisper
auto-detect.

---

## API Details

### OpenAI (Whisper)
- Endpoint: `https://api.openai.com/v1/audio/transcriptions`
- Model: `whisper-1`
- Response format: `verbose_json` with `timestamp_granularities[]=segment`
- Returns segments with `{start, end, text}` — this timestamp data drives the synced player

### Anthropic (Claude)
- Endpoint: `https://api.anthropic.com/v1/messages`
- Model: `claude-sonnet-4-20250514`
- Requires header: `anthropic-dangerous-direct-browser-access: true` (allows browser calls)
- Two calls per session: translation (segment-by-segment) + vocab extraction

---

## Roadmap (in rough priority order)

1. **transcode.js** — FFmpeg.wasm OGG→M4A (current task)
2. **Bookmarklet: sender + timestamp** — walk Discord DOM to show "Katrin · Mar 9, 4:46 AM"
   instead of "Voice message 3" so the user can identify which message to download
3. **TTS for vocab cards** — speaker button on each vocab card using OpenAI TTS (`tts-1`
   model, `sv` language). Dave already has an OpenAI key so no new credentials needed.
4. **Pitch contour visualizer** — record yourself saying a Swedish phrase, overlay your F0
   curve against a reference (ElevenLabs TTS or Katrin's recording). Swedish is a
   pitch-accent language; this would give pronunciation feedback between lessons.
5. **Session library** — a simple index/gallery of saved .svenska files for when there
   are many lessons accumulated.

---

## User Context

- **Learner:** Dave, studying Swedish with instructor Katrin
- **Discord server:** "Speak Swedish with Katrin"
- **Primary device:** Mac, but wants iPad and iPhone support too
- **Browser:** Safari primarily
- **Comfort level:** Can use Terminal, has GitHub, comfortable with developer tools
- **APIs:** Has OpenAI and Anthropic API keys (pay-as-you-go, ~$0.10/session)

# Svenska Studio 🇸🇪

A browser-based tool for transcribing, translating, and studying Swedish audio lessons from Discord.

## Features

- **Transcription** — Swedish audio → text via OpenAI Whisper
- **Translation** — Swedish → English via Claude
- **Synced player** — click any segment to jump to that point in the audio; active segment highlights as audio plays
- **Vocabulary extraction** — key words and phrases pulled from each lesson
- **SRT export** — bilingual subtitle file for use in VLC or any media player
- **Session save/load** — save a full session (audio + transcript + translation) as a `.svenska` file, reload instantly without re-running the APIs
- **Discord bookmarklet** — one-click voice message download from Discord in Safari or Chrome

## Prerequisites

- Python 3 (for the local dev server — comes with macOS)
- An [OpenAI API key](https://platform.openai.com) (for Whisper transcription)
- An [Anthropic API key](https://console.anthropic.com) (for translation and vocab)

## Quick Start

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/svenska-studio.git
cd svenska-studio

# Start the local dev server
python3 server.py
```

Then open http://localhost:8765 in your browser.

> **Why a local server?** The app uses FFmpeg (via WebAssembly) for audio transcoding, which requires
> specific HTTP headers (`COOP`/`COEP`) that browsers only send from a server, not from a local file.

## Project Structure

```
svenska-studio/
├── index.html              # Main app
├── bookmarklet/
│   └── index.html          # Bookmarklet installer — open once to install
├── src/
│   ├── player.js           # Audio player and segment sync
│   ├── transcribe.js       # OpenAI Whisper API
│   ├── translate.js        # Anthropic Claude API (translation + vocab)
│   ├── transcode.js        # FFmpeg.wasm OGG → M4A conversion
│   ├── session.js          # Save / load .svenska session files
│   └── ui.js               # DOM helpers, tab switching, rendering
├── server.py               # Local dev server with correct COOP/COEP headers
└── README.md
```

## Using the Discord Bookmarklet

1. Open `http://localhost:8765/bookmarklet/` in your browser
2. Drag the gold button to your bookmarks/favorites bar (one-time setup)
3. Go to your Discord channel in the browser, scroll so voice messages are visible
4. Click the bookmark — a panel lists all voice messages with download buttons
5. Download the `.ogg`, drop it into Svenska Studio

## Development with Claude Code

```bash
cd svenska-studio
claude
```

Claude Code has full access to the project files and can help add features, fix bugs, and refactor interactively from the terminal.

## Roadmap

- [ ] OGG → M4A transcoding via FFmpeg.wasm
- [ ] Bookmarklet: show sender name + timestamp for each voice message
- [ ] Pronunciation feedback: pitch contour (F0) visualizer
- [ ] Text-to-speech for vocab cards (ElevenLabs or OpenAI TTS)
- [ ] Session library / index view

# Diction webapp

The Express app behind Diction: it generates dictations in Dutch or American
English with Claude, speaks them with ElevenLabs, and lets you write along.
See the [top-level README](../README.md) for the product overview, play
mode, access control and deployment.

## Features

- Generate a dictation from 3 topics, with 1–8 sentences of varying difficulty,
  in Dutch or American English
- Audio for each sentence using ElevenLabs TTS, in a custom player
  (waveform, replay, 0.75× speed, play count)
- Write along: type each sentence and check it; mistakes are marked word by
  word, and near misses letter by letter
- Drafts are kept in the browser, so a reload doesn't lose your writing
- PIN-protected group play mode for a shared screen
- Admin-only delete via Google login
- Storage on the local filesystem or Vercel Blob

## Setup

### 1. Install Dependencies

```bash
cd webapp
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your API keys:

```bash
cp .env.example .env
```

Edit `.env` and add:

```
ANTHROPIC_API_KEY=sk-ant-xxx
ELEVENLABS_API_KEY=your_key_here
ELEVENLABS_VOICE_ID=your_dutch_voice_id
PORT=3000
```

#### Getting API Keys:

**Claude API Key:**
- Sign up at https://console.anthropic.com/
- Create an API key in your account settings

**ElevenLabs (Text-to-Speech):**
- Sign up at https://elevenlabs.io/
- Find your API key in Settings
- Browse the Voice Library to find a Dutch voice ID
- Set `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID`

### 3. Run the Application

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

The application will be available at http://localhost:3000

### 4. Run the Tests

```bash
npm test
```

Uses Node's built-in test runner (`node --test`); no API keys needed.

## Usage

1. **Create a dictation**: open `/create` (behind a token or passphrase, see
   the top-level README), choose a language, enter 3 topics, a sentence count
   and optionally a play-mode PIN
2. **Wait for generation**: sentences and audio take roughly 30–60 seconds
3. **Write along**: on the dictation page, play a sentence and type it in the
   lined field under it; `Esc` replays, `⌘/Ctrl+Enter` checks
4. **Review**: each check marks what differs and gives a score per sentence
   and for the session; "Show Text" reveals all sentences
5. **Play as a group**: with a PIN set, "Play Mode" shows one sentence at a
   time on a big screen
6. **Manage**: all dictations are listed under `/dictations`; admins can
   delete them

## Architecture

The app is split into two layers:

- **`core/`** — the product itself: topics in → generated, spoken dictation
  out → data needed for playback. Framework-free; it knows nothing about
  Express, sessions, users or HTML. See [`core/README.md`](core/README.md)
  for the boundary rules.
- **Web layer** (everything else) — Express routes, views, UI translations,
  and all access control (Google admin login, create passphrase, play-mode
  PIN). Routes are thin adapters: they authorize the request, call the core
  facade (`core/index.js`), and render the result.

This separation means user management and new UIs (teacher login, admin
login, classmate login) can be built entirely in the web layer without
touching the dictation engine.

## Project Structure

```
webapp/
├── server.js              # Local/Docker entry point
├── app.js                 # Express app, layout rendering, auth routes
├── package.json           # Dependencies
├── .env                   # Environment variables (not committed)
├── core/                  # CORE: dictation engine (framework-free)
│   ├── index.js          # Public facade — only import point for the web layer
│   ├── dictation.js      # Domain service: validation + generation pipeline
│   ├── generation/       # Sentence generation (Claude) + TTS (ElevenLabs)
│   ├── storage/          # Persistence (filesystem or Vercel Blob)
│   └── languages/        # Content languages: prompts + TTS voices
├── i18n/                  # UI locales (display strings only)
├── routes/                # HTTP adapters around the core
│   ├── index.js          # Home page + dictation list
│   ├── create.js         # Create dictation
│   └── dictation.js      # View/play/delete dictation
├── utils/                 # Web-layer concerns
│   ├── security.js       # CSRF, escaping, rate limiting, PIN tokens, admin check
│   ├── securityHeaders.js # CSP and other response headers
│   ├── templates.js      # {{placeholder}} rendering of views/
│   ├── createAccess.js   # Token/passphrase gate for /create
│   └── googleAuth.js     # Google OAuth + signed admin session
├── views/                 # HTML templates
│   ├── layout.html       # Base layout (nav, theme, footer)
│   ├── home.html         # Landing page
│   ├── dictations.html   # List of dictations
│   ├── create.html       # Creation form
│   ├── dictation.html    # Detail page with write-along
│   ├── play.html         # Play mode (standalone, for projection)
│   ├── play-pin.html     # PIN entry for play mode
│   ├── passphrase.html   # Passphrase entry for /create
│   ├── admin-login.html  # Google sign-in
│   └── 403.html          # Create access denied
├── public/                # Static assets (no build step)
│   ├── style.css         # All styles, light and dark theme
│   ├── player.js         # Audio player enhancement (window.DictionPlayer)
│   ├── diff.js           # Word/letter comparison (window.DictionDiff)
│   ├── practice.js       # Write-along checking and drafts
│   └── favicon.svg
├── scripts/               # Token helpers (npm run token:*)
├── test/                  # node --test suites
└── dictations/            # Filesystem storage (auto-created, gitignored)
    └── {id}/
        ├── metadata.json # Title, topics, sentences, language, PIN, timestamp
        └── 0.mp3, ...    # Audio files
```

## Notes

- Locally and in Docker, dictations are stored in the `dictations/`
  directory; on Vercel they go to Vercel Blob (see `core/storage/`)
- Each dictation has a unique 8-character ID
- With filesystem storage only `/dictations/<id>/<n>.mp3` is served
  statically; `metadata.json` holds the PIN and is never exposed
- No database required
- You can modify the generation prompts in `core/languages/` to add example sentences or adjust the format
## Troubleshooting

**Error: "Failed to generate sentences"**
- Check that your ANTHROPIC_API_KEY is valid
- Ensure you have API credits in your Anthropic account

**Error: "Failed to generate speech"**
- Verify `ELEVENLABS_API_KEY` is valid
- Verify `ELEVENLABS_VOICE_ID` is correct
- Check if you've exceeded your ElevenLabs quota

**Audio files not playing**
- Ensure the dictations directory exists and has proper permissions
- Check browser console for errors; a "Refused to load" message means the
  Content-Security-Policy in `utils/securityHeaders.js` blocks the audio's origin

## License

MIT

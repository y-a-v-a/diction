# Diction

The Dutch dictation generator, AI powered.

Inspired by what one can find here: https://dictees.nl/alle-dictees/groot-dictee-der-nederlandse-taal/

## Features

- 🤖 AI-powered Dutch dictation generation using Claude
- 🎙️ Text-to-speech with ElevenLabs
- 🌐 Multi-language UI (Dutch and English) with cookie-based language switcher
- 🎯 AI-generated titles for each dictation
- 🎲 Group play mode — PIN-protected sequential playback optimized for projection on a shared screen
- 🔒 Secret token protection for controlled access
- 🐳 Docker support for easy deployment
- 🛡️ Built-in security: input validation, XSS prevention, rate limiting

## Quick Start

### Option 1: Docker (Recommended)

See [DOCKER.md](DOCKER.md) for detailed instructions.

```bash
# 1. Configure environment
cp .env.docker.example .env.docker
# Edit .env.docker with your API keys

# 2. Run with Docker Compose
docker-compose --env-file .env.docker up -d

# 3. Access the app
open http://localhost:3000
```

### Option 2: Local Development

```bash
cd webapp

# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 3. Generate secret token for /create access
npm run token:setup

# 4. Start the server
npm start
```

## Group Play Mode

Play mode turns a dictation into a communal activity — perfect for family gatherings, classrooms, or game nights.

### Setup

1. Go to `/create?token=YOUR_SECRET_TOKEN`
2. Fill in 3 topics, choose a language and sentence count
3. Enter a **4-6 digit PIN** in the PIN field — this enables play mode for the dictation
4. Click "Generate" and wait for the sentences and audio to be created

### Running the session

5. Connect the admin's device to a TV or projector
6. Open the dictation detail page and click the **"Play Mode"** link
7. Enter the PIN — you'll see the first sentence card with an audio player
8. Hand out pen and paper to all participants

### Playing

9. Press play on the audio for the current sentence — everyone writes along
10. Click **"Next Sentence"** to reveal the next card; repeat until all sentences have been played
11. When ready, click **"Reveal All Text"** (you'll be asked to confirm) — all sentences become visible so everyone can check their work

### Notes

- The PIN is stored per-dictation and remembered in a cookie for 24 hours, so you won't need to re-enter it if you refresh
- Dictations created without a PIN work exactly as before — no play mode link is shown
- The play view is a standalone page (no nav bar) designed for large-screen projection

## Secret Token (Create Access)

The `/create` route is protected by a secret token to prevent unauthorized dictation creation. Without a valid token, visitors get a 403 Forbidden page.

### Generating a token

From the `webapp/` directory:

```bash
# Generate a token and automatically save it to .env
npm run token:setup

# Or just print a token to stdout (doesn't save)
npm run token:generate
```

This creates a 64-character hex string and stores it as `CREATE_SECRET_TOKEN` in your `.env` file.

### Using the token

Once the token is set, access the create page by appending it as a query parameter:

```
http://localhost:3000/create?token=YOUR_SECRET_TOKEN
```

To see the full URL with your token filled in:

```bash
npm run token:url
```

The token is carried through the form submission via a hidden input field, so you only need to provide it once when loading the page.

### Notes

- If `CREATE_SECRET_TOKEN` is **not set** in `.env`, the `/create` route is unprotected (a warning is logged)
- For Docker deployments, set the token in `.env.docker` instead — see [DOCKER.md](DOCKER.md)

## Documentation

- [DOCKER.md](DOCKER.md) - Docker deployment guide
- [webapp/.env.example](webapp/.env.example) - Environment configuration
- [webapp/scripts/](webapp/scripts/) - Token management utilities

## Security

This application includes:
- Secret token authentication for creation endpoints
- Input validation and sanitization
- XSS prevention (HTML escaping)
- Rate limiting
- CSRF protection via form tokens

## License

MIT
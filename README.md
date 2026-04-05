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

Play mode turns a dictation into a communal activity — perfect for family gatherings, classrooms, or game nights. One person controls playback on a shared screen while others write along.

1. Create a dictation with a 4-6 digit PIN
2. Share the play mode link — participants see a PIN entry form
3. The admin advances sentences one by one
4. At the end, reveal all text so everyone can check their work

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
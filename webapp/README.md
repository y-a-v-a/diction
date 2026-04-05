# Dutch Dictation Webapp

A web application for generating Dutch dictations (dictee) using Claude AI and ElevenLabs text-to-speech.

## Features

- Generate Dutch dictations based on 3 custom topics
- 8 sentences per dictation with varying difficulty
- Audio playback for each sentence using ElevenLabs TTS
- Hide/show text for self-assessment
- Persistent storage of dictations
- Delete old dictations

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

**Text-to-Speech Service:**

The app supports two TTS providers. Choose one by setting `TTS_SERVICE` in your `.env` file:

**Option 1: ElevenLabs** (set `TTS_SERVICE=elevenlabs`)
- Sign up at https://elevenlabs.io/
- Find your API key in Settings
- Browse the Voice Library to find a Dutch voice ID
- Set `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID`

**Option 2: Resemble.ai** (set `TTS_SERVICE=resemble`)
- Sign up at https://app.resemble.ai/
- Create or select a project
- Create a voice or use an existing one
- Get your API key from the dashboard
- Set `RESEMBLE_API_KEY` and `RESEMBLE_VOICE_UUID`

### 3. Run the Application

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

The application will be available at http://localhost:3000

## Usage

1. **Create a dictation**: Click "Nieuw Dictee" and enter 3 topics
2. **Wait for generation**: The app will generate sentences and audio (30-60 seconds)
3. **Practice**: Play each sentence audio and write it down
4. **Review**: Click "Toon Tekst" to reveal all sentences and check your work
5. **Manage**: View all dictations on the home page, delete old ones as needed

## Project Structure

```
webapp/
├── server.js              # Express server and template engine
├── package.json           # Dependencies
├── .env                   # Environment variables (not committed)
├── routes/                # Route handlers
│   ├── index.js          # Home page
│   ├── create.js         # Create dictation
│   └── dictation.js      # View/delete dictation
├── services/              # Business logic
│   ├── storage.js        # File system operations
│   ├── claude.js         # Claude SDK integration
│   ├── tts.js            # Text-to-speech abstraction layer
│   ├── elevenlabs.js     # ElevenLabs API integration
│   └── resemble.js       # Resemble.ai API integration
├── views/                 # HTML templates
│   ├── layout.html       # Base layout
│   ├── home.html         # Dictation list
│   ├── create.html       # Creation form
│   └── dictation.html    # Playback page
└── dictations/            # Storage directory (auto-created)
    └── {id}/
        ├── metadata.json # Topics, sentences, timestamp
        └── 0.mp3, ...    # Audio files
```

## Notes

- Dictations are stored in the `dictations/` directory
- Each dictation has a unique 8-character ID
- Audio files are served as static files
- No database required - everything is file-based
- You can modify the Claude prompt in `services/claude.js` to add example sentences or adjust the format
- **Pluggable TTS system**: Switch between ElevenLabs and Resemble.ai by changing `TTS_SERVICE` in `.env`
- Add more TTS providers by creating a new service in `services/` and registering it in `services/tts.js`

## Troubleshooting

**Error: "Failed to generate sentences"**
- Check that your ANTHROPIC_API_KEY is valid
- Ensure you have API credits in your Anthropic account

**Error: "Failed to generate speech"**
- Check that `TTS_SERVICE` is set to either `elevenlabs` or `resemble`
- For ElevenLabs:
  - Verify `ELEVENLABS_API_KEY` is valid
  - Verify `ELEVENLABS_VOICE_ID` is correct
  - Check if you've exceeded your ElevenLabs quota
- For Resemble.ai:
  - Verify `RESEMBLE_API_KEY` is valid
  - Verify `RESEMBLE_VOICE_UUID` is correct
  - Check your Resemble.ai account status

**Audio files not playing**
- Ensure the dictations directory exists and has proper permissions
- Check browser console for errors

## License

MIT

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
│   ├── tts.js            # Text-to-speech exports
│   └── elevenlabs.js     # ElevenLabs API integration
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
- Check browser console for errors

## License

MIT

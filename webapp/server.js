import app from './app.js';
import { getStorageBackend } from './services/storage.js';

const PORT = process.env.PORT || 3000;

// Local / Docker entry point. On Vercel the app is imported directly by the
// serverless function in api/index.js and this file is never executed.
app.listen(PORT, () => {
  console.log(`\n🎙️  Dictee app running on http://localhost:${PORT}`);
  console.log(`Storage backend: ${getStorageBackend()}`);
  console.log(`\nMake sure you have created a .env file with:`);
  console.log(`- ANTHROPIC_API_KEY`);
  console.log(`- ELEVENLABS_API_KEY`);
  console.log(`- ELEVENLABS_VOICE_ID\n`);
});

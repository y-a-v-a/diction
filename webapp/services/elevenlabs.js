import fs from 'fs';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

/**
 * Generate speech audio from text using ElevenLabs API
 */
export async function generateSpeech(text, outputPath) {
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!voiceId || !apiKey) {
    throw new Error('ElevenLabs API key or voice ID not configured');
  }

  try {
    const response = await fetch(`${ELEVENLABS_API_URL}/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_multilingual_v2',
        language_code: 'nl',
        voice_settings: {
          speed: 0.87
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error (${response.status}): ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(outputPath, buffer);

    return true;
  } catch (error) {
    console.error('ElevenLabs API error:', error);
    throw new Error(`Failed to generate speech: ${error.message}`);
  }
}

/**
 * Delay helper for rate limiting
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

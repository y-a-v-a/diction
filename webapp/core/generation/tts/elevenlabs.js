const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

/**
 * Generate speech audio from text using ElevenLabs API.
 * Returns the audio as a Buffer; persistence is left to the storage layer so
 * this works regardless of whether the app runs on a writable filesystem.
 */
export async function generateSpeech(text, options = {}) {
  const voiceId = options.voiceId || process.env.ELEVENLABS_VOICE_ID;
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const languageCode = options.languageCode || 'nl';

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
        language_code: languageCode,
        voice_settings: {
          speed: 0.87
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();

      // Try to parse JSON error response
      try {
        const errorData = JSON.parse(errorText);

        // Handle quota exceeded specifically
        if (errorData.detail?.status === 'quota_exceeded') {
          const message = errorData.detail.message || 'ElevenLabs quota exceeded';
          throw new Error(`ElevenLabs quota exceeded. ${message}`);
        }

        // Handle other structured errors
        if (errorData.detail?.message) {
          throw new Error(`ElevenLabs error: ${errorData.detail.message}`);
        }
      } catch (parseError) {
        // If JSON parsing fails, fall back to original error text
        if (parseError.message.includes('ElevenLabs')) {
          throw parseError; // Re-throw our custom error
        }
      }

      throw new Error(`ElevenLabs API error (${response.status}): ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
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

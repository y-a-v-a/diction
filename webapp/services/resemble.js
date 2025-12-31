import fs from 'fs';

const RESEMBLE_API_URL = 'https://f.cluster.resemble.ai/synthesize';

/**
 * Generate speech audio from text using Resemble.ai API
 */
export async function generateSpeech(text, outputPath) {
  const voiceUuid = process.env.RESEMBLE_VOICE_UUID;
  const apiKey = process.env.RESEMBLE_API_KEY;

  if (!voiceUuid || !apiKey) {
    throw new Error('Resemble.ai API key or voice UUID not configured');
  }

  try {
    const response = await fetch(RESEMBLE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        voice_uuid: voiceUuid,
        data: text,
        output_format: 'mp3',
        sample_rate: 44100
      })
    });

    if (!response.ok) {
      const errorText = await response.text();

      // Try to parse JSON error response
      try {
        const errorData = JSON.parse(errorText);

        // Handle structured errors
        if (errorData.issues && errorData.issues.length > 0) {
          const issues = errorData.issues.join(', ');
          throw new Error(`Resemble.ai fout: ${issues}`);
        }

        if (errorData.message) {
          throw new Error(`Resemble.ai fout: ${errorData.message}`);
        }
      } catch (parseError) {
        // If JSON parsing fails, fall back to original error text
        if (parseError.message.includes('Resemble.ai')) {
          throw parseError; // Re-throw our custom error
        }
      }

      throw new Error(`Resemble.ai API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    if (!data.success) {
      const issues = data.issues ? data.issues.join(', ') : 'Unknown error';
      throw new Error(`Resemble.ai synthese mislukt: ${issues}`);
    }

    // Decode base64 audio content
    if (!data.audio_content) {
      throw new Error('Resemble.ai response missing audio_content');
    }

    const audioBuffer = Buffer.from(data.audio_content, 'base64');
    fs.writeFileSync(outputPath, audioBuffer);

    return true;
  } catch (error) {
    console.error('Resemble.ai API error:', error);
    throw new Error(`Failed to generate speech: ${error.message}`);
  }
}

/**
 * Delay helper for rate limiting
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

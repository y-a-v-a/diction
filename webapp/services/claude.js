import Anthropic from '@anthropic-ai/sdk';
import { getLanguage } from '../languages/index.js';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

/**
 * Validate sentences to ensure no foreign words are present
 * Uses Claude Haiku for fast, cost-effective validation
 */
async function validateSentences(sentences, languageCode = 'nl') {
  const lang = getLanguage(languageCode);
  const sentencesText = sentences.map((s, i) => `${i + 1}. ${s}`).join('\n');
  const prompt = lang.claude.validationPrompt(sentencesText);

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20250929',
      max_tokens: 500,
      messages: [
        { role: 'user', content: prompt },
        { role: 'assistant', content: '{' }
      ]
    });

    // Prepend the opening brace we used as prefill
    const responseText = '{' + message.content[0].text.trim();

    const validation = JSON.parse(responseText);
    return validation;
  } catch (error) {
    console.error('Validation error:', error);
    // On validation error, assume sentences are OK (graceful degradation)
    return { hasForeignWords: false, issues: [] };
  }
}

/**
 * Generate sentences for a dictation based on 3 topics
 * @see https://dictees.nl/alle-dictees/groot-dictee-der-nederlandse-taal/
 */
export async function generateSentences(topic1, topic2, topic3, count = 8, languageCode = 'nl') {
  const lang = getLanguage(languageCode);
  const maxAttempts = 2;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const prompt = lang.claude.generatePrompt(topic1, topic2, topic3, count);

      // Generate sentences with Sonnet
      const message = await client.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const text = message.content[0].text;

      // Parse the response
      const lines = text.split('\n').filter(line => line.trim());
      const sentences = lines
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(sentence => sentence.length > 0);

      // Validate we have the expected number of sentences
      if (sentences.length !== count) {
        throw new Error(`Expected ${count} sentences, but got ${sentences.length}`);
      }

      // Validate with Haiku to check for foreign words
      console.log(`[Attempt ${attempt}/${maxAttempts}] Validating generated sentences...`);
      const validation = await validateSentences(sentences, languageCode);

      if (!validation.hasForeignWords) {
        console.log('✓ Validation passed: No foreign words detected');
        return sentences;
      }

      // Foreign words detected
      console.warn(`⚠ Foreign words detected in attempt ${attempt}:`, validation.issues);

      if (attempt === maxAttempts) {
        // Last attempt - return anyway with warning
        console.warn('Max attempts reached. Returning sentences despite foreign words.');
        console.warn('Detected issues:', JSON.stringify(validation.issues, null, 2));
        return sentences;
      }

      // Retry with stronger prompt
      console.log(`Retrying generation (attempt ${attempt + 1}/${maxAttempts})...`);

    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt}/${maxAttempts} failed:`, error.message);

      if (attempt === maxAttempts) {
        console.error('All attempts failed');
        throw new Error('Failed to generate sentences. Please try again.');
      }
    }
  }

  // Should never reach here, but just in case
  throw lastError || new Error('Failed to generate sentences. Please try again.');
}

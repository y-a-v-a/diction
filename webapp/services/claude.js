import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
});

/**
 * Generate 8 Dutch sentences for a dictation based on 3 topics
 */
export async function generateSentences(topic1, topic2, topic3) {
  const prompt = `Je bent een leraar Nederlands die dicteeoefeningen maakt.
Maak precies 8 zinnen voor een dictee over de volgende onderwerpen:
- ${topic1}
- ${topic2}
- ${topic3}

Regels:
- Elke zin op een aparte regel
- Variërende moeilijkheidsgraad (makkelijk naar moeilijker)
- Zinnen van 10-20 woorden
- Gebruik verschillende leestekens
- Focus op correcte Nederlandse grammatica en spelling

Geef ALLEEN de 8 zinnen terug, genummerd 1-8, zonder extra uitleg.`;

  try {
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

    // Validate we have exactly 8 sentences
    if (sentences.length !== 8) {
      throw new Error(`Expected 8 sentences, but got ${sentences.length}`);
    }

    return sentences;
  } catch (error) {
    console.error('Claude API error:', error);
    throw new Error('Failed to generate sentences. Please try again.');
  }
}

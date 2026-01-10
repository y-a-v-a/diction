import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
});

/**
 * Validate Dutch sentences to ensure no German words are present
 * Uses Claude Haiku for fast, cost-effective validation
 */
async function validateDutchSentences(sentences) {
  const sentencesText = sentences.map((s, i) => `${i + 1}. ${s}`).join('\n');

  const prompt = `Je bent een taalexpert die Nederlands en Duits perfect onderscheidt.

Analyseer de volgende zinnen en identificeer ALLE Duitse woorden (geen Nederlandse woorden).
Duitse woorden zijn woorden die in het Duits thuishoren maar NIET gangbaar zijn in het Nederlands.

Let op: Sommige woorden komen in beide talen voor (zoals "de", "en", "in") - die zijn NIET Duits in deze context.
Ook leenwoorden die gangbaar zijn in het Nederlands (zoals "kindergarten" als het echt gebruikt wordt) kunnen acceptabel zijn.

Focus op woorden die duidelijk Duits zijn en niet passen in Nederlandse tekst.

Zinnen:
${sentencesText}

Geef een JSON antwoord in EXACT dit formaat (geen extra tekst):
{
  "hasGermanWords": true/false,
  "issues": [
    {"sentenceIndex": 1, "germanWord": "woord", "dutchAlternative": "alternatief"}
  ]
}

Als er GEEN Duitse woorden zijn, return: {"hasGermanWords": false, "issues": []}`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20250929',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    });

    const responseText = message.content[0].text.trim();

    // Extract JSON from response (handle potential markdown code blocks)
    let jsonText = responseText;
    if (responseText.includes('```json')) {
      jsonText = responseText.match(/```json\n([\s\S]*?)\n```/)?.[1] || responseText;
    } else if (responseText.includes('```')) {
      jsonText = responseText.match(/```\n([\s\S]*?)\n```/)?.[1] || responseText;
    }

    const validation = JSON.parse(jsonText);
    return validation;
  } catch (error) {
    console.error('Validation error:', error);
    // On validation error, assume sentences are OK (graceful degradation)
    return { hasGermanWords: false, issues: [] };
  }
}

/**
 * Generate Dutch sentences for a dictation based on 3 topics
 * @see https://dictees.nl/alle-dictees/groot-dictee-der-nederlandse-taal/
 */
export async function generateSentences(topic1, topic2, topic3, count = 8) {
  const maxAttempts = 2;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const prompt = `Je bent een Neerlandicus of schrijver met het Nederlands als moedertaal die graag dictees schrijft.
Je formuleert bij voorkeur lange zinnen met moeilijke Nederlands woorden: denk hierbij aan leenwoorden met onduidelijke verbuiging, lange samengestelde woordvormen, lastige spelling met trema's, gestapelde meervoudsvormen, leenwoorden, complexe zinsstructuur met bijzinnen of archaïsch taalgebruik.
Bij het formuleren van je dictee probeer je het Nederlands als taal in brede zin te representeren: jongerentaal, academische taal, jargon en journalistiek Nederlands kunnen naast elkaar in zinnen voorkomen.
Let erop dat je niet per se moeilijke woorden gebruikt, je kunt ook terugvallen op Nederlandse woorden die niet vaak gebruikt worden of die uit een andere taal afkomstig zijn maar redelijk gangbaar zijn in het Nederlands.
Vermijd het kunstmatig creëren van werkwoorden of constructies die in het wild niet voorkomen. Als een woord moeilijk is, moet het ook daadwerkelijk gebruikt worden in geschreven Nederlands.

BELANGRIJK: Je gebruikt UITSLUITEND Nederlandse woorden. Vermijd Duitse woorden volledig, zelfs als ze op Nederlandse woorden lijken. Bij twijfel tussen een Nederlands en Duits woord: kies altijd het Nederlandse woord. Voorbeelden van VERBODEN Duitse woorden: Schlüssel, Frühstück, Schmetterling, Gesundheit, Kindergarten (gebruik Nederlandse alternatieven).

Hier volgen drie voorbeeldzinnen die als inspiratie kunnen dienen (Let op: deze zinnen klinken excentriek maar zijn grammaticaal en lexicaal authentiek):
<voorbeeldzin>Spellen was een ambigue zaak: in automatischepiloottoestand lukte het me vanzelf, maar zodra ik erover nadacht, weifelde ik of gênant zo'n fransozendakje had of niet; ja al die pietje-preciezerige accenten vond ik stupide, maar het gedoe met dat al of niet aaneenschrijven nog wel het stupiedst.</voorbeeldzin>

<andere-voorbeeldzin>Te midden van de pret makende jongelui leek praten ten enenmale onmogelijk, maar ondanks de tenhemelschreiende herrie wist de bij de ober in het gevlij gekomen vrouw een breezer en een schaaltje petitfours te bemachtigen.</andere-voorbeeldzin>

<nog-een-voorbeeldzin>De luiwammesende vrijberoepsbeoefenaar keek naar het tv-kanaal van de op reclame-inkomsten gedijende supercommerciële pulpzender; daar werd net het eerste tête-à-tête van een twee-eiige tweeling vastgelegd.</nog-een-voorbeeldzin>

Maak precies ${count} zinnen voor een dictee over de volgende onderwerpen:
- ${topic1}
- ${topic2}
- ${topic3}

Regels:
- Elke zin op een aparte regel
- Maak zinnen van 30-45 woorden
- Gebruik verschillende leestekens maar geen emdash
- Gebruik geen emoji
- Besteed extra aandacht aan correcte Nederlandse grammatica en spelling
- Gebruik GEEN Duitse woorden - alleen Nederlandse woorden zijn toegestaan

Je schrijft zinnen die natuurlijk klinken alsof ze uit een krant, essay of boek komen; moeilijkheid komt voort uit het onderwerp en de taal zelf, niet uit geforceerde constructies.

Voordat je antwoordt: controleer elke zin op Duitse woorden en vervang deze door Nederlandse alternatieven.

Geef ALLEEN de ${count} zinnen terug, genummerd 1-${count}, zonder extra uitleg.`;

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

      // Validate with Haiku to check for German words
      console.log(`[Attempt ${attempt}/${maxAttempts}] Validating generated sentences...`);
      const validation = await validateDutchSentences(sentences);

      if (!validation.hasGermanWords) {
        console.log('✓ Validation passed: No German words detected');
        return sentences;
      }

      // German words detected
      console.warn(`⚠ German words detected in attempt ${attempt}:`, validation.issues);

      if (attempt === maxAttempts) {
        // Last attempt - return anyway with warning
        console.warn('Max attempts reached. Returning sentences despite German words.');
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

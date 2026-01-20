import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
});

/**
 * Validate Dutch sentences to ensure no foreign words are present
 * Uses Claude Haiku for fast, cost-effective validation
 */
async function validateDutchSentences(sentences) {
  const sentencesText = sentences.map((s, i) => `${i + 1}. ${s}`).join('\n');

  const prompt = `Je bent een Nederlandse taalexpert die woorden uit andere talen kan identificeren.

Analyseer de volgende zinnen en identificeer ALLE woorden die NIET Nederlands zijn.
Dit kunnen zijn: Duitse, Engelse, Franse, Spaanse of andere vreemde woorden die niet gangbaar zijn in het Nederlands.

Let op:
- Sommige woorden komen in meerdere talen voor - die zijn acceptabel als ze gangbaar zijn in het Nederlands
- Leenwoorden die algemeen gebruikt worden in het Nederlands zijn acceptabel (bijv. "computer", "festival")
- Focus op woorden die duidelijk uit een andere taal komen en niet passen in Nederlandse tekst
- Let vooral op Duitse woorden die vaak per ongeluk gebruikt worden (bijv. Schlüssel in plaats van sleutel)

<zinnen>
${sentencesText}
</zinnen>

Geef een JSON antwoord in EXACT dit formaat (geen extra tekst):
{
  "hasForeignWords": true/false,
  "issues": [
    {"sentenceIndex": 1, "foreignWord": "woord", "language": "Duits/Engels/Frans/etc", "dutchAlternative": "alternatief"}
  ]
}

Als er GEEN vreemde woorden zijn, return: {"hasForeignWords": false, "issues": []}`;

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

BELANGRIJK: Je gebruikt UITSLUITEND Nederlandse woorden. Vermijd woorden uit andere talen (Duits, Engels, Frans, Spaans, etc.) volledig. Bij twijfel: kies altijd het Nederlandse woord. Voorbeelden van VERBODEN woorden: Schlüssel (gebruik: sleutel), breakfast (gebruik: ontbijt), butterfly (gebruik: vlinder), mariposa (gebruik: vlinder). Let vooral op Duitse woorden die op Nederlandse lijken.

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
- Gebruik GEEN woorden uit andere talen - alleen Nederlandse woorden zijn toegestaan

Je schrijft zinnen die natuurlijk klinken alsof ze uit een krant, essay of boek komen; moeilijkheid komt voort uit het onderwerp en de taal zelf, niet uit geforceerde constructies.

Voordat je antwoordt: controleer elke zin op woorden uit andere talen (Duits, Engels, Frans, etc.) en vervang deze door Nederlandse alternatieven.

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

      // Validate with Haiku to check for foreign words
      console.log(`[Attempt ${attempt}/${maxAttempts}] Validating generated sentences...`);
      const validation = await validateDutchSentences(sentences);

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

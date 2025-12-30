import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
});

/**
 * Generate 8 Dutch sentences for a dictation based on 3 topics
 * @see https://dictees.nl/alle-dictees/groot-dictee-der-nederlandse-taal/
 */
export async function generateSentences(topic1, topic2, topic3) {
  const prompt = `Je bent een leraar Nederlands die graag dictees geeft.
Je formuleert bij voorkeur lange zinnen met moeilijke Nederlands woorden.
Bij het formuleren van je dictee probeer je het Nederlands als taal in brede zin te representeren: jongerentaal, academische taal en journalistiek Nederlands kunnen naast elkaar in zinnen voorkomen, maar je vermijd jargon.
Let erop dat je niet per se moelijke woorden gebruikt, je kunt ook terugvallen op Nederlands woorden die niet vaak gebruikt worden in het Nederlands of die uit een andere taal afkomstig zijn maar redelijk gangbaar zijn in het Nederlands.

Hier volgen drie voorbeeldzinnen die als inspiratie kunnen dienen:
<voorbeeldzin>Spellen was een ambigue zaak: in automatischepiloottoestand lukte het me vanzelf, maar zodra ik erover nadacht, weifelde ik of gênant zo'n fransozendakje had of niet; ja al die pietje-preciezerige accenten vond ik stupide, maar het gedoe met dat al of niet aaneenschrijven nog wel het stupiedst.</voorbeeldzin>

<andere-voorbeeldzin>Te midden van de pret makende jongelui leek praten ten enenmale onmogelijk, maar ondanks de tenhemelschreiende herrie wist de bij de ober in het gevlij gekomen vrouw een breezer en een schaaltje petitfours te bemachtigen.</andere-voorbeeldzin>

<nog-een-voorbeeldzin>De luiwammesende vrijberoepsbeoefenaar keek naar het tv-kanaal van de op reclame-inkomsten gedijende supercommerciële pulpzender; daar werd net het eerste tête-à-tête van een twee-eiige tweeling vastgelegd.</nog-een-voorbeeldzin>

Maak precies 8 zinnen voor een dictee over de volgende onderwerpen:
- ${topic1}
- ${topic2}
- ${topic3}

Regels:
- Elke zin op een aparte regel
- Variërende moeilijkheidsgraad (makkelijk naar moeilijker)
- Zinnen van 20-30 woorden
- Gebruik verschillende leestekens
- Besteed extra aandacht aan correcte Nederlandse grammatica en spelling
- Gebruik bij voorkeur zij/haar of zij/hen boven hij/hem

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

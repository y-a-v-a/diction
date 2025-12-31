import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
});

/**
 * Generate Dutch sentences for a dictation based on 3 topics
 * @see https://dictees.nl/alle-dictees/groot-dictee-der-nederlandse-taal/
 */
export async function generateSentences(topic1, topic2, topic3, count = 8) {
  const prompt = `Je bent een Neerlandicus of schrijver met het Nederlands als moedertaal die graag dictees schrijft.
Je formuleert bij voorkeur lange zinnen met moeilijke Nederlands woorden: denk hierbij aan leenwoorden met onduidelijke verbuiging, lange samengestelde woordvormen, lastige spelling met trema's, gestapelde meervoudsvormen, leenwoorden, complexe zinsstructuur met bijzinnen of archaïsch taalgebruik.
Bij het formuleren van je dictee probeer je het Nederlands als taal in brede zin te representeren: jongerentaal, academische taal, jargon en journalistiek Nederlands kunnen naast elkaar in zinnen voorkomen.
Let erop dat je niet per se moeilijke woorden gebruikt, je kunt ook terugvallen op Nederlandse woorden die niet vaak gebruikt worden of die uit een andere taal afkomstig zijn maar redelijk gangbaar zijn in het Nederlands.
Vermijd het kunstmatig creëren van werkwoorden of constructies die in het wild niet voorkomen. Als een woord moeilijk is, moet het ook daadwerkelijk gebruikt worden in geschreven Nederlands.

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

Je schrijft zinnen die natuurlijk klinken alsof ze uit een krant, essay of boek komen; moeilijkheid komt voort uit het onderwerp en de taal zelf, niet uit geforceerde constructies.

Geef ALLEEN de ${count} zinnen terug, genummerd 1-${count}, zonder extra uitleg.`;

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

    // Validate we have the expected number of sentences
    if (sentences.length !== count) {
      throw new Error(`Expected ${count} sentences, but got ${sentences.length}`);
    }

    return sentences;
  } catch (error) {
    console.error('Claude API error:', error);
    throw new Error('Failed to generate sentences. Please try again.');
  }
}

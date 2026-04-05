export default {
  code: 'nl',
  displayName: 'Nederlands',
  tts: {
    languageCode: 'nl',
    voiceId: null, // uses ELEVENLABS_VOICE_ID from env
  },
  ui: {
    // Navigation
    navHome: 'Home',
    navDictations: 'Dictees',
    appTitle: 'Diction',
    langSwitch: 'EN',

    // Home page
    homeHeading: 'Diction',
    homeDescription: 'Diction is een dictee-app die met behulp van AI unieke dictees genereert. Claude van Anthropic schrijft de zinnen en ElevenLabs spreekt ze in. Zo kun je op een moderne manier je spelling oefenen.',
    homeHowItWorks: 'Hoe werkt het?',
    homeStep1: 'Kies drie onderwerpen en het aantal zinnen',
    homeStep2: 'De AI genereert een dictee op basis van jouw onderwerpen',
    homeStep3: 'Luister naar de ingesproken zinnen en schrijf ze op',
    homeStep4: 'Controleer je werk door de tekst te onthullen',
    homeViewDictations: 'Bekijk dictees',
    footerDescription: 'Genereer dictees met AI en oefen je spelling.',
    footerCopyright: '2025-2026 Vincent Bruijn',

    // Dictations listing
    dictationsHeading: 'Dictees',
    emptyState: 'Nog geen dictees. Maak je eerste dictee!',
    topicsLabel: 'Onderwerpen',
    viewButton: 'Bekijken',
    deleteButton: 'Verwijderen',

    // Create form
    createHeading: 'Nieuw Dictee Maken',
    createDescription: 'Voer drie onderwerpen in voor het dictee. Kies hoeveel zinnen je wilt genereren (1-8).',
    languageLabel: 'Taal:',
    topic1Label: 'Onderwerp 1:',
    topic1Placeholder: 'Bijvoorbeeld: honden',
    topic2Label: 'Onderwerp 2:',
    topic2Placeholder: 'Bijvoorbeeld: het weer',
    topic3Label: 'Onderwerp 3:',
    topic3Placeholder: 'Bijvoorbeeld: voetbal',
    sentenceCountLabel: 'Aantal zinnen (1-8):',
    generateButton: 'Dictee Genereren',
    cancelButton: 'Annuleren',
    generating: 'Dictee wordt gegenereerd...',
    generatingHint: 'Dit kan 30-60 seconden duren. Even geduld alstublieft.',

    // Dictation detail
    sentence: 'Zin',
    showText: 'Toon Tekst',
    topics: 'Onderwerpen',
    createdAt: 'Gemaakt op',
    deleteDictation: 'Dictee Verwijderen',
    deleteConfirm: 'Weet je zeker dat je dit dictee wilt verwijderen?',
    backHome: 'Terug naar Home',
    textLocked: 'Tekst vergrendeld',
    textAvailable: 'Tekst beschikbaar',
    dateLocale: 'nl-NL',

    // Play mode
    pinLabel: 'Speel-modus PIN (4-6 cijfers):',
    pinHint: 'Optioneel. Stel een PIN in om de speel-modus te gebruiken.',
    playMode: 'Speel-modus',
    enterPin: 'Voer PIN in',
    pinPlaceholder: '4-6 cijfers',
    pinError: 'Onjuiste PIN. Probeer het opnieuw.',
    nextSentence: 'Volgende zin',
    revealAll: 'Toon alle tekst',
    revealConfirm: 'Weet je zeker dat je alle tekst wilt onthullen? Dit kan niet ongedaan worden.',
    submit: 'Bevestigen',

    // Errors
    invalidId: 'Ongeldige dictee ID',
    notFound: 'Dictee niet gevonden',
    rateLimitError: 'Te veel verzoeken. Probeer het over een minuut opnieuw.',
    deleteRateLimitError: 'Te veel verwijderverzoeken. Probeer het over een minuut opnieuw.',
    sentenceCountError: 'Aantal zinnen moet tussen 1 en 8 zijn.',
    pinFormatError: 'PIN moet 4-6 cijfers zijn.',
    createError: 'Fout bij het maken van het dictee:',
    unexpectedError: 'Er is een onverwachte fout opgetreden.',
    audioWarning: 'Niet alle audio bestanden konden worden gegenereerd (bijv. door quotum limiet). De zinnen zijn wel opgeslagen en audio bestanden die wel zijn gegenereerd kun je hieronder afspelen.',
    audioWarningLabel: 'Let op:',
  },
  claude: {
    generatePrompt(topic1, topic2, topic3, count) {
      return `Je bent een Neerlandicus of schrijver met het Nederlands als moedertaal die graag dictees schrijft.
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
    },
    titlePrompt(topics, sampleSentences) {
      return `Bedenk een korte, creatieve titel (3-6 woorden) voor een dictee over: ${topics}.

Hier zijn een paar voorbeeldzinnen uit het dictee:
${sampleSentences}

Geef ALLEEN de titel terug, zonder aanhalingstekens of extra uitleg.`;
    },
    validationPrompt(sentencesText) {
      return `Je bent een Nederlandse taalexpert die woorden uit andere talen kan identificeren.

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
    },
  },
};

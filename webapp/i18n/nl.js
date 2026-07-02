/**
 * Dutch UI locale — strings for navigation, pages, forms and errors.
 * Content-language config (prompts, TTS voice) lives in core/languages/.
 */
export default {
  code: "nl",
  ui: {
    // Navigation
    navHome: 'Home',
    navDictations: 'Dictees',
    appTitle: 'Diction',
    langSwitch: 'EN',
    themeLight: 'Licht',
    themeDark: 'Donker',

    // Home page
    homeHeading: 'Kom erbij, spel het uit',
    homeDescription: 'Diction brengt mensen samen rond taal. AI genereert unieke dictees die je samen speelt — luister, schrijf, en kijk wie de lastigste woorden foutloos spelt. Een speels wedstrijdje voor familiebijeenkomsten, in de klas of op een spelavond.',
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
    backToOverview: 'Terug naar Overzicht',
    hideText: 'Verberg Tekst',
    dateLocale: 'nl-NL',

    // Play mode
    pinLabel: 'Speel-modus PIN (4-6 cijfers):',
    pinHint: 'Optioneel. Stel een PIN in om de speel-modus te gebruiken.',
    playMode: 'Speel-modus',
    enterPin: 'Voer PIN in',
    pinPlaceholder: '4-6 cijfers',
    pinError: 'Onjuiste PIN. Probeer het opnieuw.',
    nextSentence: 'Volgende zin',
    closePage: 'Sluiten',
    revealAll: 'Toon alle tekst',
    revealConfirm: 'Weet je zeker dat je alle tekst wilt onthullen? Dit kan niet ongedaan worden.',
    submit: 'Bevestigen',

    // Passphrase
    passphraseHeading: 'Toegangscode',
    passphraseDescription: 'Voer de toegangscode in om een dictee te maken.',
    passphrasePlaceholder: 'Toegangscode',
    passphraseError: 'Onjuiste toegangscode. Probeer het opnieuw.',

    // 403
    forbiddenTitle: 'Toegang Geweigerd',
    forbiddenMessage: 'Je hebt geen toegang tot deze pagina. Deze functie is alleen beschikbaar voor geautoriseerde gebruikers.',
    forbiddenBack: 'Terug naar home',

    // Admin
    adminLoginHeading: 'Admin Login',
    adminLoginDescription: 'Log in met je Google-account om dictees te beheren.',
    googleSignIn: 'Inloggen met Google',
    googleNotConfigured: 'Google-inloggen is niet geconfigureerd.',
    adminLoginError: 'Inloggen mislukt of dit account heeft geen toegang.',
    adminLogout: 'Uitloggen',

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
};

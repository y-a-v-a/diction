export default {
  code: 'en-US',
  displayName: 'American English',
  tts: {
    languageCode: 'en',
    voiceId: null, // uses ELEVENLABS_VOICE_ID_EN from env, or falls back to ELEVENLABS_VOICE_ID
  },
  ui: {
    // Navigation
    navHome: 'Home',
    navDictations: 'Dictations',
    appTitle: 'Diction',
    langSwitch: 'NL',
    themeLight: 'Light',
    themeDark: 'Dark',

    // Home page
    homeHeading: 'Diction',
    homeDescription: 'Diction is a dictation app that generates unique dictations with the help of AI. Claude by Anthropic writes the sentences and ElevenLabs voices them. A modern way to practice your spelling.',
    homeHowItWorks: 'How does it work?',
    homeStep1: 'Choose three topics and the number of sentences',
    homeStep2: 'The AI generates a dictation based on your topics',
    homeStep3: 'Listen to the spoken sentences and write them down',
    homeStep4: 'Check your work by revealing the text',
    homeViewDictations: 'View dictations',
    footerDescription: 'Generate dictations with AI and practice your spelling.',
    footerCopyright: '2025-2026 Vincent Bruijn',

    // Dictations listing
    dictationsHeading: 'Dictations',
    emptyState: 'No dictations yet. Create your first one!',
    topicsLabel: 'Topics',
    viewButton: 'View',
    deleteButton: 'Delete',

    // Create form
    createHeading: 'Create New Dictation',
    createDescription: 'Enter three topics for the dictation. Choose how many sentences to generate (1-8).',
    languageLabel: 'Language:',
    topic1Label: 'Topic 1:',
    topic1Placeholder: 'For example: dogs',
    topic2Label: 'Topic 2:',
    topic2Placeholder: 'For example: the weather',
    topic3Label: 'Topic 3:',
    topic3Placeholder: 'For example: football',
    sentenceCountLabel: 'Number of sentences (1-8):',
    generateButton: 'Generate Dictation',
    cancelButton: 'Cancel',
    generating: 'Generating dictation...',
    generatingHint: 'This may take 30-60 seconds. Please wait.',

    // Dictation detail
    sentence: 'Sentence',
    showText: 'Show Text',
    topics: 'Topics',
    createdAt: 'Created on',
    deleteDictation: 'Delete Dictation',
    deleteConfirm: 'Are you sure you want to delete this dictation?',
    backHome: 'Back to Home',
    hideText: 'Hide Text',
    dateLocale: 'en-US',

    // Play mode
    pinLabel: 'Play Mode PIN (4-6 digits):',
    pinHint: 'Optional. Set a PIN to enable play mode.',
    playMode: 'Play Mode',
    enterPin: 'Enter PIN',
    pinPlaceholder: '4-6 digits',
    pinError: 'Incorrect PIN. Please try again.',
    nextSentence: 'Next Sentence',
    closePage: 'Close',
    revealAll: 'Reveal All Text',
    revealConfirm: 'Are you sure you want to reveal all text? This cannot be undone.',
    submit: 'Submit',

    // Passphrase
    passphraseHeading: 'Access Code',
    passphraseDescription: 'Enter the access code to create a dictation.',
    passphrasePlaceholder: 'Access code',
    passphraseError: 'Incorrect access code. Please try again.',

    // 403
    forbiddenTitle: 'Access Denied',
    forbiddenMessage: 'You do not have access to this page. This feature is only available to authorized users.',
    forbiddenBack: 'Back to home',

    // Errors
    invalidId: 'Invalid dictation ID',
    notFound: 'Dictation not found',
    rateLimitError: 'Too many requests. Please try again in a minute.',
    deleteRateLimitError: 'Too many delete requests. Please try again in a minute.',
    sentenceCountError: 'Number of sentences must be between 1 and 8.',
    pinFormatError: 'PIN must be 4-6 digits.',
    createError: 'Error creating dictation:',
    unexpectedError: 'An unexpected error occurred.',
    audioWarning: 'Not all audio files could be generated (e.g. due to quota limits). The sentences have been saved and any audio files that were generated can be played below.',
    audioWarningLabel: 'Note:',
  },
  claude: {
    generatePrompt(topic1, topic2, topic3, count) {
      return `You are an accomplished American English author and linguist who enjoys crafting dictation exercises.
You write long, well-constructed sentences that challenge spellers with the trickiest aspects of American English: homophones (their/there/they're, affect/effect, principal/principle), silent letters (knight, pneumonia, psychology), double consonants (accommodate, occurrence, embarrass), commonly confused words (stationary/stationery, complement/compliment), irregular past tenses, and words with unusual spelling patterns.
Your sentences should represent the breadth of American English: journalistic prose, academic writing, casual speech, and literary style can all appear side by side.
Don't force obscure words for difficulty's sake — instead, rely on everyday words that are commonly misspelled or confused, alongside less frequent but genuinely used vocabulary.
Avoid artificially constructed phrases. If a word is tricky, it should be one that actually appears in written American English.

IMPORTANT: Use ONLY English words. Avoid words from other languages (French, Spanish, German, etc.) entirely. When in doubt, always choose the English word. Pay special attention to French loanwords that might not be standard in American English.

Here are three example sentences for inspiration (note: these sound elaborate but are grammatically and lexically authentic):
<example>The superintendent's accommodating demeanor notwithstanding, the committee's consensus was that the occurrence of such egregious misjudgments warranted an independent, thorough assessment of the department's personnel.</example>

<other-example>Whether the professor's hypothesis about the phenomenon would complement or contradict the laboratory's preliminary findings remained, for all intents and purposes, an unresolved question that no amount of bureaucratic maneuvering could expedite.</other-example>

<another-example>The lieutenant, whose perseverance through the labyrinthine corridors of the dilapidated government building was truly conscientious, finally retrieved the indispensable questionnaire from the superintendent's auxiliary office.</another-example>

Write exactly ${count} sentences for a dictation about the following topics:
- ${topic1}
- ${topic2}
- ${topic3}

Rules:
- Each sentence on a separate line
- Write sentences of 30-45 words
- Use varied punctuation but no em dashes
- Do not use emoji
- Pay extra attention to correct American English grammar and spelling
- Use ONLY English words - no words from other languages are allowed

Your sentences should sound natural, as if from a newspaper, essay, or book; difficulty comes from the subject matter and the language itself, not from forced constructions.

Before you answer: check each sentence for words from other languages (French, German, Spanish, etc.) and replace them with English alternatives.

Return ONLY the ${count} sentences, numbered 1-${count}, without any extra explanation.`;
    },
    titlePrompt(topics, sampleSentences) {
      return `Create a short, creative title (3-6 words) for a dictation about: ${topics}.

Here are a few sample sentences from the dictation:
${sampleSentences}

Return ONLY the title, without quotes or extra explanation.`;
    },
    validationPrompt(sentencesText) {
      return `You are an American English language expert who can identify words from other languages.

Analyze the following sentences and identify ALL words that are NOT English.
These could be: French, Spanish, German, or other foreign words that are not standard in American English.

Note:
- Some words exist in multiple languages - they are acceptable if they are standard in American English
- Loanwords that are commonly used in American English are acceptable (e.g., "kindergarten", "restaurant")
- Focus on words that clearly come from another language and do not fit in American English text
- Pay special attention to French words that are sometimes used but are not standard American English

<sentences>
${sentencesText}
</sentences>

Give a JSON response in EXACTLY this format (no extra text):
{
  "hasForeignWords": true/false,
  "issues": [
    {"sentenceIndex": 1, "foreignWord": "word", "language": "French/German/Spanish/etc", "englishAlternative": "alternative"}
  ]
}

If there are NO foreign words, return: {"hasForeignWords": false, "issues": []}`;
    },
  },
};

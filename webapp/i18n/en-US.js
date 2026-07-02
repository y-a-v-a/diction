/**
 * American English UI locale — strings for navigation, pages, forms and errors.
 * Content-language config (prompts, TTS voice) lives in core/languages/.
 */
export default {
  code: "en-US",
  ui: {
    // Navigation
    navHome: 'Home',
    navDictations: 'Dictations',
    appTitle: 'Diction',
    langSwitch: 'NL',
    themeLight: 'Light',
    themeDark: 'Dark',

    // Home page
    homeHeading: 'Gather round, spell it out',
    homeDescription: 'Diction brings people together around language. AI generates unique dictations that you play as a group — listen, write, and see who nails the trickiest words. A playful contest for family nights, classrooms, or game evenings.',
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
    backToOverview: 'Back to Overview',
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

    // Admin
    adminLoginHeading: 'Admin Login',
    adminLoginDescription: 'Sign in with your Google account to manage dictations.',
    googleSignIn: 'Sign in with Google',
    googleNotConfigured: 'Google sign-in is not configured.',
    adminLoginError: 'Sign-in failed or this account is not authorized.',
    adminLogout: 'Logout',

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
};

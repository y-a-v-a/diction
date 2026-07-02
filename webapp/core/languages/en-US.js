/**
 * American English content-language config: what the dictation is generated
 * and spoken in. Prompts and TTS settings only — UI strings live in i18n/.
 */
export default {
  code: 'en-US',
  displayName: 'American English',
  tts: {
    languageCode: 'en',
    voiceId: 'acCWxmzPBgXdHwA63uzP',
  },
  prompts: {
    sentences(topics, count) {
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
${topics.map((topic) => `- ${topic}`).join('\n')}

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
    title(topics, sampleSentences) {
      return `Create a short, creative title (3-6 words) for a dictation about: ${topics}.

Here are a few sample sentences from the dictation:
${sampleSentences}

Return ONLY the title, without quotes or extra explanation.`;
    },
    validation(sentencesText) {
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

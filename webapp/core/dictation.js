/**
 * Dictation domain service.
 *
 * Orchestrates the full pipeline: validate input → generate sentences →
 * generate title → persist metadata → synthesize audio per sentence.
 * Knows nothing about HTTP, sessions, users or rendering — callers decide
 * who may invoke it and how results are presented.
 */
import { generateSentences, generateTitle } from './generation/sentences.js';
import { generateSpeech, delay, getCurrentService } from './generation/tts/index.js';
import {
  generateId,
  createDictation,
  saveAudio,
  setDictationAudio,
  deleteDictation,
} from './storage/index.js';
import { getContentLanguage, isContentLanguage } from './languages/index.js';

export const TOPIC_COUNT = 3;
export const SENTENCE_COUNT = { min: 1, max: 8 };
export const PIN_PATTERN = /^[0-9]{4,6}$/;

/**
 * Thrown when the input is rejected before any generation happens.
 * `field` identifies the offending input ('topic1'..'topic3', 'sentenceCount',
 * 'pin'), `reason` is a short machine-readable cause so callers can localize.
 */
export class DictationInputError extends Error {
  constructor(field, reason) {
    super(`${field}: ${reason}`);
    this.name = 'DictationInputError';
    this.field = field;
    this.reason = reason;
  }
}

/**
 * Validate and sanitize a single topic string
 */
function sanitizeTopic(topic, field) {
  if (typeof topic !== 'string') {
    throw new DictationInputError(field, 'invalid');
  }

  const trimmed = topic.trim();

  if (!trimmed) {
    throw new DictationInputError(field, 'empty');
  }

  if (trimmed.length > 100) {
    throw new DictationInputError(field, 'too long');
  }

  if (/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/.test(trimmed)) {
    throw new DictationInputError(field, 'invalid characters');
  }

  const sanitized = trimmed.replace(/[\n\r\t]/g, ' ');

  const specialCharCount = (sanitized.match(/[^a-zA-Z0-9\s\-_.,!?]/g) || []).length;
  if (specialCharCount > sanitized.length * 0.5) {
    throw new DictationInputError(field, 'too many special characters');
  }

  return sanitized;
}

/**
 * Validate and normalize a dictation request.
 * Returns { topics, count, languageCode, pin } or throws DictationInputError.
 */
export function validateDictationInput({ topics, sentenceCount, language, pin }) {
  const rawTopics = Array.isArray(topics) ? topics : [];
  const sanitizedTopics = [];
  for (let i = 0; i < TOPIC_COUNT; i++) {
    sanitizedTopics.push(sanitizeTopic(rawTopics[i], `topic${i + 1}`));
  }

  const count = parseInt(sentenceCount, 10);
  if (isNaN(count) || count < SENTENCE_COUNT.min || count > SENTENCE_COUNT.max) {
    throw new DictationInputError('sentenceCount', 'out of range');
  }

  const languageCode = language && isContentLanguage(language) ? language : 'nl';

  let validatedPin = null;
  if (pin && String(pin).trim()) {
    const trimmedPin = String(pin).trim();
    if (!PIN_PATTERN.test(trimmedPin)) {
      throw new DictationInputError('pin', 'invalid format');
    }
    validatedPin = trimmedPin;
  }

  return { topics: sanitizedTopics, count, languageCode, pin: validatedPin };
}

/**
 * Generate a complete dictation from topics.
 *
 * Returns { dictation, audioComplete, audioError }:
 * - `dictation` is the persisted metadata (id, title, sentences, audio, ...)
 * - `audioComplete` is false when TTS failed partway; the dictation is kept
 *   with whatever audio was generated, and `audioError` carries the cause.
 *
 * Throws DictationInputError for invalid input, or a plain Error when
 * generation fails before anything was persisted (nothing is left behind).
 */
export async function generateDictation(input) {
  const { topics, count, languageCode, pin } = validateDictationInput(input);
  const lang = getContentLanguage(languageCode);
  const id = generateId();

  const ttsOptions = {
    languageCode: lang.tts.languageCode,
    voiceId: lang.tts.voiceId,
  };

  let sentences;
  let dictation;
  try {
    // Step 1: Generate sentences
    console.log(`Generating ${count} ${languageCode} sentences for dictation ${id}...`);
    sentences = await generateSentences(topics, count, languageCode);
    console.log(`Generated ${sentences.length} sentences`);

    // Step 2: Generate a title and persist the dictation metadata
    const title = await generateTitle(topics, sentences, languageCode);
    dictation = await createDictation(id, topics, sentences, {
      title,
      language: languageCode,
      pin,
    });
    console.log(`Dictation ${id} metadata saved`);
  } catch (error) {
    // Nothing usable was persisted — clean up any partial write and rethrow.
    await deleteDictation(id);
    throw error;
  }

  // Step 3: Generate audio per sentence. From here on the dictation exists,
  // so a TTS failure keeps the partial result instead of losing everything.
  try {
    console.log(`Generating audio files for dictation ${id} using ${getCurrentService()}...`);
    const audioUrls = [];
    for (let i = 0; i < sentences.length; i++) {
      console.log(`Generating audio ${i + 1}/${sentences.length}...`);

      const audioBuffer = await generateSpeech(sentences[i], ttsOptions);
      const url = await saveAudio(id, i, audioBuffer);
      audioUrls.push(url);
      // Persist incrementally so partial audio survives a later failure.
      dictation = await setDictationAudio(id, audioUrls) || dictation;

      if (i < sentences.length - 1) {
        await delay(500);
      }
    }

    console.log(`Dictation ${id} created successfully with all audio`);
    return { dictation, audioComplete: true, audioError: null };
  } catch (audioError) {
    console.error('Error generating audio:', audioError);
    console.log(`Dictation ${id} kept with partial audio due to: ${audioError.message}`);
    return { dictation, audioComplete: false, audioError };
  }
}

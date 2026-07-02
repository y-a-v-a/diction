/**
 * Diction core — public facade.
 *
 * This is the product: turn a handful of topics into a generated, spoken
 * dictation and hand back everything needed to play it. The web layer (and
 * any future delivery layer: CLI, API, teacher/classroom UI) must import
 * from this file only — never from core internals.
 *
 * The core has no knowledge of Express, HTTP, sessions, users, roles or
 * HTML. Access control and presentation are the caller's concern.
 */

export {
  generateDictation,
  validateDictationInput,
  DictationInputError,
  TOPIC_COUNT,
  SENTENCE_COUNT,
  PIN_PATTERN,
} from './dictation.js';

export {
  getDictation,
  listDictations,
  deleteDictation,
  getAudioUrl,
  getStorageBackend,
  isValidDictationId,
} from './storage/index.js';

export {
  getContentLanguage,
  listContentLanguages,
  isContentLanguage,
} from './languages/index.js';

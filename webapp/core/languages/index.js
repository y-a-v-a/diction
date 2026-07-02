/**
 * Content-language registry.
 *
 * A content language describes the language a dictation is generated and
 * spoken in: generation prompts and TTS voice settings. It is unrelated to
 * the UI language of the web app (see i18n/ in the web layer).
 */
import nl from './nl.js';
import enUS from './en-US.js';

const languages = {
  'nl': nl,
  'en-US': enUS,
};

const DEFAULT_LANGUAGE = 'nl';

/**
 * Get a content-language config by code, defaults to Dutch
 */
export function getContentLanguage(code) {
  return languages[code] || languages[DEFAULT_LANGUAGE];
}

/**
 * All available content languages, e.g. for building a language picker
 */
export function listContentLanguages() {
  return Object.values(languages);
}

/**
 * Check if a content-language code is supported
 */
export function isContentLanguage(code) {
  return code in languages;
}

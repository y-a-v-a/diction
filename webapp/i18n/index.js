/**
 * UI locale registry — the language the web interface is displayed in.
 *
 * Independent from core/languages/, which describes the language a dictation
 * is generated and spoken in. The codes overlap because both currently cover
 * Dutch and American English, but a Dutch UI can play an English dictation.
 */
import nl from './nl.js';
import enUS from './en-US.js';

const locales = {
  'nl': nl,
  'en-US': enUS,
};

const DEFAULT_LOCALE = 'nl';

/**
 * Get a UI locale by code, defaults to Dutch
 */
export function getLocale(code) {
  return locales[code] || locales[DEFAULT_LOCALE];
}

/**
 * Check if a locale code is valid
 */
export function isValidLocale(code) {
  return code in locales;
}

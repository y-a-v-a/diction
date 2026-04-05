import nl from './nl.js';
import enUS from './en-US.js';

const languages = {
  'nl': nl,
  'en-US': enUS,
};

/**
 * Get a language config by code, defaults to Dutch
 */
export function getLanguage(code) {
  return languages[code] || languages['nl'];
}

/**
 * Get all available languages as an array
 */
export function getAvailableLanguages() {
  return Object.values(languages);
}

/**
 * Check if a language code is valid
 */
export function isValidLanguage(code) {
  return code in languages;
}

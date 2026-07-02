/**
 * Text-to-Speech provider — ElevenLabs
 *
 * This module is the seam for swapping or adding TTS providers: the rest of
 * the core only imports from here.
 */

export { generateSpeech, delay } from './elevenlabs.js';

export function getCurrentService() {
  return 'elevenlabs';
}

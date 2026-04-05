/**
 * Text-to-Speech service — ElevenLabs
 */

export { generateSpeech, delay } from './elevenlabs.js';

export function getCurrentService() {
  return 'elevenlabs';
}

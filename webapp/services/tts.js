/**
 * Text-to-Speech service abstraction layer
 * Allows switching between different TTS providers
 */

import * as elevenlabs from './elevenlabs.js';
import * as resemble from './resemble.js';
import * as mockTts from './tts-mock.js';

const TTS_SERVICE = process.env.TTS_SERVICE || 'elevenlabs';

// Map of available TTS services
const services = {
  'elevenlabs': elevenlabs,
  'resemble': resemble,
  'mock': mockTts
};

/**
 * Get the configured TTS service
 */
function getTTSService() {
  const service = services[TTS_SERVICE.toLowerCase()];

  if (!service) {
    throw new Error(`Unknown TTS service: ${TTS_SERVICE}. Available: ${Object.keys(services).join(', ')}`);
  }

  return service;
}

/**
 * Generate speech using the configured TTS service
 */
export async function generateSpeech(text, outputPath) {
  const service = getTTSService();
  return service.generateSpeech(text, outputPath);
}

/**
 * Delay helper for rate limiting
 */
export function delay(ms) {
  const service = getTTSService();
  return service.delay(ms);
}

/**
 * Get the name of the currently configured TTS service
 */
export function getCurrentService() {
  return TTS_SERVICE;
}

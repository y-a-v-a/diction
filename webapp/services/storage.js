import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DICTATIONS_DIR = path.join(__dirname, '..', 'dictations');

// Ensure dictations directory exists
if (!fs.existsSync(DICTATIONS_DIR)) {
  fs.mkdirSync(DICTATIONS_DIR, { recursive: true });
}

/**
 * Generate a unique 8-character ID
 */
export function generateId() {
  return crypto.randomUUID().slice(0, 8);
}

/**
 * Create a new dictation
 */
export function createDictation(id, topics, sentences) {
  const dictationDir = path.join(DICTATIONS_DIR, id);

  // Create dictation directory
  fs.mkdirSync(dictationDir, { recursive: true });

  // Create metadata
  const metadata = {
    id,
    topics,
    sentences,
    created: new Date().toISOString()
  };

  // Save metadata.json
  fs.writeFileSync(
    path.join(dictationDir, 'metadata.json'),
    JSON.stringify(metadata, null, 2)
  );

  return metadata;
}

/**
 * Get a dictation by ID
 */
export function getDictation(id) {
  const metadataPath = path.join(DICTATIONS_DIR, id, 'metadata.json');

  if (!fs.existsSync(metadataPath)) {
    return null;
  }

  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
  return metadata;
}

/**
 * List all dictations
 */
export function listDictations() {
  if (!fs.existsSync(DICTATIONS_DIR)) {
    return [];
  }

  const entries = fs.readdirSync(DICTATIONS_DIR, { withFileTypes: true });
  const dictations = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const metadata = getDictation(entry.name);
      if (metadata) {
        dictations.push(metadata);
      }
    }
  }

  // Sort by creation date, newest first
  dictations.sort((a, b) => new Date(b.created) - new Date(a.created));

  return dictations;
}

/**
 * Delete a dictation by ID
 */
export function deleteDictation(id) {
  const dictationDir = path.join(DICTATIONS_DIR, id);

  if (fs.existsSync(dictationDir)) {
    fs.rmSync(dictationDir, { recursive: true, force: true });
    return true;
  }

  return false;
}

/**
 * Get the path to a dictation directory
 */
export function getDictationPath(id) {
  return path.join(DICTATIONS_DIR, id);
}

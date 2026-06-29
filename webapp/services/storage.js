import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DICTATIONS_DIR = path.join(__dirname, '..', 'dictations');

/**
 * Storage backend selection.
 *
 * - When `BLOB_READ_WRITE_TOKEN` is present (the env var Vercel injects once a
 *   Blob store is connected to the project), dictations are persisted to
 *   Vercel Blob — durable storage that survives the serverless, ephemeral and
 *   read-only filesystem.
 * - Otherwise we fall back to the local filesystem, which keeps local
 *   development and the Docker image working exactly as before.
 *
 * Both backends expose the same async API. Audio is stored alongside the
 * metadata and the resolved playback URLs are saved into `metadata.audio` so
 * the rest of the app never has to know which backend is in use.
 */
const useBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

// The @vercel/blob client is imported lazily so the filesystem path has no
// dependency on it (and so importing this module never touches the network).
let blobClient = null;
async function blob() {
  if (!blobClient) {
    blobClient = await import('@vercel/blob');
  }
  return blobClient;
}

const BLOB_PREFIX = 'dictations';

/**
 * Validate ID format (defense-in-depth)
 */
function validateId(id) {
  return typeof id === 'string' && /^[0-9a-f]{8}$/.test(id);
}

/**
 * Generate a unique 8-character ID
 */
export function generateId() {
  return crypto.randomUUID().slice(0, 8);
}

// ---------------------------------------------------------------------------
// Filesystem backend
// ---------------------------------------------------------------------------

function fsEnsureRootDir() {
  if (!fs.existsSync(DICTATIONS_DIR)) {
    fs.mkdirSync(DICTATIONS_DIR, { recursive: true });
  }
}

const fsBackend = {
  async createDictation(metadata) {
    fsEnsureRootDir();
    const dictationDir = path.join(DICTATIONS_DIR, metadata.id);
    fs.mkdirSync(dictationDir, { recursive: true });
    fs.writeFileSync(
      path.join(dictationDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );
    return metadata;
  },

  async getDictation(id) {
    const metadataPath = path.join(DICTATIONS_DIR, id, 'metadata.json');
    if (!fs.existsSync(metadataPath)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
  },

  async listDictations() {
    if (!fs.existsSync(DICTATIONS_DIR)) {
      return [];
    }
    const entries = fs.readdirSync(DICTATIONS_DIR, { withFileTypes: true });
    const dictations = [];
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const metadata = await this.getDictation(entry.name);
        if (metadata) {
          dictations.push(metadata);
        }
      }
    }
    return dictations;
  },

  async deleteDictation(id) {
    const dictationDir = path.join(DICTATIONS_DIR, id);
    if (fs.existsSync(dictationDir)) {
      fs.rmSync(dictationDir, { recursive: true, force: true });
      return true;
    }
    return false;
  },

  async saveAudio(id, index, buffer) {
    fsEnsureRootDir();
    const dictationDir = path.join(DICTATIONS_DIR, id);
    fs.mkdirSync(dictationDir, { recursive: true });
    fs.writeFileSync(path.join(dictationDir, `${index}.mp3`), buffer);
    // Served by the express.static('/dictations') middleware.
    return `/dictations/${id}/${index}.mp3`;
  },
};

// ---------------------------------------------------------------------------
// Vercel Blob backend
// ---------------------------------------------------------------------------

const blobBackend = {
  async createDictation(metadata) {
    await this._putMetadata(metadata);
    return metadata;
  },

  async getDictation(id) {
    const { list } = await blob();
    const pathname = `${BLOB_PREFIX}/${id}/metadata.json`;
    const { blobs } = await list({ prefix: pathname, limit: 1 });
    const match = blobs.find((b) => b.pathname === pathname);
    if (!match) {
      return null;
    }
    // Bypass the CDN cache so freshly-updated metadata is read back.
    const res = await fetch(`${match.url}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) {
      return null;
    }
    return res.json();
  },

  async listDictations() {
    const { list } = await blob();
    const dictations = [];
    let cursor;
    do {
      const page = await list({ prefix: `${BLOB_PREFIX}/`, cursor, limit: 1000 });
      const metaBlobs = page.blobs.filter((b) => b.pathname.endsWith('/metadata.json'));
      const fetched = await Promise.all(
        metaBlobs.map(async (b) => {
          try {
            const res = await fetch(`${b.url}?t=${Date.now()}`, { cache: 'no-store' });
            return res.ok ? await res.json() : null;
          } catch {
            return null;
          }
        })
      );
      for (const meta of fetched) {
        if (meta) dictations.push(meta);
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    return dictations;
  },

  async deleteDictation(id) {
    const { list, del } = await blob();
    const { blobs } = await list({ prefix: `${BLOB_PREFIX}/${id}/` });
    if (blobs.length === 0) {
      return false;
    }
    await del(blobs.map((b) => b.url));
    return true;
  },

  async saveAudio(id, index, buffer) {
    const { put } = await blob();
    const result = await put(`${BLOB_PREFIX}/${id}/${index}.mp3`, buffer, {
      access: 'public',
      contentType: 'audio/mpeg',
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return result.url;
  },

  async _putMetadata(metadata) {
    const { put } = await blob();
    await put(`${BLOB_PREFIX}/${metadata.id}/metadata.json`, JSON.stringify(metadata, null, 2), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 0,
    });
  },
};

const backend = useBlob ? blobBackend : fsBackend;

/**
 * Name of the active storage backend (handy for logging/diagnostics).
 */
export function getStorageBackend() {
  return useBlob ? 'vercel-blob' : 'filesystem';
}

// ---------------------------------------------------------------------------
// Public API (backend-agnostic)
// ---------------------------------------------------------------------------

/**
 * Create a new dictation (metadata only; audio is saved separately).
 */
export async function createDictation(id, topics, sentences, options = {}) {
  if (!validateId(id)) {
    throw new Error('Invalid dictation ID format');
  }

  const metadata = {
    id,
    title: options.title || null,
    topics,
    sentences,
    language: options.language || 'nl',
    pin: options.pin || null,
    audio: [],
    created: new Date().toISOString(),
  };

  return backend.createDictation(metadata);
}

/**
 * Get a dictation by ID.
 */
export async function getDictation(id) {
  if (!validateId(id)) {
    return null;
  }
  return backend.getDictation(id);
}

/**
 * List all dictations, newest first.
 */
export async function listDictations() {
  const dictations = await backend.listDictations();
  dictations.sort((a, b) => new Date(b.created) - new Date(a.created));
  return dictations;
}

/**
 * Delete a dictation by ID (metadata + audio).
 */
export async function deleteDictation(id) {
  if (!validateId(id)) {
    return false;
  }
  return backend.deleteDictation(id);
}

/**
 * Persist a single sentence's audio and return its playback URL.
 */
export async function saveAudio(id, index, buffer) {
  if (!validateId(id)) {
    throw new Error('Invalid dictation ID format');
  }
  return backend.saveAudio(id, index, buffer);
}

/**
 * Persist the list of audio playback URLs onto a dictation's metadata.
 * Called incrementally during creation so partial audio survives failures.
 */
export async function setDictationAudio(id, audioUrls) {
  const metadata = await getDictation(id);
  if (!metadata) {
    return null;
  }
  metadata.audio = audioUrls;
  if (useBlob) {
    await blobBackend._putMetadata(metadata);
  } else {
    await fsBackend.createDictation(metadata);
  }
  return metadata;
}

/**
 * Resolve the playback URL for a given sentence index.
 * Prefers the URL stored in metadata; falls back to the conventional
 * filesystem path for dictations created before the `audio` field existed.
 */
export function getAudioUrl(dictation, index) {
  if (dictation.audio && dictation.audio[index]) {
    return dictation.audio[index];
  }
  return `/dictations/${dictation.id}/${index}.mp3`;
}

# Diction core

This directory contains the product's core: **topics in → generated, spoken
dictation out → data needed for playback**. Everything else in the webapp
(homepage, logins, passphrase gate, admin actions, templates, i18n) is a
delivery layer around it.

```
core/
├── index.js          # Public facade — the ONLY module outsiders may import
├── dictation.js      # Domain service: validation + generation pipeline
├── generation/
│   ├── sentences.js  # Sentence & title generation (Claude / Anthropic API)
│   └── tts/          # Text-to-speech provider seam (ElevenLabs)
├── storage/          # Dictation persistence (filesystem or Vercel Blob)
└── languages/        # Content languages: generation prompts + TTS voices
```

## Boundary rules

1. **Inbound**: code outside `core/` imports from `core/index.js` only.
   Route handlers stay thin: translate HTTP to a core call, translate the
   result (or error) back to a response.
2. **Outbound**: nothing in `core/` may import Express, views, i18n, auth
   or anything else from the web layer. The core must stay runnable from
   any host: web app, CLI script, background job, future API.
3. **No identity**: the core does not know who a user is. Authorization
   (who may create, delete, play) is decided by the caller *before*
   invoking the core. This is what keeps future teacher/admin/classmate
   logins a pure web-layer feature.
4. **Language split**: `core/languages/` describes the language a dictation
   is *generated and spoken* in (prompts, TTS voice). The language the UI is
   *displayed* in lives in `../i18n/`. They share codes but are independent
   concerns — a Dutch UI can play an English dictation.

## Main entry points

- `generateDictation({ topics, sentenceCount, language, pin })` — runs the
  full pipeline and persists the result. Returns
  `{ dictation, audioComplete, audioError }`; keeps partial audio when TTS
  fails midway, cleans up and throws when generation fails before anything
  was persisted. Invalid input throws `DictationInputError` with
  `field`/`reason` for the caller to localize.
- `getDictation(id)` / `listDictations()` / `deleteDictation(id)` —
  repository operations.
- `getAudioUrl(dictation, index)` — resolve a sentence's playback URL.
- `listContentLanguages()` — available dictation languages, e.g. for a
  language picker.

The dictation metadata (`id`, `title`, `topics`, `sentences`, `language`,
`pin`, `audio[]`, `created`) is the contract between generation and any
playback UI.

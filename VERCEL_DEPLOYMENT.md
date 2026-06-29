# Vercel Deployment — Manual Tasks Checklist

This file lists the **manual steps you (a human) must do in the Vercel and Google
dashboards** to deploy Diction. The code changes that make the app
serverless-ready are already done (see "What the code already does" at the
bottom). Work through the checklist top to bottom.

> TL;DR: import the repo, **set Root Directory to `webapp`**, connect a **Vercel
> Blob store**, paste in the environment variables, deploy, then point Google
> OAuth at the deployed URL.

---

## 1. Import the project into Vercel

- [ ] Go to <https://vercel.com/new> and import the `y-a-v-a/diction` GitHub repo.
- [ ] **Root Directory:** click *Edit* and set it to **`webapp`**.
      This is required — the deployable app lives in the `webapp/` subdirectory,
      and `vercel.json` + the `api/` serverless function are there.
- [ ] **Framework Preset:** leave as **Other** (Vercel auto-detects the
      `api/` function and `vercel.json`). No build command is needed.
- [ ] Don't deploy yet — add the Blob store and env vars first (steps 2–3),
      otherwise the first deploy will run without storage/keys.

## 2. Create and connect a Vercel Blob store (required — this is the database)

The app stores dictation metadata **and** generated audio in Vercel Blob,
because a serverless filesystem is ephemeral and read-only.

- [ ] In the Vercel project → **Storage** tab → **Create Database** → **Blob**.
- [ ] Give it a name (e.g. `diction-blob`) and connect it to this project for
      **all environments** (Production, Preview, Development).
- [ ] Confirm that connecting the store added a **`BLOB_READ_WRITE_TOKEN`**
      environment variable to the project (Settings → Environment Variables).
      You do **not** set this by hand — Vercel injects it. Its presence is what
      flips the app from filesystem storage to Blob storage automatically.

## 3. Set environment variables

Project → **Settings → Environment Variables**. Add the following for the
**Production** (and ideally **Preview**) environments.

### Required

| Variable | Where to get it | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | <https://console.anthropic.com/> | Used to generate the dictation sentences and titles. |
| `ELEVENLABS_API_KEY` | <https://elevenlabs.io/> | Text-to-speech. |
| `ELEVENLABS_VOICE_ID` | ElevenLabs voice library | Default (Dutch) voice. |
| `SESSION_SECRET` | generate (see below) | Signs the admin session cookie. |

### Recommended / optional

| Variable | Purpose | Notes |
|---|---|---|
| `ELEVENLABS_VOICE_ID_EN_US` | English voice | Needed for `en-US` dictations. |
| `CREATE_SECRET_TOKEN` | Protects `/create` via `?token=` | Generate a random 64-hex string. Without this *and* `CREATE_PASSPHRASE`, the create page is **open to everyone**. |
| `CREATE_PASSPHRASE` | Protects `/create` via a passphrase form | Friendlier alternative/companion to the token. |
| `GOOGLE_CLIENT_ID` | Admin (delete) login | See step 5. |
| `GOOGLE_CLIENT_SECRET` | Admin (delete) login | See step 5. |
| `ADMIN_EMAILS` | Comma-separated allowlist of Google emails that get admin/delete rights | e.g. `you@example.com`. Empty = nobody is admin. |
| `GOOGLE_CALLBACK_URL` | Override OAuth callback | Only needed if auto-derivation misbehaves; see step 5. |

> **Do NOT set** `BLOB_READ_WRITE_TOKEN` yourself — step 2 provides it.
> **Do NOT set** `PORT` — Vercel manages the port for serverless functions.

Generate the secrets locally:

```bash
# SESSION_SECRET (and a CREATE_SECRET_TOKEN)
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('CREATE_SECRET_TOKEN=' + require('crypto').randomBytes(32).toString('hex'))"
```

## 4. Deploy

- [ ] Click **Deploy** (or push to the connected branch).
- [ ] Once live, open the deployment URL and verify:
  - [ ] `/` loads (home page).
  - [ ] `/dictations` loads (empty list at first).
  - [ ] `/create?token=YOUR_CREATE_SECRET_TOKEN` loads the create form.
  - [ ] Generate a short dictation (1–2 sentences) and confirm audio plays —
        this proves Claude, ElevenLabs **and** Blob storage all work.

## 5. Configure Google OAuth (only if you want admin/delete login)

Admin login uses Google. The callback URL must match your real deployment
origin.

- [ ] In the [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials),
      create (or edit) an **OAuth 2.0 Client ID** of type *Web application*.
- [ ] Add an **Authorized redirect URI** for each origin you use:
  - `https://<your-project>.vercel.app/auth/google/callback`
  - `https://<your-custom-domain>/auth/google/callback` (if you add a domain)
  - `http://localhost:3000/auth/google/callback` (for local testing)
- [ ] Put the client ID/secret into `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
      (step 3) and set `ADMIN_EMAILS` to your Google address.
- [ ] If you use a **custom domain**, the callback URL is derived from the
      request host automatically. If you sit behind something that rewrites the
      host/proto and login redirects break, set `GOOGLE_CALLBACK_URL`
      explicitly to the exact `https://.../auth/google/callback` value.
- [ ] Test: visit `/admin/login`, sign in, and confirm delete buttons appear on
      `/dictations`.

## 6. Custom domain (optional)

- [ ] Project → **Settings → Domains** → add your domain and follow the DNS
      instructions.
- [ ] Re-check the Google redirect URI (step 5) for the new domain.

---

## Important caveats & gotchas

- **Function timeout / the `/create` route is slow.** Creating a dictation calls
  Claude once per request plus ElevenLabs once *per sentence* (with a 0.5s gap
  between each). `vercel.json` sets `maxDuration: 60` for the function.
  - On the **Hobby** plan the max is **60s** — usually enough for ≤ ~6 sentences,
    but large requests can time out.
  - For headroom, use the **Pro** plan and raise `maxDuration` (up to 300) in
    `webapp/vercel.json`.
  - If you hit timeouts, create shorter dictations (fewer sentences). Partial
    audio is saved incrementally, so a timeout still leaves a usable dictation.
- **Rate limiting is best-effort.** The in-memory rate limiter
  (`utils/security.js`) is per-instance; across multiple serverless instances
  the effective limit is looser. For strict limits, move to a shared store
  (e.g. Vercel KV) — not required to deploy.
- **Blob is public.** Audio (and metadata) blobs are stored with public access
  so `<audio>` tags can load them. Don't put anything secret in a dictation.
- **Local dev / Docker are unchanged.** With no `BLOB_READ_WRITE_TOKEN`, the app
  falls back to filesystem storage under `webapp/dictations/`, exactly as before.
  To exercise the Blob path locally, run `vercel env pull` and put the pulled
  `BLOB_READ_WRITE_TOKEN` in `webapp/.env`.

---

## What the code already does (no action needed)

These were handled in code so the app is serverless-ready:

- `webapp/api/index.js` — Vercel serverless entry that exports the Express app.
- `webapp/app.js` — the Express app, split out from `server.js` (which is now
  just the local/Docker `listen()` entry). `trust proxy` is enabled.
- `webapp/vercel.json` — routes all requests to the function, bundles the
  `views/`, `public/` and `languages/` files, and sets `maxDuration`.
- `webapp/services/storage.js` — dual-backend storage: **Vercel Blob** when
  `BLOB_READ_WRITE_TOKEN` is set, **filesystem** otherwise. Audio playback URLs
  are stored in each dictation's metadata.
- `webapp/services/elevenlabs.js` — `generateSpeech()` returns an audio Buffer
  instead of writing to disk, so the storage layer decides where it lives.
- `webapp/package.json` — adds the `@vercel/blob` dependency and a Node engine.

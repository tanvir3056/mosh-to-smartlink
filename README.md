# Ampveil V1

Mobile-first smart song landing pages for released tracks only, built for paid social traffic.

## What’s included

- Public released-song page at `/:slug`
- Tracked outbound redirect route at `/go/:slug/:service`
- Private admin dashboard with:
  - sign in
  - Spotify URL import
  - review/edit/publish/unpublish flow
  - analytics overview
  - Meta Pixel settings
- First-party analytics persisted in Postgres
- Supabase Auth production path for exactly one admin account
- Local development fallback:
  - in-memory Postgres-compatible database via `pg-mem`
  - local demo admin auth when Supabase env vars are absent

## Stack

- Next.js 16
- Postgres
- Supabase
- Vercel

## Key routes

- `/`
- `/:slug`
- `/go/:slug/:service`
- `/admin/sign-in`
- `/admin`
- `/admin/songs/new`
- `/admin/songs/:songId`
- `/admin/analytics`
- `/admin/settings`

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy envs:

```bash
cp .env.example .env.local
```

3. Start the app:

```bash
npm run dev
```

4. Open `http://localhost:3000/admin/sign-in`

5. Local-only sign-in defaults:
   - email: value of `ADMIN_EMAIL`
   - password: value of `DEMO_ADMIN_PASSWORD`

## Production setup

1. Create a Supabase project.
2. Set:
   - `POSTGRES_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_EMAIL`
   - `NEXT_PUBLIC_APP_URL`
3. Apply the migration:

```bash
psql "$POSTGRES_URL" -f supabase/migrations/20260417193000_initial.sql
```

4. Seed the single admin account:

```bash
npm run seed:admin -- admin@example.com strong-password-here
```

5. Deploy to Vercel.

## Admin account model

- Production access is restricted to exactly one allowed admin email.
- The app checks the authenticated Supabase user email against `ADMIN_EMAIL`.
- The `admin_access` table stores the allowed account metadata.
- Local development can fall back to demo auth only when Supabase auth env vars are missing.

## Matching strategy

### Import input

- One Spotify track URL only

### Free-only metadata and matching

- Spotify:
  - public Spotify track page + oEmbed
- Apple Music:
  - iTunes Search API
- Deezer:
  - Deezer public search API
- YouTube Music:
  - best-effort match from public YouTube search results mapped to YouTube Music URLs
- Amazon Music:
  - search-result fallback URL
- TIDAL:
  - search-result fallback URL

### Manual review

- Manual review is mandatory before publish.
- Every service link can be edited, replaced, or left as a search-result fallback.

## Analytics model

First-party analytics is the source of truth.

Captured fields:

- page visits
- unique visitors
- outbound clicks
- clicks by streaming service
- referrer and referrer host
- UTM source / medium / campaign / term / content
- browser / OS / device summary
- country
- city when the hosting platform provides it via request headers
- privacy-safe hashed IP summary only

Meta Pixel is additive only and can be enabled from admin settings.

## Database tables

- `admin_access`
- `tracking_config`
- `songs`
- `song_pages`
- `streaming_links`
- `import_attempts`
- `visits`
- `click_events`

## Quality commands

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

## Notes for Vercel

- `/:slug` and all admin routes are dynamic server-rendered routes.
- Country/city enrichment is best when Vercel geolocation headers are available.
- Public pages are kept light: metadata is rendered server-side, with only preview playback, visit tracking, and optional Pixel behavior on the client.

## Known V1 limitations

- Amazon Music and TIDAL use search-result fallbacks, not exact deep-link resolution.
- YouTube Music matching is heuristic and may require manual correction.
- Preview playback is best-effort and depends on publicly available preview URLs.
- City tracking is only available when the hosting platform exposes it safely in headers.
- Local development uses an in-memory Postgres-compatible fallback, so local data resets when the dev server restarts.
- `next build` passes, but webpack emits a harmless `pg-mem` module-analysis warning because the local-only fallback is loaded dynamically.

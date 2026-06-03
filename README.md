# Backstage

Multi-account smart release links for artists and music teams running paid traffic.

Backstage turns a released Spotify track into a reviewable song page, lets each artist account publish on its own username path, tracks first-party visits and outbound clicks, and optionally captures fan email leads.

## What is included

- Public release pages at `/{username}/{slug}`
- Tracked outbound redirect routes at `/go/{username}/{slug}/{service}`
- Account sign-up and sign-in with username/password
- Private admin workspace with:
  - Spotify URL import
  - draft, preview, publish, unpublish, and delete flow
  - streaming destination review and visibility controls
  - artwork, metadata, preview URL, and email-capture editing
  - analytics overview
  - Meta Pixel settings
  - Mailchimp lead sync settings
  - CSV lead export
- First-party analytics persisted in Postgres
- Production Supabase Auth path
- Local development fallback:
  - in-memory Postgres-compatible database via `pg-mem`
  - signed local demo sessions when Supabase env vars are absent

## Stack

- Next.js 16 App Router
- React 19
- Postgres
- Supabase Auth
- Vercel

## Key routes

- `/`
- `/sign-up`
- `/sign-in`
- `/{username}/{slug}`
- `/go/{username}/{slug}/{service}`
- `/admin`
- `/admin/songs/new`
- `/admin/songs/{songId}`
- `/admin/preview/{songId}`
- `/admin/analytics`
- `/admin/settings`

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy envs if an example env file exists:

```bash
cp .env.example .env.local
```

3. Start the app:

```bash
npm run dev
```

4. Open `http://localhost:3000/sign-up` and create a local account.

Local development defaults:

- `ADMIN_EMAIL=admin@local.test`
- `DEMO_ADMIN_PASSWORD=dev-password`
- local data resets when the dev process restarts unless `POSTGRES_URL` is set

## Production setup

1. Create a Supabase project.
2. Set production env vars:
   - `POSTGRES_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL`
   - `DEMO_SESSION_SECRET`
   - `CONNECTOR_CREDENTIALS_SECRET`
   - `ANALYTICS_HASH_SALT`
3. For Vercel/serverless, use the Supabase pooler connection string for `POSTGRES_URL`.
4. Apply migrations in order:

```bash
psql "$POSTGRES_URL" -f supabase/migrations/20260417193000_initial.sql
psql "$POSTGRES_URL" -f supabase/migrations/20260422183000_multi_account.sql
psql "$POSTGRES_URL" -f supabase/migrations/20260425090000_email_capture.sql
psql "$POSTGRES_URL" -f supabase/migrations/20260429110000_match_review_evidence.sql
psql "$POSTGRES_URL" -f supabase/migrations/20260430021500_streaming_link_visibility.sql
psql "$POSTGRES_URL" -f supabase/migrations/20260603060000_user_avatar_url.sql
```

5. Deploy to Vercel.

## Matching strategy

Import starts from one released Spotify track URL.

Backstage resolves metadata and destinations from free/public sources:

- Spotify public track page and oEmbed
- Apple Music iTunes Search API
- Deezer public search API
- YouTube Music best-effort search mapping
- Amazon Music search fallback
- TIDAL search fallback

Manual review is mandatory before a serious launch. Every destination can be edited, replaced, hidden, or left as a search fallback. Wrong links are worse than missing links.

## Analytics model

First-party analytics is the source of truth.

Captured fields include:

- page visits
- unique visitors
- outbound clicks
- clicks by streaming service
- referrer and referrer host
- UTM source, medium, campaign, term, and content
- browser, OS, and device summary
- country and city when the host exposes safe geo headers
- privacy-safe hashed IP summary only
- captured email leads and connector sync status

Meta Pixel is additive only and can be enabled from admin settings.

## Database tables

- `app_users`
- `admin_access`
- `tracking_config`
- `email_connectors`
- `email_capture_submissions`
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
npm run review:product
```

`npm run test:e2e` starts its own local-auth Backstage server on `127.0.0.1:3001` by default so it cannot silently reuse a stale server with different environment variables. Set `PLAYWRIGHT_REUSE_EXISTING_SERVER=true` only when you have intentionally started the matching test server yourself.

`npm run review:product` creates an evidence-first review note in `output/reviews/`. Fill it with current command output and browser findings before treating any release as ready.

Smoke scenarios:

```bash
node scripts/qa-smoke.mjs basic
node scripts/qa-smoke.mjs email-capture
```

## Notes for Vercel

- `/{username}/{slug}` and admin routes are dynamic server-rendered routes.
- Country/city enrichment is best when Vercel geolocation headers are available.
- Public pages stay light: metadata is server-rendered, with only preview playback, visit tracking, email capture, and optional Pixel behavior on the client.
- Do not enable local demo auth in production unless deliberately testing a private preview.

## Known V1 limitations

- Amazon Music and TIDAL use search-result fallbacks, not exact deep-link resolution.
- YouTube Music matching is heuristic and may require manual correction.
- Preview playback is best-effort and depends on publicly available preview URLs.
- City tracking is only available when the host exposes it safely in headers.
- Local development uses an in-memory Postgres-compatible fallback unless `POSTGRES_URL` is set.
- `next build` passes, but webpack may emit an existing `pg-mem` module-analysis warning because the local-only fallback is loaded dynamically.

# POST BUILD AUDIT

## App Summary

Backstage is a multi-account artist workspace for creating mobile-first smart song landing pages. An artist imports a Spotify track, gets metadata and best-effort service matches, reviews and edits streaming links, optionally enables email capture, previews privately, and publishes a public page at `/{username}/{slug}`. Public outbound clicks route through `/go/{username}/{slug}/{service}` for tracking.

## Core User Personas

1. Artist or band owner managing their own releases
2. Label or marketing operator managing release pages for an artist account
3. Fan landing on the public release page and choosing a streaming service

## Major Routes / Screens

### Public
- `/`
- `/sign-in`
- `/sign-up`
- `/{username}/{slug}`
- `/go/{username}/{slug}/{service}`

### Admin
- `/admin`
- `/admin/songs/new`
- `/admin/songs/[songId]`
- `/admin/preview/[songId]`
- `/admin/analytics`
- `/admin/settings`

### API / Actions
- `/api/admin/artwork`
- `/api/admin/email-leads/export`
- `/api/analytics/visit`
- `/api/dev/qa/song-page`
- server actions in `src/app/admin/actions.ts`
- public actions in `src/app/public-actions.ts`

## Critical User Flows

1. Sign in
2. Import Spotify track
3. Create draft song/page
4. Review and edit streaming links
5. Hide/show destinations
6. Fix missing destinations via fallback or manual link
7. Save draft
8. Preview private page
9. Publish live page
10. Open live page
11. Click outbound service link through `/go`
12. Enable and submit email capture
13. Review analytics
14. Export captured leads
15. Update settings

## Verification Tools Found

### Scripts
- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:e2e`
- `npm run seed:admin`
- `npm run review:product`

### Test Suites
- Vitest unit/integration tests
- Playwright e2e tests
- QA seed route: `/api/dev/qa/song-page`

### Browser / QA Tooling
- Local Playwright browser scripting
- Local screenshots under `/tmp` and repo `test-results/`

## Audit Plan

### Loop 1 — Product / Functional QA
1. Reproduce currently reported admin/editor instability in a clean local instance
2. Test sign in, import, edit, save, preview, publish, and live-page click routing
3. Test missing-link states, manual link states, hidden service states
4. Log critical and major issues before fixing

### Loop 2 — Design / UX QA
1. Review admin layout, import page, editor, settings, analytics, and empty states
2. Check spacing, hierarchy, copy, state clarity, and responsive behavior
3. Polish only after critical/major functionality is stable

### Loop 3 — Regression QA
1. Re-test previously broken flows
2. Run lint, typecheck, tests, and build
3. Review remaining risks and deferred issues

## Issue Log

| ID | Route / Area | Category | Severity | Reproduction | Expected | Actual | Evidence | Proposed Fix | Status | Verification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PB-001 | `/admin/songs/[songId]` editor | Console/runtime error | Critical | Open editor and toggle destination visibility on some songs | Editor remains stable | Admin error boundary appeared after interaction | User reports + local runtime error previously found in `PublicLinkPanel` hydration and checkbox event handling | Fix deterministic rendering, stabilize event handlers, and stop non-essential editor fetches from taking down the route | Fixed | Local browser repro on 3001, e2e visibility test, no page errors |
| PB-002 | Import flow → editor handoff | Broken functionality | Critical | Import valid Spotify URL and land on editor | Draft should open reliably | Historically reported admin error after import | Prior user reports; local import on 3001 now reaches `/admin/songs/:id?review=missing-links` without boundary error | Keep import flow intact and verify the redirect into review/editor against a clean local-auth instance | Fixed | Browser import pass on 3001 succeeded |
| PB-003 | Email capture flow | Broken functionality | High | Submit valid email on public page | Success state and unlocked reward should appear after submit | Lead was saved, but the public UI did not transition to success/unlocked state | Earlier browser pass on `3001`: lead lookup returned stored record, `successVisible: 0`, no download link rendered | Memoize the server action binding so `useActionState` keeps its returned state through rerenders | Fixed | `npm run test:e2e`, `node scripts/qa-smoke.mjs email-capture`, and browser verification on 3001 |
| PB-004 | Admin surfaces | Design / UX | Major | Review import/settings/editor on desktop and mobile | Clear hierarchy and polished layout | Multiple surfaces felt boxy, sparse, and inconsistent | User feedback + screenshot review artifacts | Ship the existing admin-shell and layout polish, then validate rendered desktop/mobile screens | Fixed | Desktop/mobile screenshots captured under `/private/tmp/backstage-audit` |
| PB-005 | QA automation | Test / tooling | Major | Run Playwright or smoke scripts from repo root | Repo QA should exercise the Backstage app itself | `test:e2e` and `qa-smoke` could target the wrong app if port `3000` was already occupied | Local inspection showed port `3000` serving a different app (`Pulsepage`) while Playwright reused that server | Point automation at the stable Backstage port and reuse the repo’s own running dev instance safely | Fixed | `npm run test:e2e`, `node scripts/qa-smoke.mjs basic`, `node scripts/qa-smoke.mjs email-capture` all passed |
| PB-006 | `/admin/songs/[songId]` save flow | Missing success state | Major | Save an unchanged or edited draft from the song editor | Clear success confirmation should appear | Save persisted but no `Draft saved.` feedback rendered | Browser save/reload pass on 3001 persisted title edits with `successCount: 0` | Stop revalidating the current editor route immediately after save so `useActionState` success can render | Fixed | Browser save persistence pass on 3001 now shows `Draft saved.` and persists after reload |
| PB-007 | Public QA seed publishing | Broken functionality / QA | Major | Seed a published QA page, then navigate to the returned public URL in browser flows | Seeded page should always resolve cleanly from admin and browser verification | Direct requests could resolve, but browser/public verification had been inconsistent during mixed audit flows | One browser pass saw `page.goto()` return `404` while editor exposed a published live URL | Re-run against the corrected QA automation and stable dev instance before treating it as real product risk | Fixed | `node scripts/qa-smoke.mjs basic` and `npm run test:e2e` passed |
| PB-008 | Import form UX | Validation / feedback | Minor | Submit empty or invalid Spotify URL on import page | Clear inline guidance and loading feedback | Invalid URL copy appeared, but empty submit relied on native required state and loading text was easy to miss | Browser pass saw invalid URL message, but no app-level empty-state message | Tighten copy, hierarchy, and loading affordance without changing the working import logic | Deferred | Minor; current native validation is usable |

## Final Verification Summary

### Browser / manual verification completed

- Local sign-in on `http://127.0.0.1:3001/sign-in`
- Admin overview load
- Import page load
- Valid Spotify import on `3001`:
  - successfully redirected into `/admin/songs/:songId?review=missing-links`
  - no admin error boundary during that run
- Editor stability:
  - hide/show a found service in the editor
  - no runtime or admin boundary error on the stable `3001` instance
- Editor save persistence:
  - draft edit persisted across reload
  - success confirmation now renders
- Admin preview:
  - preview route loaded
  - back-to-editor affordance visible
  - preview service links bypass live tracking hrefs as intended
- Settings route:
  - loaded without hitting admin error boundary on `3001`
- Analytics route:
  - loaded without hitting admin error boundary on `3001`
- Public page:
  - direct browser navigation works in isolated checks
  - live `/go` redirect for Spotify reached `https://example.com/spotify`
- Email capture:
  - public email capture page loads
  - lead submission persists in storage with correct UTM data
  - success text and unlocked reward link now render after submit
- Responsive review artifacts created:
  - `/private/tmp/backstage-audit/admin-overview-desktop.png`
  - `/private/tmp/backstage-audit/admin-import-desktop.png`
  - `/private/tmp/backstage-audit/admin-settings-desktop.png`
  - `/private/tmp/backstage-audit/admin-editor-desktop.png`
  - `/private/tmp/backstage-audit/admin-overview-mobile.png`
  - `/private/tmp/backstage-audit/admin-import-mobile.png`
  - `/private/tmp/backstage-audit/admin-settings-mobile.png`
  - `/private/tmp/backstage-audit/admin-editor-mobile.png`

### Automated verification completed so far

- `npm run lint` — pass
- `npm run typecheck` — pass
- `npm run test` — pass
- `npm run build` — pass
- `npm run test:e2e` — pass
- `node scripts/qa-smoke.mjs basic` — pass
- `node scripts/qa-smoke.mjs email-capture` — pass

## Remaining Risks / Deferred

1. The import form still relies on native `required` handling for an empty URL rather than app-level inline copy. This is minor and not a flow blocker.
2. The admin overview can grow very tall with large song counts; long-term pagination or filtering would help, but the current layout is functional and readable.
3. Build still emits the existing `pg-mem` webpack critical-dependency warning, though the build completes successfully.

# Morjane - Atelier Gate + Supabase

## Environment variables (Netlify)

### Public
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

### Secret (Functions only)
- `ATELIER_PASSWORD`
- `ATELIER_COOKIE_SECRET`
- `ATELIER_ADMIN_PIN`
- `SUPABASE_SERVICE_ROLE_KEY`

## What is implemented
- V1 gate: logo click -> password modal -> Netlify function sets signed `atelier_gate` cookie.
- `/atelier` route guarded by `check-atelier-gate`.
- V1.1 base: Supabase magic-link login, member-only tracks, vote upsert, private admin message insert.
- Protected audio via Netlify `get-audio-url` generating a signed Storage URL (300s) from private bucket `atelier-audio`.
- Admin Atelier: validation membres, inbox messages (non lus + traité), votes agrégés, journal admin.
- Monitoring Atelier: événements techniques de functions + statut admin (taux d’échec 24h/7j, liens magic envoyés).

## Required setup
1. Run SQL from `supabase/schema.sql` (creates isolated `atelier_*` tables).
2. Create Supabase Storage bucket `atelier-audio` as private.
3. Ensure one active season and up to 3 active tracks with valid `storage_path`.
4. To add a second active maquette quickly, run `supabase/add-second-maquette.sql` after uploading its audio file to the bucket.
5. Install dependencies:
   - `npm install`

## Files
- `_redirects`
- `netlify/functions/check-atelier-password.js`
- `netlify/functions/check-atelier-gate.js`
- `netlify/functions/get-public-config.js`
- `netlify/functions/get-audio-url.js`
- `netlify/functions/log-track-play.js`
- `netlify/functions/log-magic-link-event.js`
- `netlify/functions/admin-votes-summary.js`
- `netlify/functions/admin-status.js`
- `netlify/functions/admin-audit-log.js`
- `atelier/index.html`
- `atelier/styles.css`
- `atelier/app.js`
- `supabase/schema.sql`

# Morjane - Atelier Gate + Supabase

## Environment variables (Netlify)

### Public
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

### Secret (Functions only)
- `ATELIER_PASSWORD`
- `ATELIER_COOKIE_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`

## What is implemented
- V1 gate: logo click -> password modal -> Netlify function sets signed `atelier_gate` cookie.
- `/atelier` route guarded by `check-atelier-gate`.
- V1.1 base: Supabase magic-link login, member-only tracks, vote upsert, private admin message insert.
- Protected audio via Netlify `get-audio-url` generating a signed Storage URL (300s) from private bucket `atelier-audio`.

## Required setup
1. Run SQL from `supabase/schema.sql`.
2. Create Supabase Storage bucket `atelier-audio` as private.
3. Ensure one active season and up to 3 active tracks with valid `storage_path`.
4. Install dependencies:
   - `npm install`

## Files
- `_redirects`
- `netlify/functions/check-atelier-password.js`
- `netlify/functions/check-atelier-gate.js`
- `netlify/functions/get-public-config.js`
- `netlify/functions/get-audio-url.js`
- `atelier/index.html`
- `atelier/styles.css`
- `atelier/app.js`
- `supabase/schema.sql`

# Morjane - Atelier + Supabase

## Environment variables (Netlify)

### Public
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

### Secret (Functions only)
- `ATELIER_COOKIE_SECRET`
- `ATELIER_ADMIN_PIN`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY` optional, to send the daily Atelier admin digest, admin access notifications, and invitation emails.
- `ATELIER_ADMIN_EMAIL` optional, recipient for the daily Atelier admin digest and new access request alerts.
- `ATELIER_DIGEST_FROM_EMAIL` optional, sender for Atelier emails. Defaults to `Atelier Morjane <atelier@morjane.re>`.
- `ATELIER_ADMIN_DIGEST_WEBHOOK_URL` optional, for the daily Atelier admin digest webhook.

## What is implemented
- V1 entry: logo hint "atelier" -> `/atelier/` -> Supabase magic-link login.
- Member validation is handled in the private admin panel before tracks/audio are visible.
- V1.1 base: member-only tracks, vote upsert, private admin message insert.
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

## Existing Supabase projects
- Run `supabase/fix-profile-rls.sql` once on any existing database to lock profile role/status writes to the service role/admin functions.
- If the Atelier product feedback columns are missing, run:
  - `supabase/atelier-product-upgrade.sql`
  - `supabase/fix-atelier-message-admin-columns.sql`
- If the member queue columns are missing, run `supabase/atelier-member-queue.sql`.

## Files
- `_redirects`
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

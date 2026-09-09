# Morjane - Atelier + Supabase

## Environment variables (Netlify)

### Public
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

### Secret (Functions only)
- `ATELIER_COOKIE_SECRET`
- `ATELIER_ADMIN_PIN`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY` required for professional/private invitations; also used by the Atelier digest and access notifications.
- `MORJANE_PRIVATE_ACCESS_COOKIE_SECRET` required for signed SET/ACTE I shared and nominative sessions; it must be independent from visitor passwords and `ATELIER_COOKIE_SECRET`.
- `ATELIER_ADMIN_EMAIL` optional, recipient for the daily Atelier admin digest and new access request alerts.
- `ATELIER_FROM_EMAIL` optional, sender for Atelier invitation and notification emails. Use a Resend-verified sender, for example `Atelier Morjane <contact@morjane.re>`.
- `ATELIER_DIGEST_FROM_EMAIL` optional legacy sender for Atelier emails. Defaults to `Atelier Morjane <atelier@morjane.re>`.
- `ATELIER_ADMIN_DIGEST_WEBHOOK_URL` optional, for the daily Atelier admin digest webhook.
- `MORJANE_SET_PASSWORD` secret (minimum 16 characters), for `/set` and its private assets.
- `MORJANE_ACTE1_PASSWORD` separate secret (minimum 16 characters), for `/acte1` and `/fissure`.

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
- Review and run `supabase/atelier-privacy-hardening.sql` to apply the approved RLS minimisation and retention job.
- The browser client is served locally from `assets/vendor/supabase-js-2.98.0.js`; Atelier no longer depends on `esm.sh` at runtime.
- Follow `PRIVACY-OPERATIONS.md` for the monthly inactive-account review and V1 email erasure procedure.

## Files
- `_redirects`
- `netlify/functions/get-public-config.js`
- `netlify/functions/get-audio-url.js`
- `netlify/functions/log-track-play.js`
- Les événements de magic link sont enregistrés exclusivement par `request-atelier-access.js`, après traitement serveur de la demande.
- `netlify/functions/admin-votes-summary.js`
- `netlify/functions/admin-status.js`
- `netlify/functions/admin-audit-log.js`
- `atelier/index.html`
- `atelier/styles.css`
- `atelier/app.js`
- `supabase/schema.sql`

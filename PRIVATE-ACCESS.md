# Accès privés SET / ACTE I

La migration `supabase/private-access-credentials.sql` est additive et doit être appliquée avant le code qui l'utilise. Elle ne doit jamais être lancée automatiquement par le site.

Deux modes coexistent : mot de passe partagé hashé côté serveur, et invitation professionnelle nominative liée à une identité Supabase. Ces droits n'accordent aucun accès Atelier.

Variables serveur requises : `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ATELIER_COOKIE_SECRET`, `ATELIER_ADMIN_PIN`, `RESEND_API_KEY`, `ATELIER_FROM_EMAIL` et `MORJANE_PRIVATE_ACCESS_COOKIE_SECRET`. Les anciennes variables `MORJANE_SET_PASSWORD` et `MORJANE_ACTE1_PASSWORD` restent des fallbacks transitoires uniquement lorsqu'aucune credential Supabase n'existe.

Ordre du premier déploiement : appliquer la migration, autoriser les Redirect URLs `/private-access` dans Supabase, créer le secret de cookie privé, déployer, initialiser les mots de passe depuis la console, tester une invitation, puis retirer ultérieurement les anciens mots de passe Netlify après validation.

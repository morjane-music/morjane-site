# Templates email Supabase - Atelier

Ces fichiers sont des versions prêtes à copier dans le dashboard Supabase.

À modifier dans Supabase :

1. Authentication > Emails > Magic Link / OTP
2. Remplacer le contenu HTML par `magic-link.html`
3. Authentication > Emails > Invite user
4. Remplacer le contenu HTML par `invite.html`
5. Sauvegarder

Pourquoi :

- `{{ .ConfirmationURL }}` garde le lien magique classique.
- `{{ .Token }}` affiche le code à 6 chiffres.
- Si le lien s'ouvre dans Gmail/Mail au lieu de Chrome/Safari, la personne peut revenir sur `morjane.re/atelier/` et entrer le code.

Ne pas modifier :

- URL Configuration / Redirect URLs, déjà géré séparément.
- Les règles RLS.
- Les statuts membres.

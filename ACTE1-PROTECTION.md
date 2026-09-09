# Protection de `/acte1`

## Variable Netlify obligatoire

Configurer exactement `MORJANE_ACTE1_PASSWORD` dans **Project configuration → Environment variables**. Ne jamais enregistrer sa valeur dans le dépôt, les logs ou `netlify.toml`.

Utiliser une valeur d’au moins 16 caractères, distincte de `MORJANE_SET_PASSWORD`. Un changement de valeur invalide les sessions existantes.

## Fonctionnement

- `/acte1-access` affiche le formulaire non indexable.
- `POST /api/acte1-auth` vérifie le mot de passe côté serveur.
- Le cookie HttpOnly `morjane_acte1_session` est signé, `Secure`, `SameSite=Strict` et valable 4 heures.
- L’Edge Function protège `/acte1`, `/acte1.html`, `/fissure`, `/acte1.css` et l’image propre à cette présentation.
- Sans mot de passe serveur valide, les pages renvoient 503 et les ressources privées 404.
- Le rate limit commun limite les tentatives sur l’endpoint d’authentification.

## Tests

Exécuter `npm run check:acte1-auth`. Un test de bout en bout du routage Edge requiert Netlify Dev ou un contexte Netlify ; aucun déploiement n’est effectué ici.

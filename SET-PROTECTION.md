# Protection de `/set`

## Variable Netlify obligatoire

Configurer exactement `MORJANE_SET_PASSWORD` dans **Project configuration → Environment variables**. Ne jamais ajouter sa valeur à un fichier versionné, `netlify.toml`, un exemple d’environnement ou les logs.

Le mot de passe doit contenir au moins 16 caractères. Il vérifie l’accès et signe le cookie ; le changer invalide toutes les sessions existantes.

## Fonctionnement

- `/set-access` affiche le formulaire public et non indexable.
- `POST /api/set-auth` vérifie le mot de passe côté serveur.
- Le cookie HttpOnly `morjane_set_session` est signé, `Secure`, `SameSite=Strict` et valable 4 heures.
- L’Edge Function protège `/set`, `/set.html`, `set.css`, `set.js`, les images propres au set, la fiche technique et `/assets/set-private/*`.
- `Cosmos.mp3`, `En_bas.mp3` et `Verite_coupee.mp3` vivent uniquement dans `/assets/set-private/` ; leurs anciennes URL `/assets/*.mp3` n’existent plus.
- `POST /api/set-logout` supprime le cookie.
- Sans variable valide, la connexion annonce une configuration incomplète et `/set` renvoie 503.

## Tests locaux

`npm run check:set-auth` puis `npm run check:seo`.

Le routage Edge, `Netlify.env`, le cookie `Secure` et les Functions exigent un contexte Netlify pour un test de bout en bout. Aucun déploiement n’est effectué ici.

## Limites

- Le mot de passe est partagé et peut être retransmis ; il n’y a pas de révocation individuelle.
- Les tentatives sont limitées par l’Edge Function Netlify commune aux endpoints sensibles (12 requêtes par minute et par domaine/IP). L’application de cette règle se vérifie en environnement Netlify.
- Les MP3 ne sont plus utilisés par `/acte1` et sont réservés au set.
- L’EPK PDF reste public, car il complète la page publique `/epk`.

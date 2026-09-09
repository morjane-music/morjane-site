# Atelier — procédure interne confidentialité

Ce document est interne. Il décrit les opérations à appliquer avec la migration
`supabase/atelier-privacy-hardening.sql`.

## Principes retenus

- Atelier réservé aux personnes de 18 ans et plus, sans collecte de date de naissance.
- Segments conservés : `public`, `proche`, `artiste`, `pro`.
- Provenance conservée seulement pour comprendre la porte/vague d’entrée utile.
- Compteur public limité au nombre agrégé de membres.
- Notes admin limitées au suivi utile, non lisibles par le membre, effacées avec le profil ou après 12 mois sans action administrative.
- Aucun historique nominatif permanent de présence ou d’écoute.
- Une seule date `last_activity_at` par profil est maintenue afin d’appliquer réellement la revue à 24 mois après purge des événements détaillés.

## Purges techniques

La fonction planifiée `atelier-privacy-maintenance.mts` appelle chaque heure
`atelier_apply_privacy_retention()`.

| Donnée | Règle appliquée |
| --- | --- |
| Écoutes individuelles | 90 jours maximum, puis agrégat quotidien sans `user_id` |
| Présence | suppression après 5 minutes sans heartbeat |
| Magic-link events | suppression après 3 mois |
| Journaux techniques ordinaires (`atelier_function_events`) | suppression après 3 mois |
| Audits administratifs ou de sécurité nécessaires | suppression après 12 mois maximum |
| Messages, votes, likes | suppression après 24 mois |
| Identité liée aux invitations | effacement après 3 mois |
| Secrets de claim expirés | effacement dès expiration |
| Notes admin | effacement après 12 mois sans usage administratif |

La vue serveur `atelier_inactive_account_review` constitue la file de revue :

- demandes bloquées/en attente/non finalisées âgées de plus de 3 mois ;
- comptes non administrateurs inactifs depuis plus de 24 mois.

La suppression Auth n’est pas automatique car elle est irréversible.

## Demande d’effacement V1

1. Recevoir la demande à `morjane.muzik@gmail.com`.
2. Vérifier que le demandeur contrôle l’adresse du compte, sans collecter plus de justificatifs que nécessaire.
3. Relever l’UUID et l’email exacts depuis Supabase Auth.
4. Avec un client `service_role`, appeler `atelier_scrub_account_references(UUID, EMAIL)`.
5. Contrôler le résultat JSON : magic links, function events, audits et invitations.
6. Supprimer ensuite l’utilisateur dans Supabase Auth. Les clés étrangères en cascade suppriment profil, messages, votes, likes, écoutes et présence.
7. Vérifier qu’aucune recherche exacte de l’email ne retourne de ligne dans les quatre tables résiduelles.
8. Répondre au demandeur sans recopier ses anciennes données dans un journal.

Ne jamais exécuter l’étape 4 ou 6 sans avoir vérifié ensemble l’UUID et l’email.

## Contrôles de production restant humains

- Relever la région du projet dans les paramètres du projet Supabase.
- Relever la région d’exécution des Functions dans la configuration du site Netlify.
- Vérifier dans Netlify si `ATELIER_ADMIN_DIGEST_WEBHOOK_URL` existe. Si oui, identifier le domaine destinataire avant de le documenter.
- Appliquer la migration SQL puis vérifier les résultats de la fonction planifiée dans les logs Netlify.

## Déconnexion

`POST /api/atelier-logout` expire `atelier_admin_gate` et l’ancien
`atelier_gate`. Le client exécute ensuite `supabase.auth.signOut()` et retire
les préférences et états propres à l’appareil.

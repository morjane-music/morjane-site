# Guide Admin Atelier

Ce guide sert de pense-bete pour gerer l'Atelier sans se perdre dans Supabase.

## Ajouter un morceau

1. Uploade le fichier audio dans le bucket Supabase `atelier-audio`.
2. Range-le dans le bon dossier : `Acte I`, `Acte II`, `Acte 0` ou `Hors acte`.
3. Dans l'Atelier, ouvre `Admin > Morceaux`.
4. Choisis le fichier dans `Choisir un fichier audio`.
5. Verifie le titre, l'acte et l'ordre.
6. Ajoute le morceau.

Par defaut, un nouveau morceau est cree en `Prepare mais cache`. Il n'apparait pas au cercle tant que tu ne le passes pas en `Visible au cercle`.

## Ouvrir un morceau au cercle

Dans la carte du morceau :

1. Verifie la checklist :
   - titre
   - audio
   - acte
   - question
   - visibilite
2. Clique `Tester audio`.
3. Choisis qui peut voir le morceau.
4. Passe `Etat public` a `Visible au cercle`.
5. Clique `Enregistrer`.

Si l'audio est casse, le morceau reste visible en admin, mais il est filtre cote membre.

## Choisir qui voit quoi

Les droits se reglent dans chaque morceau :

- `Visible pour profils` : public, proche, artiste, pro.
- `Visible pour acces` : membres, prioritaires, fondateurs.
- Aucune case cochee = visible pour tous les membres valides.

`Acte 0` et `Hors acte` restent reserves aux proches, prioritaires et fondateurs.

## Inviter quelqu'un

1. Ouvre `Admin > Demandes`.
2. Renseigne l'email.
3. Choisis le profil d'ecoute.
4. Choisis l'acces : membre ou prioritaire.
5. Clique `Inviter`.

Le mail est envoye via Resend. Pour economiser le quota, evite de renvoyer plusieurs fois le meme acces.

## Traiter les demandes

Dans `Admin > Demandes` :

- `Valider + envoyer` : valide la personne et lui envoie le mail.
- `Valider` : ouvre l'acces sans envoyer de mail.
- `Envoyer acces` : renvoie seulement le mail.
- `Prioritaire` : donne acces aux espaces reserves.
- `Refuser`, `Archiver`, `Retirer` : actions sensibles.

## Lire les retours

Dans `Admin > Messages` :

1. Filtre par morceau ou par personne.
2. Marque les messages traites.
3. Ajoute une note interne si besoin.
4. Reponds seulement quand cela apporte quelque chose.

Dans `Admin > Decisions`, utilise les signaux pour voir ce qui revient par morceau.

## Si un audio ne marche pas

1. Va dans `Admin > Systeme`.
2. Regarde `Audios a corriger`.
3. Va dans `Admin > Morceaux`.
4. Verifie le chemin avec le selecteur de fichier Storage.
5. Clique `Tester audio`.
6. Enregistre.

## Routine conseillee

Avant d'ouvrir l'Atelier a quelqu'un :

1. `Systeme` : verifier qu'il n'y a pas d'audio casse.
2. `Morceaux` : verifier la preview par profil.
3. `Demandes` : inviter ou valider.
4. `Messages` : lire seulement les retours utiles, sans tout transformer en urgence.

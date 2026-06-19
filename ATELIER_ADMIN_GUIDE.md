# Guide Admin Atelier

Ce guide sert de pense-bete pour gerer l'Atelier sans se perdre dans Supabase.

## Les statuts d'acces

- `pending` : la personne a demande l'acces, mais ne voit pas les chansons.
- `member` : acces normal aux morceaux ouverts pour son profil.
- `priority` : acces prioritaire, notamment aux espaces reserves comme Acte 0 / Hors acte.
- `founder` : acces fondateur, pour Morjane/admin.
- `blocked` : acces bloque.
- `archived` : ancien contact garde en archive.

## Les profils d'ecoute

- `public` : auditeur classique, retour instinctif.
- `proche` : proche / personne intime du cercle.
- `artiste` : regard de creation, matiere, choix artistiques.
- `pro` : regard professionnel, solidite, positionnement, booking/presse.

Le contenu principal reste le meme, mais les textes et les droits peuvent changer selon le profil.

## Les portes d'entree

Dans l'admin, ouvre `Liens et QR`.

Chaque porte cree une demande qualifiee, mais aucune porte ne donne acces directement aux chansons.

- `Atelier direct` : lien neutre pour tester ou envoyer l'entree simple.
- `Morjane telephone` : lien pour ouvrir ta session fondateur sur ton telephone.
- `Porte home` : entree cachee du site public.
- `Porte footer` : entree discrete et claire.
- `QR telephone` : entree physique, fond d'ecran, affiche, rencontre.
- `QR pro` : qualifie automatiquement la demande en profil pro.
- `QR concert` : garde le lien apres une rencontre ou une date.
- `Lien Instagram` : transforme une curiosite reseau en demande suivable.

## Parcours d'une personne invitee ou arrivee par QR

1. Elle ouvre une porte Atelier.
2. Elle entre son email.
3. Elle recoit un lien et un code.
4. Si le lien s'ouvre dans Gmail/Mail, elle revient dans Chrome/Safari et entre le code.
5. Elle est connectee, mais reste en attente tant que tu ne valides pas.
6. Apres validation, elle voit seulement les morceaux autorises pour son statut/profil.

## Inviter quelqu'un

1. Ouvre `Admin > Demandes`.
2. Renseigne l'email.
3. Choisis le profil d'ecoute.
4. Choisis l'acces : membre ou prioritaire.
5. Clique `Inviter par email` ou `Creer + copier lien`.

Le mail est envoye via Resend. Pour economiser le quota, evite de renvoyer plusieurs fois le meme acces.

## Traiter les demandes

Dans `Admin > Demandes` :

- `Valider + envoyer` : valide la personne et lui envoie le mail.
- `Valider` : ouvre l'acces sans envoyer de mail.
- `Envoyer acces` : renvoie seulement le mail.
- `Prioritaire` : donne acces aux espaces reserves.
- `Refuser`, `Archiver`, `Retirer` : actions sensibles.

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

1. Verifie la checklist : titre, audio, acte, question, visibilite.
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

## Securite a retenir

- Les QR et liens ne donnent jamais acces directement aux chansons.
- Le code email ouvre une session, mais ne valide pas la personne.
- Les audios passent par une URL signee cote serveur.
- Les compteurs ecoutes/coeurs passent par une Netlify Function securisee.
- Les messages passent par une Netlify Function avec limite et anti-spam.

## Routine conseillee avant d'ouvrir a quelqu'un

1. `Systeme` : verifier qu'il n'y a pas d'audio casse.
2. `Morceaux` : verifier la preview par profil.
3. `Liens et QR` : choisir la bonne porte.
4. `Demandes` : inviter ou valider.
5. Sur telephone : tester email + code dans Chrome/Safari.
6. `Messages` : lire seulement les retours utiles, sans tout transformer en urgence.
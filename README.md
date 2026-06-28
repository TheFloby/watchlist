# Watchlist TFCU 🛸

Site perso pour Thomas et Flo : propositions, validations croisées, suivi des saisons, et tout l'historique (vu / en cours / abandonné).

## Nouveautés de cette mise à jour

- **3 critères de notation** au lieu d'une seule note : Ressenti général (compte double), Scénario, Personnages. La moyenne affichée partout = `(ressenti×2 + scénario + personnages) / 4`.
- **Page de notation dédiée** : noter ou modifier sa note se fait maintenant sur une vraie page séparée (accessible depuis le menu "Notes" ou depuis la fiche détaillée), plus dans une fenêtre superposée.
- **Fiche détaillée en lecture seule pour la notation** : elle affiche ta note (si tu en as déjà mis une) avec un lien "Envie de modifier ? Clique ici", ou "Pas encore noté, clique ici" sinon — les deux renvoient vers la page de notation.
- **Page "Notes" simplifiée** : plus aucune action de gestion (Revoir, Abandonner, supprimer...) sur les cartes de ce menu — juste un bouton "Noter", pour rester focus sur la notation.
- **Détection élargie des nouvelles saisons** : en plus de la vérification automatique quotidienne, si une série "Terminé" a une saison de retard par rapport au total connu (ex: vue jusqu'à la saison 3 alors qu'il y en a 4), le badge "Nouvelle saison" + le bouton apparaissent aussi — utile pour tout l'historique rentré d'un coup, sans attendre le passage du cron.

Une nouvelle migration SQL est nécessaire (passage d'une note unique à 3 critères dans `ratings`). Pas de nouveau réglage Vercel.

## 1. Mettre à jour la base de données (Supabase)

1. Dans Supabase → **SQL Editor** → **New query**.
2. Copie-colle le contenu de `sql/migration_5.sql`, clique **Run**.

## 2. Mettre à jour le code (GitHub)

```powershell
cd C:\Users\flori\OneDrive\Projets\watchlist
git add .
git commit -m "3 criteres de notation et page dediee"
git push
```

Vercel redéploiera automatiquement, en reprenant les variables d'environnement déjà configurées — rien à reconfigurer.

## Comment ça fonctionne

**Le workflow complet :**

```
Propositions ──valide──→ À voir ──"On commence"──→ En cours ──Terminé──→ Terminé
     │                                                  │
   refuse                                          Abandonner
     │                                                  │
     ▼                                                  ▼
 Refusées                                        Jamais fini
                                                        │
                                                   "Reprendre"
                                                        │
                                                        ▼
                                                    En cours
```

- **Proposer un titre** : bouton "+ Proposer un titre" dans la sidebar. Le titre part dans l'onglet **Propositions**.
- **Ajouter directement** (Flo uniquement) : bouton "+ Ajouter directement" sous le précédent. Permet de choisir le statut final (À voir / En cours / Terminé) sans passer par une validation.
- **Valider/Refuser** : dans l'onglet Propositions, seule la personne qui n'a **pas** proposé le titre voit les boutons Valider/Refuser.
- **Saisons** : pour les séries et séries animées, le nombre de saisons est récupéré automatiquement via TMDB.
- **Abandonner** : depuis En cours, part dans **Jamais fini** en gardant la saison où vous étiez. "Reprendre" la renvoie en cours.
- **Revoir** : depuis Terminé, repart en cours à la saison 1 (rewatch complet).
- **Nouvelle saison automatique** : chaque jour, le site vérifie vos séries Terminées sur TMDB.
  - Si une nouvelle saison est déjà **sortie**, un badge vert "Nouvelle saison" apparaît et un bouton "Voir la nouvelle saison" envoie la série dans À voir, à la bonne saison.
  - Si une prochaine saison est **annoncée mais pas encore diffusée**, un badge neutre "Saison X le JJ/MM" s'affiche à titre informatif (pas de bouton, rien à faire pour l'instant). Il se transforme automatiquement en badge vert le jour où la saison sort vraiment.
  - Ça ne s'applique pas aux séries dans Jamais fini — celles-là restent gérées à la main.
- **Films** : pas de gestion de saisons, juste À voir → En cours → Terminé.
- **Mangas** : pas de saisons par défaut, sauf si le manga a été trouvé via la recherche TMDB (son adaptation animée) — dans ce cas il a aussi un menu de saisons et profite de la détection automatique, comme une vraie série.
- **Confirmation** : chaque bouton d'action affiche une popup "Es-tu sûr ?" avant d'appliquer le changement.
- **Recherche** : un champ de recherche par nom est disponible sur tous les onglets, filtre en temps réel.
- **Notes** : menu dédié dans la sidebar, séparé des 6 onglets de statut. Contient tous les titres déjà passés par "En cours" au moins une fois. "À noter" (pas encore noté par toi) et "Déjà noté" (modifiable à tout moment) — c'est individuel à chaque compte. Les cartes y sont en lecture pure : pas de gestion de statut, juste un bouton "Noter".
- **Fiche détaillée** : clique sur l'affiche ou le titre d'une carte, dans n'importe quel onglet, pour ouvrir la fiche avec les infos TMDB et les avis de chacun. Ta propre note s'y affiche en lecture seule, avec un lien pour aller la modifier sur la page dédiée.
- **Notation à 3 critères** : Ressenti général, Scénario, Personnages, chacun sur 10 avec demi-étoiles, plus un commentaire global. Le ressenti général compte double dans la moyenne affichée partout ailleurs.

## Pour faire des modifications plus tard

Reviens avec ce code et explique ce que tu veux changer — je modifierai les fichiers et tu n'auras qu'à refaire `git add . && git commit -m "..." && git push`.

## Structure du projet

```
series-tracker/
├── api/
│   └── check-new-seasons.js  → fonction exécutée chaque jour par le cron job
├── vercel.json                → configure l'horaire du cron job
├── sql/
│   ├── setup.sql              → création complète (base vide)
│   ├── migration.sql          → mise à jour n°1 (workflow, saisons)
│   ├── migration_2.sql        → mise à jour n°2 (détection nouvelle saison)
│   ├── migration_3.sql        → mise à jour n°3 (date de saison annoncée)
│   ├── migration_4.sql        → mise à jour n°4 (notes et avis, version 1 note)
│   └── migration_5.sql        → mise à jour n°5 (3 critères de notation)
├── public/
│   ├── logo.png               → logo TFCU complet (header, écran de connexion, favicon)
│   ├── pwa-192.png, pwa-512.png → icônes d'installation app
│   ├── manifest.json          → config PWA
│   └── avatars/
│       ├── thomas.png
│       └── flo.png
├── src/
│   ├── accounts.js            → les 2 comptes (pseudo + avatar + conversion email)
│   ├── supabaseClient.js      → connexion à la base de données (clé publique)
│   ├── config.js              → ta clé API TMDB (côté site)
│   ├── tmdb.js                → recherche + détails enrichis (synopsis, casting...)
│   ├── seasonUtils.js         → calculs partagés : saisons en retard, moyenne pondérée
│   ├── App.jsx                → page principale (sidebar + onglets + menu Notes)
│   ├── App.css                → tous les styles visuels
│   ├── index.css              → styles globaux, palette de couleurs
│   ├── main.jsx                → point d'entrée
│   └── components/
│       ├── Auth.jsx           → écran de connexion (sélection avatar + mot de passe)
│       ├── AddTitleForm.jsx   → formulaire de proposition (avec recherche TMDB)
│       ├── TitleCard.jsx      → carte d'un titre, avec ses actions selon le statut
│       ├── TitleModal.jsx     → fiche détaillée (infos TMDB + note en lecture seule)
│       └── RatingPage.jsx     → page dédiée pour noter (3 critères + commentaire)
├── index.html
├── package.json
└── vite.config.js
```

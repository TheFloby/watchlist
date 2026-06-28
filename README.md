# Watchlist TFCU 🛸

Site perso pour Thomas et Flo : propositions, validations croisées, suivi des saisons, et tout l'historique (vu / en cours / abandonné).

## Nouveautés de cette mise à jour

- **Fix du tri** : les tris par date, note TMDB et notre note ne fonctionnaient quasiment pas pour les anciens titres (pas encore de `release_year`/`tmdb_vote_average` enregistrés). Le cron quotidien va maintenant rattraper automatiquement ces infos pour tous les titres existants, en plus de sa vérification habituelle des saisons.
- **Tri inversible** : un bouton (flèche ↓/↑) apparaît à côté du menu de tri pour les options qui ont un sens logique (alphabétique, date, notes) — clique pour inverser l'ordre.
- **Priorité "nouvelle saison" retirée des autres tris** : elle ne s'applique plus que sur le tri "par défaut" dans Terminé. Les autres tris (alphabétique, date, etc.) suivent maintenant exactement l'ordre demandé, sans exception.
- Les titres sans valeur pour le tri choisi (pas d'année, pas de note) restent toujours en bas, quel que soit le sens du tri.

Aucune nouvelle migration SQL pour cette mise à jour (les colonnes existent déjà depuis `migration_6.sql`). Pas de nouveau réglage Vercel.

## 1. Mettre à jour le code (GitHub)

```powershell
cd C:\Users\flori\OneDrive\Projets\watchlist
git add .
git commit -m "Fix tri date note et priorite nouvelle saison"
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
- **Tri** : menu déroulant à côté du filtre de type — par défaut (ordre d'ajout), alphabétique, date de sortie, type, note TMDB, ou votre note moyenne. S'applique à tous les onglets. Pour les tris alphabétique, date et notes, un bouton ↓/↑ à côté permet d'inverser l'ordre. Dans Terminé, les séries avec une nouvelle saison restent en haut uniquement pour le tri "par défaut" — les autres tris suivent l'ordre demandé sans exception. Les titres sans valeur connue pour le critère choisi (pas d'année, pas de note) restent toujours en bas. Le cron quotidien complète automatiquement la note TMDB et l'année de sortie pour les titres qui n'en ont pas encore.

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
│   ├── migration_5.sql        → mise à jour n°5 (3 critères de notation)
│   └── migration_6.sql        → mise à jour n°6 (colonnes de tri)
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

# Watchlist TFCU 🛸

Site perso pour Thomas et Flo : propositions, validations croisées, suivi des saisons, et tout l'historique (vu / en cours / abandonné).

## Nouveautés de cette mise à jour

- **Distinction saison sortie / saison annoncée** : si TMDB connaît la date de sortie d'une prochaine saison mais qu'elle n'est pas encore diffusée, un badge informatif "Saison X le JJ/MM" apparaît (sans bouton d'action). Dès que la date est passée, ça redevient le badge "Nouvelle saison" classique avec son bouton.
- Plusieurs petits correctifs : recherche par nom sur tous les onglets, tri automatique des nouvelles saisons en haut de "Terminé", fix du zoom automatique sur iPhone dans les champs de texte, et prise en charge des mangas dont l'adaptation animée a des saisons (ex: Ao Ashi).

Une nouvelle migration SQL est nécessaire pour cette mise à jour (ajout de 2 colonnes). Pas de nouveau réglage Vercel cette fois — tout ce qui était déjà configuré (variables d'environnement, cron) reste valable.

## 1. Mettre à jour la base de données (Supabase)

1. Dans Supabase → **SQL Editor** → **New query**.
2. Copie-colle le contenu de `sql/migration_3.sql`, clique **Run**.

## 2. Mettre à jour le code (GitHub)

```powershell
cd C:\Users\flori\OneDrive\Projets\watchlist
git add .
git commit -m "Date de sortie des prochaines saisons annoncees"
git push
```

Vercel redéploiera automatiquement, en reprenant les variables d'environnement déjà configurées (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TMDB_API_KEY`, `CRON_SECRET`) — rien à reconfigurer.

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
│   └── migration_3.sql        → mise à jour n°3 (date de saison annoncée)
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
│   ├── tmdb.js                → recherche + récupération du nombre de saisons
│   ├── App.jsx                → page principale (sidebar + 6 onglets)
│   ├── App.css                → tous les styles visuels
│   ├── index.css              → styles globaux, palette de couleurs
│   ├── main.jsx                → point d'entrée
│   └── components/
│       ├── Auth.jsx           → écran de connexion (sélection avatar + mot de passe)
│       ├── AddTitleForm.jsx   → formulaire de proposition (avec recherche TMDB)
│       └── TitleCard.jsx      → carte d'un titre, avec ses actions selon le statut
├── index.html
├── package.json
└── vite.config.js
```

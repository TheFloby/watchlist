# Watchlist TFCU 🛸

Site perso pour Thomas et Flo : propositions, validations croisées, suivi des saisons, et tout l'historique (vu / en cours / abandonné).

## Nouveautés de cette mise à jour

- Renommage de l'onglet **"Déjà vu"** en **"Terminé"**
- **Vérification automatique quotidienne** : chaque jour, le site vérifie tout seul sur TMDB si une nouvelle saison est sortie pour vos séries Terminées
- **Badge "Nouvelle saison"** sur la carte concernée + bouton **"Voir la nouvelle saison"** qui la renvoie dans À voir, prête à être commencée à la bonne saison
- Favicon : retour au logo complet (comme avant)

Cette mise à jour est plus technique que les précédentes : en plus du code, il faut configurer 4 réglages côté Vercel et lancer une migration SQL. Suis les étapes dans l'ordre, c'est expliqué en détail.

## 1. Mettre à jour la base de données (Supabase)

1. Dans Supabase → **SQL Editor** → **New query**.
2. Copie-colle le contenu de `sql/migration_2.sql`, clique **Run**.

## 2. Récupérer 2 informations dans Supabase

On va avoir besoin de la clé "service_role" de Supabase (différente de celle déjà utilisée sur le site — c'est une clé d'administration, plus puissante, qui ne doit **jamais** apparaître dans le code, seulement dans la configuration de Vercel).

1. Dans Supabase → **Settings** (engrenage en bas à gauche) → **API Keys** (ou **API**).
2. Note ces deux valeurs :
   - **Project URL** (ressemble à `https://zkkfomckqijuoaerudoy.supabase.co`)
   - La clé **`service_role`** (parfois listée sous "secret" — **pas** la clé `anon`/`publishable` déjà utilisée ailleurs)

⚠️ Cette clé `service_role` est sensible : ne la mets jamais dans un fichier du projet, ne la partage à personne d'autre que toi. On va la mettre uniquement dans les réglages Vercel à l'étape suivante.

## 3. Configurer les variables d'environnement sur Vercel

1. Va sur [vercel.com](https://vercel.com), ouvre ton projet `watchlist`.
2. Clique sur **Settings** (en haut) → **Environment Variables** (menu de gauche).
3. Ajoute ces 3 variables une par une (nom exact à gauche, valeur à droite, puis **Save**) :

| Nom de la variable | Valeur |
|---|---|
| `SUPABASE_URL` | L'URL de ton projet Supabase (récupérée à l'étape 2) |
| `SUPABASE_SERVICE_ROLE_KEY` | La clé `service_role` (récupérée à l'étape 2) |
| `TMDB_API_KEY` | `87328bd4da01ef3ef5657578af186848` (la même clé déjà utilisée sur le site) |

(`CRON_SECRET` n'est pas à ajouter : Vercel la crée lui-même automatiquement dès qu'il détecte un cron job dans le projet.)

4. Une fois les 3 variables ajoutées, va dans l'onglet **Deployments**, clique sur les 3 petits points du dernier déploiement → **Redeploy**, pour que ces nouveaux réglages soient bien pris en compte.

## 4. Mettre à jour le code (GitHub)

```powershell
cd C:\Users\flori\Downloads\watchlist
git add .
git commit -m "Detection automatique des nouvelles saisons"
git push
```

Vercel redéploiera automatiquement. Comme il y a maintenant un fichier `vercel.json`, Vercel va aussi enregistrer le cron job automatiquement à ce moment-là — rien d'autre à faire de ton côté.

## 5. Vérifier que ça fonctionne

Le cron job se déclenche une fois par jour à 6h du matin (heure de Paris l'été, 7h l'hiver). Tu n'as pas besoin d'attendre le lendemain pour vérifier que c'est bien configuré :

1. Sur Vercel, va dans l'onglet **Cron Jobs** de ton projet (dans le menu du haut).
2. Tu devrais voir `/api/check-new-seasons` listé avec sa prochaine exécution prévue.
3. Tu peux cliquer sur **Run** (ou l'équivalent affiché) pour le déclencher manuellement tout de suite, et voir le résultat.

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
- **Nouvelle saison automatique** : chaque jour, le site vérifie vos séries Terminées sur TMDB. Si une nouvelle saison est sortie, un badge apparaît et un bouton "Voir la nouvelle saison" envoie la série dans À voir, à la bonne saison (celle juste après la dernière vue). Ça ne s'applique pas aux séries dans Jamais fini — celles-là restent gérées à la main.
- **Films et mangas** : pas de gestion de saisons, juste À voir → En cours → Terminé.
- **Confirmation** : chaque bouton d'action affiche une popup "Es-tu sûr ?" avant d'appliquer le changement.

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
│   └── migration_2.sql        → mise à jour n°2 (détection nouvelle saison)
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

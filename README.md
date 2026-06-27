# Watchlist TFCU 🛸

Site perso pour Thomas et Flo : propositions, validations croisées, suivi des saisons, et tout l'historique (vu / en cours / abandonné).

## Nouveauté de cette version

Cette mise à jour change pas mal de choses par rapport à la première version : nouveau workflow (Propositions → Refusées / À voir → En cours → Déjà vu / Jamais fini), suivi des saisons, sidebar avec connexion par avatar, nouvelle direction artistique, mobile + installation en app.

**Si tu avais déjà la première version en ligne avec des données (ex: Game of Thrones)**, il faut migrer ta base — voir étape 1 ci-dessous avant de remplacer le code.

## 1. Mettre à jour la base de données (Supabase)

### Si tu as déjà des titres enregistrés (cas probable)

1. Dans Supabase → **SQL Editor** → **New query**.
2. Copie-colle le contenu de `sql/migration.sql`, clique **Run**. Ça ajoute les nouvelles colonnes sans rien supprimer.
3. Le titre que vous aviez déjà (Game of Thrones) sera toujours là, mais avec l'ancien statut "vu" — il apparaîtra donc directement dans l'onglet **Déjà vu**, ce qui correspond à ce qu'il était.

### Si tu repars de zéro

1. Dans Supabase → **SQL Editor** → **New query**.
2. Copie-colle le contenu de `sql/setup.sql`, clique **Run**.

## 2. Le logo et les avatars

Déjà tout inclus dans `public/` — logo TFCU, avatars individuels de Thomas et Flo (découpés depuis votre logo), et icônes pour l'installation en app. Rien à faire.

## 3. La recherche automatique (TMDB)

La clé API est déjà intégrée dans `src/config.js`. Nouveauté : elle récupère maintenant aussi le nombre de saisons des séries automatiquement.

## 4. Créer les comptes (si pas déjà fait)

Toujours pas d'inscription publique. Si tu as déjà créé les comptes Thomas et Flo dans Supabase lors de la dernière mise à jour, **tu n'as rien à refaire**.

Sinon : Supabase → **Authentication** → **Users** → **Add user** → **Create new user** :
- Thomas : email `thomas@watchlist.local`, mot de passe de ton choix, coche **Auto Confirm User**
- Flo : email `flo@watchlist.local`, mot de passe de ton choix, coche **Auto Confirm User**

Sur le site, on ne tape plus de pseudo : on clique sur son avatar, puis on tape son mot de passe.

## 5. Mettre à jour le code (GitHub)

Comme c'est une grosse mise à jour, le plus simple est de **remplacer tout le contenu de ton dossier local** par celui de ce zip (sauf si tu as fait des modifs perso entre-temps), puis :

```powershell
cd C:\Users\flori\Downloads\watchlist
git add .
git commit -m "Refonte : workflow complet, saisons, sidebar, avatars, PWA"
git push
```

Vercel redéploiera automatiquement en ~1 minute.

## 6. Installer le site comme une app (PWA)

Une fois le site déployé et ouvert sur ton téléphone :

**Sur iPhone (Safari)** : bouton de partage (carré avec flèche vers le haut) → **Sur l'écran d'accueil** → Ajouter.

**Sur Android (Chrome)** : menu (⋮) en haut à droite → **Ajouter à l'écran d'accueil** (ou une bannière d'installation peut apparaître automatiquement).

L'icône TFCU apparaît alors comme une vraie app, qui s'ouvre en plein écran.

## 7. Comment ça fonctionne maintenant

**Le workflow complet :**

```
Propositions ──valide──→ À voir ──"On commence"──→ En cours ──Terminé──→ Déjà vu
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
- **Valider/Refuser** : dans l'onglet Propositions, seule la personne qui n'a **pas** proposé le titre voit les boutons Valider/Refuser (pour éviter de valider sa propre proposition).
- **Saisons** : pour les séries et séries animées, le nombre de saisons est récupéré automatiquement via TMDB. Une fois en cours, un menu déroulant permet d'indiquer où vous en êtes.
- **Abandonner** : depuis En cours, si vous arrêtez une série en cours de route, elle part dans **Jamais fini** en gardant en mémoire la saison où vous étiez. Le bouton "Reprendre" la renvoie en cours, à la bonne saison.
- **Films et mangas** : pas de gestion de saisons, juste À voir → En cours → Terminé.

## Pour faire des modifications plus tard

Reviens avec ce code et explique ce que tu veux changer — je modifierai les fichiers et tu n'auras qu'à refaire `git add . && git commit -m "..." && git push`.

## Structure du projet

```
series-tracker/
├── sql/
│   ├── setup.sql          → création complète (base vide)
│   └── migration.sql      → mise à jour d'une base existante
├── public/
│   ├── logo.png           → logo TFCU (header, favicon)
│   ├── pwa-192.png, pwa-512.png → icônes d'installation app
│   ├── manifest.json      → config PWA
│   └── avatars/
│       ├── thomas.png
│       └── flo.png
├── src/
│   ├── accounts.js        → les 2 comptes (pseudo + avatar + conversion email)
│   ├── supabaseClient.js  → connexion à la base de données
│   ├── config.js          → ta clé API TMDB
│   ├── tmdb.js            → recherche + récupération du nombre de saisons
│   ├── App.jsx            → page principale (sidebar + 6 onglets)
│   ├── App.css            → tous les styles visuels
│   ├── index.css          → styles globaux, palette de couleurs
│   ├── main.jsx           → point d'entrée
│   └── components/
│       ├── Auth.jsx          → écran de connexion (sélection avatar + mot de passe)
│       ├── AddTitleForm.jsx  → formulaire de proposition (avec recherche TMDB)
│       └── TitleCard.jsx     → carte d'un titre, avec ses actions selon le statut
├── index.html
├── package.json
└── vite.config.js
```

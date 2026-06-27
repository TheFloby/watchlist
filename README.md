# Watchlist 🎬

Site perso pour toi et ton pote pour suivre les séries/films/mangas : ce que vous avez déjà vu, ce que vous proposez, et ce que vous regardez en ce moment.

## 1. Le logo

Le logo TFCU est déjà intégré dans `public/logo.png` — rien à faire, il s'affiche automatiquement dans le header et comme icône d'onglet du navigateur.

## 2. La recherche automatique (TMDB)

La clé API est déjà intégrée dans `src/config.js` — rien à faire, la recherche fonctionnera dès le déploiement.

Petite précision technique : cette clé est visible dans le code envoyé au navigateur (c'est inévitable pour ce type de clé "publique" côté client). Ça ne pose pas de problème pour un usage personnel comme le vôtre — au pire quelqu'un pourrait l'utiliser pour faire ses propres recherches de films sur TMDB, rien de grave. Si un jour ça devenait gênant, tu peux régénérer une nouvelle clé depuis ton compte TMDB.

## 3. Créer la base de données (Supabase)

1. Va dans ton projet Supabase → menu de gauche → **SQL Editor**.
2. Clique sur **New query**.
3. Ouvre le fichier `sql/setup.sql` de ce dossier, copie tout son contenu, colle-le dans l'éditeur.
4. Clique sur **Run**. Ça crée la table `titles` et les règles de sécurité.

## 4. Activer la confirmation par email (optionnel)

Par défaut, Supabase demande une confirmation par email à l'inscription. Pour un usage entre potes, tu peux désactiver ça pour simplifier :

1. Dans Supabase → **Authentication** → **Providers** → **Email**.
2. Désactive **Confirm email** si tu veux que l'inscription soit immédiate.

## 5. Mettre le code sur GitHub

1. Crée un nouveau repository sur [github.com/new](https://github.com/new) (par exemple nommé `watchlist`). Laisse-le vide (sans README).
2. Sur ton ordinateur, dans un terminal, place-toi dans ce dossier puis :

```bash
git init
git add .
git commit -m "Premier envoi"
git branch -M main
git remote add origin https://github.com/TON-PSEUDO/watchlist.git
git push -u origin main
```

(Remplace `TON-PSEUDO` par ton nom d'utilisateur GitHub — l'adresse exacte est affichée sur la page de ton nouveau repo vide.)

## 6. Déployer sur Vercel

1. Va sur [vercel.com](https://vercel.com), connecte-toi avec GitHub.
2. Clique **Add New** → **Project**.
3. Choisis ton repo `watchlist`.
4. Vercel détecte automatiquement que c'est un projet Vite. Laisse les réglages par défaut.
5. Clique **Deploy**.

Après 1 minute, tu as une URL du type `https://watchlist-xxxx.vercel.app` que tu peux partager avec ton pote.

## 7. Utilisation au quotidien

- Chacun crée son compte avec son email (bouton "S'inscrire" sur l'écran de connexion).
- Le bouton **+ Ajouter** permet d'ajouter un titre avec une image (tu peux chercher l'affiche sur Google Images, clic droit → "Copier l'adresse de l'image", et coller le lien).
- On peut changer le statut d'un titre directement depuis sa carte (À voir / En cours / Vu).
- La croix sur chaque carte permet de la supprimer.

## Pour faire des modifications plus tard

Tu peux toujours revenir me voir avec ce code et me dire ce que tu veux changer ou ajouter (une note sur 10, un système de votes, un onglet "favoris"...) — je modifierai les fichiers et tu n'auras qu'à refaire `git add . && git commit -m "..." && git push` pour mettre à jour le site en ligne automatiquement.

## Structure du projet

```
series-tracker/
├── sql/setup.sql          → script à lancer dans Supabase
├── public/
│   └── logo.png           → logo TFCU (déjà inclus)
├── src/
│   ├── supabaseClient.js  → connexion à la base de données
│   ├── config.js          → ta clé API TMDB
│   ├── tmdb.js            → recherche automatique de films/séries
│   ├── App.jsx            → page principale (les 3 onglets)
│   ├── App.css            → tous les styles visuels
│   ├── index.css          → styles globaux
│   ├── main.jsx           → point d'entrée
│   └── components/
│       ├── Auth.jsx          → écran de connexion / inscription
│       ├── AddTitleForm.jsx  → formulaire d'ajout (avec recherche TMDB)
│       └── TitleCard.jsx     → carte d'affichage d'un titre
├── index.html
├── package.json
└── vite.config.js
```

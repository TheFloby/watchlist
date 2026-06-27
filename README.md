# Watchlist TFCU 🛸

Site perso pour Thomas et Flo : propositions, validations croisées, suivi des saisons, et tout l'historique (vu / en cours / abandonné).

## Nouveautés de cette mise à jour

- Bouton **Revoir** sur les titres déjà vus (repart en cours, saison 1)
- Bouton **Ajouter directement** (visible seulement pour Flo) : ajoute un titre sans passer par Propositions, avec choix du statut final — utile pour rentrer tout l'historique sans avoir à faire des allers-retours de validation
- Logos agrandis dans la sidebar et sur l'écran de connexion
- Une popup de confirmation apparaît maintenant avant chaque changement de statut (Valider, Refuser, On commence, Terminé, Abandonner, Reprendre, Revoir)
- Favicon dédié, recadré pour rester lisible même en tout petit dans l'onglet du navigateur
- Correction d'un bug d'affichage sur iPhone : le menu passait sous la barre de statut (heure, batterie) en PWA installée — c'est corrigé

Aucune migration de base de données n'est nécessaire pour cette mise à jour (juste du code, pas de nouvelle colonne).

## 1. Mettre à jour le code (GitHub)

Comme c'est une grosse mise à jour, le plus simple est de **remplacer tout le contenu de ton dossier local** par celui de ce zip (sauf si tu as fait des modifs perso entre-temps), puis :

```powershell
cd C:\Users\flori\Downloads\watchlist
git add .
git commit -m "Refonte : workflow complet, saisons, sidebar, avatars, PWA"
git push
```

Vercel redéploiera automatiquement en ~1 minute.

## 2. Installer le site comme une app (PWA)

Une fois le site déployé et ouvert sur ton téléphone :

**Sur iPhone (Safari)** : bouton de partage (carré avec flèche vers le haut) → **Sur l'écran d'accueil** → Ajouter.

**Sur Android (Chrome)** : menu (⋮) en haut à droite → **Ajouter à l'écran d'accueil** (ou une bannière d'installation peut apparaître automatiquement).

L'icône TFCU apparaît alors comme une vraie app, qui s'ouvre en plein écran.

Si tu avais déjà installé l'app avant cette mise à jour, désinstalle-la et réinstalle-la pour récupérer la correction de la barre de statut.

## 3. Comment ça fonctionne maintenant

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
- **Ajouter directement** (Flo uniquement) : bouton "+ Ajouter directement" sous le précédent. Permet de choisir le statut final (À voir / En cours / Déjà vu) sans passer par une validation. Pratique pour rentrer tout votre historique de séries déjà vues sans avoir à les faire valider une par une.
- **Valider/Refuser** : dans l'onglet Propositions, seule la personne qui n'a **pas** proposé le titre voit les boutons Valider/Refuser (pour éviter de valider sa propre proposition).
- **Saisons** : pour les séries et séries animées, le nombre de saisons est récupéré automatiquement via TMDB. Une fois en cours, un menu déroulant permet d'indiquer où vous en êtes.
- **Abandonner** : depuis En cours, si vous arrêtez une série en cours de route, elle part dans **Jamais fini** en gardant en mémoire la saison où vous étiez. Le bouton "Reprendre" la renvoie en cours, à la bonne saison.
- **Revoir** : depuis Déjà vu, repart en cours à la saison 1 (pour un rewatch complet).
- **Films et mangas** : pas de gestion de saisons, juste À voir → En cours → Terminé.
- **Confirmation** : chaque bouton d'action affiche une popup "Es-tu sûr ?" avant d'appliquer le changement.

## Pour faire des modifications plus tard

Reviens avec ce code et explique ce que tu veux changer — je modifierai les fichiers et tu n'auras qu'à refaire `git add . && git commit -m "..." && git push`.

## Structure du projet

```
series-tracker/
├── sql/
│   ├── setup.sql          → création complète (base vide)
│   └── migration.sql      → mise à jour d'une base existante
├── public/
│   ├── logo.png           → logo TFCU complet (header, écran de connexion)
│   ├── favicon.png        → version recadrée du logo, pour l'icône d'onglet
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

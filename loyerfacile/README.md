# 🔑 LoyerFacile

Application web de **gestion locative** pour propriétaires : immeubles, unités (appartements, studios, magasins), locataires et suivi des loyers mois par mois.

## Fonctionnalités

- **Comptes propriétaires** : inscription et connexion sécurisées (mots de passe hachés avec bcrypt, jeton JWT valable 7 jours).
- **Tableau de bord** :
  - ce qui a été encaissé ce mois-ci et ce qui reste à percevoir ;
  - le taux d'occupation ;
  - un graphique des 6 derniers mois ;
  - les loyers en attente et les derniers paiements.
- **Biens** : création, modification et suppression, avec l'occupation de chaque bien.
- **Unités** : loyer mensuel, surface et état (disponible, occupée, en maintenance).
- **Locataires** :
  - quand on ajoute un locataire, son unité passe automatiquement à « occupée » ;
  - une « fin de bail » libère l'unité.
- **Paiements** :
  - la situation de chaque locataire pour le mois choisi : payé, reste à payer ou impayé ;
  - un encaissement en un clic, en Wave, Orange Money, MTN, Moov, espèces…
- **Espace locataire** :
  - le propriétaire **invite** son locataire avec un lien à usage unique, valable 7 jours, à envoyer par WhatsApp ou SMS ;
  - le locataire voit **ce qu'il doit, mois par mois** depuis son entrée (payé, partiel, impayé, en validation) ;
  - il **déclare un paiement** (Wave, Orange Money…) avec la référence de la transaction ;
  - le propriétaire **valide ou refuse** ce paiement depuis son tableau de bord ;
  - le locataire peut ensuite imprimer son **reçu** ou l'enregistrer en PDF.
- **Cautions et avances** :
  - à l'entrée, on saisit la caution (en mois de loyer) et l'avance ; l'avance règle automatiquement les premiers mois ;
  - à la sortie, on saisit les retenues (peinture, serrure, facture…) et on choisit de prendre ou non les impayés sur la caution ;
  - le **montant à rendre**, ou le reste dû, est calculé en direct ;
  - un **décompte de sortie** imprimable, avec signatures, est visible par le propriétaire et par le locataire.
- **WhatsApp, sans frais** : des boutons ouvrent WhatsApp avec un message déjà rédigé (lien `wa.me`, pas d'API payante) :
  - **Relancer** un locataire en retard, avec le montant et les mois concernés (tableau de bord, onglets Locataires et Paiements) ;
  - **Reçu** : envoyer la confirmation d'un paiement validé ;
  - côté locataire : **écrire au propriétaire**, et le **prévenir** juste après une déclaration de paiement.

  Le propriétaire renseigne son numéro dans **Mon profil**, en cliquant sur son nom dans la barre latérale.
- **Application installable (PWA)** :
  - bouton « Installer l'application » sur Android, Chrome et Edge ; sur iPhone : Partager → « Sur l'écran d'accueil » ;
  - l'application s'ouvre même sans connexion, avec un bandeau « Pas de connexion » ;
  - les données (`/api`) ne sont jamais gardées en cache sur le téléphone.
- **Sécurité** : chaque propriétaire ne voit et ne modifie **que ses propres données**. Chaque route vérifie le jeton et que le bien lui appartient.
- **Interface** : responsive (ordinateur et mobile), avec un mode clair et un mode sombre.

📊 Comparaison avec les solutions existantes en Côte d'Ivoire : [docs/etude-de-l-existant.md](docs/etude-de-l-existant.md)

## Technologies

| Partie | Outils |
|---|---|
| Frontend | React 19, Vite 8, CSS moderne (variables, grid, mode sombre) |
| Backend | Node.js, Express 5, JWT, bcryptjs |
| Base de données | MySQL (mysql2) |

🌐 Mise en ligne (Aiven + Vercel) : [docs/HEBERGEMENT.md](docs/HEBERGEMENT.md)

## Lancer le projet en local

**Prérequis** : Node.js 20 ou plus récent, et MySQL. Avec WAMP, démarre WAMP pour que MySQL tourne.

1. Crée la base de données (une seule fois) :
   ```bash
   cd backend
   npm install
   cp .env.example .env    # puis remplis le mot de passe MySQL et JWT_SECRET
   node reset_db.js        # ⚠️ supprime et recrée la base loyerfacile
   ```
   Si ta base existe déjà, n'utilise **pas** `reset_db.js`. Ajoute seulement les nouveautés, sans rien perdre :
   ```bash
   cd backend
   npm run migrate
   ```
2. À la **racine** du projet, démarre tout d'un coup, l'API (port 5000) et le site :
   ```bash
   npm install
   npm run dev
   ```
   Les lignes `[api]` viennent du backend, les lignes `[web]` de Vite. Ctrl+C arrête les deux.
   Si tu modifies un fichier du backend, arrête (Ctrl+C) puis relance `npm run dev`.
3. Ouvre http://localhost:5173 et crée un compte.

> **PWA** : le service worker (`public/sw.js`) n'est actif que dans la version de production (`npm run build`, puis `npm run preview`), jamais avec `npm run dev`, pour ne pas garder d'anciennes versions en cache pendant le développement. Après une modification de `sw.js`, change sa constante `VERSION`.

> « Le serveur (API) ne répond pas » (erreur 502) = l'API n'est pas démarrée : lance `npm run dev` à la racine, pas `vite` seul.
> « Erreur serveur » à l'inscription = MySQL n'est pas démarré : lance WAMP.

Le frontend appelle `/api/...`, et Vite redirige ces appels vers `http://localhost:5000` (voir `vite.config.js`).

## Structure

```
backend/
  server.js              # point d'entrée de l'API, branchement des routes
  db.js                  # connexion MySQL
  middleware/auth.js     # vérifie le jeton JWT
  middleware/immeuble.js # vérifie que le bien appartient au propriétaire
  routes/                # auth, proprietaire, immeubles, unites, locataires, paiements
  schema.sql             # structure de la base
src/
  api.js                 # client API (ajoute le jeton automatiquement)
  router.js              # navigation par URL (#/biens/3/paiements)
  context/               # connexion / déconnexion
  components/            # Layout, Icon, modale, champs, badges…
  pages/                 # Login, Register, Dashboard, Properties, PropertyDetail
  App.css                # tout le design
```

## API

Toutes les routes, sauf `/api/auth/*`, exigent l'en-tête `Authorization: Bearer <jeton>`.

| Méthode | Route | Rôle |
|---|---|---|
| POST | `/api/auth/inscription` · `/api/auth/connexion` | Créer un compte · se connecter |
| GET | `/api/proprietaire/resume` | Chiffres du tableau de bord |
| GET, POST | `/api/immeubles` | Lister · créer un bien |
| GET, PATCH, DELETE | `/api/immeubles/:id` | Lire · modifier · supprimer un bien |
| GET, POST, PATCH, DELETE | `/api/immeubles/:id/unites[/:uniteId]` | Unités du bien |
| GET, POST, PATCH, DELETE | `/api/immeubles/:id/locataires[/:locId]` | Locataires du bien |
| GET, POST, PATCH, DELETE | `/api/immeubles/:id/paiements[/:paiementId]` | Paiements du bien |
| POST | `/api/immeubles/:id/locataires/:locId/invitation` | Créer le lien d'invitation |
| GET | `/api/immeubles/:id/locataires/:locId/sortie/apercu?date=` | Impayés et caution à une date de sortie |
| POST, GET | `/api/immeubles/:id/locataires/:locId/sortie` | Régler la sortie · lire le décompte |
| GET, POST | `/api/locataire/invitation/:jeton` | Lire · accepter une invitation (public) |
| GET | `/api/locataire/moi` | Espace locataire : situation et paiements |
| POST | `/api/locataire/paiements` | Le locataire déclare un paiement |

Les routes propriétaire refusent un jeton de locataire, et inversement (réponse 403).

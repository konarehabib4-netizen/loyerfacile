# Mettre LoyerFacile en ligne (gratuit)

## Adresses actuelles

| | Adresse |
|---|---|
| 🌐 Site (PWA) | https://loyerfacile-eight.vercel.app |
| ⚙️ API | https://loyerfacile-api.vercel.app (santé : `/api/health`) |
| 🗄️ Base | Aiven, service `mysql-e304f52` (Free, Amsterdam) |

| Morceau | Hébergeur | Projet |
|---|---|---|
| Base MySQL | **Aiven**, offre Free | service MySQL |
| API Express (`backend/`) | **Vercel** | projet `loyerfacile-api` |
| Site React / PWA (racine) | **Vercel** | projet `loyerfacile` |

Les comptes, mots de passe et clés se créent et se saisissent **toi-même**. Aucun secret ne doit être commité : `backend/.env.production` et `*.pem` sont ignorés par Git.

---

## 1. La base MySQL sur Aiven

1. Crée un compte sur https://aiven.io, puis **Create service** → **MySQL** → plan **Free**.
2. Quand le service est « Running », ouvre l'onglet **Overview** et note **Host**, **Port**, **User** (`avnadmin`) et **Password**.
3. Toujours dans **Overview**, télécharge le **CA certificate**, puis enregistre-le sous `backend/ca.pem`.
4. Crée le fichier `backend/.env.production` :
   
   Le lanceur `prod.js` charge `.env.production` en premier et refuse de démarrer si `DB_HOST` pointe vers ton PC.```
   DB_HOST=…aivencloud.com
   DB_PORT=…
   DB_USER=avnadmin
   DB_PASSWORD=…
   DB_NAME=loyerfacile
   DB_SSL=true
   DB_SSL_CA_FILE=ca.pem
   ```
5. Crée les tables, puis applique les migrations. La commande n'efface rien et peut être relancée sans risque :
   ```
   cd backend
   npm.cmd run prod:init
   ```
   Plus tard, après une nouvelle migration : `npm.cmd run prod:migrate`.

## 2. L'API sur Vercel

1. Sur vercel.com : **Add New → Project**, puis importe le dépôt `loyerfacile`.
2. **Root Directory** : `backend`. Vercel reconnaît Express tout seul.
3. **Environment Variables** :
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME=loyerfacile`, `DB_SSL=true` ;
   - `DB_SSL_CA` : colle **tout le contenu** de `ca.pem`, de `-----BEGIN CERTIFICATE-----` à `-----END CERTIFICATE-----` ;
   - `DB_POOL=3` ;
   - `JWT_SECRET` : une longue clé aléatoire, générée avec
     `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
4. **Deploy**, puis note l'adresse de production, par exemple `https://loyerfacile-api.vercel.app`.
5. Vérifie que `https://…/api/health` répond `{"api":"ok","database":"ok"}`.

## 3. Le site sur Vercel

1. **Add New → Project**, puis importe **le même** dépôt `loyerfacile`.
2. **Root Directory** : `./`, la racine. Vercel reconnaît Vite tout seul.
3. **Environment Variable** : `VITE_API_URL` = l'adresse de l'API de l'étape 2, **sans** `/api` à la fin.
4. **Deploy**. Le site est en ligne en HTTPS : la PWA s'installe alors directement depuis le téléphone, sans câble.

## Ensuite

- Chaque `git push` sur `main` redéploie **les deux** projets.
- Si tu changes `VITE_API_URL`, il faut **redéployer** le site : la variable est intégrée au moment du build.
- Les adresses du type `projet-abc123-….vercel.app` sont privées (Vercel Authentication). Partage l'adresse de **production**.
- Sur Vercel, ajoute un nom de domaine dans **Settings → Domains**, par exemple `loyerfacile.vercel.app` s'il est libre.

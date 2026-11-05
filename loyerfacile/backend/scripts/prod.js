// Lance un script du backend sur la base EN LIGNE (identifiants de .env.production).
//   node scripts/prod.js database/reset_db.js --sans-suppression
//   node scripts/prod.js database/migrations/index.js
// (les chemins sont relatifs au dossier backend/ ; le plus simple : npm.cmd run prod:...)
// Les variables de .env.production sont chargées AVANT tout le reste : le .env local
// (WAMP) ne peut donc plus les remplacer. Les sous-processus en héritent aussi.
const path = require('path');
const fs = require('fs');

// Ce fichier est dans backend/scripts/ : la racine du backend est le dossier parent
const RACINE = path.join(__dirname, '..');
const fichier = path.join(RACINE, '.env.production');
if (!fs.existsSync(fichier)) {
  console.error('❌ backend/.env.production introuvable : voir docs/HEBERGEMENT.md');
  process.exit(1);
}
require('dotenv').config({ path: fichier, quiet: true });

if (!process.env.DB_HOST || /^(localhost|127\.0\.0\.1)$/.test(process.env.DB_HOST)) {
  console.error('❌ DB_HOST pointe vers ton PC : ce n’est pas la base en ligne. Arrêt par sécurité.');
  process.exit(1);
}
console.log(`🌐 Base en ligne : ${process.env.DB_HOST}:${process.env.DB_PORT || 3306}`);

const [script, ...args] = process.argv.slice(2);
if (!script) {
  console.error('Usage : node scripts/prod.js <script> [arguments]');
  process.exit(1);
}
// Le script lancé voit ses propres arguments, comme s'il avait été lancé directement
process.argv = [process.argv[0], path.resolve(RACINE, script), ...args];
require(path.resolve(RACINE, script));

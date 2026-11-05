// Lance un script du backend sur la base EN LIGNE (identifiants de .env.production).
//   node prod.js reset_db.js --sans-suppression
//   node prod.js migrations/index.js
// Les variables de .env.production sont chargées AVANT tout le reste : le .env local
// (WAMP) ne peut donc plus les remplacer. Les sous-processus en héritent aussi.
const path = require('path');
const fs = require('fs');

const fichier = path.join(__dirname, '.env.production');
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
  console.error('Usage : node prod.js <script> [arguments]');
  process.exit(1);
}
// Le script lancé voit ses propres arguments, comme s'il avait été lancé directement
process.argv = [process.argv[0], path.resolve(__dirname, script), ...args];
require(path.resolve(__dirname, script));

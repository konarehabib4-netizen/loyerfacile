// Lance toutes les migrations dans l'ordre : npm run migrate
// Chacune vérifie ce qui existe déjà : on peut relancer sans risque.
const { execFileSync } = require('child_process');
const path = require('path');

const migrations = ['001_espace_locataire.js', '002_cautions_avances.js'];

for (const fichier of migrations) {
  console.log(`\n▶ ${fichier}`);
  execFileSync(process.execPath, [path.join(__dirname, fichier)], { stdio: 'inherit' });
}

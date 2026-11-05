// ============================================================================
// MIGRATION 003 — Mot de passe oublié (propriétaires)
//   - reset_token   : empreinte sha256 du lien envoyé par email (jamais le lien lui-même)
//   - reset_expire  : le lien ne marche que jusqu'à cette date (1 heure)
//   - reset_demande_le : date de la dernière demande, pour limiter les envois
// Les locataires, eux, réutilisent les colonnes d'invitation (lien envoyé par le propriétaire).
// Lancer :  cd backend  puis  npm run migrate   (et npm.cmd run prod:migrate pour la base en ligne)
// ============================================================================
const pool = require('../../src/config/db');

async function colonneExiste(table, colonne) {
  const [rows] = await pool.query(
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, colonne]
  );
  return rows.length > 0;
}

async function ajouterColonne(table, colonne, definition) {
  if (await colonneExiste(table, colonne)) return console.log(`= ${table}.${colonne} existe déjà`);
  await pool.query(`ALTER TABLE ${table} ADD COLUMN ${colonne} ${definition}`);
  console.log(`+ ${table}.${colonne}`);
}

async function main() {
  await ajouterColonne('proprietaires', 'reset_token', 'CHAR(64) NULL UNIQUE');
  await ajouterColonne('proprietaires', 'reset_expire', 'DATETIME NULL');
  await ajouterColonne('proprietaires', 'reset_demande_le', 'DATETIME NULL');
  console.log('\nMigration 003 terminée.');
}

main()
  .catch((err) => {
    console.error('Erreur de migration :', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

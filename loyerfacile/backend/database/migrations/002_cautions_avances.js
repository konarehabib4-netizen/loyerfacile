// ============================================================================
// MIGRATION 002 — Cautions et avances
//   - locataires : caution versée, et résultat du décompte de sortie
//   - table retenues_caution : les retenues faites sur la caution à la sortie
// Lancer une fois :  cd backend  puis  npm run migrate
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
  // Montant de la caution (dépôt de garantie) versée à l'entrée
  await ajouterColonne('locataires', 'caution', 'INT NOT NULL DEFAULT 0');
  // Résultat du décompte de sortie (rempli quand le propriétaire règle la sortie)
  await ajouterColonne('locataires', 'caution_deduite_impayes', 'INT NULL');
  await ajouterColonne('locataires', 'caution_a_rendre', 'INT NULL');
  await ajouterColonne('locataires', 'sortie_reglee_le', 'DATETIME NULL');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS retenues_caution (
      id INT AUTO_INCREMENT PRIMARY KEY,
      locataire_id INT NOT NULL,
      libelle VARCHAR(150) NOT NULL,
      montant INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (locataire_id) REFERENCES locataires(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`);
  console.log('= table retenues_caution prête');

  console.log('\nMigration 002 terminée.');
}

main()
  .catch((err) => {
    console.error('Erreur de migration :', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

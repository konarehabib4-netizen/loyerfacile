// ============================================================================
// MIGRATION 001 — Espace locataire
// Ajoute à une base EXISTANTE (sans perdre les données) :
//   - locataires : email, mot de passe, invitation
//   - paiements  : référence, qui l'a déclaré, note
//   - table echeances : ce que le locataire doit, mois par mois
// Lancer une fois :  cd backend  puis  npm run migrate
// On peut la relancer sans risque : chaque étape vérifie si elle est déjà faite.
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
  // Compte du locataire (créé via le lien d'invitation)
  await ajouterColonne('locataires', 'email', 'VARCHAR(150) NULL UNIQUE');
  await ajouterColonne('locataires', 'mot_de_passe_hash', 'VARCHAR(255) NULL');
  // On stocke l'EMPREINTE (sha256) du jeton d'invitation, jamais le jeton lui-même
  await ajouterColonne('locataires', 'invitation_token', 'CHAR(64) NULL UNIQUE');
  await ajouterColonne('locataires', 'invitation_expire', 'DATETIME NULL');

  // Paiements déclarés par le locataire
  await ajouterColonne('paiements', 'reference', 'VARCHAR(100) NULL');
  await ajouterColonne('paiements', 'declare_par', "ENUM('proprietaire', 'locataire') NOT NULL DEFAULT 'proprietaire'");
  await ajouterColonne('paiements', 'note', 'VARCHAR(255) NULL');

  // Échéances : un loyer dû par locataire et par mois.
  // Le montant est figé au moment où le mois est créé : si le loyer change,
  // les mois passés gardent leur montant.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS echeances (
      id INT AUTO_INCREMENT PRIMARY KEY,
      locataire_id INT NOT NULL,
      mois VARCHAR(7) NOT NULL,
      montant_du INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_locataire_mois (locataire_id, mois),
      FOREIGN KEY (locataire_id) REFERENCES locataires(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`);
  console.log('= table echeances prête');

  console.log('\nMigration 001 terminée.');
}

main()
  .catch((err) => {
    console.error('Erreur de migration :', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

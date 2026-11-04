// Script pour réinitialiser la base de données selon schema.sql
require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  console.log('=== Recréation de la base de données ===');

  // 1. Supprimer la base si elle existe
  await connection.query('DROP DATABASE IF EXISTS loyerfacile');
  console.log('Base supprimée');

  // 2. Créer la base
  await connection.query('CREATE DATABASE loyerfacile CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  console.log('Base créée');

  await connection.query('USE loyerfacile');

  // 3. Créer toutes les tables
  const tables = [
    // proprietaires
    `CREATE TABLE IF NOT EXISTS proprietaires (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nom VARCHAR(100) NOT NULL,
      email VARCHAR(150) NOT NULL UNIQUE,
      mot_de_passe_hash VARCHAR(255) NOT NULL,
      telephone VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;`,

    // immeubles
    `CREATE TABLE IF NOT EXISTS immeubles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      proprietaire_id INT NOT NULL,
      nom_immeuble VARCHAR(150) NOT NULL,
      adresse VARCHAR(255),
      type_logement VARCHAR(50) DEFAULT 'appartement',
      nb_pieces INT DEFAULT 1,
      loyer_mensuel INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (proprietaire_id) REFERENCES proprietaires(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;`,

    // unites
    `CREATE TABLE IF NOT EXISTS unites (
      id INT AUTO_INCREMENT PRIMARY KEY,
      propriete_id INT NOT NULL,
      label VARCHAR(50) NOT NULL,
      surface INT DEFAULT 0,
      loyer_mensuel INT DEFAULT 0,
      etat ENUM('disponible', 'Occupé', 'en_maintenance') DEFAULT 'disponible',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (propriete_id) REFERENCES immeubles(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;`,

    // locataires
    `CREATE TABLE IF NOT EXISTS locataires (
      id INT AUTO_INCREMENT PRIMARY KEY,
      unite_id INT NULL,
      nom VARCHAR(100) NOT NULL,
      prenom VARCHAR(100) NOT NULL,
      telephone VARCHAR(20),
      date_entree DATE NOT NULL,
      date_sortie DATE,
      statut ENUM('actif', 'sorti') DEFAULT 'actif',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (unite_id) REFERENCES unites(id) ON DELETE SET NULL
    ) ENGINE=InnoDB;`,

    // paiements
    `CREATE TABLE IF NOT EXISTS paiements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      locataire_id INT NOT NULL,
      montant INT NOT NULL,
      mois_couvrit VARCHAR(7) NOT NULL,
      mode_paiement VARCHAR(30) NOT NULL,
      date_paiement DATE NOT NULL,
      statut ENUM('paye', 'en_attente', 'refuse') DEFAULT 'en_attente',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (locataire_id) REFERENCES locataires(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;`,
  ];

  for (const sql of tables) {
    await connection.query(sql);
    console.log('Table créée');
  }

  // 4. Index
  await connection.query('CREATE INDEX idx_unites_prop ON unites(propriete_id)');
  await connection.query('CREATE INDEX idx_locataires_unite ON locataires(unite_id)');
  await connection.query('CREATE INDEX idx_paiements_locataire ON paiements(locataire_id)');
  await connection.query('CREATE INDEX idx_paiements_mois ON paiements(mois_couvrit)');

  await connection.end();
  // Ajoute les colonnes et tables des migrations (espace locataire, cautions…)
  require('./migrations/index');
  console.log('\\n=== Base réinitialisée avec succès ===');
}

main().catch(err => {
  console.error('Erreur fatale:', err.message);
  console.error(err.stack);
  process.exit(1);
});

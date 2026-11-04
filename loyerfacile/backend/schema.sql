-- ============================================================================
-- SCHÉMA DE BASE DE DONNÉES — LOYERFACILE
-- À exécuter une seule fois via MySQL :  mysql -u root -p < schema.sql
-- ============================================================================

CREATE DATABASE IF NOT EXISTS loyerfacile CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE loyerfacile;

-- ----------------------------------------------------------------------------
-- UTILISATEURS (propriétaires)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS proprietaires (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    mot_de_passe_hash VARCHAR(255) NOT NULL,
    telephone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- IMMEUBLES (biens gérés par un propriétaire)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS immeubles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    proprietaire_id INT NOT NULL,
    nom_immeuble VARCHAR(150) NOT NULL,
    adresse VARCHAR(255),
    type_logement VARCHAR(50) DEFAULT 'appartement',
    nb_pieces INT DEFAULT 1,
    loyer_mensuel INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (proprietaire_id) REFERENCES proprietaires(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- UNITÉS (pièces/locations dans un immeuble)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS unites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    propriete_id INT NOT NULL,
    label VARCHAR(50) NOT NULL,
    surface INT DEFAULT 0,
    loyer_mensuel INT DEFAULT 0,
    etat ENUM('disponible', 'Occupé', 'en_maintenance') DEFAULT 'disponible',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (propriete_id) REFERENCES immeubles(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- LOCATAIRES (locataires d'une unité)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS locataires (
    id INT AUTO_INCREMENT PRIMARY KEY,
    unite_id INT NULL,          -- NULL autorisé : ON DELETE SET NULL l'exige
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    telephone VARCHAR(20),
    date_entree DATE NOT NULL,
    date_sortie DATE,
    statut ENUM('actif', 'sorti') DEFAULT 'actif',
    email VARCHAR(150) NULL UNIQUE,              -- compte de l'espace locataire
    mot_de_passe_hash VARCHAR(255) NULL,
    invitation_token CHAR(64) NULL UNIQUE,       -- empreinte sha256 du lien d'invitation
    invitation_expire DATETIME NULL,
    caution INT NOT NULL DEFAULT 0,              -- caution (dépôt de garantie) versée à l'entrée
    caution_deduite_impayes INT NULL,            -- décompte de sortie : part utilisée pour les impayés
    caution_a_rendre INT NULL,                   -- décompte de sortie : montant rendu au locataire
    sortie_reglee_le DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (unite_id) REFERENCES unites(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- PAIEMENTS (loyers versés par les locataires)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS paiements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    locataire_id INT NOT NULL,
    montant INT NOT NULL,
    mois_couvrit VARCHAR(7) NOT NULL,       -- format 'YYYY-MM'
    mode_paiement VARCHAR(30) NOT NULL,
    date_paiement DATE NOT NULL,
    statut ENUM('paye', 'en_attente', 'refuse') DEFAULT 'en_attente',
    reference VARCHAR(100) NULL,                 -- référence Wave / Orange Money...
    declare_par ENUM('proprietaire', 'locataire') NOT NULL DEFAULT 'proprietaire',
    note VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (locataire_id) REFERENCES locataires(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- ÉCHÉANCES (loyer dû par locataire et par mois, montant figé)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS echeances (
    id INT AUTO_INCREMENT PRIMARY KEY,
    locataire_id INT NOT NULL,
    mois VARCHAR(7) NOT NULL,                    -- format 'YYYY-MM'
    montant_du INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_locataire_mois (locataire_id, mois),
    FOREIGN KEY (locataire_id) REFERENCES locataires(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- RETENUES SUR CAUTION (réparations, factures… à la sortie)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS retenues_caution (
    id INT AUTO_INCREMENT PRIMARY KEY,
    locataire_id INT NOT NULL,
    libelle VARCHAR(150) NOT NULL,
    montant INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (locataire_id) REFERENCES locataires(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- INDEXES DE PERFORMANCE
-- ----------------------------------------------------------------------------
CREATE INDEX idx_unites_prop ON unites(propriete_id);
CREATE INDEX idx_locataires_unite ON locataires(unite_id);
CREATE INDEX idx_paiements_locataire ON paiements(locataire_id);
CREATE INDEX idx_paiements_mois ON paiements(mois_couvrit);
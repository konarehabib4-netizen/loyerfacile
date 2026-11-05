// mysql2/promise permet d'utiliser async/await avec MySQL
const mysql = require('mysql2/promise');
// Adresse, identifiants et SSL lus dans le .env (ou dans les variables de Vercel)
const { optionsConnexion } = require('./db-config');

// Un "pool" est un groupe de connexions MySQL gardées ouvertes et réutilisées.
// C'est plus rapide et plus stable que d'ouvrir une nouvelle connexion à chaque requête.
const pool = mysql.createPool({
  ...optionsConnexion(),
  waitForConnections: true, // si toutes les connexions sont occupées, les requêtes attendent leur tour
  // En ligne, l'API tourne dans plusieurs petites instances : on limite le nombre
  // de connexions de chacune pour ne pas dépasser la limite de l'offre gratuite.
  connectionLimit: Number(process.env.DB_POOL) || 10,
  enableKeepAlive: true,
});

module.exports = pool;

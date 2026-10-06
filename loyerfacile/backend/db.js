// Charge les variables du fichier .env (mot de passe MySQL, nom de la base...)
// dans process.env, pour ne jamais écrire de secrets directement dans le code
require('dotenv').config();

// mysql2/promise permet d'utiliser async/await avec MySQL
// (plus lisible que les "callbacks" de l'ancienne version)
const mysql = require('mysql2/promise');

// Un "pool" est un groupe de connexions MySQL gardées ouvertes et réutilisées.
// C'est plus rapide et plus stable que d'ouvrir une nouvelle connexion
// à chaque requête.
const pool = mysql.createPool({
  host: process.env.DB_HOST,         // adresse du serveur MySQL (localhost = ton PC)
  user: process.env.DB_USER,         // utilisateur MySQL (ex : root)
  password: process.env.DB_PASSWORD, // mot de passe MySQL
  database: process.env.DB_NAME,     // base utilisée (loyerfacile)
  waitForConnections: true,          // si toutes les connexions sont occupées, les requêtes attendent leur tour
  connectionLimit: 10,               // maximum 10 connexions ouvertes en même temps
});

// On exporte le pool pour pouvoir faire : const pool = require('./db');
// dans les autres fichiers
module.exports = pool;
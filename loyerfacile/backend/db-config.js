// Paramètres de connexion MySQL, communs à l'API, aux migrations et à reset_db.js.
// En local (WAMP) : DB_HOST=127.0.0.1, sans SSL.
// En ligne (Aiven…) : DB_PORT, DB_SSL=true et DB_SSL_CA (certificat fourni par l'hébergeur).
require('dotenv').config();

function optionsConnexion({ avecBase = true } = {}) {
  const options = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  };
  if (avecBase) options.database = process.env.DB_NAME;

  // Connexion chiffrée, obligatoire chez les hébergeurs de bases en ligne
  if (process.env.DB_SSL === 'true') {
    options.ssl = { rejectUnauthorized: true, minVersion: 'TLSv1.2' };
    // Le certificat (CA) peut être collé tel quel, ou avec des \n à la place des retours à la ligne
    if (process.env.DB_SSL_CA) options.ssl.ca = process.env.DB_SSL_CA.replace(/\\n/g, '\n');
    // En local, plus simple : le chemin du fichier ca.pem téléchargé chez l'hébergeur
    else if (process.env.DB_SSL_CA_FILE) options.ssl.ca = require('fs').readFileSync(process.env.DB_SSL_CA_FILE, 'utf8');
  }
  return options;
}

module.exports = { optionsConnexion };

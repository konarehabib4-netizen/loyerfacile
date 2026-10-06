// 1. IMPORTS : on charge tout ce dont le serveur a besoin
require('dotenv').config();                           // charge le fichier .env
const express = require('express');                   // framework pour créer l'API
const cors = require('cors');                         // autorise React (autre port) à appeler l'API
const pool = require('./db');                         // connexion MySQL
const verifierToken = require('./middleware/auth');   // videur qui exige un jeton valide

// 2. CRÉATION DE L'APPLICATION
// IMPORTANT : "app" doit être créé AVANT de l'utiliser (c'était ton erreur précédente)
const app = express();

// 3. MIDDLEWARES GLOBAUX (appliqués à toutes les requêtes)
app.use(cors());           // sans ça, le navigateur bloquerait les appels du frontend React
app.use(express.json());   // permet de lire le JSON envoyé dans le corps des requêtes (req.body)

// 4. ROUTES
// Toutes les routes de routes/auth.js commencent par /api/auth
// (donc /api/auth/inscription et /api/auth/connexion)
app.use('/api/auth', require('./routes/auth'));

// Route de test : vérifie que l'API répond
app.get('/', (req, res) => {
  res.json({ message: 'API LoyerFacile en marche' });
});

// Route de santé : vérifie aussi que MySQL répond
app.get('/api/health', async (req, res) => {
  try {
    // "SELECT 1" est la requête la plus simple : si elle réussit, la base est joignable
    const [rows] = await pool.query('SELECT 1 AS ok');
    res.json({ api: 'ok', database: rows[0].ok === 1 ? 'ok' : 'erreur' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ api: 'ok', database: 'erreur' });
  }
});

// Route protégée de test : verifierToken s'exécute d'abord.
// Sans jeton valide, la requête s'arrête là avec une erreur 401.
app.get('/api/moi', verifierToken, (req, res) => {
  // req.proprietaire a été rempli par le middleware (id, email du jeton)
  res.json({ connecte_en_tant_que: req.proprietaire });
});

// 5. DÉMARRAGE DU SERVEUR
// Utilise le port du .env, ou 5000 par défaut
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
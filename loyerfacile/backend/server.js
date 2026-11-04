// 1. IMPORTS : on charge tout ce dont le serveur a besoin
require('dotenv').config();                                    // charge le fichier .env
const express = require('express');                            // framework pour créer l'API
const cors = require('cors');                                  // autorise React (autre port) à appeler l'API
const pool = require('./db');                                  // connexion MySQL
const { verifierToken, exigerRole } = require('./middleware/auth'); // videur : jeton valide + bon rôle
const immeubleDuProprietaire = require('./middleware/immeuble'); // l'immeuble doit appartenir au propriétaire

// 2. CRÉATION DE L'APPLICATION
const app = express();

// 3. MIDDLEWARES GLOBAUX (appliqués à toutes les requêtes)
app.use(cors());           // sans ça, le navigateur bloquerait les appels du frontend React
app.use(express.json());   // permet de lire le JSON envoyé dans le corps des requêtes (req.body)

// 4. ROUTES
// Publiques : inscription / connexion
app.use('/api/auth', require('./routes/auth'));

// Espace locataire : invitation (publique) puis routes réservées aux locataires
app.use('/api/locataire', require('./routes/locataire'));

// Toutes les routes ci-dessous exigent un jeton de PROPRIÉTAIRE (proprio).
// Les routes "imbriquées" vérifient en plus que l'immeuble :id appartient
// au propriétaire connecté (immeubleDuProprietaire).
const proprio = [verifierToken, exigerRole('proprietaire')];
app.use('/api/proprietaire', proprio, require('./routes/proprietaire'));
app.use('/api/immeubles/:id/unites', proprio, immeubleDuProprietaire, require('./routes/unites'));
app.use('/api/immeubles/:id/locataires', proprio, immeubleDuProprietaire, require('./routes/locataires'));
app.use('/api/immeubles/:id/paiements', proprio, immeubleDuProprietaire, require('./routes/paiements'));
app.use('/api/immeubles', proprio, require('./routes/immeubles'));

// Route de test : vérifie que l'API répond
app.get('/', (req, res) => {
  res.json({ message: 'API LoyerFacile en marche' });
});

// Route de santé : vérifie aussi que MySQL répond
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS ok');
    res.json({ api: 'ok', database: rows[0].ok === 1 ? 'ok' : 'erreur' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ api: 'ok', database: 'erreur' });
  }
});

// Route inconnue : réponse JSON claire plutôt qu'une page HTML
app.use('/api', (req, res) => {
  res.status(404).json({ erreur: 'Route introuvable' });
});

// 5. DÉMARRAGE DU SERVEUR
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});

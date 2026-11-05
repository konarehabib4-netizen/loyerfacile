// Vérifie que l'immeuble de l'URL (/api/immeubles/:id/...) appartient bien
// au propriétaire connecté. À utiliser APRÈS verifierToken.
// Sans ce contrôle, un propriétaire pourrait lire les données d'un autre
// simplement en changeant l'id dans l'URL.
const pool = require('../config/db');

async function immeubleDuProprietaire(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT id, nom_immeuble FROM immeubles WHERE id = ? AND proprietaire_id = ?',
      [req.params.id, req.proprietaire.id]
    );
    if (rows.length === 0) return res.status(404).json({ erreur: 'Immeuble non trouvé' });
    req.immeuble = rows[0];
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
}

module.exports = immeubleDuProprietaire;

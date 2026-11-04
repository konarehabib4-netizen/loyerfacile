// ============================================================================
// ROUTES — UNITÉS (pièces / locations dans un immeuble)
// Montées sous /api/immeubles/:id/unites, derrière verifierToken et
// immeubleDuProprietaire : l'immeuble :id appartient donc au propriétaire.
// mergeParams: true permet de lire req.params.id (défini dans server.js).
// ============================================================================
const express = require('express');
const router = express.Router({ mergeParams: true });
const pool = require('../db');

const ETATS = ['disponible', 'Occupé', 'en_maintenance'];

// ---------- LISTE (d'un immeuble) ----------
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.label, u.surface, u.loyer_mensuel, u.etat, u.created_at,
              l.id AS locataire_id, CONCAT(l.prenom, ' ', l.nom) AS locataire
       FROM unites u
       LEFT JOIN locataires l ON l.unite_id = u.id AND l.statut = 'actif'
       WHERE u.propriete_id = ?
       ORDER BY u.label`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ---------- CRÉER ----------
router.post('/', async (req, res) => {
  const { label, surface, loyer_mensuel, etat } = req.body;
  if (!label || !String(label).trim()) {
    return res.status(400).json({ erreur: 'Le libellé de l\'unité est obligatoire' });
  }
  if (etat !== undefined && !ETATS.includes(etat)) {
    return res.status(400).json({ erreur: 'État invalide' });
  }
  try {
    const [resultat] = await pool.query(
      `INSERT INTO unites (propriete_id, label, surface, loyer_mensuel, etat)
       VALUES (?, ?, COALESCE(?, 0), COALESCE(?, 0), COALESCE(?, 'disponible'))`,
      [req.params.id, String(label).trim(), surface, loyer_mensuel, etat]
    );
    res.status(201).json({ message: 'Unité créée', id: resultat.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ---------- MISE À JOUR ----------
router.patch('/:uniteId', async (req, res) => {
  const { etat } = req.body;
  if (etat !== undefined && !ETATS.includes(etat)) {
    return res.status(400).json({ erreur: 'État invalide' });
  }
  const sets = [];
  const params = [];
  for (const champ of ['label', 'surface', 'loyer_mensuel', 'etat']) {
    if (req.body[champ] !== undefined) {
      sets.push(`${champ} = ?`);
      params.push(typeof req.body[champ] === 'string' ? req.body[champ].trim() : req.body[champ]);
    }
  }
  if (sets.length === 0) return res.json({ message: 'Aucun champ à mettre à jour' });

  try {
    params.push(req.params.uniteId, req.params.id);
    const [resultat] = await pool.query(
      `UPDATE unites SET ${sets.join(', ')} WHERE id = ? AND propriete_id = ?`,
      params
    );
    if (resultat.affectedRows === 0) return res.status(404).json({ erreur: 'Unité non trouvée' });
    res.json({ message: 'Unité mise à jour', id: Number(req.params.uniteId) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ---------- SUPPRIMER ----------
router.delete('/:uniteId', async (req, res) => {
  try {
    const [resultat] = await pool.query(
      'DELETE FROM unites WHERE id = ? AND propriete_id = ?',
      [req.params.uniteId, req.params.id]
    );
    if (resultat.affectedRows === 0) return res.status(404).json({ erreur: 'Unité non trouvée' });
    res.json({ message: 'Unité supprimée' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

module.exports = router;

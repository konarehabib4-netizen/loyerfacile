// ============================================================================
// ROUTES — IMMEUBLES (biens du propriétaire)
// Montées dans server.js sous /api/immeubles, derrière verifierToken :
// req.proprietaire.id est donc toujours disponible ici.
// ============================================================================
const express = require('express');
const router = express.Router();
const pool = require('../db');

// Requête commune : l'immeuble + ses statistiques (unités, occupation, locataires)
const SELECT_IMMEUBLE = `
  SELECT i.id, i.nom_immeuble, i.adresse, i.type_logement, i.nb_pieces, i.loyer_mensuel, i.created_at,
         (SELECT COUNT(*) FROM unites u WHERE u.propriete_id = i.id) AS nb_unites,
         (SELECT COUNT(*) FROM unites u WHERE u.propriete_id = i.id AND u.etat = 'Occupé') AS nb_occupees,
         (SELECT COUNT(*) FROM locataires l JOIN unites u ON u.id = l.unite_id
            WHERE u.propriete_id = i.id AND l.statut = 'actif') AS nb_locataires,
         (SELECT COALESCE(SUM(u.loyer_mensuel), 0) FROM unites u
            WHERE u.propriete_id = i.id AND u.etat = 'Occupé') AS loyer_attendu
  FROM immeubles i`;

// ---------- LISTE ----------
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `${SELECT_IMMEUBLE} WHERE i.proprietaire_id = ? ORDER BY i.created_at DESC`,
      [req.proprietaire.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ---------- CRÉER ----------
router.post('/', async (req, res) => {
  const { nom_immeuble, adresse, type_logement, nb_pieces, loyer_mensuel } = req.body;
  if (!nom_immeuble || !String(nom_immeuble).trim()) {
    return res.status(400).json({ erreur: 'Le nom de l\'immeuble est obligatoire' });
  }
  try {
    const [resultat] = await pool.query(
      `INSERT INTO immeubles (proprietaire_id, nom_immeuble, adresse, type_logement, nb_pieces, loyer_mensuel)
       VALUES (?, ?, ?, COALESCE(?, 'appartement'), COALESCE(?, 1), COALESCE(?, 0))`,
      [req.proprietaire.id, String(nom_immeuble).trim(), adresse || null, type_logement, nb_pieces, loyer_mensuel]
    );
    res.status(201).json({ message: 'Immeuble créé', id: resultat.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ---------- LIRE UN ----------
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `${SELECT_IMMEUBLE} WHERE i.proprietaire_id = ? AND i.id = ?`,
      [req.proprietaire.id, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ erreur: 'Immeuble non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ---------- MISE À JOUR ----------
router.patch('/:id', async (req, res) => {
  const champs = ['nom_immeuble', 'adresse', 'type_logement', 'nb_pieces', 'loyer_mensuel'];
  const sets = [];
  const params = [];
  for (const champ of champs) {
    if (req.body[champ] !== undefined) {
      sets.push(`${champ} = ?`);
      params.push(typeof req.body[champ] === 'string' ? req.body[champ].trim() : req.body[champ]);
    }
  }
  if (sets.length === 0) return res.json({ message: 'Aucun champ à mettre à jour' });

  try {
    // Le WHERE sur proprietaire_id garantit qu'on ne modifie que SES immeubles
    params.push(req.params.id, req.proprietaire.id);
    const [resultat] = await pool.query(
      `UPDATE immeubles SET ${sets.join(', ')} WHERE id = ? AND proprietaire_id = ?`,
      params
    );
    if (resultat.affectedRows === 0) return res.status(404).json({ erreur: 'Immeuble non trouvé' });
    res.json({ message: 'Immeuble mis à jour', id: Number(req.params.id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ---------- SUPPRIMER ----------
router.delete('/:id', async (req, res) => {
  try {
    const [resultat] = await pool.query(
      'DELETE FROM immeubles WHERE id = ? AND proprietaire_id = ?',
      [req.params.id, req.proprietaire.id]
    );
    if (resultat.affectedRows === 0) return res.status(404).json({ erreur: 'Immeuble non trouvé' });
    res.json({ message: 'Immeuble supprimé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

module.exports = router;

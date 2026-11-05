// ============================================================================
// ROUTES — PAIEMENTS (versement du loyer)
// Montées sous /api/immeubles/:id/paiements, derrière verifierToken et
// immeubleDuProprietaire. Seuls les paiements des locataires de CET
// immeuble sont visibles ou modifiables.
// ============================================================================
const express = require('express');
const router = express.Router({ mergeParams: true });
const pool = require('../config/db');

const { MODES_PAIEMENT: MODES, STATUTS_PAIEMENT: STATUTS } = require('../config/constantes');

// ---------- LISTE (de l'immeuble, filtrable par ?locataire_id= ou ?mois=YYYY-MM) ----------
router.get('/', async (req, res) => {
  try {
    const params = [req.params.id];
    let filtre = '';
    if (req.query.locataire_id) { filtre += ' AND p.locataire_id = ?'; params.push(req.query.locataire_id); }
    if (req.query.mois) { filtre += ' AND p.mois_couvrit = ?'; params.push(req.query.mois); }
    const [rows] = await pool.query(
      `SELECT p.id, p.locataire_id, CONCAT(l.prenom, ' ', l.nom) AS locataire, l.prenom, l.telephone, u.label AS unite,
              p.montant, p.mois_couvrit, p.mode_paiement, p.date_paiement, p.statut, p.created_at,
              p.reference, p.declare_par, p.note
       FROM paiements p
       JOIN locataires l ON l.id = p.locataire_id
       JOIN unites u ON u.id = l.unite_id
       WHERE u.propriete_id = ?${filtre}
       ORDER BY p.date_paiement DESC, p.id DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ---------- ENREGISTRER UN PAIEMENT ----------
router.post('/', async (req, res) => {
  const { montant, mois_couvrit, mode_paiement, date_paiement, locataire_id, statut } = req.body;
  if (!locataire_id) return res.status(400).json({ erreur: 'Choisissez un locataire' });
  if (!(Number(montant) > 0)) return res.status(400).json({ erreur: 'Le montant doit être supérieur à 0' });
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mois_couvrit || '')) {
    return res.status(400).json({ erreur: 'Mois invalide (format AAAA-MM)' });
  }
  if (!MODES.includes(mode_paiement)) return res.status(400).json({ erreur: 'Mode de paiement invalide' });
  if (statut !== undefined && !STATUTS.includes(statut)) return res.status(400).json({ erreur: 'Statut invalide' });

  try {
    // Le locataire doit appartenir à cet immeuble
    const [locataire] = await pool.query(
      `SELECT l.id FROM locataires l JOIN unites u ON u.id = l.unite_id
       WHERE l.id = ? AND u.propriete_id = ?`,
      [locataire_id, req.params.id]
    );
    if (locataire.length === 0) return res.status(404).json({ erreur: 'Locataire non trouvé sur ce bien' });

    const [resultat] = await pool.query(
      `INSERT INTO paiements (locataire_id, montant, mois_couvrit, mode_paiement, date_paiement, statut)
       VALUES (?, ?, ?, ?, COALESCE(?, CURRENT_DATE), ?)`,
      [locataire_id, Math.round(Number(montant)), mois_couvrit, mode_paiement, date_paiement || null, statut || 'paye']
    );
    res.status(201).json({ message: 'Paiement enregistré', id: resultat.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ---------- CHANGER LE STATUT ----------
router.patch('/:paiementId', async (req, res) => {
  const { statut } = req.body;
  if (!STATUTS.includes(statut)) return res.status(400).json({ erreur: 'Statut invalide' });
  try {
    const [resultat] = await pool.query(
      `UPDATE paiements p JOIN locataires l ON l.id = p.locataire_id JOIN unites u ON u.id = l.unite_id
       SET p.statut = ? WHERE p.id = ? AND u.propriete_id = ?`,
      [statut, req.params.paiementId, req.params.id]
    );
    if (resultat.affectedRows === 0) return res.status(404).json({ erreur: 'Paiement non trouvé' });
    res.json({ message: 'Paiement mis à jour' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ---------- SUPPRIMER ----------
router.delete('/:paiementId', async (req, res) => {
  try {
    const [resultat] = await pool.query(
      `DELETE p FROM paiements p JOIN locataires l ON l.id = p.locataire_id JOIN unites u ON u.id = l.unite_id
       WHERE p.id = ? AND u.propriete_id = ?`,
      [req.params.paiementId, req.params.id]
    );
    if (resultat.affectedRows === 0) return res.status(404).json({ erreur: 'Paiement non trouvé' });
    res.json({ message: 'Paiement supprimé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

module.exports = router;

// ============================================================================
// ROUTES — PROPRIÉTAIRE (profil + résumé financier global)
// Montées sous /api/proprietaire, derrière verifierToken.
// ============================================================================
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// ---------- PROFIL ----------
router.get('/profil', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, nom, email, telephone, created_at FROM proprietaires WHERE id = ?',
      [req.proprietaire.id]
    );
    if (rows.length === 0) return res.status(404).json({ erreur: 'Propriétaire non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ---------- MISE À JOUR DU PROFIL ----------
router.patch('/profil', async (req, res) => {
  const sets = [];
  const params = [];
  for (const champ of ['nom', 'email', 'telephone']) {
    if (req.body[champ] !== undefined) {
      sets.push(`${champ} = ?`);
      params.push(String(req.body[champ]).trim());
    }
  }
  if (sets.length === 0) return res.json({ message: 'Aucun champ à mettre à jour' });
  try {
    params.push(req.proprietaire.id);
    await pool.query(`UPDATE proprietaires SET ${sets.join(', ')} WHERE id = ?`, params);
    res.json({ message: 'Profil mis à jour' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ erreur: 'Cet email est déjà utilisé' });
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ---------- RÉSUMÉ FINANCIER GLOBAL ----------
// Chiffres du tableau de bord, pour le mois en cours (ou ?mois=YYYY-MM).
router.get('/resume', async (req, res) => {
  const id = req.proprietaire.id;
  const mois = /^\d{4}-\d{2}$/.test(req.query.mois || '')
    ? req.query.mois
    : new Date().toISOString().slice(0, 7);

  // Jointure réutilisée : unités des immeubles du propriétaire
  const UNITES = '(unites u JOIN immeubles i ON i.id = u.propriete_id AND i.proprietaire_id = ?)';

  try {
    const [[comptes]] = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM immeubles WHERE proprietaire_id = ?) AS nb_immeubles,
         (SELECT COUNT(*) FROM ${UNITES}) AS nb_unites,
         (SELECT COUNT(*) FROM ${UNITES} WHERE u.etat = 'Occupé') AS nb_occupees,
         (SELECT COUNT(*) FROM locataires l JOIN ${UNITES} ON u.id = l.unite_id WHERE l.statut = 'actif') AS nb_locataires,
         (SELECT COALESCE(SUM(u.loyer_mensuel), 0) FROM ${UNITES} WHERE u.etat = 'Occupé') AS loyer_attendu`,
      [id, id, id, id, id]
    );

    // Encaissé ce mois (paiements "payé" pour le mois couvert)
    const [[encaisse]] = await pool.query(
      `SELECT COALESCE(SUM(p.montant), 0) AS total
       FROM paiements p JOIN locataires l ON l.id = p.locataire_id JOIN ${UNITES} ON u.id = l.unite_id
       WHERE p.statut = 'paye' AND p.mois_couvrit = ?`,
      [id, mois]
    );

    // Locataires actifs qui n'ont pas encore tout payé ce mois-ci
    const [impayes] = await pool.query(
      `SELECT l.id, CONCAT(l.prenom, ' ', l.nom) AS locataire, l.prenom, l.telephone, i.id AS immeuble_id, i.nom_immeuble,
              u.label AS unite, u.loyer_mensuel,
              COALESCE((SELECT SUM(p.montant) FROM paiements p
                        WHERE p.locataire_id = l.id AND p.statut = 'paye' AND p.mois_couvrit = ?), 0) AS verse
       FROM locataires l JOIN ${UNITES} ON u.id = l.unite_id
       WHERE l.statut = 'actif'
       HAVING verse < u.loyer_mensuel
       ORDER BY (u.loyer_mensuel - verse) DESC`,
      [mois, id]
    );

    // 5 derniers paiements
    const [derniers] = await pool.query(
      `SELECT p.id, p.montant, p.mois_couvrit, p.mode_paiement, p.date_paiement, p.statut,
              CONCAT(l.prenom, ' ', l.nom) AS locataire, i.nom_immeuble, i.id AS immeuble_id
       FROM paiements p JOIN locataires l ON l.id = p.locataire_id JOIN ${UNITES} ON u.id = l.unite_id
       ORDER BY p.date_paiement DESC, p.id DESC LIMIT 5`,
      [id]
    );

    // Encaissements des 6 derniers mois (pour le graphique)
    const [historique] = await pool.query(
      `SELECT p.mois_couvrit AS mois, SUM(p.montant) AS total
       FROM paiements p JOIN locataires l ON l.id = p.locataire_id JOIN ${UNITES} ON u.id = l.unite_id
       WHERE p.statut = 'paye' AND p.mois_couvrit > DATE_FORMAT(CURDATE() - INTERVAL 6 MONTH, '%Y-%m')
       GROUP BY p.mois_couvrit ORDER BY p.mois_couvrit`,
      [id]
    );

    // Paiements déclarés par les locataires, en attente de validation
    const [aValider] = await pool.query(
      `SELECT p.id, p.montant, p.mois_couvrit, p.mode_paiement, p.date_paiement, p.reference, p.note,
              CONCAT(l.prenom, ' ', l.nom) AS locataire, i.nom_immeuble, i.id AS immeuble_id, u.label AS unite
       FROM paiements p JOIN locataires l ON l.id = p.locataire_id JOIN ${UNITES} ON u.id = l.unite_id
       WHERE p.statut = 'en_attente' AND p.declare_par = 'locataire'
       ORDER BY p.created_at DESC LIMIT 20`,
      [id]
    );

    const reste = impayes.reduce((s, r) => s + (Number(r.loyer_mensuel) - Number(r.verse)), 0);

    res.json({
      mois,
      nb_immeubles: Number(comptes.nb_immeubles),
      nb_unites: Number(comptes.nb_unites),
      nb_occupees: Number(comptes.nb_occupees),
      nb_locataires: Number(comptes.nb_locataires),
      loyer_attendu: Number(comptes.loyer_attendu),
      encaisse_mois: Number(encaisse.total),
      reste_a_percevoir: reste,
      impayes: impayes.map((r) => ({ ...r, verse: Number(r.verse) })),
      derniers_paiements: derniers,
      a_valider: aValider,
      historique: historique.map((h) => ({ mois: h.mois, total: Number(h.total) })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

module.exports = router;

// ============================================================================
// ROUTES — LOCATAIRES (d'un immeuble)
// Montées sous /api/immeubles/:id/locataires, derrière verifierToken et
// immeubleDuProprietaire. Chaque requête vérifie que le locataire est bien
// dans une unité de CET immeuble.
// ============================================================================
const express = require('express');
const router = express.Router({ mergeParams: true });
const crypto = require('crypto');
const pool = require('../db');
const { situation } = require('../echeances');
const { empreinte } = require('./locataire');

// Le locataire :locId est-il dans une unité de l'immeuble :id ?
async function locataireDeLImmeuble(locId, immeubleId) {
  const [rows] = await pool.query(
    `SELECT l.id, l.unite_id, l.statut FROM locataires l JOIN unites u ON u.id = l.unite_id
     WHERE l.id = ? AND u.propriete_id = ?`,
    [locId, immeubleId]
  );
  return rows[0];
}

// ---------- LISTE (de l'immeuble, filtrable par ?unite_id=) ----------
router.get('/', async (req, res) => {
  try {
    const params = [req.params.id];
    let filtre = '';
    if (req.query.unite_id) {
      filtre = ' AND l.unite_id = ?';
      params.push(req.query.unite_id);
    }
    const [rows] = await pool.query(
      `SELECT l.id, l.unite_id, u.label AS unite, u.loyer_mensuel, l.nom, l.prenom, l.telephone,
              l.date_entree, l.date_sortie, l.statut, l.created_at, l.email,
              (l.mot_de_passe_hash IS NOT NULL) AS a_un_compte,
              (l.invitation_token IS NOT NULL AND l.invitation_expire > NOW()) AS invitation_en_cours
       FROM locataires l JOIN unites u ON u.id = l.unite_id
       WHERE u.propriete_id = ?${filtre}
       ORDER BY l.statut, l.nom, l.prenom`,
      params
    );
    // Reste dû cumulé (tous les mois impayés) de chaque locataire
    for (const r of rows) {
      const s = await situation(r.id);
      r.reste_du = s.total_du;
      r.nb_mois_impayes = s.nb_mois_impayes;
      r.a_un_compte = !!r.a_un_compte;
      r.invitation_en_cours = !!r.invitation_en_cours;
    }
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ---------- AJOUTER UN LOCATAIRE ----------
router.post('/', async (req, res) => {
  const { nom, prenom, telephone, date_entree, unite_id } = req.body;
  if (!nom || !prenom) {
    return res.status(400).json({ erreur: 'Le nom et le prénom sont obligatoires' });
  }
  if (!unite_id) return res.status(400).json({ erreur: 'Choisissez une unité' });
  try {
    const [unite] = await pool.query(
      'SELECT id, etat FROM unites WHERE propriete_id = ? AND id = ?',
      [req.params.id, unite_id]
    );
    if (unite.length === 0) return res.status(404).json({ erreur: 'Unité non trouvée' });
    if (unite[0].etat === 'Occupé') {
      return res.status(409).json({ erreur: 'Cette unité est déjà occupée' });
    }

    const [resultat] = await pool.query(
      `INSERT INTO locataires (unite_id, nom, prenom, telephone, date_entree, statut)
       VALUES (?, ?, ?, ?, COALESCE(?, CURRENT_DATE), 'actif')`,
      [unite_id, String(nom).trim(), String(prenom).trim(), telephone || null, date_entree || null]
    );
    // L'unité devient occupée
    await pool.query("UPDATE unites SET etat = 'Occupé' WHERE id = ?", [unite_id]);
    res.status(201).json({ message: 'Locataire ajouté', id: resultat.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ---------- MISE À JOUR (dont la sortie du locataire) ----------
router.patch('/:locId', async (req, res) => {
  const { statut } = req.body;
  if (statut !== undefined && !['actif', 'sorti'].includes(statut)) {
    return res.status(400).json({ erreur: 'Statut invalide' });
  }
  try {
    const locataire = await locataireDeLImmeuble(req.params.locId, req.params.id);
    if (!locataire) return res.status(404).json({ erreur: 'Locataire non trouvé' });

    const sets = [];
    const params = [];
    for (const champ of ['nom', 'prenom', 'telephone', 'date_entree', 'date_sortie', 'statut']) {
      if (req.body[champ] !== undefined) {
        sets.push(`${champ} = ?`);
        params.push(typeof req.body[champ] === 'string' ? req.body[champ].trim() || null : req.body[champ]);
      }
    }
    // Sortie du locataire : date de sortie = aujourd'hui si non précisée
    if (statut === 'sorti' && req.body.date_sortie === undefined) sets.push('date_sortie = CURRENT_DATE');
    if (sets.length === 0) return res.json({ message: 'Aucun champ à mettre à jour' });

    params.push(req.params.locId);
    await pool.query(`UPDATE locataires SET ${sets.join(', ')} WHERE id = ?`, params);

    // Dates modifiées : on retire les échéances hors de la période de location
    await pool.query(
      `DELETE e FROM echeances e JOIN locataires l ON l.id = e.locataire_id
       WHERE l.id = ? AND (e.mois < DATE_FORMAT(l.date_entree, '%Y-%m')
                           OR (l.date_sortie IS NOT NULL AND e.mois > DATE_FORMAT(l.date_sortie, '%Y-%m')))`,
      [req.params.locId]
    );

    // L'unité suit le statut du locataire
    if (statut === 'sorti') {
      await pool.query("UPDATE unites SET etat = 'disponible' WHERE id = ?", [locataire.unite_id]);
    } else if (statut === 'actif') {
      await pool.query("UPDATE unites SET etat = 'Occupé' WHERE id = ?", [locataire.unite_id]);
    }
    res.json({ message: 'Locataire mis à jour', id: Number(req.params.locId) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ---------- INVITER LE LOCATAIRE DANS SON ESPACE ----------
// Génère un lien à usage unique, valable 7 jours, que le propriétaire envoie
// (WhatsApp, SMS…). Un nouveau lien remplace l'ancien.
router.post('/:locId/invitation', async (req, res) => {
  try {
    const locataire = await locataireDeLImmeuble(req.params.locId, req.params.id);
    if (!locataire) return res.status(404).json({ erreur: 'Locataire non trouvé' });
    const [[l]] = await pool.query('SELECT mot_de_passe_hash FROM locataires WHERE id = ?', [req.params.locId]);
    if (l.mot_de_passe_hash) return res.status(409).json({ erreur: 'Ce locataire a déjà activé son espace' });

    const jeton = crypto.randomBytes(24).toString('hex');
    await pool.query(
      'UPDATE locataires SET invitation_token = ?, invitation_expire = NOW() + INTERVAL 7 DAY WHERE id = ?',
      [empreinte(jeton), req.params.locId]
    );
    res.status(201).json({ jeton, expire_dans_jours: 7 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ---------- SUPPRIMER ----------
router.delete('/:locId', async (req, res) => {
  try {
    const locataire = await locataireDeLImmeuble(req.params.locId, req.params.id);
    if (!locataire) return res.status(404).json({ erreur: 'Locataire non trouvé' });
    await pool.query('DELETE FROM locataires WHERE id = ?', [req.params.locId]);
    if (locataire.statut === 'actif') {
      await pool.query("UPDATE unites SET etat = 'disponible' WHERE id = ?", [locataire.unite_id]);
    }
    res.json({ message: 'Locataire supprimé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

module.exports = router;

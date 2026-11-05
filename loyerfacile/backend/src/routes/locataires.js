// ============================================================================
// ROUTES — LOCATAIRES (d'un immeuble)
// Montées sous /api/immeubles/:id/locataires, derrière verifierToken et
// immeubleDuProprietaire. Chaque requête vérifie que le locataire est bien
// dans une unité de CET immeuble.
// ============================================================================
const express = require('express');
const router = express.Router({ mergeParams: true });
const crypto = require('crypto');
const pool = require('../config/db');
const { situation } = require('../services/echeances');
const { empreinte } = require('./locataire');
const { impayesJusquA, calculer, decompte } = require('../services/sortie');
const { MODES_PAIEMENT } = require('../config/constantes');

// '2026-08' + 2 -> '2026-10'
function ajouterMois(mois, n) {
  const [a, m] = mois.split('-').map(Number);
  const d = new Date(a, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

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
              l.caution, l.caution_a_rendre, l.sortie_reglee_le,
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
      r.mois_impayes = s.mois.filter((m) => m.reste > 0).map((m) => m.mois);
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
  // Versement à l'entrée : caution (montant) et avance (nombre de mois payés d'avance)
  const caution = Math.max(0, Math.round(Number(req.body.caution) || 0));
  const avanceMois = Math.max(0, Math.round(Number(req.body.avance_mois) || 0));
  const modeEntree = req.body.mode_entree || 'especes';
  if (avanceMois > 12) return res.status(400).json({ erreur: 'L’avance ne peut pas dépasser 12 mois' });
  if (!MODES_PAIEMENT.includes(modeEntree)) return res.status(400).json({ erreur: 'Mode de versement invalide' });
  if (date_entree && !/^\d{4}-\d{2}-\d{2}$/.test(date_entree)) {
    return res.status(400).json({ erreur: 'Date d’entrée invalide' });
  }
  if (!nom || !prenom) {
    return res.status(400).json({ erreur: 'Le nom et le prénom sont obligatoires' });
  }
  if (!unite_id) return res.status(400).json({ erreur: 'Choisissez une unité' });
  try {
    const [unite] = await pool.query(
      'SELECT id, etat, loyer_mensuel FROM unites WHERE propriete_id = ? AND id = ?',
      [req.params.id, unite_id]
    );
    if (unite.length === 0) return res.status(404).json({ erreur: 'Unité non trouvée' });
    if (unite[0].etat === 'Occupé') {
      return res.status(409).json({ erreur: 'Cette unité est déjà occupée' });
    }

    const [resultat] = await pool.query(
      `INSERT INTO locataires (unite_id, nom, prenom, telephone, date_entree, statut, caution)
       VALUES (?, ?, ?, ?, COALESCE(?, CURRENT_DATE), 'actif', ?)`,
      [unite_id, String(nom).trim(), String(prenom).trim(), telephone || null, date_entree || null, caution]
    );
    // L'avance règle d'avance les premiers mois de loyer, à partir du mois d'entrée
    const loyer = Number(unite[0].loyer_mensuel) || 0;
    if (avanceMois > 0 && loyer > 0) {
      const jour = date_entree || new Date().toISOString().slice(0, 10);
      const lignes = Array.from({ length: avanceMois }, (_, i) => [
        resultat.insertId, loyer, ajouterMois(jour.slice(0, 7), i), modeEntree, jour, 'paye', 'proprietaire', 'Avance versée à l’entrée',
      ]);
      await pool.query(
        `INSERT INTO paiements (locataire_id, montant, mois_couvrit, mode_paiement, date_paiement, statut, declare_par, note)
         VALUES ?`,
        [lignes]
      );
    }
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
    for (const champ of ['nom', 'prenom', 'telephone', 'date_entree', 'date_sortie', 'statut', 'caution']) {
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

// ---------- SORTIE : APERÇU DU DÉCOMPTE (rien n'est enregistré) ----------
// GET /:locId/sortie/apercu?date=2026-11-30
router.get('/:locId/sortie/apercu', async (req, res) => {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date || '') ? req.query.date : new Date().toISOString().slice(0, 10);
  try {
    const locataire = await locataireDeLImmeuble(req.params.locId, req.params.id);
    if (!locataire) return res.status(404).json({ erreur: 'Locataire non trouvé' });
    const [[l]] = await pool.query(
      "SELECT caution, DATE_FORMAT(date_entree, '%Y-%m-%d') AS entree FROM locataires WHERE id = ?",
      [req.params.locId]
    );
    const { mois, total } = await impayesJusquA(req.params.locId, date);
    res.json({ caution: l.caution, date_entree: l.entree, impayes: total, mois_impayes: mois.map((m) => ({ mois: m.mois, reste: m.reste })) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ---------- SORTIE : RÉGLER LE DÉPART DU LOCATAIRE ----------
// Corps : { date_sortie, caution, retenues: [{ libelle, montant }], deduire_impayes: true }
router.post('/:locId/sortie', async (req, res) => {
  const { date_sortie, deduire_impayes } = req.body;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date_sortie || '')) return res.status(400).json({ erreur: 'Date de sortie invalide' });
  const retenues = Array.isArray(req.body.retenues) ? req.body.retenues : [];
  if (retenues.length > 30) return res.status(400).json({ erreur: 'Trop de retenues' });
  const propres = [];
  for (const r of retenues) {
    const libelle = String(r?.libelle || '').trim().slice(0, 150);
    const montant = Math.round(Number(r?.montant));
    if (!libelle && !montant) continue; // ligne vide ignorée
    if (!libelle) return res.status(400).json({ erreur: 'Chaque retenue doit avoir un libellé' });
    if (!(montant > 0)) return res.status(400).json({ erreur: `Montant invalide pour « ${libelle} »` });
    propres.push({ libelle, montant });
  }

  try {
    const locataire = await locataireDeLImmeuble(req.params.locId, req.params.id);
    if (!locataire) return res.status(404).json({ erreur: 'Locataire non trouvé' });
    const [[l]] = await pool.query(
      "SELECT caution, sortie_reglee_le, DATE_FORMAT(date_entree, '%Y-%m-%d') AS entree FROM locataires WHERE id = ?",
      [req.params.locId]
    );
    if (l.sortie_reglee_le) return res.status(409).json({ erreur: 'La sortie de ce locataire est déjà réglée' });
    if (date_sortie < l.entree) return res.status(400).json({ erreur: 'La date de sortie est avant la date d’entrée' });
    const caution = req.body.caution !== undefined ? Math.max(0, Math.round(Number(req.body.caution) || 0)) : l.caution;

    // 1. Le locataire sort : date de sortie, mois suivants retirés, unité libérée
    await pool.query("UPDATE locataires SET statut = 'sorti', date_sortie = ?, caution = ? WHERE id = ?", [date_sortie, caution, req.params.locId]);
    await pool.query("DELETE FROM echeances WHERE locataire_id = ? AND mois > DATE_FORMAT(?, '%Y-%m')", [req.params.locId, date_sortie]);
    await pool.query("UPDATE unites SET etat = 'disponible' WHERE id = ?", [locataire.unite_id]);

    // 2. Calcul du décompte
    const { mois, total } = await impayesJusquA(req.params.locId, date_sortie);
    const d = calculer({ caution, retenues: propres, impayes: total, deduireImpayes: deduire_impayes !== false });

    // 3. La part de caution utilisée règle les mois impayés, du plus ancien au plus récent
    let reste = d.impayes_deduits;
    const lignes = [];
    for (const m of mois) {
      if (reste <= 0) break;
      const montant = Math.min(reste, m.reste);
      lignes.push([req.params.locId, montant, m.mois, 'caution', date_sortie, 'paye', 'proprietaire', 'Réglé avec la caution à la sortie']);
      reste -= montant;
    }
    if (lignes.length) {
      await pool.query(
        'INSERT INTO paiements (locataire_id, montant, mois_couvrit, mode_paiement, date_paiement, statut, declare_par, note) VALUES ?',
        [lignes]
      );
    }
    if (propres.length) {
      await pool.query('INSERT INTO retenues_caution (locataire_id, libelle, montant) VALUES ?', [
        propres.map((r) => [req.params.locId, r.libelle, r.montant]),
      ]);
    }
    await pool.query(
      'UPDATE locataires SET caution_deduite_impayes = ?, caution_a_rendre = ?, sortie_reglee_le = NOW() WHERE id = ?',
      [d.impayes_deduits, d.a_rendre, req.params.locId]
    );
    res.status(201).json({ message: 'Sortie réglée', decompte: await decompte(req.params.locId) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ---------- SORTIE : DÉCOMPTE ENREGISTRÉ ----------
router.get('/:locId/sortie', async (req, res) => {
  try {
    const locataire = await locataireDeLImmeuble(req.params.locId, req.params.id);
    if (!locataire) return res.status(404).json({ erreur: 'Locataire non trouvé' });
    const d = await decompte(req.params.locId);
    if (!d) return res.status(404).json({ erreur: 'La sortie de ce locataire n’est pas encore réglée' });
    res.json(d);
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

// ---------- MOT DE PASSE OUBLIÉ (locataire qui a déjà un compte) ----------
// Le propriétaire génère un lien valable 1 heure, à usage unique, et l'envoie
// par WhatsApp ou SMS. Le locataire y choisit un nouveau mot de passe.
router.post('/:locId/reinitialisation', async (req, res) => {
  try {
    const locataire = await locataireDeLImmeuble(req.params.locId, req.params.id);
    if (!locataire) return res.status(404).json({ erreur: 'Locataire non trouvé' });
    const [[l]] = await pool.query('SELECT mot_de_passe_hash FROM locataires WHERE id = ?', [req.params.locId]);
    if (!l.mot_de_passe_hash) return res.status(409).json({ erreur: 'Ce locataire n’a pas encore de compte : envoyez-lui une invitation.' });

    const jeton = crypto.randomBytes(24).toString('hex');
    await pool.query(
      'UPDATE locataires SET invitation_token = ?, invitation_expire = NOW() + INTERVAL 1 HOUR WHERE id = ?',
      [empreinte(jeton), req.params.locId]
    );
    res.status(201).json({ jeton, expire_dans_heures: 1 });
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

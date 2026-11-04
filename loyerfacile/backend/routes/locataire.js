// ============================================================================
// ROUTES — ESPACE LOCATAIRE (/api/locataire)
//  • Publiques : lire et accepter une invitation (le locataire n'a pas encore de compte)
//  • Protégées (rôle "locataire") : sa situation, ses paiements, déclarer un paiement
// ============================================================================
const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { verifierToken, exigerRole, creerToken } = require('../middleware/auth');
const { situation } = require('../echeances');
const { MODES_PAIEMENT, REGEX_MOIS, REGEX_EMAIL } = require('../constantes');

const router = express.Router();

// Le lien contient le jeton ; la base ne garde que son empreinte sha256.
// Ainsi, même quelqu'un qui lit la base ne peut pas utiliser les invitations.
const empreinte = (jeton) => crypto.createHash('sha256').update(String(jeton)).digest('hex');

async function invitationValide(jeton) {
  const [rows] = await pool.query(
    `SELECT l.id, l.prenom, l.nom, l.email, u.label AS unite, i.nom_immeuble, p.nom AS proprietaire
     FROM locataires l
     LEFT JOIN unites u ON u.id = l.unite_id
     LEFT JOIN immeubles i ON i.id = u.propriete_id
     LEFT JOIN proprietaires p ON p.id = i.proprietaire_id
     WHERE l.invitation_token = ? AND l.invitation_expire > NOW()`,
    [empreinte(jeton)]
  );
  return rows[0];
}

// ---------- LIRE UNE INVITATION (public) ----------
router.get('/invitation/:jeton', async (req, res) => {
  try {
    const inv = await invitationValide(req.params.jeton);
    if (!inv) return res.status(404).json({ erreur: 'Ce lien d’invitation est invalide ou a expiré. Demandez-en un nouveau à votre propriétaire.' });
    res.json({ prenom: inv.prenom, nom: inv.nom, unite: inv.unite, nom_immeuble: inv.nom_immeuble, proprietaire: inv.proprietaire });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ---------- ACCEPTER UNE INVITATION = créer son compte (public) ----------
router.post('/invitation/:jeton', async (req, res) => {
  const { email, mot_de_passe } = req.body;
  if (!email || !REGEX_EMAIL.test(email)) return res.status(400).json({ erreur: 'Adresse email invalide' });
  if (!mot_de_passe || mot_de_passe.length < 8) {
    return res.status(400).json({ erreur: 'Le mot de passe doit contenir au moins 8 caractères' });
  }
  try {
    const inv = await invitationValide(req.params.jeton);
    if (!inv) return res.status(404).json({ erreur: 'Ce lien d’invitation est invalide ou a expiré.' });

    const [pris] = await pool.query(
      `SELECT id FROM proprietaires WHERE email = ?
       UNION SELECT id FROM locataires WHERE email = ? AND id <> ?`,
      [email, email, inv.id]
    );
    if (pris.length > 0) return res.status(409).json({ erreur: 'Cet email est déjà utilisé' });

    const hash = await bcrypt.hash(mot_de_passe, 10);
    // Le lien ne sert qu'une fois : on efface l'invitation
    await pool.query(
      `UPDATE locataires SET email = ?, mot_de_passe_hash = ?, invitation_token = NULL, invitation_expire = NULL
       WHERE id = ?`,
      [email, hash, inv.id]
    );
    res.status(201).json({
      token: creerToken(inv.id, email, 'locataire'),
      role: 'locataire',
      utilisateur: { id: inv.id, nom: `${inv.prenom} ${inv.nom}`, email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ============ À partir d'ici : locataire connecté uniquement ============
router.use(verifierToken, exigerRole('locataire'));

// ---------- MA SITUATION ----------
router.get('/moi', async (req, res) => {
  const id = req.utilisateur.id;
  try {
    const [[l]] = await pool.query(
      `SELECT l.id, l.prenom, l.nom, l.email, l.telephone, l.date_entree, l.date_sortie, l.statut,
              u.label AS unite, u.loyer_mensuel, i.nom_immeuble, i.adresse,
              p.nom AS proprietaire_nom, p.email AS proprietaire_email, p.telephone AS proprietaire_telephone
       FROM locataires l
       LEFT JOIN unites u ON u.id = l.unite_id
       LEFT JOIN immeubles i ON i.id = u.propriete_id
       LEFT JOIN proprietaires p ON p.id = i.proprietaire_id
       WHERE l.id = ?`,
      [id]
    );
    if (!l) return res.status(404).json({ erreur: 'Compte introuvable' });

    const [paiements] = await pool.query(
      `SELECT id, montant, mois_couvrit, mode_paiement, date_paiement, statut, reference, declare_par, created_at
       FROM paiements WHERE locataire_id = ? ORDER BY date_paiement DESC, id DESC`,
      [id]
    );

    res.json({
      locataire: {
        id: l.id, prenom: l.prenom, nom: l.nom, email: l.email, telephone: l.telephone,
        date_entree: l.date_entree, date_sortie: l.date_sortie, statut: l.statut,
      },
      logement: { unite: l.unite, loyer_mensuel: l.loyer_mensuel, nom_immeuble: l.nom_immeuble, adresse: l.adresse },
      proprietaire: { nom: l.proprietaire_nom, email: l.proprietaire_email, telephone: l.proprietaire_telephone },
      situation: await situation(id),
      paiements,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ---------- DÉCLARER UN PAIEMENT ----------
// Le locataire a payé (Wave, Orange Money…) : il le signale avec la référence.
// Le paiement reste "en attente" jusqu'à la validation du propriétaire.
// Corps : { lignes: [{ mois: '2026-10', montant: 40000 }, ...], mode_paiement, reference, date_paiement, note }
router.post('/paiements', async (req, res) => {
  const id = req.utilisateur.id;
  const { lignes, mode_paiement, reference, date_paiement, note } = req.body;

  if (!Array.isArray(lignes) || lignes.length === 0 || lignes.length > 24) {
    return res.status(400).json({ erreur: 'Choisissez au moins un mois' });
  }
  if (!MODES_PAIEMENT.includes(mode_paiement)) return res.status(400).json({ erreur: 'Mode de paiement invalide' });
  const ref = String(reference || '').trim();
  if (mode_paiement !== 'especes' && ref.length < 3) {
    return res.status(400).json({ erreur: 'Indiquez la référence de la transaction (reçue par SMS)' });
  }
  if (date_paiement && !/^\d{4}-\d{2}-\d{2}$/.test(date_paiement)) {
    return res.status(400).json({ erreur: 'Date invalide' });
  }

  try {
    const sit = await situation(id);
    const parMois = new Map(sit.mois.map((m) => [m.mois, m]));
    const vus = new Set();
    for (const ligne of lignes) {
      const m = parMois.get(ligne?.mois);
      const montant = Math.round(Number(ligne?.montant));
      if (!REGEX_MOIS.test(ligne?.mois || '') || !m) return res.status(400).json({ erreur: `Mois invalide : ${ligne?.mois}` });
      if (vus.has(ligne.mois)) return res.status(400).json({ erreur: `Le mois ${ligne.mois} est en double` });
      if (!(montant > 0)) return res.status(400).json({ erreur: 'Chaque montant doit être supérieur à 0' });
      if (m.a_declarer === 0) {
        return res.status(400).json({ erreur: `${ligne.mois} est déjà payé ou en attente de validation` });
      }
      if (montant > m.a_declarer) {
        return res.status(400).json({ erreur: `Le montant pour ${ligne.mois} dépasse ce qu'il reste à payer (${m.a_declarer} F)` });
      }
      vus.add(ligne.mois);
    }

    const valeurs = lignes.map((l) => [
      id, Math.round(Number(l.montant)), l.mois, mode_paiement, date_paiement || new Date().toISOString().slice(0, 10),
      'en_attente', ref || null, 'locataire', note ? String(note).slice(0, 255) : null,
    ]);
    await pool.query(
      `INSERT INTO paiements (locataire_id, montant, mois_couvrit, mode_paiement, date_paiement, statut, reference, declare_par, note)
       VALUES ?`,
      [valeurs]
    );
    res.status(201).json({ message: 'Paiement déclaré. Votre propriétaire va le vérifier.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

module.exports = router;
module.exports.empreinte = empreinte;

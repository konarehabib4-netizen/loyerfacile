const express = require('express');
// bcryptjs transforme un mot de passe en "hash" (chaîne illisible et irréversible)
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool = require('../config/db');
const { creerToken } = require('../middlewares/auth');
const { REGEX_EMAIL } = require('../config/constantes');
const { empreinte } = require('./locataire');
const { envoyerEmail, emailReinitialisation } = require('../services/email');

// Branché dans server.js sous le préfixe /api/auth
const router = express.Router();

// ---------------------------------------------------------------
// INSCRIPTION (propriétaires) : POST /api/auth/inscription
// Les locataires, eux, créent leur compte via le lien d'invitation.
// ---------------------------------------------------------------
router.post('/inscription', async (req, res) => {
  const { nom, email, mot_de_passe } = req.body;

  if (!nom || !email || !mot_de_passe) {
    return res.status(400).json({ erreur: 'Nom, email et mot de passe sont obligatoires' });
  }
  if (!REGEX_EMAIL.test(email)) {
    return res.status(400).json({ erreur: 'Adresse email invalide' });
  }
  if (mot_de_passe.length < 8) {
    return res.status(400).json({ erreur: 'Le mot de passe doit contenir au moins 8 caractères' });
  }

  try {
    // L'email ne doit exister ni chez les propriétaires, ni chez les locataires
    // (sinon la connexion ne saurait pas quel compte ouvrir).
    const [existants] = await pool.query(
      `SELECT id FROM proprietaires WHERE email = ?
       UNION SELECT id FROM locataires WHERE email = ?`,
      [email, email]
    );
    if (existants.length > 0) {
      return res.status(409).json({ erreur: 'Cet email est déjà utilisé' });
    }

    // On ne stocke JAMAIS le mot de passe en clair
    const hash = await bcrypt.hash(mot_de_passe, 10);
    const [resultat] = await pool.query(
      'INSERT INTO proprietaires (nom, email, mot_de_passe_hash) VALUES (?, ?, ?)',
      [String(nom).trim(), email, hash]
    );
    res.status(201).json({ message: 'Compte créé', id: resultat.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ---------------------------------------------------------------
// CONNEXION (propriétaires ET locataires) : POST /api/auth/connexion
// Le même formulaire sert aux deux : on cherche d'abord un propriétaire,
// puis un locataire qui a activé son espace.
// ---------------------------------------------------------------
router.post('/connexion', async (req, res) => {
  const { email, mot_de_passe } = req.body;
  if (!email || !mot_de_passe) {
    return res.status(400).json({ erreur: 'Email et mot de passe sont obligatoires' });
  }

  try {
    const [proprietaires] = await pool.query(
      'SELECT id, nom, email, telephone, mot_de_passe_hash FROM proprietaires WHERE email = ?',
      [email]
    );
    const p = proprietaires[0];
    if (p && (await bcrypt.compare(mot_de_passe, p.mot_de_passe_hash))) {
      const utilisateur = { id: p.id, nom: p.nom, email: p.email, telephone: p.telephone };
      return res.json({
        token: creerToken(p.id, p.email, 'proprietaire'),
        role: 'proprietaire',
        utilisateur,
        proprietaire: utilisateur,
      });
    }

    const [locataires] = await pool.query(
      `SELECT id, prenom, nom, email, mot_de_passe_hash FROM locataires
       WHERE email = ? AND mot_de_passe_hash IS NOT NULL`,
      [email]
    );
    const l = locataires[0];
    if (l && (await bcrypt.compare(mot_de_passe, l.mot_de_passe_hash))) {
      return res.json({
        token: creerToken(l.id, l.email, 'locataire'),
        role: 'locataire',
        utilisateur: { id: l.id, nom: `${l.prenom} ${l.nom}`, email: l.email },
      });
    }

    // Même message dans tous les cas : on ne révèle pas quels emails ont un compte
    res.status(401).json({ erreur: 'Email ou mot de passe incorrect' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ===============================================================
// MOT DE PASSE OUBLIÉ (propriétaires)
//  1. POST /api/auth/mot-de-passe-oublie  { email }  → email avec un lien
//  2. GET  /api/auth/reinitialiser/:jeton            → le lien est-il encore valable ?
//  3. POST /api/auth/reinitialiser/:jeton { mot_de_passe } → nouveau mot de passe + connexion
// Les locataires demandent un nouveau lien à leur propriétaire (route locataires.js).
// ===============================================================

// Adresse du site mise dans l'email. Jamais lue dans la requête : un pirate pourrait
// sinon faire envoyer un lien vers son propre site.
const SITE_URL = () =>
  (process.env.SITE_URL || (process.env.VERCEL === '1' ? 'https://monloyerfacile.vercel.app' : 'http://localhost:5173')).replace(/\/+$/, '');

const REPONSE_DEMANDE =
  'Si un compte propriétaire existe pour cette adresse, un email avec un lien vient d’être envoyé. Pensez à regarder dans les spams. Locataire ? Demandez un nouveau lien à votre propriétaire.';

// Limite simple : 5 demandes par quart d'heure et par adresse IP
const demandesParIp = new Map();
function tropDeDemandes(ip) {
  const maintenant = Date.now();
  const recentes = (demandesParIp.get(ip) || []).filter((t) => maintenant - t < 15 * 60 * 1000);
  recentes.push(maintenant);
  demandesParIp.set(ip, recentes);
  if (demandesParIp.size > 5000) demandesParIp.clear();
  return recentes.length > 5;
}

router.post('/mot-de-passe-oublie', async (req, res) => {
  const email = String(req.body.email || '').trim();
  if (!REGEX_EMAIL.test(email)) return res.status(400).json({ erreur: 'Adresse email invalide' });
  const ip = String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();
  if (tropDeDemandes(ip)) return res.status(429).json({ erreur: 'Trop de demandes. Réessayez dans un quart d’heure.' });

  try {
    const [[p]] = await pool.query(
      `SELECT id, nom, email, reset_demande_le > NOW() - INTERVAL 2 MINUTE AS trop_recent
       FROM proprietaires WHERE email = ?`,
      [email]
    );
    // Compte inconnu, ou demande toute récente : on répond pareil, sans rien envoyer
    if (p && !p.trop_recent) {
      const jeton = crypto.randomBytes(32).toString('hex');
      await pool.query(
        `UPDATE proprietaires SET reset_token = ?, reset_expire = NOW() + INTERVAL 1 HOUR, reset_demande_le = NOW()
         WHERE id = ?`,
        [empreinte(jeton), p.id]
      );
      const lien = `${SITE_URL()}/#/reinitialiser/${jeton}`;
      try {
        await envoyerEmail({ a: p.email, nom: p.nom, ...emailReinitialisation({ nom: p.nom, lien }) });
      } catch (err) {
        // L'erreur reste dans les logs du serveur ; le visiteur reçoit la réponse habituelle
        console.error('Email de réinitialisation :', err.message);
      }
    }
    res.json({ message: REPONSE_DEMANDE });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

async function demandeValide(jeton) {
  const [[p]] = await pool.query(
    'SELECT id, nom, email, telephone FROM proprietaires WHERE reset_token = ? AND reset_expire > NOW()',
    [empreinte(jeton)]
  );
  return p;
}

const LIEN_INVALIDE = 'Ce lien est invalide ou a expiré (il est valable 1 heure). Refaites une demande depuis l’écran de connexion.';

router.get('/reinitialiser/:jeton', async (req, res) => {
  try {
    const p = await demandeValide(req.params.jeton);
    if (!p) return res.status(404).json({ erreur: LIEN_INVALIDE });
    res.json({ nom: p.nom, email: p.email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

router.post('/reinitialiser/:jeton', async (req, res) => {
  const { mot_de_passe } = req.body;
  if (!mot_de_passe || mot_de_passe.length < 8) {
    return res.status(400).json({ erreur: 'Le mot de passe doit contenir au moins 8 caractères' });
  }
  try {
    const p = await demandeValide(req.params.jeton);
    if (!p) return res.status(404).json({ erreur: LIEN_INVALIDE });
    const hash = await bcrypt.hash(mot_de_passe, 10);
    // Le lien ne sert qu'une fois : on l'efface en même temps
    await pool.query(
      'UPDATE proprietaires SET mot_de_passe_hash = ?, reset_token = NULL, reset_expire = NULL WHERE id = ?',
      [hash, p.id]
    );
    const utilisateur = { id: p.id, nom: p.nom, email: p.email, telephone: p.telephone };
    res.json({ token: creerToken(p.id, p.email, 'proprietaire'), role: 'proprietaire', utilisateur, proprietaire: utilisateur });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

module.exports = router;

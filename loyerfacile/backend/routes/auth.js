const express = require('express');
// bcryptjs transforme un mot de passe en "hash" (chaîne illisible et irréversible)
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { creerToken } = require('../middleware/auth');
const { REGEX_EMAIL } = require('../constantes');

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
      'SELECT id, nom, email, mot_de_passe_hash FROM proprietaires WHERE email = ?',
      [email]
    );
    const p = proprietaires[0];
    if (p && (await bcrypt.compare(mot_de_passe, p.mot_de_passe_hash))) {
      const utilisateur = { id: p.id, nom: p.nom, email: p.email };
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

module.exports = router;

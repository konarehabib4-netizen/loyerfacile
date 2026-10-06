const express = require('express');
// bcryptjs transforme un mot de passe en "hash" (chaîne illisible et irréversible)
const bcrypt = require('bcryptjs');
// jsonwebtoken crée le jeton remis au propriétaire après connexion
const jwt = require('jsonwebtoken');
// Notre pool de connexions MySQL (le "../" remonte d'un dossier, car on est dans routes/)
const pool = require('../db');

// Un Router regroupe des routes dans un fichier séparé.
// Il sera branché dans server.js sous le préfixe /api/auth
const router = express.Router();

// ---------------------------------------------------------------
// INSCRIPTION : POST /api/auth/inscription
// ---------------------------------------------------------------
router.post('/inscription', async (req, res) => {
  // On extrait les 3 champs envoyés par le client dans le corps JSON
  const { nom, email, mot_de_passe } = req.body;

  // Validation : les trois champs sont obligatoires (400 = requête incorrecte)
  if (!nom || !email || !mot_de_passe) {
    return res.status(400).json({ erreur: 'Nom, email et mot de passe sont obligatoires' });
  }
  // Règle de sécurité minimale sur la longueur du mot de passe
  if (mot_de_passe.length < 8) {
    return res.status(400).json({ erreur: 'Le mot de passe doit contenir au moins 8 caractères' });
  }

  try {
    // Vérifie si l'email existe déjà.
    // Le "?" est remplacé par la valeur du tableau [email] : c'est une requête
    // préparée, qui protège contre les injections SQL.
    // pool.query renvoie [lignes, infos] : on récupère seulement les lignes.
    const [existants] = await pool.query(
      'SELECT id FROM proprietaires WHERE email = ?',
      [email]
    );
    // Si on trouve au moins une ligne, l'email est déjà pris (409 = conflit)
    if (existants.length > 0) {
      return res.status(409).json({ erreur: 'Cet email est déjà utilisé' });
    }

    // Hachage du mot de passe. Le 10 est le "coût" : plus il est élevé,
    // plus le calcul est lent et difficile à casser par force brute.
    // On ne stocke JAMAIS le mot de passe en clair.
    const hash = await bcrypt.hash(mot_de_passe, 10);

    // Enregistre le nouveau propriétaire. L'id est créé automatiquement (AUTO_INCREMENT)
    const [resultat] = await pool.query(
      'INSERT INTO proprietaires (nom, email, mot_de_passe_hash) VALUES (?, ?, ?)',
      [nom, email, hash]
    );

    // 201 = ressource créée. insertId est l'id attribué par MySQL.
    res.status(201).json({ message: 'Compte créé', id: resultat.insertId });
  } catch (err) {
    // Erreur imprévue : on l'affiche dans le terminal pour pouvoir la corriger,
    // mais on ne montre pas les détails au client (sécurité)
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ---------------------------------------------------------------
// CONNEXION : POST /api/auth/connexion
// ---------------------------------------------------------------
router.post('/connexion', async (req, res) => {
  const { email, mot_de_passe } = req.body;

  if (!email || !mot_de_passe) {
    return res.status(400).json({ erreur: 'Email et mot de passe sont obligatoires' });
  }

  try {
    // Cherche le propriétaire par son email
    const [lignes] = await pool.query(
      'SELECT id, nom, email, mot_de_passe_hash FROM proprietaires WHERE email = ?',
      [email]
    );
    // lignes[0] est le premier résultat, ou undefined si l'email n'existe pas
    const proprietaire = lignes[0];

    // Le propriétaire doit exister ET le mot de passe saisi doit correspondre au hash.
    // bcrypt.compare refait le calcul et compare : il ne "déchiffre" pas le hash.
    // Le && évite d'appeler bcrypt si le propriétaire n'existe pas.
    const valide = proprietaire &&
      (await bcrypt.compare(mot_de_passe, proprietaire.mot_de_passe_hash));

    // Même message que l'email soit faux ou le mot de passe faux :
    // on ne révèle pas quels emails ont un compte (401 = non authentifié)
    if (!valide) {
      return res.status(401).json({ erreur: 'Email ou mot de passe incorrect' });
    }

    // Création du jeton JWT. Il contient l'id et l'email (le "payload"),
    // il est signé avec notre clé secrète et expire au bout de 7 jours.
    // Personne ne peut le modifier sans connaître JWT_SECRET.
    const token = jwt.sign(
      { id: proprietaire.id, email: proprietaire.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // On renvoie le jeton et les infos utiles (surtout pas le hash du mot de passe)
    res.json({
      token,
      proprietaire: { id: proprietaire.id, nom: proprietaire.nom, email: proprietaire.email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// Exporte le router pour le brancher dans server.js
module.exports = router;
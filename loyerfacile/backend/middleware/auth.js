// jsonwebtoken sert à créer et à vérifier les jetons JWT
const jwt = require('jsonwebtoken');

// Clé secrète qui signe les jetons. .trim() retire les espaces ou retours à la ligne
// copiés par erreur en collant la clé (dans .env ou dans Vercel).
function cleSecrete() {
  const cle = (process.env.JWT_SECRET || '').trim();
  if (!cle) throw new Error('JWT_SECRET manquant : ajoute-le dans .env ou dans les variables Vercel');
  return cle;
}

// Un "middleware" est une fonction qui s'exécute AVANT la route.
// Ici, il joue le rôle de videur : il laisse passer uniquement
// les requêtes qui contiennent un jeton valide.
function verifierToken(req, res, next) {
  // Le client envoie son jeton dans l'en-tête "Authorization" : "Bearer eyJhbGciOi..."
  const entete = req.headers.authorization;
  if (!entete || !entete.startsWith('Bearer ')) {
    return res.status(401).json({ erreur: 'Connexion requise' });
  }

  try {
    // jwt.verify contrôle la signature avec notre clé secrète et la date d'expiration
    const donnees = jwt.verify(entete.split(' ')[1], cleSecrete());
    // Les anciens jetons n'avaient pas de rôle : ils appartiennent à des propriétaires
    donnees.role = donnees.role || 'proprietaire';
    req.utilisateur = donnees;
    req.proprietaire = donnees; // nom utilisé par les routes propriétaire
    next();
  } catch {
    res.status(401).json({ erreur: 'Jeton invalide ou expiré' });
  }
}

// Réserve une route à un rôle ('proprietaire' ou 'locataire').
// ESSENTIEL : sans ça, un locataire (id 3) pourrait appeler les routes
// propriétaire et serait pris pour le propriétaire n°3.
function exigerRole(role) {
  return (req, res, next) => {
    if (req.utilisateur?.role !== role) {
      return res.status(403).json({ erreur: 'Accès non autorisé pour ce compte' });
    }
    next();
  };
}

// Crée le jeton remis après connexion (valable 7 jours)
function creerToken(id, email, role) {
  return jwt.sign({ id, email, role }, cleSecrete(), { expiresIn: '7d' });
}

module.exports = verifierToken;
module.exports.verifierToken = verifierToken;
module.exports.exigerRole = exigerRole;
module.exports.creerToken = creerToken;

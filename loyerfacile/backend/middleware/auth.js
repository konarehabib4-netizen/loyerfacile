// jsonwebtoken sert à créer et à vérifier les jetons JWT
const jwt = require('jsonwebtoken');

// Un "middleware" est une fonction qui s'exécute AVANT la route.
// Ici, il joue le rôle de videur : il laisse passer uniquement
// les requêtes qui contiennent un jeton valide.
// Paramètres :
//   req  = la requête reçue (contient les en-têtes, le corps...)
//   res  = la réponse qu'on peut renvoyer
//   next = fonction à appeler pour laisser passer vers la route suivante
function verifierToken(req, res, next) {
  // Le client envoie son jeton dans l'en-tête "Authorization"
  // sous la forme : "Bearer eyJhbGciOi..."
  const entete = req.headers.authorization;

  // Pas d'en-tête, ou format incorrect : on refuse (401 = non authentifié)
  if (!entete || !entete.startsWith('Bearer ')) {
    return res.status(401).json({ erreur: 'Connexion requise' });
  }

  try {
    // entete.split(' ')[1] récupère uniquement le jeton (la partie après "Bearer ")
    // jwt.verify contrôle la signature avec notre clé secrète et la date d'expiration.
    // Si le jeton est faux ou expiré, il lance une erreur (traitée dans le catch).
    const donnees = jwt.verify(entete.split(' ')[1], process.env.JWT_SECRET);

    // On stocke l'identité du propriétaire dans la requête :
    // les routes suivantes pourront lire req.proprietaire.id
    req.proprietaire = donnees;

    // Tout est bon : on passe à la route suivante
    next();
  } catch (err) {
    res.status(401).json({ erreur: 'Jeton invalide ou expiré' });
  }
}

// On exporte la fonction pour l'utiliser dans server.js et les routes
module.exports = verifierToken;
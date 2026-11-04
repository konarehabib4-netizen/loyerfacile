// Fournit à toute l'application : l'utilisateur connecté (propriétaire ou
// locataire), son rôle, connexion, inscription, invitation et déconnexion.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, enregistrerToken, lireToken } from '../api';
import { AuthContext } from './auth-context';

// Lit le rôle contenu dans le jeton JWT (partie du milieu, encodée en base64).
// Ce n'est qu'un affichage : c'est le serveur qui vérifie vraiment le rôle.
function roleDuToken(token) {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.role || 'proprietaire';
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(lireToken);
  const [utilisateur, setUtilisateur] = useState(null);
  const [verification, setVerification] = useState(() => !!lireToken());
  const role = roleDuToken(token);

  const deconnecte = useCallback(() => {
    enregistrerToken(null);
    setToken(null);
    setUtilisateur(null);
  }, []);

  // Au chargement : le jeton enregistré est-il encore valide ?
  useEffect(() => {
    if (!token || utilisateur) return;
    let annule = false;
    const chemin = role === 'locataire' ? '/locataire/moi' : '/proprietaire/profil';
    api(chemin)
      .then((d) => {
        if (annule) return;
        if (role === 'locataire') setUtilisateur({ id: d.locataire.id, nom: `${d.locataire.prenom} ${d.locataire.nom}`, email: d.locataire.email });
        else setUtilisateur(d);
      })
      .catch(() => !annule && deconnecte())
      .finally(() => !annule && setVerification(false));
    return () => {
      annule = true;
    };
  }, [token, role, utilisateur, deconnecte]);

  // Jeton expiré pendant l'utilisation -> retour à la connexion
  useEffect(() => {
    window.addEventListener('loyerfacile:session-expiree', deconnecte);
    return () => window.removeEventListener('loyerfacile:session-expiree', deconnecte);
  }, [deconnecte]);

  // Réponse de connexion (propriétaire ou locataire) -> session ouverte
  const ouvrirSession = useCallback((data) => {
    enregistrerToken(data.token);
    setUtilisateur(data.utilisateur);
    setToken(data.token);
  }, []);

  const connexion = useCallback(
    async (email, motDePasse) => {
      ouvrirSession(await api('/auth/connexion', { method: 'POST', body: { email, mot_de_passe: motDePasse } }));
    },
    [ouvrirSession],
  );

  const inscription = useCallback(
    async (nom, email, motDePasse) => {
      await api('/auth/inscription', { method: 'POST', body: { nom, email, mot_de_passe: motDePasse } });
      await connexion(email, motDePasse);
    },
    [connexion],
  );

  const accepterInvitation = useCallback(
    async (jeton, email, motDePasse) => {
      ouvrirSession(await api(`/locataire/invitation/${jeton}`, { method: 'POST', body: { email, mot_de_passe: motDePasse } }));
    },
    [ouvrirSession],
  );

  const value = useMemo(
    () => ({
      estConnecte: !!token && !!utilisateur,
      verification: verification && !utilisateur,
      role,
      utilisateur,
      proprietaire: role === 'proprietaire' ? utilisateur : null,
      connexion,
      inscription,
      accepterInvitation,
      deconnecte,
    }),
    [token, utilisateur, verification, role, connexion, inscription, accepterInvitation, deconnecte],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

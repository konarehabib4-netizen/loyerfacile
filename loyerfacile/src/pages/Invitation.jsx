// Page ouverte depuis le lien envoyé par le propriétaire : #/invitation/<jeton>
// Le locataire y choisit son email et son mot de passe.
import { useState } from 'react';
import AuthLayout from '../components/AuthLayout';
import Icon from '../components/Icon';
import { Alerte, Champ, Squelette } from '../components/ui';
import { useAuth } from '../context/auth-context';
import { useApi } from '../useApi';

export default function Invitation({ jeton }) {
  const { accepterInvitation } = useAuth();
  const invitation = useApi(`/locataire/invitation/${jeton}`);
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const inv = invitation.data;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (motDePasse !== confirmation) return setErreur('Les deux mots de passe ne sont pas identiques.');
    setErreur('');
    setEnvoi(true);
    try {
      await accepterInvitation(jeton, email.trim(), motDePasse);
      window.location.hash = '#/';
    } catch (err) {
      setErreur(err.message);
      setEnvoi(false);
    }
  };

  if (invitation.erreur) {
    return (
      <AuthLayout titre="Lien expiré" sousTitre={invitation.erreur} pied={<a href="#/">Aller à la connexion</a>}>
        <div className="vide-icone">
          <Icon name="alert" size={26} />
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      titre={inv ? `Bienvenue ${inv.prenom} 👋` : 'Bienvenue 👋'}
      sousTitre="Créez votre espace locataire pour suivre vos loyers et déclarer vos paiements."
      pied={
        <>
          Déjà un compte ? <a href="#/">Se connecter</a>
        </>
      }
    >
      {!inv ? (
        <Squelette lignes={4} />
      ) : (
        <>
          <div className="invitation-logement">
            <span className="pastille-icone">
              <Icon name="door" size={18} />
            </span>
            <span>
              <strong>
                {inv.unite} · {inv.nom_immeuble}
              </strong>
              <small>Propriétaire : {inv.proprietaire}</small>
            </span>
          </div>
          <form className="formulaire" onSubmit={handleSubmit}>
            <Alerte>{erreur}</Alerte>
            <Champ label="Votre adresse email" aide="Elle vous servira à vous connecter.">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" autoComplete="email" required />
            </Champ>
            <Champ label="Mot de passe" aide="8 caractères minimum">
              <input type="password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} autoComplete="new-password" minLength={8} required />
            </Champ>
            <Champ label="Confirmez le mot de passe">
              <input type="password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} autoComplete="new-password" minLength={8} required />
            </Champ>
            <button type="submit" className="btn btn-primaire btn-plein" disabled={envoi}>
              {envoi ? 'Création…' : 'Activer mon espace'}
            </button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}

// Page ouverte depuis l'email « mot de passe oublié » : #/reinitialiser/<jeton>
// Le propriétaire choisit un nouveau mot de passe, puis il est connecté directement.
import { useState } from 'react';
import AuthLayout from '../../components/layout/AuthLayout';
import Icon from '../../components/ui/Icon';
import { Alerte, Champ, Squelette } from '../../components/ui/ui';
import { useAuth } from '../../context/auth-context';
import { useApi } from '../../hooks/useApi';

export default function Reinitialiser({ jeton }) {
  const { reinitialiserMotDePasse } = useAuth();
  const demande = useApi(`/auth/reinitialiser/${jeton}`);
  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (motDePasse !== confirmation) return setErreur('Les deux mots de passe ne sont pas identiques.');
    setErreur('');
    setEnvoi(true);
    try {
      await reinitialiserMotDePasse(jeton, motDePasse);
      window.location.hash = '#/';
    } catch (err) {
      setErreur(err.message);
      setEnvoi(false);
    }
  };

  if (demande.erreur) {
    return (
      <AuthLayout titre="Lien expiré" sousTitre={demande.erreur} pied={<a href="#/mot-de-passe-oublie">Refaire une demande</a>}>
        <div className="vide-icone">
          <Icon name="alert" size={26} />
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      titre="Nouveau mot de passe"
      sousTitre={demande.data ? `Compte : ${demande.data.email}` : 'Vérification du lien…'}
      pied={<a href="#/">← Retour à la connexion</a>}
    >
      {!demande.data ? (
        <Squelette lignes={3} />
      ) : (
        <form className="formulaire" onSubmit={handleSubmit}>
          <Alerte>{erreur}</Alerte>
          <Champ label="Nouveau mot de passe" aide="8 caractères minimum">
            <input type="password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} autoComplete="new-password" minLength={8} required />
          </Champ>
          <Champ label="Confirmez le mot de passe">
            <input type="password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} autoComplete="new-password" minLength={8} required />
          </Champ>
          <button type="submit" className="btn btn-primaire btn-plein" disabled={envoi}>
            {envoi ? 'Enregistrement…' : 'Enregistrer et me connecter'}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}

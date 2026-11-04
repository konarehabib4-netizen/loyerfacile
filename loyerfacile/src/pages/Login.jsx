import { useState } from 'react';
import AuthLayout from '../components/AuthLayout';
import { Alerte, Champ } from '../components/ui';
import { useAuth } from '../context/auth-context';

export default function Login() {
  const { connexion } = useAuth();
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur('');
    setEnvoi(true);
    try {
      await connexion(email.trim(), motDePasse);
    } catch (err) {
      setErreur(err.message);
      setEnvoi(false);
    }
  };

  return (
    <AuthLayout
      titre="Bon retour 👋"
      sousTitre="Propriétaire ou locataire, connectez-vous à votre espace."
      pied={
        <>
          Propriétaire sans compte ? <a href="#/inscription">Créer un compte</a>
          <br />
          <small>Locataire ? Utilisez le lien d’invitation envoyé par votre propriétaire.</small>
        </>
      }
    >
      <form className="formulaire" onSubmit={handleSubmit}>
        <Alerte>{erreur}</Alerte>
        <Champ label="Adresse email">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" autoComplete="email" required />
        </Champ>
        <Champ label="Mot de passe">
          <input type="password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} placeholder="••••••••" autoComplete="current-password" required />
        </Champ>
        <button type="submit" className="btn btn-primaire btn-plein" disabled={envoi}>
          {envoi ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </AuthLayout>
  );
}

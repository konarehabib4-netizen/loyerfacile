// Page « Mot de passe oublié ? » : #/mot-de-passe-oublie
// Le propriétaire saisit son email ; s'il a un compte, il reçoit un lien valable 1 heure.
// La réponse est la même que l'email existe ou non (on ne révèle pas qui a un compte).
import { useState } from 'react';
import AuthLayout from '../../components/layout/AuthLayout';
import Icon from '../../components/ui/Icon';
import { Alerte, Champ } from '../../components/ui/ui';
import { api } from '../../services/api';

export default function MotDePasseOublie() {
  const [email, setEmail] = useState('');
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur('');
    setEnvoi(true);
    try {
      const r = await api('/auth/mot-de-passe-oublie', { method: 'POST', body: { email: email.trim() } });
      setMessage(r.message);
    } catch (err) {
      setErreur(err.message);
    }
    setEnvoi(false);
  };

  return (
    <AuthLayout
      titre="Mot de passe oublié ?"
      sousTitre="Indiquez l’email de votre compte propriétaire : nous vous envoyons un lien pour en choisir un nouveau."
      pied={<a href="#/">← Retour à la connexion</a>}
    >
      {message ? (
        <div className="confirmation" role="status">
          <Icon name="check" size={20} />
          <p>{message}</p>
        </div>
      ) : (
        <form className="formulaire" onSubmit={handleSubmit}>
          <Alerte>{erreur}</Alerte>
          <Champ label="Adresse email">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" autoComplete="email" required />
          </Champ>
          <button type="submit" className="btn btn-primaire btn-plein" disabled={envoi}>
            {envoi ? 'Envoi…' : 'Recevoir le lien'}
          </button>
          <p className="champ-aide">
            Vous êtes locataire ? Demandez à votre propriétaire un nouveau lien d’accès : il vous l’envoie sur WhatsApp en un clic.
          </p>
        </form>
      )}
    </AuthLayout>
  );
}

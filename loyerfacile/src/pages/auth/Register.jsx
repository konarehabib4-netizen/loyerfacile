import { useState } from 'react';
import AuthLayout from '../../components/layout/AuthLayout';
import { Alerte, Champ } from '../../components/ui/ui';
import { useAuth } from '../../context/auth-context';

export default function Register() {
  const { inscription } = useAuth();
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur('');
    setEnvoi(true);
    try {
      await inscription(nom.trim(), email.trim(), motDePasse);
      window.location.hash = '#/';
    } catch (err) {
      setErreur(err.message);
      setEnvoi(false);
    }
  };

  return (
    <AuthLayout
      titre="Créer votre compte"
      sousTitre="Quelques secondes suffisent pour commencer à gérer vos biens."
      pied={
        <>
          Déjà inscrit ? <a href="#/">Se connecter</a>
        </>
      }
    >
      <form className="formulaire" onSubmit={handleSubmit}>
        <Alerte>{erreur}</Alerte>
        <Champ label="Nom complet">
          <input type="text" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Konan Yao" autoComplete="name" required />
        </Champ>
        <Champ label="Adresse email">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" autoComplete="email" required />
        </Champ>
        <Champ label="Mot de passe" aide="8 caractères minimum">
          <input type="password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} placeholder="••••••••" autoComplete="new-password" minLength={8} required />
        </Champ>
        <button type="submit" className="btn btn-primaire btn-plein" disabled={envoi}>
          {envoi ? 'Création du compte…' : 'Créer mon compte'}
        </button>
      </form>
    </AuthLayout>
  );
}

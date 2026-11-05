// « Mon profil » du propriétaire : nom et téléphone.
// Le téléphone permet aux locataires de lui écrire sur WhatsApp depuis leur espace.
import { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/auth-context';
import { Alerte, Champ, Modal } from './ui';

export default function ProfilModal({ onClose }) {
  const { utilisateur, majUtilisateur } = useAuth();
  const [nom, setNom] = useState(utilisateur?.nom || '');
  const [telephone, setTelephone] = useState(utilisateur?.telephone || '');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const enregistrer = async (e) => {
    e.preventDefault();
    setEnvoi(true);
    setErreur('');
    try {
      await api('/proprietaire/profil', { method: 'PATCH', body: { nom, telephone } });
      majUtilisateur({ nom: nom.trim(), telephone: telephone.trim() });
      onClose();
    } catch (err) {
      setErreur(err.message);
      setEnvoi(false);
    }
  };

  return (
    <Modal titre="Mon profil" sousTitre="Votre numéro permet à vos locataires de vous écrire sur WhatsApp depuis leur espace." onClose={onClose}>
      <form className="formulaire" onSubmit={enregistrer}>
        <Alerte>{erreur}</Alerte>
        <Champ label="Nom affiché">
          <input value={nom} onChange={(e) => setNom(e.target.value)} required />
        </Champ>
        <Champ label="Téléphone (WhatsApp)">
          <input type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="07 00 00 00 00" />
        </Champ>
        <Champ label="Adresse email">
          <input value={utilisateur?.email || ''} disabled />
        </Champ>
        <div className="modal-actions">
          <button type="button" className="btn btn-fantome" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn btn-primaire" disabled={envoi}>
            {envoi ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

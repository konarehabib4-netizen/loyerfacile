// Formulaire d'ajout / modification d'un immeuble (dans une modale).
import { useState } from 'react';
import { api } from '../../services/api';
import { Alerte, Champ, Modal } from '../ui/ui';

export default function BienForm({ bien, onClose, onSaved }) {
  const [form, setForm] = useState({
    nom_immeuble: bien?.nom_immeuble || '',
    adresse: bien?.adresse || '',
    type_logement: bien?.type_logement || 'appartement',
    nb_pieces: bien?.nb_pieces ?? 1,
  });
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const maj = (champ) => (e) => setForm((f) => ({ ...f, [champ]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnvoi(true);
    setErreur('');
    try {
      const body = { ...form, nb_pieces: Number(form.nb_pieces) || 1 };
      const res = bien
        ? await api(`/immeubles/${bien.id}`, { method: 'PATCH', body })
        : await api('/immeubles', { method: 'POST', body });
      onSaved(res.id);
    } catch (err) {
      setErreur(err.message);
      setEnvoi(false);
    }
  };

  return (
    <Modal titre={bien ? 'Modifier le bien' : 'Nouveau bien'} sousTitre="Les loyers se définissent ensuite pour chaque unité." onClose={onClose}>
      <form className="formulaire grille-2" onSubmit={handleSubmit}>
        <Alerte>{erreur}</Alerte>
        <Champ label="Nom du bien *" large>
          <input value={form.nom_immeuble} onChange={maj('nom_immeuble')} placeholder="Résidence Les Palmiers" required />
        </Champ>
        <Champ label="Adresse" large>
          <input value={form.adresse} onChange={maj('adresse')} placeholder="Cocody Angré, Abidjan" />
        </Champ>
        <Champ label="Type">
          <select value={form.type_logement} onChange={maj('type_logement')}>
            <option value="appartement">Immeuble d’appartements</option>
            <option value="maison">Maison / villa</option>
            <option value="cour commune">Cour commune</option>
            <option value="local commercial">Local commercial</option>
          </select>
        </Champ>
        <Champ label="Niveaux / pièces">
          <input type="number" min="1" value={form.nb_pieces} onChange={maj('nb_pieces')} />
        </Champ>
        <div className="modal-actions">
          <button type="button" className="btn btn-fantome" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn btn-primaire" disabled={envoi}>
            {envoi ? 'Enregistrement…' : bien ? 'Enregistrer' : 'Créer le bien'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

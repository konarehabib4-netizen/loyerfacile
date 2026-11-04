// Fenêtre « Sortie du locataire » : date, caution, retenues, impayés,
// et calcul en direct du montant à rendre.
import { useEffect, useState } from 'react';
import { api } from '../api';
import { aujourdhui, fcfa, moisLabel } from '../format';
import Icon from './Icon';
import { Alerte, Champ, Modal, Squelette } from './ui';

export default function SortieModal({ base, locataire, onClose, onDone }) {
  const [date, setDate] = useState(aujourdhui);
  const [apercu, setApercu] = useState(null);
  const [caution, setCaution] = useState('');
  const [retenues, setRetenues] = useState([{ libelle: '', montant: '' }]);
  const [deduire, setDeduire] = useState(true);
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const chemin = `${base}/locataires/${locataire.id}/sortie`;

  // Impayés à la date de sortie choisie (recalculés quand la date change)
  useEffect(() => {
    let annule = false;
    api(`${chemin}/apercu?date=${date}`)
      .then((a) => {
        if (annule) return;
        setApercu(a);
        setCaution((c) => (c === '' ? String(a.caution) : c));
      })
      .catch((e) => !annule && setErreur(e.message));
    return () => {
      annule = true;
    };
  }, [chemin, date]);

  const montantCaution = Number(caution) || 0;
  const totalRetenues = retenues.reduce((t, r) => t + (Number(r.montant) || 0), 0);
  const impayes = apercu?.impayes || 0;
  const disponible = Math.max(0, montantCaution - totalRetenues);
  const deduit = deduire ? Math.min(disponible, impayes) : 0;
  const aRendre = disponible - deduit;
  const resteDu = impayes - deduit + Math.max(0, totalRetenues - montantCaution);

  const majRetenue = (i, champ, valeur) => setRetenues((rs) => rs.map((r, j) => (j === i ? { ...r, [champ]: valeur } : r)));

  const valider = async (e) => {
    e.preventDefault();
    if (!window.confirm(`Confirmer la sortie de ${locataire.prenom} ${locataire.nom} ? Cette opération ne peut pas être annulée.`)) return;
    setEnvoi(true);
    setErreur('');
    try {
      const res = await api(chemin, {
        method: 'POST',
        body: { date_sortie: date, caution: montantCaution, deduire_impayes: deduire, retenues: retenues.map((r) => ({ libelle: r.libelle, montant: Number(r.montant) || 0 })) },
      });
      onDone(res.decompte);
    } catch (err) {
      setErreur(err.message);
      setEnvoi(false);
    }
  };

  return (
    <Modal titre={`Sortie de ${locataire.prenom} ${locataire.nom}`} sousTitre={`${locataire.unite} · décompte de la caution`} onClose={onClose}>
      <form className="formulaire" onSubmit={valider}>
        <Alerte>{erreur}</Alerte>
        <div className="grille-2 formulaire">
          <Champ label="Date de sortie">
            <input type="date" value={date} min={apercu?.date_entree} onChange={(e) => e.target.value && setDate(e.target.value)} required />
          </Champ>
          <Champ label="Caution détenue (F CFA)">
            <input type="number" min="0" value={caution} onChange={(e) => setCaution(e.target.value)} />
          </Champ>
        </div>

        <div className="champ">
          <span className="champ-label">Retenues sur la caution</span>
          <ul className="retenues">
            {retenues.map((r, i) => (
              <li key={i}>
                <input value={r.libelle} onChange={(e) => majRetenue(i, 'libelle', e.target.value)} placeholder="Ex. : peinture, serrure, facture CIE" aria-label="Libellé de la retenue" />
                <input type="number" min="0" value={r.montant} onChange={(e) => majRetenue(i, 'montant', e.target.value)} placeholder="Montant" aria-label="Montant de la retenue" />
                <button type="button" className="btn-icone danger" onClick={() => setRetenues((rs) => rs.filter((_, j) => j !== i))} aria-label="Retirer cette retenue">
                  <Icon name="x" size={16} />
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn-fantome petit ajout-ligne" onClick={() => setRetenues((rs) => [...rs, { libelle: '', montant: '' }])}>
            <Icon name="plus" size={15} /> Ajouter une retenue
          </button>
        </div>

        {!apercu ? (
          <Squelette lignes={3} />
        ) : (
          <>
            {impayes > 0 && (
              <label className="case">
                <input type="checkbox" checked={deduire} onChange={(e) => setDeduire(e.target.checked)} />
                <span>
                  Prendre les <strong>{fcfa(impayes)}</strong> d’impayés sur la caution
                  <small>{apercu.mois_impayes.map((m) => `${moisLabel(m.mois)} (${fcfa(m.reste)})`).join(', ')}</small>
                </span>
              </label>
            )}
            <table className="decompte-lignes">
              <tbody>
                <tr>
                  <td>Caution</td>
                  <td>{fcfa(montantCaution)}</td>
                </tr>
                {totalRetenues > 0 && (
                  <tr className="moins">
                    <td>Retenues</td>
                    <td>− {fcfa(totalRetenues)}</td>
                  </tr>
                )}
                {deduit > 0 && (
                  <tr className="moins">
                    <td>Impayés réglés avec la caution</td>
                    <td>− {fcfa(deduit)}</td>
                  </tr>
                )}
                <tr className="total">
                  <td>À rendre au locataire</td>
                  <td>{fcfa(aRendre)}</td>
                </tr>
                {resteDu > 0 && (
                  <tr className="total rouge">
                    <td>Reste dû par le locataire</td>
                    <td>{fcfa(resteDu)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        )}

        <div className="modal-actions">
          <button type="button" className="btn btn-fantome" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn btn-primaire" disabled={envoi || !apercu}>
            {envoi ? 'Enregistrement…' : 'Valider la sortie'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

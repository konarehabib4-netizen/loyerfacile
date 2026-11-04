// Décompte de sortie imprimable (utilisé côté propriétaire ET côté locataire)
import Icon from './Icon';
import { Modal } from './ui';
import { dateFr, fcfa } from '../format';

export function DecompteContenu({ d }) {
  return (
    <div className="recu decompte" id="recu">
      <div className="recu-tete">
        <span className="marque">
          <span className="marque-logo">
            <Icon name="key" size={16} />
          </span>
          <span>
            Loyer<b>Facile</b>
          </span>
        </span>
        <span className="recu-numero">Décompte de sortie · {dateFr(d.regle_le)}</span>
      </div>

      <dl className="recu-details">
        <dt>Locataire</dt>
        <dd>{d.locataire}</dd>
        <dt>Logement</dt>
        <dd>{d.logement}</dd>
        <dt>Propriétaire</dt>
        <dd>{d.proprietaire}</dd>
        <dt>Période</dt>
        <dd>
          du {dateFr(d.date_entree)} au {dateFr(d.date_sortie)}
        </dd>
      </dl>

      <table className="decompte-lignes">
        <tbody>
          <tr>
            <td>Caution versée à l’entrée</td>
            <td>{fcfa(d.caution)}</td>
          </tr>
          {d.retenues.map((r, i) => (
            <tr key={i} className="moins">
              <td>Retenue : {r.libelle}</td>
              <td>− {fcfa(r.montant)}</td>
            </tr>
          ))}
          {d.impayes_deduits > 0 && (
            <tr className="moins">
              <td>Loyers impayés réglés avec la caution</td>
              <td>− {fcfa(d.impayes_deduits)}</td>
            </tr>
          )}
          <tr className="total">
            <td>Montant rendu au locataire</td>
            <td>{fcfa(d.a_rendre)}</td>
          </tr>
          {d.reste_du > 0 && (
            <tr className="total rouge">
              <td>Reste dû par le locataire</td>
              <td>{fcfa(d.reste_du)}</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="signatures">
        <span>Signature du propriétaire</span>
        <span>Signature du locataire</span>
      </div>
    </div>
  );
}

export default function DecompteModal({ d, onClose }) {
  return (
    <Modal titre="Décompte de sortie" sousTitre="À imprimer ou enregistrer en PDF, puis à signer par les deux parties." onClose={onClose}>
      <DecompteContenu d={d} />
      <div className="modal-actions">
        <button type="button" className="btn btn-fantome" onClick={onClose}>
          Fermer
        </button>
        <button type="button" className="btn btn-primaire" onClick={() => window.print()}>
          Imprimer / PDF
        </button>
      </div>
    </Modal>
  );
}

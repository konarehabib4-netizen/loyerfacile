// Détail d'un bien : onglets Unités / Locataires / Paiements.
// L'onglet actif est dans l'URL (#/biens/3/locataires) : on peut le partager ou y revenir.
import { useState } from 'react';
import { api } from '../api';
import BienForm from '../components/BienForm';
import DecompteModal from '../components/Decompte';
import SortieModal from '../components/SortieModal';
import Icon from '../components/Icon';
import { Alerte, Badge, BoutonWhatsApp, Champ, Modal, Squelette, Vide } from '../components/ui';
import { useAuth } from '../context/auth-context';
import { lienWhatsApp, messageRecu, messageRelance } from '../whatsapp';
import { ETATS_UNITE, MODES_PAIEMENT, libelleMode, STATUTS_PAIEMENT, aujourdhui, dateFr, fcfa, initiales, moisCourant, moisLabel } from '../format';
import { naviguer } from '../router';
import { useApi } from '../useApi';

const ONGLETS = [
  { id: 'unites', label: 'Unités', icone: 'door' },
  { id: 'locataires', label: 'Locataires', icone: 'users' },
  { id: 'paiements', label: 'Paiements', icone: 'wallet' },
];

const TON_ETAT = { disponible: 'vert', 'Occupé': 'bleu', en_maintenance: 'orange' };
const TON_PAIEMENT = { paye: 'vert', en_attente: 'orange', refuse: 'rouge' };

// Petit formulaire générique dans une modale
function FormModal({ titre, sousTitre, initial, onClose, onSubmit, children, bouton }) {
  const [form, setForm] = useState(initial);
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const maj = (champ) => (e) => setForm((f) => ({ ...f, [champ]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnvoi(true);
    setErreur('');
    try {
      await onSubmit(form);
    } catch (err) {
      setErreur(err.message);
      setEnvoi(false);
    }
  };

  return (
    <Modal titre={titre} sousTitre={sousTitre} onClose={onClose}>
      <form className="formulaire grille-2" onSubmit={handleSubmit}>
        <Alerte>{erreur}</Alerte>
        {children(form, maj, setForm)}
        <div className="modal-actions">
          <button type="button" className="btn btn-fantome" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn btn-primaire" disabled={envoi}>
            {envoi ? 'Enregistrement…' : bouton}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------- Unités
function OngletUnites({ base, unites, onChange }) {
  const [edition, setEdition] = useState(null); // null | {} (nouvelle) | unité
  const [erreur, setErreur] = useState('');

  const supprimer = async (u) => {
    if (!window.confirm(`Supprimer l’unité « ${u.label} » ? Ses locataires et paiements seront aussi supprimés.`)) return;
    try {
      await api(`${base}/unites/${u.id}`, { method: 'DELETE' });
      onChange();
    } catch (e) {
      setErreur(e.message);
    }
  };

  return (
    <>
      <div className="onglet-barre">
        <p className="texte-muet">Appartements, studios, chambres ou magasins de ce bien.</p>
        <button className="btn btn-primaire" onClick={() => setEdition({})}>
          <Icon name="plus" size={18} /> Ajouter une unité
        </button>
      </div>
      <Alerte>{erreur}</Alerte>

      {unites.length === 0 ? (
        <Vide icone="door" titre="Aucune unité" texte="Ajoutez les logements de ce bien et leur loyer mensuel." />
      ) : (
        <div className="grille-unites">
          {unites.map((u) => (
            <article key={u.id} className="unite">
              <div className="ligne-entre">
                <h3>{u.label}</h3>
                <Badge ton={TON_ETAT[u.etat]}>{ETATS_UNITE[u.etat] || u.etat}</Badge>
              </div>
              <p className="unite-loyer">
                {fcfa(u.loyer_mensuel)}
                <small> / mois</small>
              </p>
              <p className="unite-info">
                {u.locataire ? (
                  <>
                    <Icon name="users" size={15} /> {u.locataire}
                  </>
                ) : (
                  <span className="texte-muet">Pas de locataire</span>
                )}
                {u.surface > 0 && <span className="texte-muet"> · {u.surface} m²</span>}
              </p>
              <div className="unite-actions">
                <button className="btn-icone" onClick={() => setEdition(u)} aria-label={`Modifier ${u.label}`}>
                  <Icon name="edit" size={17} />
                </button>
                <button className="btn-icone danger" onClick={() => supprimer(u)} aria-label={`Supprimer ${u.label}`}>
                  <Icon name="trash" size={17} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {edition && (
        <FormModal
          titre={edition.id ? `Modifier ${edition.label}` : 'Nouvelle unité'}
          bouton={edition.id ? 'Enregistrer' : 'Ajouter'}
          initial={{
            label: edition.label || '',
            loyer_mensuel: edition.loyer_mensuel ?? '',
            surface: edition.surface || '',
            etat: edition.etat || 'disponible',
          }}
          onClose={() => setEdition(null)}
          onSubmit={async (f) => {
            const body = { ...f, loyer_mensuel: Number(f.loyer_mensuel) || 0, surface: Number(f.surface) || 0 };
            if (edition.id) await api(`${base}/unites/${edition.id}`, { method: 'PATCH', body });
            else await api(`${base}/unites`, { method: 'POST', body });
            setEdition(null);
            onChange();
          }}
        >
          {(f, maj) => (
            <>
              <Champ label="Nom de l’unité *" large>
                <input value={f.label} onChange={maj('label')} placeholder="Appartement A2, Studio 4…" required />
              </Champ>
              <Champ label="Loyer mensuel (F CFA) *">
                <input type="number" min="0" step="500" value={f.loyer_mensuel} onChange={maj('loyer_mensuel')} placeholder="75000" required />
              </Champ>
              <Champ label="Surface (m²)">
                <input type="number" min="0" value={f.surface} onChange={maj('surface')} placeholder="45" />
              </Champ>
              {edition.id && (
                <Champ label="État" large>
                  <select value={f.etat} onChange={maj('etat')}>
                    {Object.entries(ETATS_UNITE).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </Champ>
              )}
            </>
          )}
        </FormModal>
      )}
    </>
  );
}

// ---------------------------------------------------------------- Invitation
// Génère le lien d'invitation et propose de l'envoyer par WhatsApp ou SMS.
function InvitationModal({ base, locataire, onClose, onDone }) {
  const [lien, setLien] = useState('');
  const [erreur, setErreur] = useState('');
  const [copie, setCopie] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  const generer = async () => {
    setEnvoi(true);
    setErreur('');
    try {
      const { jeton } = await api(`${base}/locataires/${locataire.id}/invitation`, { method: 'POST' });
      setLien(`${window.location.origin}${window.location.pathname}#/invitation/${jeton}`);
      onDone();
    } catch (e) {
      setErreur(e.message);
    }
    setEnvoi(false);
  };

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(lien);
      setCopie(true);
    } catch {
      setErreur('Copie impossible : sélectionnez le lien et copiez-le à la main.');
    }
  };

  const texte = `Bonjour ${locataire.prenom}, voici votre lien pour accéder à votre espace locataire LoyerFacile (suivi des loyers, déclaration de paiement) : ${lien}`;
  const whatsapp = lienWhatsApp(locataire.telephone, texte);

  return (
    <Modal
      titre={`Inviter ${locataire.prenom} ${locataire.nom}`}
      sousTitre="Il pourra voir ses mois impayés et vous déclarer ses paiements. Le lien est valable 7 jours et ne sert qu’une fois."
      onClose={onClose}
    >
      <Alerte>{erreur}</Alerte>
      {!lien ? (
        <div className="modal-actions">
          <button type="button" className="btn btn-fantome" onClick={onClose}>
            Annuler
          </button>
          <button type="button" className="btn btn-primaire" onClick={generer} disabled={envoi}>
            {envoi ? 'Création…' : locataire.invitation_en_cours ? 'Créer un nouveau lien' : 'Créer le lien d’invitation'}
          </button>
        </div>
      ) : (
        <div className="formulaire">
          <div className="lien-invitation">
            <input readOnly value={lien} onFocus={(e) => e.target.select()} aria-label="Lien d’invitation" />
            <button type="button" className="btn btn-secondaire" onClick={copier}>
              {copie ? 'Copié ✓' : 'Copier'}
            </button>
          </div>
          <div className="modal-actions">
            <a className="btn btn-fantome" href={`sms:${locataire.telephone || ''}?body=${encodeURIComponent(texte)}`}>
              Envoyer par SMS
            </a>
            <a className="btn btn-primaire" href={whatsapp} target="_blank" rel="noreferrer">
              Envoyer sur WhatsApp
            </a>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------- Locataires
function OngletLocataires({ base, nomBien, unites, locataires, onChange }) {
  const { utilisateur } = useAuth();
  const [ajout, setAjout] = useState(false);
  const [invite, setInvite] = useState(null);
  const [sortie, setSortie] = useState(null); // locataire dont on règle la sortie
  const [decompte, setDecompte] = useState(null); // décompte affiché
  const [erreur, setErreur] = useState('');
  const libres = unites.filter((u) => u.etat !== 'Occupé');

  const action = async (fn) => {
    setErreur('');
    try {
      await fn();
      onChange();
    } catch (e) {
      setErreur(e.message);
    }
  };

  const voirDecompte = (l) => action(async () => setDecompte(await api(`${base}/locataires/${l.id}/sortie`)));

  const supprimer = (l) =>
    window.confirm(`Supprimer définitivement ${l.prenom} ${l.nom} et tout son historique de paiements ?`) &&
    action(() => api(`${base}/locataires/${l.id}`, { method: 'DELETE' }));

  return (
    <>
      <div className="onglet-barre">
        <p className="texte-muet">
          {libres.length} unité{libres.length > 1 ? 's' : ''} disponible{libres.length > 1 ? 's' : ''}.
        </p>
        <button className="btn btn-primaire" onClick={() => setAjout(true)} disabled={libres.length === 0} title={libres.length === 0 ? 'Aucune unité libre' : undefined}>
          <Icon name="plus" size={18} /> Nouveau locataire
        </button>
      </div>
      <Alerte>{erreur}</Alerte>

      {locataires.length === 0 ? (
        <Vide icone="users" titre="Aucun locataire" texte={unites.length ? 'Ajoutez un locataire dans une unité disponible.' : 'Créez d’abord une unité dans l’onglet Unités.'} />
      ) : (
        <div className="tableau-zone">
          <table className="tableau">
            <thead>
              <tr>
                <th>Locataire</th>
                <th>Unité</th>
                <th>Loyer</th>
                <th>Entrée</th>
                <th>Reste dû</th>
                <th>Espace</th>
                <th>Statut</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {locataires.map((l) => (
                <tr key={l.id} className={l.statut === 'sorti' ? 'ligne-terne' : ''}>
                  <td>
                    <span className="personne">
                      <span className="avatar petit">{initiales(`${l.prenom} ${l.nom}`)}</span>
                      <span>
                        <strong>
                          {l.prenom} {l.nom}
                        </strong>
                        {l.telephone && <small>{l.telephone}</small>}
                      </span>
                    </span>
                  </td>
                  <td data-label="Unité">{l.unite}</td>
                  <td data-label="Loyer">
                    {fcfa(l.loyer_mensuel)}
                    {l.caution > 0 && <small className="bloc-petit">Caution {fcfa(l.caution)}</small>}
                  </td>
                  <td data-label="Entrée">{dateFr(l.date_entree)}</td>
                  <td data-label="Reste dû">
                    {l.reste_du > 0 ? (
                      <span className="du">
                        <strong className="rouge">{fcfa(l.reste_du)}</strong>
                        <small>
                          {l.nb_mois_impayes} mois
                        </small>
                        {l.statut === 'actif' && (
                          <BoutonWhatsApp
                            titre={l.telephone ? `Envoyer un rappel à ${l.telephone}` : 'Aucun numéro : WhatsApp vous demandera le contact'}
                            href={lienWhatsApp(l.telephone, messageRelance({ prenom: l.prenom, montant: l.reste_du, mois: l.mois_impayes, logement: `${l.unite} · ${nomBien}`, proprietaire: utilisateur?.nom }))}
                          >
                            Relancer
                          </BoutonWhatsApp>
                        )}
                      </span>
                    ) : (
                      <Badge ton="vert">À jour</Badge>
                    )}
                  </td>
                  <td data-label="Espace">
                    {l.a_un_compte ? (
                      <Badge ton="bleu">
                        <Icon name="check" size={13} /> Activé
                      </Badge>
                    ) : (
                      <button className="btn btn-secondaire petit" onClick={() => setInvite(l)}>
                        {l.invitation_en_cours ? 'Renvoyer' : 'Inviter'}
                      </button>
                    )}
                  </td>
                  <td data-label="Statut">
                    {l.statut === 'actif' ? <Badge ton="vert">Actif</Badge> : <Badge>Sorti le {dateFr(l.date_sortie)}</Badge>}
                  </td>
                  <td className="cellule-actions">
                    {l.statut === 'actif' && (
                      <button className="btn btn-fantome petit" onClick={() => setSortie(l)}>
                        Fin de bail
                      </button>
                    )}
                    {l.sortie_reglee_le && (
                      <button className="btn btn-secondaire petit" onClick={() => voirDecompte(l)}>
                        Décompte
                      </button>
                    )}
                    <button className="btn-icone danger" onClick={() => supprimer(l)} aria-label="Supprimer">
                      <Icon name="trash" size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {invite && <InvitationModal base={base} locataire={invite} onClose={() => setInvite(null)} onDone={onChange} />}
      {sortie && (
        <SortieModal
          base={base}
          locataire={sortie}
          onClose={() => setSortie(null)}
          onDone={(d) => {
            setSortie(null);
            setDecompte(d);
            onChange();
          }}
        />
      )}
      {decompte && <DecompteModal d={decompte} onClose={() => setDecompte(null)} />}

      {ajout && (
        <FormModal
          titre="Nouveau locataire"
          sousTitre="L’unité choisie passera automatiquement en « Occupée »."
          bouton="Ajouter le locataire"
          initial={{ prenom: '', nom: '', telephone: '', unite_id: String(libres[0]?.id || ''), date_entree: aujourdhui(), caution_mois: 2, avance_mois: 1, mode_entree: 'especes' }}
          onClose={() => setAjout(false)}
          onSubmit={async (f) => {
            const loyer = libres.find((u) => String(u.id) === f.unite_id)?.loyer_mensuel || 0;
            await api(`${base}/locataires`, {
              method: 'POST',
              body: {
                prenom: f.prenom, nom: f.nom, telephone: f.telephone, date_entree: f.date_entree, unite_id: Number(f.unite_id),
                caution: (Number(f.caution_mois) || 0) * loyer, avance_mois: Number(f.avance_mois) || 0, mode_entree: f.mode_entree,
              },
            });
            setAjout(false);
            onChange();
          }}
        >
          {(f, maj) => {
            const loyer = libres.find((u) => String(u.id) === f.unite_id)?.loyer_mensuel || 0;
            const montantCaution = (Number(f.caution_mois) || 0) * loyer;
            const montantAvance = (Number(f.avance_mois) || 0) * loyer;
            return (
            <>
              <Champ label="Prénom *">
                <input value={f.prenom} onChange={maj('prenom')} required />
              </Champ>
              <Champ label="Nom *">
                <input value={f.nom} onChange={maj('nom')} required />
              </Champ>
              <Champ label="Téléphone">
                <input type="tel" value={f.telephone} onChange={maj('telephone')} placeholder="07 00 00 00 00" />
              </Champ>
              <Champ label="Date d’entrée">
                <input type="date" value={f.date_entree} onChange={maj('date_entree')} />
              </Champ>
              <Champ label="Unité *" large>
                <select value={f.unite_id} onChange={maj('unite_id')} required>
                  {libres.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.label} · {fcfa(u.loyer_mensuel)}/mois
                    </option>
                  ))}
                </select>
              </Champ>
              <Champ label="Caution (mois de loyer)" aide={`= ${fcfa(montantCaution)}, rendue à la sortie`}>
                <input type="number" min="0" max="12" value={f.caution_mois} onChange={maj('caution_mois')} />
              </Champ>
              <Champ label="Avance (mois payés d’avance)" aide={`= ${fcfa(montantAvance)}, couvre les premiers mois`}>
                <input type="number" min="0" max="12" value={f.avance_mois} onChange={maj('avance_mois')} />
              </Champ>
              <Champ label="Versement de l’entrée par" large>
                <select value={f.mode_entree} onChange={maj('mode_entree')}>
                  {Object.entries(MODES_PAIEMENT).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </Champ>
              <div className="total-declaration champ-large">
                <span>Total versé à l’entrée</span>
                <strong>{fcfa(montantCaution + montantAvance)}</strong>
              </div>
            </>
            );
          }}
        </FormModal>
      )}
    </>
  );
}

// ---------------------------------------------------------------- Paiements
function OngletPaiements({ base, nomBien, locataires }) {
  const { utilisateur } = useAuth();
  const [mois, setMois] = useState(moisCourant);
  const paiements = useApi(`${base}/paiements`);
  const [ajout, setAjout] = useState(null); // null | { locataire_id, montant }
  const [erreur, setErreur] = useState('');
  const actifs = locataires.filter((l) => l.statut === 'actif');
  const liste = paiements.data || [];

  // Situation de chaque locataire actif pour le mois choisi
  const situation = actifs.map((l) => {
    const duMoisLoc = liste.filter((p) => p.locataire_id === l.id && p.mois_couvrit === mois);
    const verse = duMoisLoc.filter((p) => p.statut === 'paye').reduce((s, p) => s + p.montant, 0);
    const enAttente = duMoisLoc.filter((p) => p.statut === 'en_attente').reduce((s, p) => s + p.montant, 0);
    return { ...l, verse, enAttente, reste: Math.max(0, l.loyer_mensuel - verse) };
  });
  const aValider = liste.filter((p) => p.statut === 'en_attente').length;
  const totalAttendu = situation.reduce((s, l) => s + l.loyer_mensuel, 0);
  const totalVerse = situation.reduce((s, l) => s + Math.min(l.verse, l.loyer_mensuel), 0);
  const duMois = liste.filter((p) => p.mois_couvrit === mois);

  const action = async (fn) => {
    setErreur('');
    try {
      await fn();
      paiements.recharger();
    } catch (e) {
      setErreur(e.message);
    }
  };

  return (
    <>
      <div className="onglet-barre">
        <label className="mois-choix">
          <Icon name="calendar" size={18} />
          <input type="month" value={mois} onChange={(e) => e.target.value && setMois(e.target.value)} aria-label="Mois" />
        </label>
        <button className="btn btn-primaire" onClick={() => setAjout({})} disabled={actifs.length === 0}>
          <Icon name="plus" size={18} /> Enregistrer un paiement
        </button>
      </div>
      <Alerte>{erreur || paiements.erreur}</Alerte>
      {aValider > 0 && (
        <section className="bloc-validation">
          <h3>
            <Icon name="alert" size={18} /> {aValider} paiement{aValider > 1 ? 's' : ''} à valider
          </h3>
          <p className="texte-muet">Vérifiez la référence sur votre téléphone (SMS Wave, Orange Money…), puis validez.</p>
          <ul className="liste">
            {liste
              .filter((p) => p.statut === 'en_attente')
              .map((p) => (
                <li key={p.id} className="liste-ligne">
                  <span className="liste-texte">
                    <strong>
                      {p.locataire} · {fcfa(p.montant)}
                    </strong>
                    <small>
                      {moisLabel(p.mois_couvrit)} · {libelleMode(p.mode_paiement)}
                      {p.reference ? ` · Réf. ${p.reference}` : ''} · {dateFr(p.date_paiement)}
                      {p.note ? ` · « ${p.note} »` : ''}
                    </small>
                  </span>
                  <span className="boutons-validation">
                    <button className="btn btn-primaire petit" onClick={() => action(() => api(`${base}/paiements/${p.id}`, { method: 'PATCH', body: { statut: 'paye' } }))}>
                      <Icon name="check" size={15} /> Valider
                    </button>
                    <button className="btn btn-fantome petit danger" onClick={() => action(() => api(`${base}/paiements/${p.id}`, { method: 'PATCH', body: { statut: 'refuse' } }))}>
                      Refuser
                    </button>
                  </span>
                </li>
              ))}
          </ul>
        </section>
      )}

      {actifs.length === 0 ? (
        <Vide icone="wallet" titre="Aucun locataire actif" texte="Ajoutez un locataire pour suivre ses loyers." />
      ) : (
        <>
          <section className="bloc">
            <div className="ligne-entre bloc-tete">
              <h3>Situation de {moisLabel(mois)}</h3>
              <span className="texte-muet">
                {fcfa(totalVerse)} / {fcfa(totalAttendu)}
              </span>
            </div>
            <div className="progression-piste epaisse">
              <i style={{ width: `${totalAttendu ? (totalVerse / totalAttendu) * 100 : 0}%` }} />
            </div>
            <ul className="liste situation">
              {situation.map((l) => (
                <li key={l.id} className="liste-ligne">
                  <span className="avatar petit">{initiales(`${l.prenom} ${l.nom}`)}</span>
                  <span className="liste-texte">
                    <strong>
                      {l.prenom} {l.nom}
                    </strong>
                    <small>
                      {l.unite} · loyer {fcfa(l.loyer_mensuel)}
                    </small>
                  </span>
                  {l.reste === 0 ? (
                    <Badge ton="vert">
                      <Icon name="check" size={14} /> Payé
                    </Badge>
                  ) : (
                    <span className="liste-fin">
                      {l.enAttente > 0 && <Badge ton="bleu">{fcfa(l.enAttente)} à valider</Badge>}
                      <Badge ton={l.verse > 0 ? 'orange' : 'rouge'}>{l.verse > 0 ? `Reste ${fcfa(l.reste)}` : 'Impayé'}</Badge>
                      <BoutonWhatsApp
                        href={lienWhatsApp(l.telephone, messageRelance({ prenom: l.prenom, montant: l.reste, mois: [mois], logement: `${l.unite} · ${nomBien}`, proprietaire: utilisateur?.nom }))}
                      >
                        Relancer
                      </BoutonWhatsApp>
                      <button className="btn btn-secondaire petit" onClick={() => setAjout({ locataire_id: l.id, montant: l.reste })}>
                        Encaisser
                      </button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="bloc">
            <h3 className="bloc-tete">Paiements enregistrés pour {moisLabel(mois)}</h3>
            {paiements.chargement ? (
              <Squelette />
            ) : duMois.length === 0 ? (
              <p className="texte-muet">Aucun paiement pour ce mois.</p>
            ) : (
              <div className="tableau-zone">
                <table className="tableau">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Locataire</th>
                      <th>Mode</th>
                      <th>Montant</th>
                      <th>Statut</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {duMois.map((p) => (
                      <tr key={p.id}>
                        <td data-label="Date">{dateFr(p.date_paiement)}</td>
                        <td>
                          <strong>{p.locataire}</strong>
                          <small className="bloc-petit">{p.unite}</small>
                        </td>
                        <td data-label="Mode">
                          {libelleMode(p.mode_paiement)}
                          {p.reference && <small className="bloc-petit">Réf. {p.reference}</small>}
                          {p.declare_par === 'locataire' && <small className="bloc-petit">Déclaré par le locataire</small>}
                          {p.note && <small className="bloc-petit">« {p.note} »</small>}
                        </td>
                        <td data-label="Montant">
                          <strong>{fcfa(p.montant)}</strong>
                        </td>
                        <td data-label="Statut">
                          {p.statut === 'en_attente' ? (
                            <span className="boutons-validation">
                              <button className="btn btn-primaire petit" onClick={() => action(() => api(`${base}/paiements/${p.id}`, { method: 'PATCH', body: { statut: 'paye' } }))}>
                                <Icon name="check" size={15} /> Valider
                              </button>
                              <button className="btn btn-fantome petit danger" onClick={() => action(() => api(`${base}/paiements/${p.id}`, { method: 'PATCH', body: { statut: 'refuse' } }))}>
                                Refuser
                              </button>
                            </span>
                          ) : (
                          <select
                            className={`select-statut ton-${TON_PAIEMENT[p.statut]}`}
                            value={p.statut}
                            onChange={(e) => action(() => api(`${base}/paiements/${p.id}`, { method: 'PATCH', body: { statut: e.target.value } }))}
                            aria-label="Statut du paiement"
                          >
                            {Object.entries(STATUTS_PAIEMENT).map(([v, l]) => (
                              <option key={v} value={v}>
                                {l}
                              </option>
                            ))}
                          </select>
                          )}
                        </td>
                        <td className="cellule-actions">
                          {p.statut === 'paye' && (
                            <BoutonWhatsApp
                              titre="Envoyer le reçu au locataire sur WhatsApp"
                              href={lienWhatsApp(p.telephone, messageRecu({
                                prenom: p.prenom, montant: p.montant, mois: p.mois_couvrit, mode: p.mode_paiement, reference: p.reference,
                                date: dateFr(p.date_paiement), logement: `${p.unite} · ${nomBien}`, proprietaire: utilisateur?.nom,
                              }))}
                            >
                              Reçu
                            </BoutonWhatsApp>
                          )}
                          <button
                            className="btn-icone danger"
                            aria-label="Supprimer le paiement"
                            onClick={() => window.confirm('Supprimer ce paiement ?') && action(() => api(`${base}/paiements/${p.id}`, { method: 'DELETE' }))}
                          >
                            <Icon name="trash" size={17} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {ajout && (
        <FormModal
          titre="Enregistrer un paiement"
          sousTitre={`Loyer de ${moisLabel(mois)}`}
          bouton="Enregistrer"
          initial={{
            locataire_id: String(ajout.locataire_id || actifs[0]?.id || ''),
            montant: ajout.montant ?? actifs[0]?.loyer_mensuel ?? '',
            mois_couvrit: mois,
            mode_paiement: 'wave',
            date_paiement: aujourdhui(),
          }}
          onClose={() => setAjout(null)}
          onSubmit={async (f) => {
            await api(`${base}/paiements`, { method: 'POST', body: { ...f, locataire_id: Number(f.locataire_id), montant: Number(f.montant) } });
            setAjout(null);
            if (f.mois_couvrit !== mois) setMois(f.mois_couvrit);
            paiements.recharger();
          }}
        >
          {(f, maj, setForm) => (
            <>
              <Champ label="Locataire *" large>
                <select
                  value={f.locataire_id}
                  onChange={(e) => {
                    const l = actifs.find((x) => String(x.id) === e.target.value);
                    setForm((s) => ({ ...s, locataire_id: e.target.value, montant: l?.loyer_mensuel ?? s.montant }));
                  }}
                >
                  {actifs.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.prenom} {l.nom} · {l.unite}
                    </option>
                  ))}
                </select>
              </Champ>
              <Champ label="Montant (F CFA) *">
                <input type="number" min="1" value={f.montant} onChange={maj('montant')} required />
              </Champ>
              <Champ label="Mois concerné *">
                <input type="month" value={f.mois_couvrit} onChange={maj('mois_couvrit')} required />
              </Champ>
              <Champ label="Mode de paiement">
                <select value={f.mode_paiement} onChange={maj('mode_paiement')}>
                  {Object.entries(MODES_PAIEMENT).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </Champ>
              <Champ label="Date du paiement">
                <input type="date" value={f.date_paiement} onChange={maj('date_paiement')} />
              </Champ>
            </>
          )}
        </FormModal>
      )}
    </>
  );
}

// ---------------------------------------------------------------- Page
export default function PropertyDetail({ id, onglet = 'unites' }) {
  const base = `/immeubles/${id}`;
  const bien = useApi(base);
  const unites = useApi(`${base}/unites`);
  const locataires = useApi(`${base}/locataires`);
  const [edition, setEdition] = useState(false);
  const [erreur, setErreur] = useState('');
  const actif = ONGLETS.some((o) => o.id === onglet) ? onglet : 'unites';

  const toutRecharger = () => {
    bien.recharger();
    unites.recharger();
    locataires.recharger();
  };

  const supprimer = async () => {
    if (!window.confirm(`Supprimer « ${bien.data.nom_immeuble} » avec toutes ses unités, locataires et paiements ?`)) return;
    try {
      await api(base, { method: 'DELETE' });
      naviguer('/biens');
    } catch (e) {
      setErreur(e.message);
    }
  };

  if (bien.erreur) {
    return (
      <div className="page">
        <Vide icone="alert" titre="Bien introuvable" texte={bien.erreur} action={<a className="btn btn-primaire" href="#/biens">Retour à mes biens</a>} />
      </div>
    );
  }

  const b = bien.data;
  return (
    <div className="page">
      <a href="#/biens" className="lien-retour">
        <Icon name="arrowLeft" size={16} /> Mes biens
      </a>

      <header className="page-tete">
        {b ? (
          <div>
            <h1>{b.nom_immeuble}</h1>
            <p className="page-sous">
              <Icon name="pin" size={15} /> {b.adresse || 'Adresse non renseignée'}
            </p>
          </div>
        ) : (
          <Squelette lignes={2} />
        )}
        {b && (
          <div className="actions-tete">
            <button className="btn btn-fantome" onClick={() => setEdition(true)}>
              <Icon name="edit" size={17} /> Modifier
            </button>
            <button className="btn btn-fantome danger" onClick={supprimer}>
              <Icon name="trash" size={17} /> Supprimer
            </button>
          </div>
        )}
      </header>

      <Alerte>{erreur || unites.erreur || locataires.erreur}</Alerte>

      {b && (
        <div className="mini-stats">
          <div>
            <small>Unités</small>
            <strong>{b.nb_unites}</strong>
          </div>
          <div>
            <small>Occupées</small>
            <strong>{b.nb_occupees}</strong>
          </div>
          <div>
            <small>Locataires actifs</small>
            <strong>{b.nb_locataires}</strong>
          </div>
          <div>
            <small>Loyers / mois</small>
            <strong>{fcfa(b.loyer_attendu)}</strong>
          </div>
        </div>
      )}

      <nav className="onglets" aria-label="Sections du bien">
        {ONGLETS.map((o) => (
          <a key={o.id} href={`#/biens/${id}/${o.id}`} className={actif === o.id ? 'actif' : ''} aria-current={actif === o.id ? 'page' : undefined}>
            <Icon name={o.icone} size={18} />
            {o.label}
          </a>
        ))}
      </nav>

      <section className="carte">
        {unites.chargement || locataires.chargement ? (
          <Squelette lignes={4} />
        ) : actif === 'unites' ? (
          <OngletUnites base={base} unites={unites.data || []} onChange={toutRecharger} />
        ) : actif === 'locataires' ? (
          <OngletLocataires base={base} nomBien={b?.nom_immeuble || ''} unites={unites.data || []} locataires={locataires.data || []} onChange={toutRecharger} />
        ) : (
          <OngletPaiements base={base} nomBien={b?.nom_immeuble || ''} locataires={locataires.data || []} />
        )}
      </section>

      {edition && b && (
        <BienForm
          bien={b}
          onClose={() => setEdition(false)}
          onSaved={() => {
            setEdition(false);
            bien.recharger();
          }}
        />
      )}
    </div>
  );
}

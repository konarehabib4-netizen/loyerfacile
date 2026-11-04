// Espace du locataire : ce qu'il doit, mois par mois, ses paiements,
// la déclaration d'un paiement et les reçus imprimables.
import { useState } from 'react';
import { api } from '../api';
import DecompteModal from '../components/Decompte';
import Icon from '../components/Icon';
import { Alerte, Badge, Champ, Modal, Squelette } from '../components/ui';
import { MODES_PAIEMENT, libelleMode, aujourdhui, dateFr, fcfa, moisLabel } from '../format';
import { useApi } from '../useApi';

const STATUT_MOIS = {
  paye: { ton: 'vert', label: 'Payé' },
  en_attente: { ton: 'bleu', label: 'En validation' },
  partiel: { ton: 'orange', label: 'Partiel' },
  impaye: { ton: 'rouge', label: 'Impayé' },
};
const STATUT_PAIEMENT = {
  paye: { ton: 'vert', label: 'Validé' },
  en_attente: { ton: 'orange', label: 'En attente de validation' },
  refuse: { ton: 'rouge', label: 'Refusé' },
};

// ------------------------------------------------ Déclarer un paiement
function Declaration({ mois, onClose, onSaved }) {
  const aPayer = mois.filter((m) => m.a_declarer > 0);
  // Par défaut : le mois le plus ancien qui reste à payer
  const [choix, setChoix] = useState(() => Object.fromEntries(aPayer.map((m, i) => [m.mois, { coche: i === 0, montant: m.a_declarer }])));
  const [mode, setMode] = useState('wave');
  const [reference, setReference] = useState('');
  const [date, setDate] = useState(aujourdhui);
  const [note, setNote] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const lignes = aPayer.filter((m) => choix[m.mois]?.coche).map((m) => ({ mois: m.mois, montant: Number(choix[m.mois].montant) || 0 }));
  const total = lignes.reduce((s, l) => s + l.montant, 0);
  const maj = (m, champ, valeur) => setChoix((c) => ({ ...c, [m]: { ...c[m], [champ]: valeur } }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (lignes.length === 0) return setErreur('Cochez au moins un mois.');
    setEnvoi(true);
    setErreur('');
    try {
      await api('/locataire/paiements', { method: 'POST', body: { lignes, mode_paiement: mode, reference, date_paiement: date, note } });
      onSaved();
    } catch (err) {
      setErreur(err.message);
      setEnvoi(false);
    }
  };

  return (
    <Modal titre="Déclarer un paiement" sousTitre="Vous avez payé votre propriétaire ? Indiquez-le ici : il le validera." onClose={onClose}>
      <form className="formulaire" onSubmit={handleSubmit}>
        <Alerte>{erreur}</Alerte>
        <div className="champ">
          <span className="champ-label">Mois concernés</span>
          <ul className="choix-mois">
            {aPayer.map((m) => (
              <li key={m.mois} className={choix[m.mois]?.coche ? 'coche' : ''}>
                <label>
                  <input type="checkbox" checked={!!choix[m.mois]?.coche} onChange={(e) => maj(m.mois, 'coche', e.target.checked)} />
                  <span>
                    <strong>{moisLabel(m.mois)}</strong>
                    <small>Reste {fcfa(m.a_declarer)}</small>
                  </span>
                </label>
                {choix[m.mois]?.coche && (
                  <input
                    type="number"
                    min="1"
                    max={m.a_declarer}
                    value={choix[m.mois].montant}
                    onChange={(e) => maj(m.mois, 'montant', e.target.value)}
                    aria-label={`Montant pour ${moisLabel(m.mois)}`}
                  />
                )}
              </li>
            ))}
          </ul>
        </div>
        <div className="grille-2 formulaire">
          <Champ label="Moyen de paiement">
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              {Object.entries(MODES_PAIEMENT).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Champ>
          <Champ label="Date du paiement">
            <input type="date" value={date} max={aujourdhui()} onChange={(e) => setDate(e.target.value)} />
          </Champ>
          <Champ label={mode === 'especes' ? 'Référence (facultatif)' : 'Référence de la transaction *'} aide="Le code reçu par SMS après le transfert" large>
            <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Ex. : CI241104.1532.A12345" required={mode !== 'especes'} />
          </Champ>
          <Champ label="Message pour le propriétaire (facultatif)" large>
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={255} placeholder="Ex. : envoyé depuis le numéro de ma sœur" />
          </Champ>
        </div>
        <div className="total-declaration">
          <span>Total déclaré</span>
          <strong>{fcfa(total)}</strong>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-fantome" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn btn-primaire" disabled={envoi || total <= 0}>
            {envoi ? 'Envoi…' : 'Déclarer le paiement'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ------------------------------------------------ Reçu imprimable
function Recu({ paiement, data, onClose }) {
  const { locataire, logement, proprietaire } = data;
  return (
    <Modal titre="Reçu de paiement" onClose={onClose}>
      <div className="recu" id="recu">
        <div className="recu-tete">
          <span className="marque">
            <span className="marque-logo">
              <Icon name="key" size={16} />
            </span>
            <span>
              Loyer<b>Facile</b>
            </span>
          </span>
          <span className="recu-numero">Reçu n° {String(paiement.id).padStart(6, '0')}</span>
        </div>
        <p className="recu-montant">{fcfa(paiement.montant)}</p>
        <p className="recu-objet">Loyer de {moisLabel(paiement.mois_couvrit).toLowerCase()}</p>
        <dl className="recu-details">
          <dt>Locataire</dt>
          <dd>
            {locataire.prenom} {locataire.nom}
          </dd>
          <dt>Logement</dt>
          <dd>
            {logement.unite} · {logement.nom_immeuble}
            {logement.adresse ? `, ${logement.adresse}` : ''}
          </dd>
          <dt>Propriétaire</dt>
          <dd>{proprietaire.nom}</dd>
          <dt>Payé le</dt>
          <dd>{dateFr(paiement.date_paiement)}</dd>
          <dt>Moyen</dt>
          <dd>{libelleMode(paiement.mode_paiement)}</dd>
          {paiement.reference && (
            <>
              <dt>Référence</dt>
              <dd>{paiement.reference}</dd>
            </>
          )}
        </dl>
        <p className="recu-pied">
          <Icon name="check" size={16} /> Paiement validé par le propriétaire
        </p>
      </div>
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

// ------------------------------------------------ Page
export default function EspaceLocataire() {
  const moi = useApi('/locataire/moi');
  const [declaration, setDeclaration] = useState(false);
  const [recu, setRecu] = useState(null);
  const [voirDecompte, setVoirDecompte] = useState(false);
  const [message, setMessage] = useState('');
  const d = moi.data;

  if (moi.chargement) {
    return (
      <div className="page">
        <Squelette lignes={6} />
      </div>
    );
  }
  if (!d) {
    return (
      <div className="page">
        <Alerte>{moi.erreur}</Alerte>
      </div>
    );
  }

  const s = d.situation;
  const aDeclarer = s.mois.some((m) => m.a_declarer > 0);
  const aJour = s.total_du === 0;
  const prenom = d.locataire.prenom;

  return (
    <div className="page">
      <header className="page-tete">
        <div>
          <p className="surtitre">Espace locataire</p>
          <h1>Bonjour {prenom} 👋</h1>
          <p className="page-sous">
            <Icon name="door" size={15} /> {d.logement.unite} · {d.logement.nom_immeuble}
          </p>
        </div>
        {aDeclarer && (
          <button className="btn btn-primaire" onClick={() => setDeclaration(true)}>
            <Icon name="wallet" size={18} /> J’ai payé
          </button>
        )}
      </header>

      {message && (
        <p className="succes" role="status">
          <Icon name="check" size={18} /> {message}
        </p>
      )}
      <Alerte>{moi.erreur}</Alerte>

      <section className={`solde ${aJour ? 'solde-ok' : ''}`}>
        <div>
          <p className="solde-label">{aJour ? 'Vous êtes à jour' : 'Montant à payer'}</p>
          <p className="solde-valeur">{aJour ? '0 F' : fcfa(s.total_du)}</p>
          <p className="solde-detail">
            {aJour
              ? 'Merci ! Tous vos loyers sont réglés.'
              : `${s.nb_mois_impayes} mois non soldé${s.nb_mois_impayes > 1 ? 's' : ''} · loyer ${fcfa(d.logement.loyer_mensuel)}/mois`}
          </p>
        </div>
        {s.total_en_attente > 0 && (
          <div className="solde-attente">
            <Icon name="calendar" size={18} />
            <span>
              <strong>{fcfa(s.total_en_attente)}</strong> en cours de validation
            </span>
          </div>
        )}
      </section>

      <div className="grille-dash">
        <section className="carte">
          <div className="carte-tete">
            <div>
              <h2>Mes loyers</h2>
              <p>Depuis votre entrée le {dateFr(d.locataire.date_entree)}</p>
            </div>
          </div>
          <ul className="frise">
            {[...s.mois].reverse().map((m) => (
              <li key={m.mois} className={`frise-mois frise-${m.statut}`}>
                <span className="frise-point" />
                <span className="frise-texte">
                  <strong>{moisLabel(m.mois)}</strong>
                  <small>
                    {m.statut === 'paye'
                      ? `${fcfa(m.du)} réglés`
                      : m.statut === 'en_attente'
                        ? `${fcfa(m.en_attente)} déclarés, en validation`
                        : m.paye > 0
                          ? `Payé ${fcfa(m.paye)} sur ${fcfa(m.du)}`
                          : `Loyer de ${fcfa(m.du)} non réglé`}
                  </small>
                </span>
                <span className="liste-fin">
                  {m.reste > 0 && m.statut !== 'en_attente' && <span className="liste-montant rouge">{fcfa(m.reste)}</span>}
                  <Badge ton={STATUT_MOIS[m.statut].ton}>{STATUT_MOIS[m.statut].label}</Badge>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <div className="colonne">
          {(d.locataire.caution > 0 || d.sortie) && (
            <section className="carte">
              <div className="carte-tete">
                <div>
                  <h2>Ma caution</h2>
                  <p>{d.sortie ? 'Décompte réglé à votre sortie' : 'Rendue à votre départ, moins les éventuelles retenues'}</p>
                </div>
              </div>
              {d.sortie ? (
                <>
                  <ul className="liste">
                    <li className="liste-ligne"><span className="liste-texte"><strong>Caution versée</strong></span><span className="liste-montant">{fcfa(d.sortie.caution)}</span></li>
                    {d.sortie.total_retenues > 0 && <li className="liste-ligne"><span className="liste-texte"><strong>Retenues</strong><small>{d.sortie.retenues.map((r) => r.libelle).join(', ')}</small></span><span className="liste-montant rouge">− {fcfa(d.sortie.total_retenues)}</span></li>}
                    {d.sortie.impayes_deduits > 0 && <li className="liste-ligne"><span className="liste-texte"><strong>Impayés réglés avec la caution</strong></span><span className="liste-montant rouge">− {fcfa(d.sortie.impayes_deduits)}</span></li>}
                    <li className="liste-ligne"><span className="liste-texte"><strong>Rendu</strong></span><span className="liste-montant">{fcfa(d.sortie.a_rendre)}</span></li>
                  </ul>
                  <button className="btn btn-secondaire petit ajout-ligne" onClick={() => setVoirDecompte(true)}>
                    Voir le décompte
                  </button>
                </>
              ) : (
                <p className="caution-montant">{fcfa(d.locataire.caution)}</p>
              )}
            </section>
          )}

          <section className="carte">
            <div className="carte-tete">
              <div>
                <h2>Mon propriétaire</h2>
                <p>Pour toute question sur votre loyer</p>
              </div>
            </div>
            <p className="contact-nom">{d.proprietaire.nom}</p>
            <ul className="contact-liste">
              {d.proprietaire.telephone && (
                <li>
                  <Icon name="phone" size={16} /> <a href={`tel:${d.proprietaire.telephone}`}>{d.proprietaire.telephone}</a>
                </li>
              )}
              {d.proprietaire.email && (
                <li>
                  <Icon name="users" size={16} /> <a href={`mailto:${d.proprietaire.email}`}>{d.proprietaire.email}</a>
                </li>
              )}
            </ul>
          </section>

          <section className="carte">
            <div className="carte-tete">
              <div>
                <h2>Mes paiements</h2>
                <p>{d.paiements.length} au total</p>
              </div>
            </div>
            {d.paiements.length === 0 ? (
              <p className="texte-muet">Aucun paiement pour le moment.</p>
            ) : (
              <ul className="liste">
                {d.paiements.map((p) => (
                  <li key={p.id} className="liste-ligne">
                    <span className="liste-texte">
                      <strong>
                        {fcfa(p.montant)} · {moisLabel(p.mois_couvrit)}
                      </strong>
                      <small>
                        {dateFr(p.date_paiement)} · {libelleMode(p.mode_paiement)}
                        {p.reference ? ` · ${p.reference}` : ''}
                      </small>
                    </span>
                    {p.statut === 'paye' ? (
                      <button className="btn btn-secondaire petit" onClick={() => setRecu(p)}>
                        Reçu
                      </button>
                    ) : (
                      <Badge ton={STATUT_PAIEMENT[p.statut].ton}>{STATUT_PAIEMENT[p.statut].label}</Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {declaration && (
        <Declaration
          mois={s.mois}
          onClose={() => setDeclaration(false)}
          onSaved={() => {
            setDeclaration(false);
            setMessage('Paiement déclaré ! Votre propriétaire va le vérifier, puis il apparaîtra comme validé.');
            moi.recharger();
          }}
        />
      )}
      {recu && <Recu paiement={recu} data={d} onClose={() => setRecu(null)} />}
      {voirDecompte && d.sortie && <DecompteModal d={d.sortie} onClose={() => setVoirDecompte(false)} />}
    </div>
  );
}

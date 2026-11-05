import { useState } from 'react';
import { api } from '../api';
import BienForm from '../components/BienForm';
import Icon from '../components/Icon';
import { Alerte, Badge, BoutonWhatsApp, Squelette, Stat, Vide } from '../components/ui';
import { lienWhatsApp, messageRelance } from '../whatsapp';
import { useAuth } from '../context/auth-context';
import { libelleMode, dateFr, fcfa, moisLabel } from '../format';
import { naviguer } from '../router';
import { useApi } from '../useApi';

function salutation() {
  const h = new Date().getHours();
  return h < 18 ? 'Bonjour' : 'Bonsoir';
}

// Graphique en barres des encaissements des 6 derniers mois (CSS pur)
function Graphique({ historique, mois }) {
  const derniers = [];
  const [a, m] = mois.split('-').map(Number);
  for (let i = 5; i >= 0; i--) {
    const d = new Date(a, m - 1 - i, 1);
    derniers.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  const valeurs = derniers.map((k) => historique.find((h) => h.mois === k)?.total || 0);
  const max = Math.max(...valeurs, 1);
  return (
    <div className="graphique">
      {derniers.map((k, i) => (
        <div key={k} className={`barre-col ${k === mois ? 'courant' : ''}`}>
          <span className="barre-valeur">{valeurs[i] ? fcfa(valeurs[i]).replace(' F', '') : ''}</span>
          <div className="barre-piste">
            <i style={{ height: `${Math.max((valeurs[i] / max) * 100, valeurs[i] ? 4 : 0)}%` }} />
          </div>
          <span className="barre-mois">{moisLabel(k, true)}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { proprietaire } = useAuth();
  const resume = useApi('/proprietaire/resume');
  const biens = useApi('/immeubles');
  const [ajout, setAjout] = useState(false);
  const [erreur, setErreur] = useState('');
  const r = resume.data;

  const valider = async (p, statut) => {
    setErreur('');
    try {
      await api(`/immeubles/${p.immeuble_id}/paiements/${p.id}`, { method: 'PATCH', body: { statut } });
      resume.recharger();
    } catch (e) {
      setErreur(e.message);
    }
  };

  const taux = r && r.loyer_attendu > 0 ? Math.min(100, Math.round((r.encaisse_mois / r.loyer_attendu) * 100)) : 0;
  const occupation = r && r.nb_unites > 0 ? Math.round((r.nb_occupees / r.nb_unites) * 100) : 0;
  const prenom = proprietaire?.nom?.split(' ')[0] || '';

  return (
    <div className="page">
      <header className="page-tete">
        <div>
          <p className="surtitre">{r ? moisLabel(r.mois) : ' '}</p>
          <h1>
            {salutation()} {prenom} 👋
          </h1>
          <p className="page-sous">Voici où en sont vos loyers ce mois-ci.</p>
        </div>
        <button className="btn btn-primaire" onClick={() => setAjout(true)}>
          <Icon name="plus" size={18} /> Nouveau bien
        </button>
      </header>

      <Alerte>{erreur || resume.erreur || biens.erreur}</Alerte>

      {resume.chargement ? (
        <div className="stats">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="stat">
              <Squelette lignes={2} />
            </div>
          ))}
        </div>
      ) : (
        r && (
          <div className="stats">
            <Stat icone="wallet" ton="vert" label="Encaissé ce mois" valeur={fcfa(r.encaisse_mois)} detail={`${taux} % des loyers attendus`} />
            <Stat icone="alert" ton="orange" label="Reste à percevoir" valeur={fcfa(r.reste_a_percevoir)} detail={`${r.impayes.length} locataire${r.impayes.length > 1 ? 's' : ''} concerné${r.impayes.length > 1 ? 's' : ''}`} />
            <Stat icone="door" ton="bleu" label="Taux d’occupation" valeur={`${occupation} %`} detail={`${r.nb_occupees} / ${r.nb_unites} unités louées`} />
            <Stat icone="users" ton="violet" label="Locataires actifs" valeur={r.nb_locataires} detail={`${r.nb_immeubles} bien${r.nb_immeubles > 1 ? 's' : ''} gérés`} />
          </div>
        )
      )}

      {r?.a_valider?.length > 0 && (
        <section className="carte bloc-validation">
          <div className="carte-tete">
            <div>
              <h2>
                {r.a_valider.length} paiement{r.a_valider.length > 1 ? 's' : ''} à valider
              </h2>
              <p>Déclarés par vos locataires : vérifiez la référence reçue par SMS, puis validez.</p>
            </div>
          </div>
          <ul className="liste">
            {r.a_valider.map((p) => (
              <li key={p.id} className="liste-ligne">
                <span className="liste-texte">
                  <strong>
                    {p.locataire} · {fcfa(p.montant)}
                  </strong>
                  <small>
                    {p.nom_immeuble} · {p.unite} · {moisLabel(p.mois_couvrit)} · {libelleMode(p.mode_paiement)}
                    {p.reference ? ` · Réf. ${p.reference}` : ''}
                  </small>
                </span>
                <span className="boutons-validation">
                  <button className="btn btn-primaire petit" onClick={() => valider(p, 'paye')}>
                    <Icon name="check" size={15} /> Valider
                  </button>
                  <button className="btn btn-fantome petit danger" onClick={() => valider(p, 'refuse')}>
                    Refuser
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grille-dash">
        <section className="carte">
          <div className="carte-tete">
            <div>
              <h2>Encaissements</h2>
              <p>6 derniers mois</p>
            </div>
            {r && (
              <div className="progression">
                <span>{taux} %</span>
                <div className="progression-piste">
                  <i style={{ width: `${taux}%` }} />
                </div>
              </div>
            )}
          </div>
          {r ? <Graphique historique={r.historique} mois={r.mois} /> : <Squelette lignes={4} />}
        </section>

        <section className="carte">
          <div className="carte-tete">
            <div>
              <h2>Loyers en attente</h2>
              <p>{r ? moisLabel(r.mois) : ''}</p>
            </div>
          </div>
          {!r ? (
            <Squelette />
          ) : r.impayes.length === 0 ? (
            <div className="ok-bloc">
              <Icon name="check" size={22} />
              <span>{r.nb_locataires ? 'Tous les loyers du mois sont payés.' : 'Aucun locataire pour le moment.'}</span>
            </div>
          ) : (
            <ul className="liste liste-actions">
              {r.impayes.slice(0, 6).map((i) => (
                <li key={i.id}>
                  <a href={`#/biens/${i.immeuble_id}/paiements`} className="liste-ligne">
                    <span className="liste-texte">
                      <strong>{i.locataire}</strong>
                      <small>
                        {i.nom_immeuble} · {i.unite}
                      </small>
                    </span>
                    <span className="liste-montant orange">{fcfa(i.loyer_mensuel - i.verse)}</span>
                  </a>
                  <BoutonWhatsApp
                    titre={`Relancer ${i.locataire} sur WhatsApp`}
                    href={lienWhatsApp(i.telephone, messageRelance({ prenom: i.prenom, montant: i.loyer_mensuel - i.verse, mois: [r.mois], logement: `${i.unite} · ${i.nom_immeuble}`, proprietaire: proprietaire?.nom }))}
                  >
                    Relancer
                  </BoutonWhatsApp>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grille-dash">
        <section className="carte">
          <div className="carte-tete">
            <div>
              <h2>Mes biens</h2>
              <p>{biens.data ? `${biens.data.length} au total` : ''}</p>
            </div>
            <a href="#/biens" className="lien-fleche">
              Tout voir <Icon name="arrowRight" size={16} />
            </a>
          </div>
          {biens.chargement ? (
            <Squelette />
          ) : biens.data?.length === 0 ? (
            <Vide
              titre="Aucun bien pour l’instant"
              texte="Ajoutez votre premier immeuble pour commencer."
              action={
                <button className="btn btn-primaire" onClick={() => setAjout(true)}>
                  <Icon name="plus" size={18} /> Ajouter un bien
                </button>
              }
            />
          ) : (
            <ul className="liste">
              {biens.data?.slice(0, 5).map((b) => (
                <li key={b.id}>
                  <a href={`#/biens/${b.id}`} className="liste-ligne">
                    <span className="pastille-icone">
                      <Icon name="building" size={18} />
                    </span>
                    <span className="liste-texte">
                      <strong>{b.nom_immeuble}</strong>
                      <small>
                        {b.nb_occupees}/{b.nb_unites} unités louées · {fcfa(b.loyer_attendu)}/mois
                      </small>
                    </span>
                    <Icon name="arrowRight" size={16} className="muet" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="carte">
          <div className="carte-tete">
            <div>
              <h2>Derniers paiements</h2>
              <p>Les 5 plus récents</p>
            </div>
          </div>
          {!r ? (
            <Squelette />
          ) : r.derniers_paiements.length === 0 ? (
            <p className="texte-muet">Aucun paiement enregistré.</p>
          ) : (
            <ul className="liste">
              {r.derniers_paiements.map((p) => (
                <li key={p.id}>
                  <a href={`#/biens/${p.immeuble_id}/paiements`} className="liste-ligne">
                    <span className="liste-texte">
                      <strong>{p.locataire}</strong>
                      <small>
                        {dateFr(p.date_paiement)} · {libelleMode(p.mode_paiement)}
                      </small>
                    </span>
                    <span className="liste-fin">
                      <span className="liste-montant">{fcfa(p.montant)}</span>
                      {p.statut !== 'paye' && <Badge ton={p.statut === 'refuse' ? 'rouge' : 'orange'}>{p.statut === 'refuse' ? 'Refusé' : 'En attente'}</Badge>}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {ajout && <BienForm onClose={() => setAjout(false)} onSaved={(id) => naviguer(`/biens/${id}`)} />}
    </div>
  );
}

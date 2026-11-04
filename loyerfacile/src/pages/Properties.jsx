import { useState } from 'react';
import BienForm from '../components/BienForm';
import Icon from '../components/Icon';
import { Alerte, Squelette, Vide } from '../components/ui';
import { fcfa } from '../format';
import { naviguer } from '../router';
import { useApi } from '../useApi';

const TYPES = {
  appartement: 'Immeuble d’appartements',
  maison: 'Maison / villa',
  'cour commune': 'Cour commune',
  'local commercial': 'Local commercial',
};

export default function Properties() {
  const biens = useApi('/immeubles');
  const [ajout, setAjout] = useState(false);
  const [recherche, setRecherche] = useState('');

  const filtres = (biens.data || []).filter((b) =>
    `${b.nom_immeuble} ${b.adresse || ''}`.toLowerCase().includes(recherche.toLowerCase()),
  );

  return (
    <div className="page">
      <header className="page-tete">
        <div>
          <p className="surtitre">Patrimoine</p>
          <h1>Mes biens</h1>
          <p className="page-sous">Immeubles, maisons et locaux que vous mettez en location.</p>
        </div>
        <button className="btn btn-primaire" onClick={() => setAjout(true)}>
          <Icon name="plus" size={18} /> Nouveau bien
        </button>
      </header>

      <Alerte>{biens.erreur}</Alerte>

      {biens.data?.length > 3 && (
        <input className="recherche" type="search" placeholder="Rechercher un bien ou une adresse…" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
      )}

      {biens.chargement ? (
        <div className="grille-biens">
          {[0, 1, 2].map((i) => (
            <div key={i} className="carte">
              <Squelette lignes={4} />
            </div>
          ))}
        </div>
      ) : biens.data?.length === 0 ? (
        <section className="carte">
          <Vide
            titre="Aucun bien pour l’instant"
            texte="Créez votre premier bien, puis ajoutez-y des unités (appartements, studios, magasins…) et leurs locataires."
            action={
              <button className="btn btn-primaire" onClick={() => setAjout(true)}>
                <Icon name="plus" size={18} /> Ajouter un bien
              </button>
            }
          />
        </section>
      ) : (
        <div className="grille-biens">
          {filtres.map((b) => {
            const occ = b.nb_unites ? Math.round((b.nb_occupees / b.nb_unites) * 100) : 0;
            return (
              <a key={b.id} href={`#/biens/${b.id}`} className="carte carte-bien">
                <div className="bien-haut">
                  <span className="pastille-icone grande">
                    <Icon name="building" size={22} />
                  </span>
                  <span className="bien-type">{TYPES[b.type_logement] || b.type_logement}</span>
                </div>
                <h3>{b.nom_immeuble}</h3>
                <p className="bien-adresse">
                  <Icon name="pin" size={15} /> {b.adresse || 'Adresse non renseignée'}
                </p>
                <div className="bien-occupation">
                  <div className="ligne-entre">
                    <span>Occupation</span>
                    <strong>
                      {b.nb_occupees}/{b.nb_unites} unités
                    </strong>
                  </div>
                  <div className="progression-piste">
                    <i style={{ width: `${occ}%` }} />
                  </div>
                </div>
                <div className="bien-bas">
                  <span>
                    <small>Loyers / mois</small>
                    <strong>{fcfa(b.loyer_attendu)}</strong>
                  </span>
                  <span>
                    <small>Locataires</small>
                    <strong>{b.nb_locataires}</strong>
                  </span>
                </div>
              </a>
            );
          })}
          <button type="button" className="carte carte-ajout" onClick={() => setAjout(true)}>
            <Icon name="plus" size={26} />
            <span>Ajouter un bien</span>
          </button>
        </div>
      )}

      {ajout && <BienForm onClose={() => setAjout(false)} onSaved={(id) => naviguer(`/biens/${id}`)} />}
    </div>
  );
}

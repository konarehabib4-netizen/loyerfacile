// Mise en page des écrans Connexion / Inscription : visuel à gauche, formulaire à droite.
import Icon from '../ui/Icon';
import BlocInstallation from './BlocInstallation';

const POINTS = [
  { icone: 'building', texte: 'Tous vos immeubles et logements au même endroit' },
  { icone: 'users', texte: 'Le suivi de chaque locataire, de l’entrée à la sortie' },
  { icone: 'wallet', texte: 'Les loyers encaissés et les impayés du mois en un coup d’œil' },
];

export default function AuthLayout({ titre, sousTitre, children, pied }) {
  return (
    <div className="auth">
      <section className="auth-visuel" aria-hidden="true">
        <div className="auth-visuel-haut">
          <span className="marque marque-claire">
            <span className="marque-logo">
              <Icon name="key" size={18} />
            </span>
            <span>
              Loyer<b>Facile</b>
            </span>
          </span>
        </div>
        <div>
          <h2>
            La gestion locative,
            <br />
            enfin <em>simple</em>.
          </h2>
          <ul className="auth-points">
            {POINTS.map((p) => (
              <li key={p.texte}>
                <span>
                  <Icon name={p.icone} size={18} />
                </span>
                {p.texte}
              </li>
            ))}
          </ul>
        </div>
        <div className="auth-carte-demo">
          <div className="demo-ligne">
            <span>Encaissé ce mois</span>
            <strong>1 250 000 F</strong>
          </div>
          <div className="demo-barre">
            <i style={{ width: '78%' }} />
          </div>
          <div className="demo-ligne petit">
            <span>78 % des loyers perçus</span>
            <span className="vert">+12 %</span>
          </div>
        </div>
      </section>

      <section className="auth-form-zone">
        <div className="auth-boite">
          <h1>{titre}</h1>
          <p className="auth-sous">{sousTitre}</p>
          <BlocInstallation />
          {children}
          <p className="auth-pied">{pied}</p>
        </div>
      </section>
    </div>
  );
}

// Structure de l'application connectée : barre latérale + contenu.
// Sur mobile, la barre latérale devient une barre d'onglets en bas.
import { useState } from 'react';
import { useAuth } from '../context/auth-context';
import { initiales } from '../format';
import Icon from './Icon';

const LIENS_PROPRIETAIRE = [
  { href: '#/', icone: 'home', label: 'Tableau de bord', actif: (m) => m.length === 0 },
  { href: '#/biens', icone: 'building', label: 'Mes biens', actif: (m) => m[0] === 'biens' },
];
const LIENS_LOCATAIRE = [{ href: '#/', icone: 'wallet', label: 'Mes loyers', actif: () => true }];

function lireTheme() {
  const t = document.documentElement.dataset.theme;
  if (t) return t;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function Layout({ morceaux, children }) {
  const { utilisateur, role, deconnecte } = useAuth();
  const LIENS = role === 'locataire' ? LIENS_LOCATAIRE : LIENS_PROPRIETAIRE;
  const [theme, setTheme] = useState(lireTheme);

  const basculerTheme = () => {
    const t = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = t;
    try {
      localStorage.setItem('loyerfacile_theme', t);
    } catch {
      /* ignoré */
    }
    setTheme(t);
  };

  const sortir = () => {
    deconnecte();
    window.location.hash = '#/';
  };

  return (
    <div className="coque">
      <aside className="sidebar">
        <a href="#/" className="marque">
          <span className="marque-logo">
            <Icon name="key" size={18} />
          </span>
          <span>
            Loyer<b>Facile</b>
          </span>
        </a>

        <nav className="nav" aria-label="Navigation principale">
          {LIENS.map((l) => (
            <a key={l.href} href={l.href} className={`nav-lien ${l.actif(morceaux) ? 'actif' : ''}`}>
              <Icon name={l.icone} />
              <span>{l.label}</span>
            </a>
          ))}
        </nav>

        <div className="sidebar-bas">
          <button type="button" className="nav-lien" onClick={basculerTheme}>
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
            <span>{theme === 'dark' ? 'Mode clair' : 'Mode sombre'}</span>
          </button>
          <div className="profil">
            <span className="avatar">{initiales(utilisateur?.nom)}</span>
            <span className="profil-texte">
              <strong>{utilisateur?.nom}</strong>
              <small>{utilisateur?.email}</small>
            </span>
            <button type="button" className="btn-icone" onClick={sortir} aria-label="Déconnexion" title="Déconnexion">
              <Icon name="logoutDoor" size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Barre du haut, visible seulement sur mobile */}
      <header className="topbar">
        <a href="#/" className="marque">
          <span className="marque-logo">
            <Icon name="key" size={16} />
          </span>
          <span>
            Loyer<b>Facile</b>
          </span>
        </a>
        <div className="topbar-actions">
          <button type="button" className="btn-icone" onClick={basculerTheme} aria-label="Changer de thème">
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
          </button>
          <button type="button" className="btn-icone" onClick={sortir} aria-label="Déconnexion">
            <Icon name="logoutDoor" size={18} />
          </button>
        </div>
      </header>

      <main className="contenu">{children}</main>

      {LIENS.length > 1 && (
      <nav className="onglets-mobile" aria-label="Navigation">
        {LIENS.map((l) => (
          <a key={l.href} href={l.href} className={l.actif(morceaux) ? 'actif' : ''}>
            <Icon name={l.icone} />
            <span>{l.label}</span>
          </a>
        ))}
      </nav>
      )}
    </div>
  );
}

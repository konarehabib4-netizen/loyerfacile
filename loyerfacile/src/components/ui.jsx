// Petits composants d'interface réutilisés partout.
import { useEffect, useRef } from 'react';
import Icon from './Icon';

// Fenêtre modale (formulaires d'ajout / modification)
export function Modal({ titre, sousTitre, onClose, children }) {
  const ref = useRef(null);
  // On garde la dernière version de onClose sans relancer l'effet
  // (sinon le focus reviendrait au premier champ à chaque rendu).
  const fermer = useRef(onClose);
  useEffect(() => {
    fermer.current = onClose;
  });
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && fermer.current();
    document.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    ref.current?.querySelector('input, select, textarea')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
    };
  }, []);

  return (
    <div className="modal-fond" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={titre} ref={ref}>
        <header className="modal-tete">
          <div>
            <h2>{titre}</h2>
            {sousTitre && <p>{sousTitre}</p>}
          </div>
          <button type="button" className="btn-icone" onClick={onClose} aria-label="Fermer">
            <Icon name="x" />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

// Champ de formulaire avec son libellé
export function Champ({ label, aide, children, large }) {
  return (
    <label className={`champ ${large ? 'champ-large' : ''}`.trim()}>
      <span className="champ-label">{label}</span>
      {children}
      {aide && <span className="champ-aide">{aide}</span>}
    </label>
  );
}

// Pastille de statut colorée
export function Badge({ ton = 'neutre', children }) {
  return <span className={`badge badge-${ton}`}>{children}</span>;
}

// Bloc "rien à afficher" avec une action
export function Vide({ icone = 'building', titre, texte, action }) {
  return (
    <div className="vide">
      <div className="vide-icone">
        <Icon name={icone} size={26} />
      </div>
      <h3>{titre}</h3>
      {texte && <p>{texte}</p>}
      {action}
    </div>
  );
}

// Message d'erreur
export function Alerte({ children }) {
  if (!children) return null;
  return (
    <p className="alerte" role="alert">
      <Icon name="alert" size={18} />
      <span>{children}</span>
    </p>
  );
}

// Squelette de chargement
export function Squelette({ lignes = 3 }) {
  return (
    <div className="squelette" aria-label="Chargement">
      {Array.from({ length: lignes }, (_, i) => (
        <span key={i} />
      ))}
    </div>
  );
}

// Carte de statistique du tableau de bord
export function Stat({ icone, ton, label, valeur, detail }) {
  return (
    <div className={`stat stat-${ton}`}>
      <div className="stat-icone">
        <Icon name={icone} />
      </div>
      <div>
        <p className="stat-label">{label}</p>
        <p className="stat-valeur">{valeur}</p>
        {detail && <p className="stat-detail">{detail}</p>}
      </div>
    </div>
  );
}

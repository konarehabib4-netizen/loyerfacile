// Proposition d'installer l'application, visible AVANT la connexion
// (sinon un nouveau visiteur ne verrait jamais le bouton).
import { useInstallation } from '../pwa';
import Icon from './Icon';

const dejaInstallee = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const surIphone = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const surMobile = () => window.matchMedia('(max-width: 900px)').matches;

export default function BlocInstallation() {
  const { peutInstaller, installer } = useInstallation();
  if (dejaInstallee()) return null;

  // Chrome, Edge, Android : le navigateur nous laisse afficher notre propre bouton
  if (peutInstaller) {
    return (
      <button type="button" className="bloc-installation" onClick={installer}>
        <span className="marque-logo">
          <Icon name="download" size={18} />
        </span>
        <span>
          <strong>Installer l’application</strong>
          <small>Sur votre écran d’accueil, comme une vraie appli</small>
        </span>
      </button>
    );
  }

  // Sinon (iPhone, ou navigateur qui ne le propose pas encore) : on explique comment faire
  if (!surMobile()) return null;
  return (
    <p className="aide-installation">
      <Icon name="download" size={16} />
      {surIphone()
        ? 'Pour installer l’appli : bouton Partager, puis « Sur l’écran d’accueil ».'
        : 'Pour installer l’appli : ouvrez ce site dans Chrome, menu ⋮, puis « Installer l’application ».'}
    </p>
  );
}

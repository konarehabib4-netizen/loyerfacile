// Application installable (PWA) : enregistrement du service worker,
// bouton « Installer » et détection de la connexion.
import { useEffect, useState } from 'react';

// Le service worker n'est activé qu'en production (npm run build) :
// en développement, il garderait d'anciennes versions des fichiers en cache.
export function enregistrerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('Service worker non enregistré :', err));
  });
}

// Le navigateur propose l'installation via l'événement « beforeinstallprompt »
// (Chrome, Edge, Android). On le garde pour l'afficher sur notre propre bouton.
let invitationEnAttente = null;
const abonnes = new Set();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    invitationEnAttente = e;
    abonnes.forEach((f) => f(true));
  });
  window.addEventListener('appinstalled', () => {
    invitationEnAttente = null;
    abonnes.forEach((f) => f(false));
  });
}

export function useInstallation() {
  const [disponible, setDisponible] = useState(() => !!invitationEnAttente);
  useEffect(() => {
    abonnes.add(setDisponible);
    return () => abonnes.delete(setDisponible);
  }, []);

  const installer = async () => {
    if (!invitationEnAttente) return;
    invitationEnAttente.prompt();
    await invitationEnAttente.userChoice;
    invitationEnAttente = null;
    setDisponible(false);
  };
  return { peutInstaller: disponible, installer };
}

export function useEnLigne() {
  const [enLigne, setEnLigne] = useState(() => navigator.onLine);
  useEffect(() => {
    const oui = () => setEnLigne(true);
    const non = () => setEnLigne(false);
    window.addEventListener('online', oui);
    window.addEventListener('offline', non);
    return () => {
      window.removeEventListener('online', oui);
      window.removeEventListener('offline', non);
    };
  }, []);
  return enLigne;
}

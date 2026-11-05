// Mini-routeur basé sur le "hash" de l'URL (#/biens/3).
// Pas besoin de dépendance supplémentaire, et les liens <a href="#/..."> marchent tout seuls.
import { useEffect, useState } from 'react';

function lireRoute() {
  const chemin = window.location.hash.replace(/^#/, '') || '/';
  const morceaux = chemin.split('/').filter(Boolean);
  return { chemin, morceaux };
}

export function useRoute() {
  const [route, setRoute] = useState(lireRoute);
  useEffect(() => {
    const maj = () => {
      setRoute(lireRoute());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', maj);
    return () => window.removeEventListener('hashchange', maj);
  }, []);
  return route;
}

export function naviguer(chemin) {
  window.location.hash = chemin;
}

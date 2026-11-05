// Hook de chargement de données : const { data, erreur, chargement, recharger } = useApi('/immeubles')
import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';

export function useApi(chemin) {
  const [etat, setEtat] = useState({ data: null, erreur: '', chargement: true });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!chemin) return;
    let annule = false;
    api(chemin)
      .then((data) => !annule && setEtat({ data, erreur: '', chargement: false }))
      .catch((e) => !annule && setEtat((s) => ({ ...s, erreur: e.message, chargement: false })));
    return () => {
      annule = true;
    };
  }, [chemin, version]);

  const recharger = useCallback(() => setVersion((v) => v + 1), []);
  return { ...etat, recharger };
}

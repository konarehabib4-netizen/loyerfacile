// Client API unique : TOUS les appels au backend passent par ici.
// Il ajoute automatiquement le jeton JWT, lit le JSON et transforme
// les erreurs de l'API en exceptions avec un message lisible.
// En local : '/api', que le proxy de Vite redirige vers http://localhost:5000.
// En ligne : VITE_API_URL contient l'adresse de l'API (ex. https://loyerfacile-api.vercel.app),
// à définir dans les variables d'environnement du projet Vercel du site.
const BASE_URL = `${(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')}/api`;
const CLE_TOKEN = 'loyerfacile_token';

export function lireToken() {
  try {
    return localStorage.getItem(CLE_TOKEN);
  } catch {
    return null;
  }
}

export function enregistrerToken(token) {
  try {
    if (token) localStorage.setItem(CLE_TOKEN, token);
    else localStorage.removeItem(CLE_TOKEN);
  } catch {
    /* stockage indisponible (navigation privée) : on ignore */
  }
}

export async function api(chemin, { method = 'GET', body } = {}) {
  const headers = {};
  const token = lireToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(BASE_URL + chemin, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Impossible de joindre le serveur. Vérifiez que le backend (port 5000) est démarré.');
  }

  // 502/503/504 = le proxy de Vite ne joint pas l'API : le backend n'est pas démarré
  if ([502, 503, 504].includes(res.status)) {
    throw new Error('Le serveur (API) ne répond pas. Lancez « npm run dev » à la racine du projet : il démarre l’API et le site ensemble.');
  }

  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && token) {
    // Jeton expiré ou invalide : on prévient l'application pour déconnecter
    window.dispatchEvent(new Event('loyerfacile:session-expiree'));
  }
  if (!res.ok) throw new Error(data.erreur || `Erreur ${res.status}`);
  return data;
}

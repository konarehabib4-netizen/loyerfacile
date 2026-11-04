// Client API unique : TOUS les appels au backend passent par ici.
// Il ajoute automatiquement le jeton JWT, lit le JSON et transforme
// les erreurs de l'API en exceptions avec un message lisible.
const BASE_URL = '/api'; // le proxy Vite redirige /api vers http://localhost:5000
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

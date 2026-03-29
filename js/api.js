/**
 * NOUNOULINK — Client API
 * Tous les appels au backend centralisés ici.
 * Changer API_BASE suffit pour pointer vers prod ou local.
 */

const API_BASE = 'http://localhost:3000'; // ← mettre l'URL Railway en prod

// ─── AUTH ─────────────────────────────────────────────────────────────────────

export const auth = {
  async register(email, password, prenom, nom) {
    return call('POST', '/auth/register', { email, password, prenom, nom });
  },
  async login(email, password) {
    const res = await call('POST', '/auth/login', { email, password });
    if (res.token) saveToken(res.token);
    return res;
  },
  async me() {
    return call('GET', '/auth/me');
  },
  logout() {
    localStorage.removeItem('nl_token');
    localStorage.removeItem('nl_garde');
    window.location.href = '/index.html';
  },
  isLoggedIn() {
    return !!localStorage.getItem('nl_token');
  },
};

// ─── GARDES ───────────────────────────────────────────────────────────────────

export const gardes = {
  async creer(data) {
    const res = await call('POST', '/gardes', data);
    if (res.garde) saveGarde(res.garde.id);
    return res;
  },
  async lister() {
    return call('GET', '/gardes');
  },
  async get(id) {
    return call('GET', `/gardes/${id}`);
  },
  async rejoindre(token, nomFamille) {
    return call('POST', '/gardes/rejoindre', { token, nomFamille });
  },
};

// ─── ONBOARDING ───────────────────────────────────────────────────────────────

export const onboarding = {
  async ajouterNounou(gardeId, data) {
    return call('POST', `/gardes/${gardeId}/nounou`, data);
  },
  async ajouterEnfant(gardeId, data) {
    return call('POST', `/gardes/${gardeId}/enfants`, data);
  },
  async creerModele(gardeId, data) {
    return call('POST', `/gardes/${gardeId}/modele`, data);
  },
  async getModele(gardeId) {
    return call('GET', `/gardes/${gardeId}/modele`);
  },
  async mettreAJourAides(gardeId, familleId, aides) {
    return call('PUT', `/gardes/${gardeId}/familles/${familleId}/aides`, aides);
  },
};

// ─── MOIS ─────────────────────────────────────────────────────────────────────

export const mois = {
  async get(gardeId, annee, moisNum) {
    return call('GET', `/gardes/${gardeId}/mois/${annee}/${moisNum}`);
  },
  async calculer(gardeId, annee, moisNum) {
    return call('POST', `/gardes/${gardeId}/mois/${annee}/${moisNum}/calculer`, {});
  },
  async valider(gardeId, annee, moisNum) {
    return call('POST', `/gardes/${gardeId}/mois/${annee}/${moisNum}/valider`, {});
  },
  async ajouterEvenement(gardeId, annee, moisNum, evt) {
    return call('POST', `/gardes/${gardeId}/mois/${annee}/${moisNum}/evenements`, evt);
  },
  async supprimerEvenement(gardeId, annee, moisNum, evtId) {
    return call('DELETE', `/gardes/${gardeId}/mois/${annee}/${moisNum}/evenements/${evtId}`);
  },
};

// ─── LIEN PUBLIC ──────────────────────────────────────────────────────────────

export const public_ = {
  async get(token) {
    return callPublic('GET', `/public/${token}`);
  },
};

// ─── ÉTAT LOCAL ───────────────────────────────────────────────────────────────
// On stocke le token et l'ID de la garde en cours dans localStorage
// pour ne pas avoir à les resaisir à chaque page.

export function getToken() { return localStorage.getItem('nl_token'); }
export function saveToken(t) { localStorage.setItem('nl_token', t); }
export function getGardeId() { return localStorage.getItem('nl_garde'); }
export function saveGarde(id) { localStorage.setItem('nl_garde', id); }

// Données temporaires d'onboarding (partagées entre les étapes)
export const draft = {
  get()      { return JSON.parse(localStorage.getItem('nl_draft') || '{}'); },
  set(data)  { localStorage.setItem('nl_draft', JSON.stringify({ ...this.get(), ...data })); },
  clear()    { localStorage.removeItem('nl_draft'); },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function call(method, path, body) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (res.status === 401) {
    // Token expiré → retour à la connexion
    localStorage.removeItem('nl_token');
    window.location.href = '/index.html?session=expired';
    return;
  }
  if (!res.ok) throw new APIError(data.error || 'Erreur serveur', res.status, data);
  return data;
}

async function callPublic(method, path) {
  const res = await fetch(`${API_BASE}${path}`, { method });
  const data = await res.json();
  if (!res.ok) throw new APIError(data.error || 'Erreur', res.status, data);
  return data;
}

export class APIError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

// ─── GARDE DE SESSION ─────────────────────────────────────────────────────────
// À appeler en haut de chaque page protégée.

export function requireLogin() {
  if (!getToken()) {
    window.location.href = '/index.html?redirect=' + encodeURIComponent(window.location.pathname);
  }
}

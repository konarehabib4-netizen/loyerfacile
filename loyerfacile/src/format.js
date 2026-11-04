// Fonctions d'affichage (montants, dates, mois…)

const nf = new Intl.NumberFormat('fr-FR');

// 125000 -> "125 000 F CFA"
export const fcfa = (n) => `${nf.format(Math.round(Number(n) || 0))} F`;

// "2026-11" -> "novembre 2026"
export function moisLabel(mois, court = false) {
  if (!mois) return '';
  const [a, m] = mois.split('-').map(Number);
  const texte = new Date(a, m - 1, 1).toLocaleDateString('fr-FR', { month: court ? 'short' : 'long', year: court ? undefined : 'numeric' });
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

// Date ISO -> "4 nov. 2026"
export function dateFr(d) {
  if (!d) return '—';
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Date du jour au format AAAA-MM-JJ (pour les <input type="date">)
export const aujourdhui = () => new Date().toLocaleDateString('en-CA');
// Mois en cours au format AAAA-MM
export const moisCourant = () => aujourdhui().slice(0, 7);

export const MODES_PAIEMENT = {
  especes: 'Espèces',
  wave: 'Wave',
  orange_money: 'Orange Money',
  mtn_money: 'MTN MoMo',
  moov_money: 'Moov Money',
  virement: 'Virement',
  cheque: 'Chèque',
};

export const STATUTS_PAIEMENT = { paye: 'Payé', en_attente: 'En attente', refuse: 'Refusé' };
export const ETATS_UNITE = { disponible: 'Disponible', 'Occupé': 'Occupée', en_maintenance: 'En maintenance' };

export function initiales(nom = '') {
  return nom.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';
}

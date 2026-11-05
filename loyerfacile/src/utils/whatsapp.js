// Liens WhatsApp « click-to-chat » (https://wa.me/...) : gratuits, sans API.
// Le message est déjà rédigé ; l'utilisateur n'a plus qu'à appuyer sur Envoyer.
import { fcfa, libelleMode, moisLabel } from './format';

// Numéro au format international sans « + » : '07 11 22 33 44' -> '2250711223344'
// Renvoie '' si le numéro n'est pas exploitable (WhatsApp demandera alors le contact).
export function numeroWhatsApp(telephone) {
  let n = String(telephone || '').replace(/\D/g, '');
  if (n.startsWith('00')) n = n.slice(2);
  if (n.length === 10) return `225${n}`; // numéro ivoirien à 10 chiffres
  if (n.length >= 11 && n.length <= 15) return n; // déjà avec l'indicatif
  return '';
}

export function lienWhatsApp(telephone, message) {
  return `https://wa.me/${numeroWhatsApp(telephone)}?text=${encodeURIComponent(message)}`;
}

const liste = (mois) => mois.map((m) => moisLabel(m).toLowerCase()).join(', ');

// Rappel de loyer impayé
export function messageRelance({ prenom, montant, mois = [], logement, proprietaire }) {
  const detail = mois.length ? ` (${liste(mois)})` : '';
  return [
    `Bonjour ${prenom},`,
    `Sauf erreur de ma part, il reste ${fcfa(montant)} de loyer à régler${detail}${logement ? ` pour ${logement}` : ''}.`,
    'Merci de me faire le paiement dès que possible, puis de m’envoyer la référence de la transaction.',
    proprietaire ? `Cordialement, ${proprietaire}` : 'Cordialement.',
    '— envoyé avec LoyerFacile',
  ].join('\n');
}

// Reçu de paiement envoyé au locataire
export function messageRecu({ prenom, montant, mois, mode, reference, date, logement, proprietaire }) {
  return [
    `Bonjour ${prenom},`,
    `Je confirme avoir bien reçu ${fcfa(montant)} pour le loyer de ${moisLabel(mois).toLowerCase()}${logement ? ` (${logement})` : ''}.`,
    `Payé le ${date} par ${libelleMode(mode)}${reference ? `, référence ${reference}` : ''}.`,
    `Merci ! ${proprietaire || ''}`.trim(),
    '— reçu envoyé avec LoyerFacile',
  ].join('\n');
}

// Valeurs partagées par plusieurs routes
// Modes qu'un propriétaire ou un locataire peut choisir
const MODES_PAIEMENT = ['especes', 'wave', 'orange_money', 'mtn_money', 'moov_money', 'virement', 'cheque'];
// 'caution' n'est utilisé que par le serveur : impayés réglés avec la caution à la sortie
const STATUTS_PAIEMENT = ['paye', 'en_attente', 'refuse'];
const REGEX_MOIS = /^\d{4}-(0[1-9]|1[0-2])$/;
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = { MODES_PAIEMENT, STATUTS_PAIEMENT, REGEX_MOIS, REGEX_EMAIL };

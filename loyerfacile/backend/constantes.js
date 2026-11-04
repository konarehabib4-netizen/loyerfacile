// Valeurs partagées par plusieurs routes
const MODES_PAIEMENT = ['especes', 'wave', 'orange_money', 'mtn_money', 'moov_money', 'virement', 'cheque'];
const STATUTS_PAIEMENT = ['paye', 'en_attente', 'refuse'];
const REGEX_MOIS = /^\d{4}-(0[1-9]|1[0-2])$/;
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = { MODES_PAIEMENT, STATUTS_PAIEMENT, REGEX_MOIS, REGEX_EMAIL };

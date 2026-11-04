// ============================================================================
// SORTIE D'UN LOCATAIRE : décompte de la caution
//   caution versée
// − retenues (réparations, peinture, dernière facture…)
// − impayés (si le propriétaire choisit de les prendre sur la caution)
// = montant à rendre au locataire (ou reste dû par le locataire si négatif)
// ============================================================================
const pool = require('./db');
const { situation } = require('./echeances');

// Situation limitée aux mois de location (jusqu'au mois de sortie inclus)
async function impayesJusquA(locataireId, dateSortie) {
  const s = await situation(locataireId);
  const moisSortie = String(dateSortie).slice(0, 7);
  const mois = s.mois.filter((m) => m.mois <= moisSortie && m.reste > 0);
  return { mois, total: mois.reduce((t, m) => t + m.reste, 0) };
}

// Calcul pur (sans rien enregistrer) : sert à l'aperçu ET au règlement
function calculer({ caution, retenues, impayes, deduireImpayes }) {
  const totalRetenues = retenues.reduce((t, r) => t + r.montant, 0);
  const disponible = Math.max(0, caution - totalRetenues);
  const deduit = deduireImpayes ? Math.min(disponible, impayes) : 0;
  return {
    caution,
    total_retenues: totalRetenues,
    impayes,
    impayes_deduits: deduit,
    a_rendre: disponible - deduit,
    // ce que le locataire doit encore après le décompte
    reste_du: impayes - deduit + Math.max(0, totalRetenues - caution),
  };
}

// Décompte enregistré d'un locataire sorti (null si la sortie n'est pas réglée)
async function decompte(locataireId) {
  const [[l]] = await pool.query(
    `SELECT l.id, l.prenom, l.nom, l.date_entree, l.date_sortie, l.caution,
            l.caution_deduite_impayes, l.caution_a_rendre, l.sortie_reglee_le,
            u.label AS unite, i.nom_immeuble, i.adresse, p.nom AS proprietaire
     FROM locataires l
     LEFT JOIN unites u ON u.id = l.unite_id
     LEFT JOIN immeubles i ON i.id = u.propriete_id
     LEFT JOIN proprietaires p ON p.id = i.proprietaire_id
     WHERE l.id = ?`,
    [locataireId]
  );
  if (!l || !l.sortie_reglee_le) return null;
  const [retenues] = await pool.query(
    'SELECT libelle, montant FROM retenues_caution WHERE locataire_id = ? ORDER BY id',
    [locataireId]
  );
  const { total: resteImpayes } = await impayesJusquA(locataireId, l.date_sortie || new Date().toISOString());
  const totalRetenues = retenues.reduce((t, r) => t + r.montant, 0);
  return {
    locataire: `${l.prenom} ${l.nom}`,
    logement: `${l.unite || '—'} · ${l.nom_immeuble || ''}${l.adresse ? `, ${l.adresse}` : ''}`,
    proprietaire: l.proprietaire,
    date_entree: l.date_entree,
    date_sortie: l.date_sortie,
    regle_le: l.sortie_reglee_le,
    caution: l.caution,
    retenues,
    total_retenues: totalRetenues,
    impayes_deduits: l.caution_deduite_impayes || 0,
    a_rendre: l.caution_a_rendre || 0,
    // calculé en direct : diminue si le locataire paie ses impayés après coup
    reste_du: resteImpayes + Math.max(0, totalRetenues - l.caution),
  };
}

module.exports = { impayesJusquA, calculer, decompte };

// ============================================================================
// ÉCHÉANCES : ce qu'un locataire doit, mois par mois.
// Chaque mois entre la date d'entrée et aujourd'hui (ou la date de sortie)
// est une échéance, au montant du loyer de son unité au moment de sa création.
// On compare ensuite aux paiements "payé" (et "en attente") de chaque mois.
// ============================================================================
const pool = require('../config/db');

// '2026-08' → '2026-11' : ['2026-08', '2026-09', '2026-10', '2026-11']
function moisEntre(debut, fin) {
  const liste = [];
  let [a, m] = debut.split('-').map(Number);
  const [af, mf] = fin.split('-').map(Number);
  while ((a < af || (a === af && m <= mf)) && liste.length < 600) {
    liste.push(`${a}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) { m = 1; a += 1; }
  }
  return liste;
}

// Crée les échéances manquantes d'un locataire (les existantes ne bougent pas)
async function synchroniser(locataireId) {
  const [[l]] = await pool.query(
    `SELECT DATE_FORMAT(l.date_entree, '%Y-%m') AS debut,
            DATE_FORMAT(LEAST(COALESCE(l.date_sortie, CURDATE()), CURDATE()), '%Y-%m') AS fin,
            COALESCE(u.loyer_mensuel, 0) AS loyer
     FROM locataires l LEFT JOIN unites u ON u.id = l.unite_id
     WHERE l.id = ?`,
    [locataireId]
  );
  if (!l || !l.debut) return;
  const mois = moisEntre(l.debut, l.fin);
  if (mois.length === 0) return;
  // INSERT IGNORE : un mois déjà présent (clé unique locataire + mois) est ignoré
  await pool.query('INSERT IGNORE INTO echeances (locataire_id, mois, montant_du) VALUES ?', [
    mois.map((m) => [locataireId, m, l.loyer]),
  ]);
}

// Situation complète d'un locataire : chaque mois + totaux
async function situation(locataireId) {
  await synchroniser(locataireId);
  const [rows] = await pool.query(
    `SELECT e.mois, e.montant_du,
       COALESCE((SELECT SUM(p.montant) FROM paiements p
                 WHERE p.locataire_id = e.locataire_id AND p.mois_couvrit = e.mois AND p.statut = 'paye'), 0) AS paye,
       COALESCE((SELECT SUM(p.montant) FROM paiements p
                 WHERE p.locataire_id = e.locataire_id AND p.mois_couvrit = e.mois AND p.statut = 'en_attente'), 0) AS en_attente
     FROM echeances e WHERE e.locataire_id = ? ORDER BY e.mois`,
    [locataireId]
  );
  const mois = rows.map((r) => {
    const du = Number(r.montant_du);
    const paye = Number(r.paye);
    const enAttente = Number(r.en_attente);
    const reste = Math.max(0, du - paye);
    return {
      mois: r.mois,
      du,
      paye,
      en_attente: enAttente,
      reste,
      // ce qu'il reste à déclarer en tenant compte des paiements déjà en attente
      a_declarer: Math.max(0, reste - enAttente),
      statut: reste === 0 ? 'paye' : enAttente >= reste ? 'en_attente' : paye > 0 || enAttente > 0 ? 'partiel' : 'impaye',
    };
  });
  return {
    mois,
    total_du: mois.reduce((s, m) => s + m.reste, 0),
    total_en_attente: mois.reduce((s, m) => s + Math.min(m.en_attente, m.reste), 0),
    nb_mois_impayes: mois.filter((m) => m.reste > 0).length,
  };
}

module.exports = { synchroniser, situation, moisEntre };

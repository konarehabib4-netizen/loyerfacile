// Affiche le contenu de la base dans le terminal.
//   npm.cmd run prod:voir              -> liste des tables + nombre de lignes (base EN LIGNE)
//   npm.cmd run prod:voir -- locataires -> les 20 dernières lignes de la table locataires
//   npm.cmd run voir                    -> la même chose sur ta base locale (WAMP)
// Les colonnes sensibles (empreintes de mots de passe, jetons) sont masquées.
const mysql = require('mysql2/promise');
const { optionsConnexion } = require('../src/config/db-config');

const MASQUEES = ['mot_de_passe_hash', 'invitation_token'];

async function main() {
  const table = process.argv[2];
  const c = await mysql.createConnection(optionsConnexion());
  try {
    const [tables] = await c.query('SHOW TABLES');
    const noms = tables.map((t) => Object.values(t)[0]);

    if (!table) {
      const lignes = [];
      for (const nom of noms) {
        const [[{ n }]] = await c.query('SELECT COUNT(*) AS n FROM ??', [nom]);
        lignes.push({ table: nom, lignes: n });
      }
      console.log(`\nBase « ${process.env.DB_NAME} » sur ${process.env.DB_HOST}\n`);
      console.table(lignes);
      console.log('Pour voir une table : npm.cmd run prod:voir -- <nom de la table>');
      return;
    }

    // ?? = nom de table échappé par mysql2 : impossible d'injecter du SQL
    if (!noms.includes(table)) throw new Error(`Table inconnue : ${table}. Tables : ${noms.join(', ')}`);
    const [rows] = await c.query('SELECT * FROM ?? ORDER BY 1 DESC LIMIT 20', [table]);
    const propres = rows.map((r) => {
      const copie = { ...r };
      for (const col of MASQUEES) if (col in copie) copie[col] = copie[col] ? '••••' : null;
      for (const [k, v] of Object.entries(copie)) if (v instanceof Date) copie[k] = v.toISOString().slice(0, 16).replace('T', ' ');
      return copie;
    });
    console.log(`\n${table} : ${rows.length} ligne(s) affichée(s) (les 20 plus récentes)\n`);
    if (propres.length) console.table(propres);
  } finally {
    await c.end();
  }
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exitCode = 1;
});

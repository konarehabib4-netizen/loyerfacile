// Lance l'API (backend, port 5000) ET le frontend (Vite) avec une seule commande :
//   npm run dev
// Ctrl+C arrête les deux. Sans dépendance supplémentaire.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const processus = [
  // L'API (relancer npm run dev après avoir modifié le backend)
  { nom: 'api', couleur: 36, cmd: process.execPath, args: ['server.js'], cwd: path.join(racine, 'backend') },
  { nom: 'web', couleur: 35, cmd: process.execPath, args: [path.join(racine, 'node_modules', 'vite', 'bin', 'vite.js'), ...process.argv.slice(2)], cwd: racine },
];

const enfants = processus.map(({ nom, couleur, cmd, args, cwd }) => {
  const prefixe = `\x1b[${couleur}m[${nom}]\x1b[0m `;
  const enfant = spawn(cmd, args, { cwd, env: { ...process.env, FORCE_COLOR: '1' } });
  const afficher = (flux) => (data) =>
    String(data)
      .split(/\r?\n/)
      .filter((l) => l.trim())
      .forEach((l) => flux.write(prefixe + l + '\n'));
  enfant.stdout.on('data', afficher(process.stdout));
  enfant.stderr.on('data', afficher(process.stderr));
  enfant.on('exit', (code) => {
    console.log(`${prefixe}arrêté (code ${code ?? 0})`);
    arreter();
  });
  return enfant;
});

let arretEnCours = false;
function arreter() {
  if (arretEnCours) return;
  arretEnCours = true;
  enfants.forEach((e) => e.exitCode === null && e.kill());
  setTimeout(() => process.exit(0), 300);
}
process.on('SIGINT', arreter);
process.on('SIGTERM', arreter);

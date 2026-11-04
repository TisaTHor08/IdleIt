// Publie une version sur GitHub : node tools/release.js [notes.md]
// 1. construit l'installateur et la version portable (electron-builder) ;
// 2. ajoute des copies au nom stable (Farmling-Setup.exe, Farmling-portable.exe) : le site les télécharge via
//    /releases/latest/download/... sans connaître le numéro de version ;
// 3. crée la version vX.Y.Z avec tous les fichiers (latest.yml et .blockmap servent aux mises à jour automatiques).
// Pense à monter "version" dans package.json avant, et à pousser le commit (la version pointe sur main).
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const { version } = require(path.join(ROOT, 'package.json'));
const notes = process.argv[2];
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE; // sinon Electron démarrerait comme Node pendant la construction
const run = (cmd, args) => execFileSync(cmd, args, { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32', env });

fs.rmSync(DIST, { recursive: true, force: true });
run('npx', ['electron-builder', '--win', 'portable', 'nsis', '--publish', 'never']);
const setup = `Farmling-Setup-${version}.exe`, portable = `Farmling-portable-${version}.exe`;
for (const f of [setup, portable, `${setup}.blockmap`, 'latest.yml']) if (!fs.existsSync(path.join(DIST, f))) throw new Error('Fichier manquant : ' + f);
fs.copyFileSync(path.join(DIST, setup), path.join(DIST, 'Farmling-Setup.exe'));
fs.copyFileSync(path.join(DIST, portable), path.join(DIST, 'Farmling-portable.exe'));
const files = [setup, `${setup}.blockmap`, portable, 'latest.yml', 'Farmling-Setup.exe', 'Farmling-portable.exe'].map(f => path.join('dist', f));
run('gh', ['release', 'create', 'v' + version, ...files, '--repo', 'TisaTHor08/IdleIt', '--target', 'main', '--title', `Farmling ${version}`,
  ...(notes ? ['--notes-file', notes] : ['--generate-notes'])]);
console.log('Version publiée : v' + version);

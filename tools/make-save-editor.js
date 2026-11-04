// Génère editeur-de-save.html : un seul fichier autonome, avec les données du jeu (data.js) intégrées.
// Usage : npm run save-editor (à relancer quand le contenu du jeu change).
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const data = fs.readFileSync(path.join(root, 'src', 'renderer', 'js', 'data.js'), 'utf8').replace(/<\/script/gi, '<\/script');
const src = fs.readFileSync(path.join(__dirname, 'save-editor.src.html'), 'utf8');
const { version } = require(path.join(root, 'package.json'));
const out = src.replace('/*DATA*/', () => data).replace('Éditeur de sauvegarde · IdleIt Ferme</h1>', `Éditeur de sauvegarde · IdleIt Ferme</h1><span class="muted">v${version}</span>`);
fs.writeFileSync(path.join(root, 'editeur-de-save.html'), out);
console.log('editeur-de-save.html généré (' + Math.round(out.length / 1024) + ' Ko)');

// Test de l'éditeur de sauvegarde (Electron, rendu hors écran) :
//   node tools/start-test.js tools/test-save-editor.js   (ou : npx electron tools/test-save-editor.js)
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const assert = require('assert');
const D = require('../src/renderer/js/data.js');
const { Game } = require('../src/renderer/js/core.js');

app.whenReady().then(async () => {
  const errors = [];
  // Rendu hors écran : rien ne s'affiche, mais la capture fonctionne.
  const win = new BrowserWindow({ width: 1200, height: 800, show: false, webPreferences: { contextIsolation: true, offscreen: true } });
  win.webContents.on('console-message', (_e, level, msg) => { if (level >= 3) errors.push(msg); });
  await win.loadFile(path.join(__dirname, '..', 'editeur-de-save.html'));
  const js = code => win.webContents.executeJavaScript(code);
  const fresh = new Game(null).serialize();
  await js(`window.confirm = () => true; loadText(${JSON.stringify(fresh)}, 'save.json')`);
  // Tous les onglets s'affichent sans erreur.
  for (const t of ['general', 'seeds', 'field', 'ups', 'robots', 'tal', 'perks', 'pets', 'market', 'factory', 'ach', 'json']) await js(`tab = '${t}'; buildNav(); render();`);
  await js(`
    document.getElementById('god').click();
    save.pets.list.push({ uid: save.pets.nextUid++, id: 'dragon', xp: 0, nodes: {}, path: null, mastery: {}, food: 'gl_elixir' });
    save.pets.list.push({ uid: save.pets.nextUid++, id: 'taupe', xp: 0, nodes: {}, path: 'ver', mastery: {}, food: 'gl_tarte_cosmique' });
    save.pets.list.forEach(maxPet);
    tab = 'factory'; render();
    [...document.querySelectorAll('button')].find(b => b.textContent === 'Usine complète').click();
    tab = 'pets'; render();
  `);
  await new Promise(r => setTimeout(r, 800));
  fs.mkdirSync(path.join(__dirname, 'shots'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'shots', 'editeur.png'), (await win.webContents.capturePage()).toPNG());
  const out = await js('JSON.stringify(save)');
  const g = new Game(out);
  assert.strictEqual(g.prestiges(), 0, 'toujours 0 renaissance');
  const dragon = g.s.pets.list.find(p => p.id === 'dragon');
  assert.ok(dragon && g.petLevel(dragon) === D.PET_LEVEL.max + D.PET_LEVEL.masteryMax, 'dragonnet au niveau max sans renaissance');
  assert.ok(dragon.path && dragon.food === 'gl_elixir', 'voie et gamelle gardées');
  const worm = g.s.pets.list.find(p => p.id === 'taupe');
  assert.strictEqual(g.foodEffectFor(worm, worm.food).desc.startsWith('Ver cosmique'), true, 'ver cosmique actif');
  assert.ok(D.SEEDS.every(sd => g.s.seeds[sd.id]), 'tous les légumes');
  assert.ok(g.factoryOn() && g.s.factory.machines.length === D.MACHINES.reduce((a, m) => a + m.max, 0), 'usine complète');
  assert.ok(g.achCount() === D.ACHIEVEMENTS.length, 'tous les succès');
  assert.ok(g.petSlots() >= g.s.pets.list.length, 'tous les compagnons visibles');
  for (let t = 0; t < 30; t += 0.25) g.tick(0.25); // la partie éditée tourne
  assert.deepStrictEqual(errors, [], 'aucune erreur dans l’éditeur');
  console.log('éditeur de sauvegarde : OK');
  app.quit();
}).catch(e => { console.error(e); process.exitCode = 1; app.quit(); });

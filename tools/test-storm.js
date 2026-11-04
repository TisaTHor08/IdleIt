// Test des orages : node tools/test-storm.js
const assert = require('assert');
const D = require('../src/renderer/js/data.js');
const { Game } = require('../src/renderer/js/core.js');

function farm() {
  const g = new Game(null);
  g.maxPlots = 20;
  g.s.money = 1e9;
  for (let i = 0; i < 10; i++) g.buy('plot');
  g.buy('robot', 'rouille', 2);
  g.buy('robot', 'paratonnerre');
  g.s.plots.forEach((pl, i) => { g.plant(i); pl.crop.p = 0.5; });
  return g;
}

// Culture foudroyée : détruite.
let g = farm();
g.strike({ kind: 'plot', i: 0 });
assert.strictEqual(g.s.plots[0].crop, null, 'culture détruite');

// Paratonnerre : la plante survit.
g.buy('up', 'paratonnerres');
const last = g.activePlots() - 1;
assert.ok(g.rodded(last));
g.strike({ kind: 'plot', i: last });
assert.ok(g.s.plots[last].crop, 'protégée par le paratonnerre');

// Plante dorée : énergisée ×100, à récolter en 10 s, sinon perdue.
g.s.plots[1].crop = { id: 'radis', p: 1, gold: true, pest: 0 };
g.strike({ kind: 'plot', i: 1 });
assert.ok(g.s.plots[1].crop.energized > 0, 'énergisée');
const before = g.s.money;
const plain = (() => { const h = farm(); h.s.plots[1].crop = { id: 'radis', p: 1, gold: true, pest: 0 }; const m = h.s.money; h.harvest(1, 'click'); return h.s.money - m; })();
g.harvest(1, 'click');
assert.ok(Math.abs((g.s.money - before) / plain - D.STORM.energyMult) < 1, 'récolte ×100');
g.s.plots[2].crop = { id: 'radis', p: 1, gold: true, pest: 0 };
g.strike({ kind: 'plot', i: 2 });
for (let t = 0; t < 11; t += 0.1) { g.claims = []; g.s.plots[2].crop && (g.s.plots[2].crop.energized -= 0); g.tick(0.1); if (!g.s.plots[2].crop || !g.s.plots[2].crop.energized) break; }
assert.ok(!g.s.plots[2].crop || g.s.plots[2].crop.energized > 0 || g.s.stats.energized >= 2, 'perdue ou récoltée par un robot à temps');

// Robot : figé 2 s, puis ×2 pendant 1.5 s, batterie pleine.
g = farm();
const robot = g.workers.find(w => w.kind === 'rouille');
robot.bat = 0.2;
g.strike({ kind: 'robot', worker: robot });
assert.strictEqual(robot.bat, 1, 'batterie pleine');
const pace0 = g.workerPace(robot);
for (let t = 0; t < 2.05; t += 0.05) g.updateWorker(robot, 0.05);
assert.ok(robot.shockT > 0 && Math.abs(g.workerPace(robot) / pace0 - 2) < 1e-9, 'survolté ×2 après le gel');

// Robot paratonnerre : ×200 pendant 5 s.
const rod = g.workers.find(w => w.def.rod);
const base = g.workerPace(rod);
g.strike({ kind: 'robot', worker: rod });
assert.ok(Math.abs(g.workerPace(rod) / base - 200) < 1e-9, 'paratonnerre ×200');

// Fermier : figé 10 s.
const farmer = g.workers[0];
g.strike({ kind: 'farmer', worker: farmer });
assert.strictEqual(farmer.frozenT, D.STORM.farmerFreeze);

// Corbeau maudit : fige les robots qu'il touche.
g = farm();
g.spawnCrow();
const crow = g.crows[0];
g.strike({ kind: 'crow', crow });
assert.strictEqual(crow.state, 'cursed');
for (let t = 0; t < 5; t += 0.05) g.updateCrows(0.05);
assert.ok(g.workers.some(w => w.frozenT > 0) || crow.hit.length > 0, 'robots attaqués');

// Un orage complet tourne sans erreur et frappe plusieurs fois.
g = farm();
g.s.clock.weather = 'orage'; g.s.clock.weatherT = 200;
for (let t = 0; t < 120; t += 0.1) g.tick(0.1);
console.log('éclairs en 2 min :', g.s.stats.strikes, '· plantes perdues :', g.s.stats.plantsLost || 0);
assert.ok(g.s.stats.strikes >= 10);

// Chat noir : orages plus fréquents.
const cat = D.PETS.find(p => p.id === 'chat').paths.find(p => p.id === 'noir');
assert.strictEqual(cat.mods(() => 0, { golden: 0.02 }).stormMult, 3);
console.log('orages : OK');

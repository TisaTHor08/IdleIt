// Test des cultures denses et de la miniaturisation : node tools/test-dense.js
const assert = require('assert');
const D = require('../src/renderer/js/data.js');
const { Game } = require('../src/renderer/js/core.js');

const g = new Game(null);
g.maxPlots = 40;
g.s.money = 1e30;
for (let i = 0; i < 27; i++) g.buy('plot');
const n0 = g.s.plots.length, equiv0 = g.plotEquiv(), cost0 = g.plotCost();
assert.strictEqual(n0, 30);

// Culture serrée : 3 parcelles -> 1, même nombre de plants, prix des parcelles inchangé.
assert.ok(g.buy('merge', 1));
assert.strictEqual(g.s.plots.length, n0 - 2, '3 parcelles fusionnées en 1');
assert.strictEqual(g.plotEquiv(), equiv0, 'même nombre total de plants');
assert.strictEqual(g.plotCost(), cost0, 'le prix des parcelles ne baisse pas en fusionnant');

// Intensive puis quantique.
for (let k = 0; k < 8; k++) g.buy('merge', 1);
assert.strictEqual(g.tierCount(1), 9);
for (let k = 0; k < 3; k++) assert.ok(g.buy('merge', 2), 'intensive');
assert.ok(g.buy('merge', 3), 'quantique');
assert.strictEqual(g.tierCount(3), 1);
assert.strictEqual(g.plotEquiv(), equiv0, 'toujours le même nombre de plants');
assert.ok(!g.buy('merge', 3), 'plus assez d\'intensives');
console.log(`30 parcelles -> ${g.s.plots.length} (dont 1 quantique de 27 plants) : ${g.maxPlots - g.s.plots.length} places libérées`);

// Une récolte quantique vaut 27 récoltes, la pousse est 2 % plus lente.
const q = g.s.plots.findIndex(p => p.tier === 3), c = g.s.plots.findIndex(p => !p.tier);
for (const i of [q, c]) { g.plant(i); g.s.plots[i].moist = 1; g.s.plots[i].crop.p = 0.5; }
assert.ok(Math.abs(g.plotGrowthRate(q) / g.plotGrowthRate(c) - 0.98) < 1e-9, 'pousse -2 %');
g.s.plots[q].crop.p = 1; g.s.plots[c].crop.p = 1;
g.pm.double = -1; // pas de double récolte aléatoire pendant le test
const vq = g.harvest(q, 'click'), vc = g.harvest(c, 'click');
assert.ok(Math.abs(vq / vc - 27) < 1e-6, 'récolte ×27');

// Actions, eau et dorés proportionnels au nombre de plants.
const wk = g.workers[0];
assert.ok(Math.abs(g.actTime(wk, 'harvest', q) / g.actTime(wk, 'harvest', c) - 27) < 1e-9, 'récolte 27× plus longue');
assert.ok(Math.abs(g.actTime(wk, 'plant', q) / g.actTime(wk, 'plant', c) - 27) < 1e-9, 'plantation 27× plus longue');
assert.strictEqual(g.actTime(wk, 'water', q), g.actTime(wk, 'water', c), 'arroser : même durée');
g.plant(q); g.plant(c);
assert.ok(Math.abs(g.evapRate(q) / g.evapRate(c) - 27) < 1e-9, 'boit 27× plus');

// Miniaturisation : verrouillée avant 8 robots, puis -5 %.
assert.ok(!g.buy('up', 'mini_rouille'), 'verrouillée avant 8 robots');
g.buy('robot', 'rouille', 8);
const r = g.workers.find(w => w.kind === 'rouille');
const pace = g.workerPace(r);
assert.ok(g.buy('up', 'mini_rouille'));
assert.ok(Math.abs(g.workerPace(r) / pace - D.MINI.pace) < 1e-9, 'robot 5 % moins efficace');

// Sauvegarde : les niveaux de parcelles sont gardés.
const g2 = new Game(g.serialize());
assert.strictEqual(g2.tierCount(3), 1);
assert.ok(g2.lvl('mini_rouille'));
for (let t = 0; t < 120; t += 0.1) g2.tick(0.1);
console.log('denses et miniaturisation : OK');

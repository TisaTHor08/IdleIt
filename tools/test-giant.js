// Test des mutations : node tools/test-giant.js
const assert = require('assert');
const D = require('../src/renderer/js/data.js');
const { Game } = require('../src/renderer/js/core.js');

const g = new Game(null);
g.s.money = 1e12;
for (let i = 0; i < 9; i++) g.buy('plot');
g.buy('tal', 'labo');
g.pm.double = -1; g.pm.golden = -1;
const quiet = fn => { const r = Math.random; Math.random = () => 0.99; try { return fn(); } finally { Math.random = r; } };
const crop = (i, mutant) => quiet(() => { g.plant(i); const c = g.s.plots[i].crop; c.mutant = mutant; c.p = 1; return c; });
const value = i => quiet(() => g.harvest(i, 'click'));
const w = g.workers[0];

// Tirage à la plantation : uniquement en Science, réparti selon les poids.
const counts = {};
const r0 = Math.random;
for (let k = 0; k < 400000; k++) { const m = g.rollMutation(); if (m) counts[m] = (counts[m] || 0) + 1; }
assert.ok(Object.keys(counts).length === Object.keys(D.MUTATIONS).length, 'toutes les mutations sortent : ' + JSON.stringify(counts));

crop(0, null); const base = value(0);
crop(0, 'giant'); assert.ok(Math.abs(value(0) / base - 8) < 1e-6, 'géante ×8');
crop(0, 'giant'); crop(1, null);
assert.ok(Math.abs(g.actTime(w, 'harvest', 0) / g.actTime(w, 'harvest', 1) - 3) < 1e-9, 'géante : récolte ×3');
crop(0, 'solide'); assert.ok(Math.abs(g.actTime(w, 'harvest', 0) / g.actTime(w, 'harvest', 1) - 5) < 1e-9, 'solide : récolte ×5');
crop(0, 'sterile'); assert.strictEqual(value(0), 0, 'stérile = 0');
// Fébrile : une fois sur deux rien.
let zero = 0; for (let k = 0; k < 400; k++) { g.plant(0); const c = g.s.plots[0].crop; c.mutant = 'febrile'; c.p = 1; if (g.harvest(0, 'click') === 0) zero++; }
assert.ok(zero > 150 && zero < 250, 'fébrile ~50 % : ' + zero);
// Lente : pousse 6× plus lentement.
quiet(() => { g.plant(0); g.plant(1); });
g.s.plots[0].crop.mutant = 'lente'; g.s.plots[0].moist = g.s.plots[1].moist = 1;
assert.ok(Math.abs(g.plotGrowthRate(1) / g.plotGrowthRate(0) - 6) < 1e-9, 'lente ÷6');
// Moisie : 0 et voisines ÷10 dans un rayon de 3.
crop(0, 'moisi'); crop(3, null); crop(4, null);
assert.strictEqual(g.moldNear(3), 10, 'voisine à 3 cases touchée');
assert.strictEqual(g.moldNear(4), 1, 'à 4 cases : épargnée');
assert.ok(Math.abs(value(3) / base - 0.1) < 1e-6, 'voisine ÷10');
assert.strictEqual(value(0), 0, 'moisie = 0');
// Infinie : les ouvriers la laissent, elle grandit et prend de la valeur.
crop(0, 'infini');
assert.strictEqual(g.taskFor(0), null, 'les ouvriers ne la récoltent pas');
g.s.plots[0].moist = 1;
for (let t = 0; t < 30; t += 0.1) g.tick(0.1);
assert.ok(g.s.plots[0].crop.extra > 1, 'continue de grandir');
assert.ok(value(0) > base * 2, 'sa valeur a augmenté');
// À partir de ×300, les ouvriers la récoltent.
crop(0, 'infini'); g.s.plots[0].crop.extra = 298;
assert.strictEqual(g.taskFor(0), null, '×299 : encore laissée');
g.s.plots[0].crop.extra = 299;
assert.strictEqual(g.taskFor(0), 'harvest', '×300 : récoltée par les ouvriers');
value(0);
// Carnivore : attrape un robot, libéré quand un autre la récolte, vaut ×2.
const h = new Game(null);
h.s.money = 1e12; h.buy('robot', 'rouille', 2); h.buy('tal', 'labo');
quiet(() => { h.plant(0); }); const c = h.s.plots[0].crop; c.mutant = 'carnivore'; c.p = 1;
const [r1] = h.workers.filter(x => x.kind === 'rouille');
r1.x = 30; h.assign(r1, { plot: 0, type: 'harvest' }); r1.x = r1.tx;
h.updateWorker(r1, 0.1);
assert.strictEqual(r1.state, 'caught', 'robot attrapé');
assert.strictEqual(c.caught, r1.id);
assert.ok(h.taskFor(0) === 'harvest' && !h.claims[0], 'un autre ouvrier peut venir');
h.harvest(0, 'click');
assert.notStrictEqual(r1.state, 'caught', 'libéré après la récolte');
console.log('mutations :', Object.entries(counts).map(([k, v]) => k + ' ' + v).join(', '));
console.log('mutations : OK');

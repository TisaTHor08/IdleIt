// Renaissances, ères, compagnons multiples, périssabilité, événements : node tools/test-v4.js
const assert = require('assert');
const D = require('../src/renderer/js/data.js');
const { Game } = require('../src/renderer/js/core.js');
const run = (g, secs) => { for (let t = 0; t < secs; t += 0.1) g.tick(0.1); };

// --- Renaissance : peu de graines d'or, seuil qui grandit, ères débloquées ---
const g = new Game(null);
assert.strictEqual(g.prestigeGain(), 0, 'rien avant le seuil');
assert.ok(g.locked('seed', 'fraise'), 'fraise verrouillée avant la 1re renaissance');
g.s.runEarned = D.PRESTIGE.base;
assert.strictEqual(g.prestigeGain(), D.PRESTIGE.gsBase, 'gain au seuil');
g.s.runEarned = D.PRESTIGE.base * 1000;
const big = g.prestigeGain();
assert.ok(big < 40, 'même ×1000 le seuil, le gain reste modeste : ' + big);
g.s.money = 1e6;
g.adoptPet('poussin');
g.s.pets.list[0].xp = 1e9;
assert.ok(g.prestige(), 'renaissance');
assert.strictEqual(g.s.pets.list[0].xp, 0, 'compagnon remis au niveau 0');
assert.strictEqual(g.harvestRate(), 0, 'les revenus récents repartent de zéro');
assert.strictEqual(g.petSlots(), 2, 'un emplacement de plus');
assert.ok(!g.locked('seed', 'fraise'), 'fraise débloquée');
assert.ok(g.locked('seed', 'brocoli'), 'brocoli encore verrouillé');
assert.ok(g.prestigeThreshold() === D.PRESTIGE.base * D.PRESTIGE.growth, 'seuil ×growth');
assert.ok(!('autoBuy' in g.s) && !D.PERKS.some(p => /auto/.test(p.id)), "plus d'achat automatique");

// --- Deux compagnons (le même ou un autre) ---
g.s.money = 1e9;
assert.ok(g.adoptPet('poussin'), 'second poussin');
assert.strictEqual(g.s.pets.list.length, 2);
assert.ok(!g.adoptPet('chat'), 'pas de 3e emplacement');
assert.ok(g.adoptPet('chat', 1), 'remplacement dans un emplacement');
run(g, 5);
const g2 = new Game(g.serialize());
assert.deepStrictEqual(g2.s.pets.list.map(p => p.id), ['poussin', 'chat'], 'compagnons sauvegardés');

// --- Maîtrise : améliorations après le niveau max (avec une voie) ---
const m = new Game(null);
m.s.money = 1e9;
m.adoptPet('poussin');
const pet = m.s.pets.list[0];
pet.xp = 1e12;
const def = D.PETS[0];
for (let k = 0; k < 30; k++) for (const n of def.nodes) m.buyPetNode(pet, n.id);
assert.ok(m.choosePath(pet, def.paths[0].id));
assert.ok(m.masteryPoints(pet) > 0, 'points de maîtrise');
assert.ok(m.buyMastery(pet, D.MASTERY[0].id), 'maîtrise achetée');

// --- Périssabilité ---
const f = new Game(null);
f.s.trade.stock.x = { seed: 'salade', units: 10, worth: 5, fresh: 1, traits: [] };
f.updateFreshness(f.shelfLife('salade') * 0.5);
assert.ok(f.s.trade.stock.x.fresh < 0.7 && f.s.trade.stock.x.fresh > 0.5, 'la fraîcheur baisse');
f.updateFreshness(f.shelfLife('salade') * 5);
assert.ok(!f.s.trade.stock.x, 'le stock pourrit');
assert.ok(D.SEEDS.find(s => s.id === 'salade').shelf < D.SEEDS.find(s => s.id === 'patate').shelf, 'la salade se garde moins que la patate');

// --- Événements : chacun démarre et se termine sans erreur ---
for (const id of Object.keys(D.EVENTS)) {
  const e = new Game(null);
  e.s.money = 1e9;
  for (let i = 0; i < 12; i++) e.buy('plot');
  e.s.plots.forEach((pl, i) => { e.plant(i); if (pl.crop) pl.crop.p = 0.5; });
  e.startEvent(id);
  run(e, 120);
  console.log(`événement ${id.padEnd(20)} ok · ${e.s.plots.filter(p => p.crop).length} plantes`);
}
// Sanglier chassé au clic, voleur attrapé
const b = new Game(null);
b.s.money = 1e6; for (let i = 0; i < 8; i++) b.buy('plot');
b.startEvent('sanglier'); run(b, 1); b.scareBoar(); run(b, 10);
assert.ok(!b.ev.boar, 'sanglier parti');
b.startEvent('voleur'); run(b, 1); b.catchThief(); assert.ok(b.s.stats.thieves === 1, 'voleur attrapé'); run(b, 10);
assert.ok(!b.ev.thief, 'voleur enfui');
console.log('v4 : OK');

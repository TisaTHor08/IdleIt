// Test des voies des compagnons : node tools/test-paths.js
const assert = require('assert');
const D = require('../src/renderer/js/data.js');
const { Game } = require('../src/renderer/js/core.js');

function maxedGame(petId) {
  const g = new Game(null);
  g.maxPlots = 30;
  g.s.money = 1e12;
  g.s.stats.prestiges = 20; // compagnons légendaires débloqués
  for (let i = 0; i < 20; i++) g.buy('plot');
  for (const id of ['carotte', 'salade', 'tomate', 'chou']) g.buy('seed', id);
  g.buy('robot', 'rouille', 4);
  g.s.money += D.PETS.find(p => p.id === petId).cost;
  assert.ok(g.adoptPet(petId), petId + ' adopté');
  const pet = g.s.pets.list[0];
  pet.xp = 1e9;
  const def = D.PETS.find(p => p.id === petId);
  const evo = def.nodes.find(n => n.evo);
  for (let k = 0; k < 30; k++) for (const n of def.nodes) { g.buyPetNode(pet, evo.id); g.buyPetNode(pet, n.id); }
  g.s.plots.forEach((pl, i) => { g.plant(i); pl.crop.p = 0.2; });
  g.pet = pet;
  return g;
}

for (const pet of D.PETS) {
  // Pas de voie avant l'évolution au niveau max.
  const fresh = new Game(null);
  fresh.s.money = pet.cost;
  assert.strictEqual(fresh.adoptPet(pet.id), !pet.pr, pet.id + ' : verrouillé avant ' + (pet.pr || 0) + ' renaissances');
  fresh.s.stats.prestiges = pet.pr || 0;
  fresh.adoptPet(pet.id);
  assert.ok(!fresh.canChoosePath(fresh.s.pets.list[0]), pet.id + ' : voie verrouillée au départ');
  for (const path of pet.paths) {
    const g = maxedGame(pet.id);
    assert.ok(g.canChoosePath(g.pet), pet.id + ' : voie disponible une fois maxé');
    assert.ok(g.choosePath(g.pet, path.id), pet.id + '/' + path.id + ' choisie');
    assert.ok(!g.choosePath(g.pet, pet.paths[0].id === path.id ? pet.paths[1].id : pet.paths[0].id), 'voie définitive');
    let money = g.s.money;
    for (let t = 0; t < 240; t += 0.1) g.tick(0.1);
    const events = new Set(g.events.map(e => e.type));
    // Sauvegarde / chargement : la voie est gardée.
    const g2 = new Game(g.serialize());
    assert.strictEqual(g2.petPath(g2.s.pets.list[0]).id, path.id, 'voie sauvegardée');
    console.log(`${pet.id.padEnd(8)} ${path.id.padEnd(13)} ok · ${g.petName(g.pet).padEnd(18)} gain 4 min ${D.fmt(g.s.money - money).padStart(7)} · ${[...events].filter(e => ['cry', 'worm', 'cheshire', 'gem', 'cry-blocked', 'cart', 'crow-scared'].includes(e)).join(', ')}`);
  }
}

// Basilic : muet près d'une mandragore.
const b = maxedGame('poussin');
b.choosePath(b.pet, 'basilic');
b.s.stats.prestiges = 7;
b.s.seeds.mandragore = true;
b.s.plots.forEach((pl, i) => { pl.crop = { id: 'mandragore', p: 0.1, gold: false, pest: 0 }; });
b.events.length = 0;
for (let t = 0; t < 50; t += 0.1) b.tick(0.1);
assert.ok(!b.events.some(e => e.type === 'cry') && b.events.some(e => e.type === 'cry-blocked'), 'basilic bloqué par la mandragore');
console.log('voies : OK');

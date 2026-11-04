// Saisons : dates, chevauchements, plantes, bonus, événements, sauvegarde : node tools/test-seasons.js
const assert = require('assert');
const D = require('../src/renderer/js/data.js');
const { Game } = require('../src/renderer/js/core.js');
const at = s => D.seasonAt(new Date(s + 'T12:00'));
const id = s => (at(s) || {}).id || null;

// --- Dates : 2 semaines avant et après ---
assert.strictEqual(id('2026-10-21'), 'halloween', 'Halloween J-10');
assert.strictEqual(id('2026-10-20'), null, 'Halloween J-11 : rien');
assert.strictEqual(id('2026-11-10'), 'halloween', 'Halloween J+10');
assert.strictEqual(id('2026-11-11'), null, 'Halloween J+11 : rien');
assert.strictEqual(id('2026-12-20'), 'noel');
assert.strictEqual(id('2026-12-30'), 'nouvel_an', 'chevauchement : la date la plus proche gagne');
assert.strictEqual(id('2027-01-11'), 'nouvel_an');
assert.strictEqual(id('2027-02-06'), 'nouvel_an_chinois', 'nouvel an chinois 2027 (6 février)');
assert.strictEqual(at('2027-03-28').date.getDate(), 28, 'Pâques 2027 : 28 mars');
assert.strictEqual(id('2028-04-16'), 'paques', 'Pâques 2028 : 16 avril');
assert.strictEqual(id('2027-07-20'), null, 'été : pas de saison');
assert.strictEqual(id('2027-06-21'), 'fete_musique', 'fête de la musique');
assert.strictEqual(id('2027-07-01'), 'fete_musique', 'fête de la musique J+10');
assert.strictEqual(id('2027-07-02'), null, 'fête de la musique J+11 : finie');
assert.strictEqual(id('2026-02-14'), 'saint_valentin', 'Saint-Valentin 2026 (le nouvel an chinois est le 17 : la date la plus proche gagne)');
assert.strictEqual(id('2026-02-17'), 'nouvel_an_chinois', 'nouvel an chinois 2026');
console.log('dates : OK');

// --- En saison (forcée) ---
const g = new Game(null);
g.forceSeason = 'halloween'; g.seasonT = 0; g.updateSeason(0);
assert.strictEqual(g.seasonId, 'halloween');
const seeds = g.seasonSeeds().map(s => s.id);
assert.deepStrictEqual(seeds, ['potiron', 'herbe_sorciere']);
assert.ok(g.seasonSeedOk('potiron') && !g.seasonSeedOk('sapin'), 'seules les plantes de la saison');
const champi = D.SEEDS.find(s => s.fam === 'champi');
assert.strictEqual(g.fxValue(champi), 2, 'Halloween : champignons ×2');
assert.ok(g.pm.nightSpeed < 1, 'Halloween : nuits plus longues');
// Une plante de saison vaut un multiple de la meilleure graine.
g.s.seeds.tomate = true;
assert.strictEqual(g.seedValue(D.SEASON_SEEDS.find(s => s.id === 'potiron')), D.SEEDS.find(s => s.id === 'tomate').value * 3);
g.s.plots[0].seed = 'potiron';
g.plant(0);
assert.strictEqual(g.s.plots[0].crop.id, 'potiron', 'on plante un potiron');
g.s.plots[0].crop.p = 1;
const m0 = g.s.money;
g.harvest(0, 'click');
assert.ok(g.s.money > m0, 'il se récolte');
// Événement de saison
assert.ok(g.eventAllowed('sabbat') && !g.eventAllowed('traineau'), 'seul l’événement de la saison');
for (let k = 0; k < 3; k++) { g.plant(k); }
assert.ok(g.startEvent('sabbat'), 'nuit des sorcières');
for (let t = 0; t < 20; t += 0.25) g.tick(0.25);

// --- Chaque saison s'applique sans erreur ---
for (const s of D.SEASONS) {
  const x = new Game(null);
  x.s.money = 1e9;
  for (let k = 0; k < 8; k++) x.buy('plot');
  x.forceSeason = s.id; x.seasonT = 0; x.updateSeason(0);
  x.s.plots.forEach((pl, i) => { pl.seed = x.seasonSeeds()[i % 2].id; x.plant(i); });
  const ev = Object.keys(D.EVENTS).find(k => D.EVENTS[k].season === s.id);
  assert.ok(x.startEvent(ev), s.id + ' : événement');
  for (let t = 0; t < 120; t += 0.25) x.tick(0.25);
  if (s.discount) assert.ok(x.discount() < 1, s.id + ' : soldes');
  console.log(`${s.name.padEnd(18)} OK · ${x.seasonSeeds().map(p => p.name).join(', ')} · événement « ${D.EVENTS[ev].name} »`);
}
// Nouvel an chinois : une récolte sur 8 vaut ×8.
const c = new Game(null);
c.forceSeason = 'nouvel_an_chinois'; c.seasonT = 0; c.updateSeason(0);
let lucky = 0;
c.emit = (type) => { if (type === 'lucky8') lucky++; };
for (let k = 0; k < 16; k++) { c.s.plots[0].crop = { id: 'radis', p: 1, gold: false, pest: 0 }; c.harvest(0, 'click'); }
assert.strictEqual(lucky, 2, 'deux récoltes ×8 sur 16');

// --- Fin de saison : on ne replante plus, la sauvegarde reste propre ---
const e = new Game(null);
e.forceSeason = 'noel'; e.seasonT = 0; e.updateSeason(0);
e.s.plots[0].seed = 'sapin'; e.plant(0);
const saved = e.serialize();
const f = new Game(saved);
f.forceSeason = null; f.seasonT = 0; f.updateSeason(0);
assert.strictEqual(f.s.plots[0].crop.id, 'sapin', 'le sapin déjà planté reste');
f.plant(0);
assert.notStrictEqual(f.s.plots[0].crop.id, 'sapin', 'hors saison, on ne replante plus de sapin');
// --- Gamelles de saison : panier, cuisine en saison seulement, gardées après, perdues si retirées ---
const h = new Game(null);
h.s.money = 1e12;
h.forceSeason = 'halloween'; h.seasonT = 0; h.updateSeason(0);
const food = D.PET_FOODS.find(f => f.id === 'gl_bonbon_potiron');
assert.ok(!h.canCraftSeasonFood(food.id), 'panier vide : pas de bonbon');
for (const ing of food.ingredients) for (let k = 0; k < ing.n; k++) { h.s.plots[0].crop = { id: ing.seed, p: 1, gold: false, pest: 0 }; h.harvest(0, 'click'); }
assert.deepStrictEqual(Object.keys(h.s.basket).sort(), ['herbe_sorciere', 'potiron'], 'les légumes de saison vont au panier');
assert.ok(h.craftSeasonFood(food.id), 'bonbon cuisiné pendant Halloween');
assert.ok(!h.canCraftSeasonFood('gl_pain_epices'), 'pas de pain d’épices à Halloween');
h.forceSeason = null; h.seasonT = 0; h.updateSeason(0);
assert.strictEqual(h.s.pantry[food.id], 1, 'la gamelle se garde après la fête');
assert.deepStrictEqual(h.s.basket, {}, 'le panier se vide à la fin de la fête');
h.adoptPet('poussin');
const pet = h.s.pets.list[0];
assert.ok(h.equipFood(pet, food.id));
const pm = h.petRt[pet.uid].pm;
assert.ok(pm.crowHunter && pm.crowHunter.reward === 3 && pm.nightSpeed < 1, 'effet et contrepartie du bonbon');
const back = new Game(h.serialize());
assert.strictEqual(back.s.pets.list[0].food, food.id, 'gamelle de saison sauvegardée');
h.equipFood(pet, null);
assert.ok(!h.s.pantry[food.id], 'retirée, elle est détruite');
for (const f of D.PET_FOODS.filter(x => x.season)) assert.ok(f.ingredients.every(i => D.SEASON_SEEDS.find(x => x.id === i.seed).season === f.season), f.id + ' : ingrédients de sa saison');
console.log('gamelles de saison : OK');
console.log('saisons : OK');

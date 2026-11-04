// Usine, produits dorés et nourriture des compagnons : node tools/test-factory.js
const assert = require('assert');
const D = require('../src/renderer/js/data.js');
const { Game } = require('../src/renderer/js/core.js');
const run = (g, secs) => { for (let t = 0; t < secs; t += 0.25) g.tick(0.25); };
const stock = (g, seed, units, worth = 100, gold = false) => {
  g.s.trade.stock[seed + (gold ? '|dore' : '|')] = { seed, traits: gold ? ['dore'] : [], units, worth, fresh: 1 };
};

// --- Verrouillage : rien avant 13 renaissances ---
const g0 = new Game(null);
g0.s.money = 1e60;
assert.ok(!g0.buy('up', 'usine'), 'usine verrouillée avant 13 renaissances');

// --- Une usine qui tourne ---
const g = new Game(null);
g.s.stats.prestiges = 17;
g.s.money = 1e60; g.s.market.unlocked = true;
g.buy('up', 'licence');
for (let i = 0; i < 8; i++) g.buy('silo');
assert.ok(g.buy('up', 'usine'), 'usine construite');
assert.ok(g.buy('machine', 'marmite') && g.buy('machine', 'four') && g.buy('machine', 'sorbetiere'), 'machines achetées');
assert.ok(g.buy('fridge'), 'frigo');
for (const id of ['fraise', 'framboise', 'ble', 'tomate']) g.s.seeds[id] = true;
stock(g, 'fraise', 200); stock(g, 'framboise', 200); stock(g, 'ble', 200);
const before = g.stockUnits();
run(g, 120);
assert.ok(g.stockUnits() < before, 'les ingrédients partent des silos');
assert.ok(g.s.stats.batches > 0, 'des lots sont cuisinés : ' + g.s.stats.batches);
assert.ok(g.fridgeUnits() > 0, 'le frigo se remplit : ' + g.fridgeUnits());
const made = Object.keys(g.s.factory.stock);
console.log('produits :', made.map(k => `${k} ${g.s.factory.stock[k].units}`).join(', '), '· lots', g.s.stats.batches);
// Valeur : un produit vaut plus que ses ingrédients.
const e = g.s.factory.stock.compote || g.s.factory.stock[made[0]];
assert.ok(e.worth > 100, 'un produit transformé vaut plus que ses ingrédients');

// --- Vente : grossiste puis trader ---
const m0 = g.s.money;
const vWhole = g.sellProduct(made[0], 0.5);
assert.ok(vWhole > 0 && g.s.stats.productValue >= vWhole, 'vente au grossiste'); void m0;
g.buy('up', 'trader_usine');
assert.ok(g.productPrice(made[0]) !== D.FACTORY.wholesale, 'avec le trader, prix au cours');

// --- Recette imposée ---
g.setMachineRecipe('marmite', 'confiture');
assert.strictEqual(g.machineRecipe('marmite'), 'confiture');

// --- Légumes dorés : produit à part, cours à part, recettes dorées ---
const gg = new Game(null);
gg.s.stats.prestiges = 17; gg.s.money = 1e60; gg.s.market.unlocked = true;
gg.buy('up', 'licence'); gg.buy('silo');
gg.s.plots[0].crop = { id: 'radis', p: 1, gold: true, pest: 0 };
gg.harvest(0, 'click');
const goldKey = Object.keys(gg.s.trade.stock).find(k => gg.s.trade.stock[k].traits.includes('dore'));
assert.ok(goldKey, 'le légume doré est stocké à part');
for (let i = 0; i < 20; i++) gg.updateMarket(5);
assert.ok(gg.s.trade.trend['radis*'] != null, 'le doré a son propre cours');
const r = D.RECIPES.find(x => x.id === 'sorbet_dore');
assert.ok(!gg.canCook(r, 1), 'pas de sorbet doré sans fruits dorés');

// --- Nourriture : cuisiner, équiper, retirer ---
const p = new Game(null);
p.s.stats.prestiges = 17; p.s.money = 1e60; p.s.market.unlocked = true;
p.buy('up', 'licence'); p.buy('silo');
p.buy('up', 'usine'); p.buy('up', 'cuisine');
p.s.factory.stock.glace = { id: 'glace', units: 50, worth: 1e6, fresh: 1 };
assert.ok(p.craftFood('gl_glace'), 'gamelle cuisinée');
assert.strictEqual(p.s.pantry.gl_glace, 1);
p.s.money += D.PETS[0].cost;
p.adoptPet('poussin');
const pet = p.s.pets.list[0];
pet.xp = 1e9;
for (let k = 0; k < 30; k++) for (const n of D.PETS[0].nodes) p.buyPetNode(pet, n.id);
assert.ok(p.choosePath(pet, 'phenix'));
const auraBefore = p.petRt[pet.uid].pm.aura.mult;
assert.ok(p.equipFood(pet, 'gl_glace'), 'gamelle équipée');
const pmFood = p.petRt[pet.uid].pm;
assert.ok(pmFood.aura.wet && pmFood.aura.evap === 0, 'phénix givré : il humidifie');
assert.ok(Math.abs(pmFood.aura.mult / auraBefore - 1.6) < 1e-9, 'phénix givré : +60% de croissance');
assert.strictEqual(p.s.pantry.gl_glace, 0);
// La terre de l'aura reste humide.
const ent = p.petRt[pet.uid].ents[0];
const i = Math.max(0, Math.round((ent.x - 29 - 6) / 15));
p.s.plots[i].moist = 0; p.tick(0.25);
assert.strictEqual(p.s.plots[i].moist, 1, 'aura humide');
// Retirer : l'effet s'arrête et la gamelle revient.
assert.ok(p.equipFood(pet, null));
assert.ok(!p.petRt[pet.uid].pm.aura.wet, 'effet arrêté une fois retirée');
assert.strictEqual(p.s.pantry.gl_glace, 1, 'la gamelle revient au placard');
p.equipFood(pet, 'gl_glace');
// Renaissance : la gamelle reste équipée, l'usine repart de zéro.
p.s.runEarned = D.threshold(17) * 2;
assert.ok(p.prestige());
assert.strictEqual(p.s.pets.list[0].food, 'gl_glace', 'gamelle gardée à la renaissance');
assert.ok(!p.factoryOn() && !p.s.factory.machines.length, 'usine remise à zéro');
// Sauvegarde
const p2 = new Game(p.serialize());
assert.strictEqual(p2.s.pets.list[0].food, 'gl_glace', 'gamelle sauvegardée');

// --- Tous les effets de nourriture se calculent sur tous les compagnons et toutes les voies ---
const all = new Game(null);
all.s.stats.prestiges = 20; all.s.money = 1e60;
let combos = 0;
for (const def of D.PETS) {
  for (const look of [null, ...def.paths.map(x => x.id)]) {
    for (const f of D.PET_FOODS) {
      const fake = { uid: 999, id: def.id, xp: 1e12, nodes: Object.fromEntries(def.nodes.map(n => [n.id, n.max])), path: look, mastery: {}, food: f.id };
      const pm = all.petMods(fake);
      assert.ok(pm && typeof pm.valueAll === 'number' && !Number.isNaN(pm.valueAll), `${def.id}/${look}/${f.id}`);
      combos++;
    }
  }
}
console.log('combinaisons compagnon × voie × gamelle vérifiées :', combos);

// --- Pouvoirs : ils tournent tous sans erreur ---
const pw = new Game(null);
pw.s.stats.prestiges = 20; pw.s.money = 1e60;
for (let k = 0; k < 15; k++) pw.buy('plot');
pw.s.plots.forEach((pl, i) => { pw.plant(i); if (pl.crop) pl.crop.p = i % 2 ? 1 : 0.3; });
pw.adoptPet('poussin');
const r0 = pw.petRt[pw.s.pets.list[0].uid];
for (const kind of ['rain', 'storm', 'star', 'gold', 'ripen', 'harvestAura', 'plant', 'water', 'energize', 'cart', 'frenzy', 'giant', 'crowGold', 'boost']) {
  pw.petPower({ kind, every: 1, n: 2, dur: 5, all: true }, r0, r0.ents[0]);
}
pw.petPower({ kind: 'event', every: 1, ev: 'arcenciel' }, r0, r0.ents[0]);
run(pw, 10);
// Ver cosmique : il balaie tout le champ.
const w = new Game(null);
w.s.stats.prestiges = 20; w.s.money = 1e60;
for (let k = 0; k < 12; k++) w.buy('plot');
w.s.plots.forEach((pl, i) => { w.plant(i); if (pl.crop) pl.crop.p = 0.1; });
w.adoptPet('taupe');
const wp = w.s.pets.list[0];
wp.xp = 1e9;
for (let k = 0; k < 30; k++) for (const n of D.PETS.find(x => x.id === 'taupe').nodes) w.buyPetNode(wp, n.id);
w.choosePath(wp, 'ver');
w.s.pantry.gl_tarte_cosmique = 1;
w.equipFood(wp, 'gl_tarte_cosmique');
const planted = w.s.plots.filter(pl => pl.crop).length;
w.petRt[wp.uid].fxT.worm = 999;
w.updatePets(0.25);
assert.strictEqual(w.s.plots.filter(pl => pl.crop).length, planted, 'le ver cosmique ne mange rien');
assert.ok(w.s.plots.every(pl => !pl.crop || pl.crop.p >= 1), 'tout le champ a mûri');
console.log('usine : OK');

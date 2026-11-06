// Test rapide du marché sans interface : node tools/test-market.js
const assert = require('assert');
const D = require('../src/renderer/js/data.js');
const { Game } = require('../src/renderer/js/core.js');

const g = new Game(null);
g.maxPlots = 30;
g.s.money = 1e9;
for (let i = 0; i < 12; i++) g.buy('plot');
for (const id of ['carotte', 'salade', 'tomate', 'chou']) g.buy('seed', id);

assert.strictEqual(g.buy('up', 'licence'), false, 'licence verrouillée avant le déblocage');
g.s.runEarned = D.MARKET.unlockAt;
g.tick(0.1);
assert.ok(g.s.market.unlocked, 'marché débloqué à 10 M');
assert.ok(g.buy('up', 'licence'), 'licence achetée');
assert.ok(g.buy('up', 'trader'), 'trader possible après la licence');

// Sans silo : tout part au marché classique à 75 %.
let before = g.s.money;
g.plant(0); g.s.plots[0].crop.p = 1;
const ref = g.harvest(0, 'farmer');
assert.ok(Math.abs(g.s.money - before - ref * D.MARKET.surplus) < 1e-6, 'surplus vendu à 75 %');

// Avec silo : stocké, puis vendu au cours.
g.buy('silo');
before = g.s.money;
for (let i = 0; i < 12; i++) { g.plant(i); g.s.plots[i].crop.p = 1; g.harvest(i, 'farmer'); }
assert.strictEqual(g.s.money, before, 'récoltes stockées, pas vendues');
assert.ok(g.stockUnits() === 12, 'stock = 12 unités');
const key = Object.keys(g.s.trade.stock)[0];
const sat0 = g.saturation(g.s.trade.stock[key].seed);
const got = g.sellStock(key);
assert.ok(got > 0 && g.stockUnits() === 0, 'vente au cours');
assert.ok(g.saturation(g.s.plots[0].crop ? 'x' : key.split('|')[0]) < sat0, 'le prix baisse après une grosse vente');

const quiet = fn => { const r = Math.random; Math.random = () => 0.99; try { return fn(); } finally { Math.random = r; } };
// Taille : une géante donne 8 unités au silo, une infinie ×(1 + extra), pour la même valeur totale.
quiet(() => { g.plant(0); }); g.s.plots[0].crop.p = 1; g.s.plots[0].crop.mutant = 'giant';
quiet(() => g.harvest(0, 'farmer'));
assert.strictEqual(g.stockUnits(), 8, 'géante : 8 unités');
quiet(() => { g.plant(0); }); Object.assign(g.s.plots[0].crop, { p: 1, mutant: 'infini', extra: 19 });
quiet(() => g.harvest(0, 'farmer'));
assert.strictEqual(g.stockUnits(), 28, 'infinie ×20 : 20 unités');
g.sellAll();

// Vision du trader : exigence qui baisse avec le remplissage, et ventes anticipées selon le flux entrant.
{
  const t = new Game(null);
  t.s.money = 1e15; t.s.market.unlocked = true;
  t.buy('up', 'licence'); t.buy('silo'); t.buy('up', 'trader');
  const floor = D.MARKET.surplus / (1 - t.traderCommission());
  assert.ok(Math.abs(t.traderTarget(0, floor) - D.MARKET.traderTarget) < 1e-9 && Math.abs(t.traderTarget(1, floor) - floor) < 1e-9, 'cible : du prix visé au plancher');
  const fillUp = () => { t.s.trade.stock = {}; t.s.trade.sold = {}; t.s.trade.trend = {}; t.s.trade.demands = []; t.store(D.SEEDS[0], [], 100 * t.siloCapacity() * 0.8, t.siloCapacity() * 0.8); };
  t.inflow = t.siloCapacity() / 100; // de quoi remplir le silo en 100 s
  fillUp(); t.s.trade.trend[D.SEEDS[0].id] = 0.75; t.traderAct();
  const kept = t.stockUnits();
  assert.ok(t.buy('up', 'trader_vision'), 'amélioration achetée');
  fillUp(); t.s.trade.trend[D.SEEDS[0].id] = 0.75; t.traderAct();
  assert.ok(t.stockUnits() < kept, 'avec la vision, il libère de la place (' + t.stockUnits() + ' < ' + kept + ')');
  assert.ok(t.stockUnits() <= t.traderRoom() + 1, 'garde la place des récoltes à venir');
  console.log('vision du trader : OK (stock ' + kept + ' -> ' + t.stockUnits() + ' / ' + t.siloCapacity() + ')');
}

// Fusion des silos : 3 silos -> 1 grand silo (même capacité, 2 emplacements libérés), puis 3 grands -> 1 géant.
{
  const t = new Game(null);
  t.s.money = 1e30; t.s.market.unlocked = true; t.buy('up', 'licence');
  t.buy('silo', null, 8);
  assert.strictEqual(t.s.trade.silos, 8);
  const cap8 = t.siloCapacity();
  assert.ok(!t.buy('silo'), 'emplacements pleins');
  assert.ok(t.buy('smerge', 1), 'fusion en grand silo');
  assert.strictEqual(t.s.trade.silos, 6, '2 emplacements libérés');
  assert.strictEqual(t.siloCapacity(), cap8, 'capacité conservée');
  const c1 = t.siloCost();
  t.buy('silo', null, 2); t.buy('smerge', 1, 2);
  assert.strictEqual(t.siloTierCount(1), 3, '3 grands silos');
  assert.ok(t.buy('smerge', 2), 'fusion en silo géant');
  assert.deepStrictEqual(t.s.trade.siloTiers.slice(0, 2), [2, 0], 'le géant est rangé en premier');
  assert.ok(t.siloCost() > c1, 'les silos équivalents rendent le suivant plus cher');
  assert.strictEqual(t.siloEquiv(), 9 + t.siloTierCount(0), 'capacité en silos équivalents');
  const t2 = new Game(t.serialize());
  assert.deepStrictEqual(t2.s.trade.siloTiers, t.s.trade.siloTiers, 'niveaux sauvegardés');
  const old = t.serialize(); const o = JSON.parse(old); delete o.trade.siloTiers; o.trade.silos = 5;
  const t3 = new Game(JSON.stringify(o));
  assert.strictEqual(t3.siloCapacity(), 5 * D.MARKET.siloCap * (1 + 0.5 * t3.lvl('silo_cap')), 'ancienne partie : silos simples');
  console.log('fusion des silos : OK (capacité max ' + D.fmt(D.MARKET.siloMax * D.SILO_TIERS[D.SILO_TIERS.length - 1].mult * D.MARKET.siloCap) + ' unités)');
}

// Réactivité du trader : 8 s, 3 s au niveau 5, 2 s au niveau max.
{
  const t = new Game(null);
  const at = l => { t.s.up.trader_vif = l; return t.traderEvery(); };
  const max = D.UPGRADES.find(u => u.id === 'trader_vif').max;
  assert.ok(Math.abs(at(0) - 8) < 1e-9 && Math.abs(at(5) - 3) < 1e-9 && Math.abs(at(max) - 2) < 1e-9, 'réactivité : ' + [at(0), at(5), at(max)]);
}

// Gestionnaire : fait récolter une infinie d'une graine moins rentable que celle prévue sur la parcelle.
{
  const t = new Game(null);
  t.s.money = 1e15; t.s.market.unlocked = true;
  for (let i = 0; i < 3; i++) t.buy('plot');
  for (const id of ['carotte', 'salade', 'tomate', 'chou']) t.buy('seed', id);
  t.buy('up', 'licence'); t.buy('up', 'trader'); t.buy('up', 'gestion');
  const mk = (i, id) => { t.s.plots[i].seed = id; t.plant(i); Object.assign(t.s.plots[i].crop, { id, p: 1, mutant: 'infini', extra: 3 }); };
  mk(0, 'radis'); t.s.plots[0].seed = 'chou';
  mk(1, 'chou'); t.s.plots[1].seed = 'chou';
  t.s.trade.trend = {}; t.s.trade.demands = []; t.s.trade.shocks = [];
  t.managerRenew();
  assert.ok(t.s.plots[0].crop.renew && t.taskFor(0) === 'harvest', 'infinie de radis sur une parcelle à chou : récoltée');
  assert.ok(!t.s.plots[1].crop.renew && t.taskFor(1) === null, 'infinie déjà de la bonne graine : gardée');
  console.log('gestionnaire et infinies : OK');
}

// Demandes, trader et gestionnaire tournent sans erreur.
g.buy('up', 'gestion');
g.newDemand();
for (let t = 0; t < 600; t += 0.1) g.tick(0.1);
console.log('stock', g.stockUnits(), '/', g.siloCapacity(), '· demandes', g.s.trade.demands.length, '· ventes', g.s.stats.marketSales || 0,
  '· cours', Object.entries(g.s.trade.trend).slice(0, 4).map(([k, v]) => k + ' ' + v.toFixed(2)).join(', '));
assert.ok((g.s.stats.marketSales || 0) > 1, 'le trader a vendu');

// Sauvegarde / chargement et renaissance.
const g2 = new Game(g.serialize());
assert.strictEqual(g2.s.trade.silos, 1);
assert.ok(g2.s.market.unlocked);
g2.s.runEarned = 1e10;
g2.prestige();
assert.strictEqual(g2.s.trade.silos, 0, 'silos remis à zéro');
assert.ok(g2.s.market.unlocked, 'déblocage conservé');
assert.strictEqual(g2.lvl('licence'), 0, 'licence à racheter');
console.log('marché : OK');

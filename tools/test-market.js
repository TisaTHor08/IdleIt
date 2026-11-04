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

// Ferme de démonstration du marché : npm start -- --farm-shots --farm-demo=tools/demo-market.js
(() => {
  const g = FARM_APP.game;
  g.s.money = 1e9;
  g.s.runEarned = 2e7;
  for (let i = 0; i < 16; i++) g.buy('plot');
  for (const id of ['carotte', 'salade', 'tomate', 'chou', 'mais']) g.buy('seed', id);
  g.buy('robot', 'rouille', 3);
  g.buy('tal', 'certif');
  g.tick(0.1);
  g.buy('up', 'licence');
  for (let k = 0; k < 4; k++) g.buy('silo');
  g.buy('up', 'trader');
  g.buy('up', 'gestion');
  g.s.plots.forEach((pl, i) => { pl.seed = i % 2 ? 'chou' : 'tomate'; g.plant(i); pl.crop.p = 1; g.harvest(i, 'farmer'); g.plant(i); pl.crop.p = Math.random(); });
  for (let k = 0; k < 6; k++) for (let i = 0; i < 16; i++) { g.plant(i); g.s.plots[i].crop.p = 1; g.harvest(i, 'robot'); g.plant(i); g.s.plots[i].crop.p = Math.random(); }
  g.newDemand(); g.newDemand();
  FARM_APP.ui.setDrawer(false);
  FARM_APP.ui.buildSeedbar();
})();

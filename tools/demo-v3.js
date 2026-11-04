// Ferme de démonstration : robots spécialisés, recharge, bio et ravageurs, tiroir ouvert.
// npm start -- --farm-shots --farm-demo=tools/demo-v3.js
(() => {
  const g = FARM_APP.game;
  g.s.money = 1e7;
  for (let i = 0; i < 16; i++) g.buy('plot');
  for (const id of ['carotte', 'salade', 'tomate', 'chou']) g.buy('seed', id);
  g.buy('robot', 'rouille', 2);
  g.buy('robot', 'arroseur', 2);
  g.buy('robot', 'semeur');
  g.buy('robot', 'moissonneur');
  g.buy('robot', 'soigneur');
  g.buy('tal', 'certif');
  g.s.plots.forEach((pl, i) => { pl.seed = i % 2 ? 'chou' : 'tomate'; g.plant(i); pl.crop.p = Math.random(); });
  for (const i of [3, 8, 12]) g.s.plots[i].crop.pest = 5;
  // Deux robots vides : ils partent recharger.
  g.workers.filter(w => w.kind === 'rouille').forEach(w => { w.bat = 0.05; });
  // La nuit tombe : le fermier rentre dormir.
  g.s.clock.t = Math.ceil(g.s.clock.t / 480) * 480 + 480 * 0.9;
  FARM_APP.ui.buildSeedbar();
  FARM_APP.ui.setDrawer(true);
})();

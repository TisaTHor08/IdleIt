// Ferme de démonstration v4 : 3 compagnons, graines d'ères avancées, événements (sanglier, voleur, foire).
// npm start -- --farm-shots --farm-demo=tools/demo-v4.js
(() => {
  const { game: g } = FARM_APP;
  const D = FARM_DATA;
  g.s.stats.prestiges = 4;
  g.s.gsTotal = 40;
  g.s.money = 1e14;
  for (let i = 0; i < 20; i++) g.buy('plot');
  for (const sd of D.SEEDS) if (g.eraOk(sd)) g.buy('seed', sd.id);
  g.buy('robot', 'rouille', 3);
  g.buy('robot', 'arroseur', 2);
  g.buy('robot', 'drone', 1);
  for (const id of ['poussin', 'chat', 'chien']) g.adoptPet(id);
  const [a, b] = g.s.pets.list;
  a.xp = 1e9; b.xp = 1e5;
  for (let k = 0; k < 10; k++) for (const n of D.PETS.find(p => p.id === a.id).nodes) g.buyPetNode(a, n.id);
  g.choosePath(a, D.PETS.find(p => p.id === a.id).paths[0].id);
  g.s.plots.forEach((pl, i) => { pl.seed = D.SEEDS[i % D.SEEDS.length].id; if (!g.s.seeds[pl.seed]) pl.seed = 'radis'; g.plant(i); if (pl.crop) pl.crop.p = Math.random(); });
  g.startEvent('sanglier');
  g.startEvent('voleur');
  g.startEvent('foire');
  g.startEvent('etoile');
  FARM_APP.ui.buildSeedbar();
  FARM_APP.ui.setDrawer(true);
})();

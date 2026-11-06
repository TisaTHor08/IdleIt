// Démo de la chaîne de robots : un robot de chaque rang (rouillé → esprit de l'Arbre-monde), légumes de haut niveau.
// npm start -- --farm-shots --farm-demo=tools/demo-chain.js
(() => {
  const { game: g } = FARM_APP;
  const D = FARM_DATA;
  g.s.stats.prestiges = 20;
  g.s.money = 1e40;
  for (let i = 0; i < 24; i++) g.buy('plot');
  for (const sd of D.SEEDS) g.buy('seed', sd.id);
  const n = D.ROBOT_CHAIN.length;
  g.buy('robot', 'rouille', n);
  // Le k-ième rouillé monte jusqu'au rang k : un robot de chaque rang.
  for (let k = n - 1; k >= 1; k--) for (let j = 0; j < k; j++) g.buy('rupgrade', D.ROBOT_CHAIN[j].id);
  g.buy('robot', 'moissonneur', 2);
  const top = D.SEEDS.slice(-8).map(sd => sd.id);
  g.s.plots.forEach((pl, i) => { pl.seed = top[i % top.length]; g.plant(i); if (pl.crop) pl.crop.p = 0.3 + ((i * 37) % 70) / 100; pl.moist = 1; });
  g.workers.forEach((w, i) => { if (w.kind !== 'farmer') { w.x = 40 + i * 14; w.state = 'idle'; } });
  g.s.money = 1e33;
  FARM_APP.ui.buildSeedbar();
})();

// Orage de démonstration : npm start -- --farm-shots --farm-demo=tools/demo-storm.js
(() => {
  const { game: g } = FARM_APP;
  g.s.money = 1e9;
  for (let i = 0; i < 16; i++) g.buy('plot');
  g.buy('robot', 'rouille', 2);
  g.buy('robot', 'paratonnerre', 2);
  for (let i = 0; i < 4; i++) g.buy('up', 'paratonnerres');
  g.s.clock.weather = 'orage'; g.s.clock.weatherT = 999;
  g.s.clock.t = Math.floor(g.s.clock.t / 480) * 480 + 240; // midi
  g.s.plots.forEach((pl, i) => { g.plant(i); pl.crop.p = 0.3 + Math.random() * 0.6; });
  const last = g.activePlots() - 2;
  g.s.plots[last].crop = { id: 'radis', p: 1, gold: true, pest: 0 };
  g.strike({ kind: 'plot', i: last });              // doré énergisé
  g.spawnCrow();
  setTimeout(() => {
    if (g.crows[0]) g.strike({ kind: 'crow', crow: g.crows[0] });
    g.strike({ kind: 'robot', worker: g.workers.find(w => w.def.rod) });
    g.strike({ kind: 'plot', i: 3 });
  }, 1400);
  // Les captures défilent ensuite : quelques éclairs de plus pendant ce temps.
  setInterval(() => g.strike(g.pickStrikeTarget()), 700);
})();

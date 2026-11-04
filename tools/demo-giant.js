// Les 8 mutations côte à côte : npm start -- --farm-shots --farm-demo=tools/demo-giant.js
(() => {
  const { game: g } = FARM_APP;
  g.s.money = 1e12;
  for (let i = 0; i < 12; i++) g.buy('plot');
  for (const id of ['carotte', 'salade', 'tomate', 'chou']) g.buy('seed', id);
  g.buy('tal', 'labo');
  g.buy('robot', 'rouille', 2);
  g.s.clock.t = Math.floor(g.s.clock.t / 480) * 480 + 240;
  g.s.clock.weather = 'soleil'; g.s.clock.weatherT = 999;
  const muts = [null, 'giant', 'infini', 'carnivore', 'sterile', 'febrile', 'lente', 'solide', 'moisi', null, 'giant', null];
  g.s.plots.forEach((pl, i) => {
    pl.seed = ['chou', 'carotte', 'salade', 'tomate'][i % 4];
    g.plant(i); pl.crop.p = 1; pl.crop.mutant = muts[i % muts.length]; pl.moist = 1;
    if (pl.crop.mutant === 'infini') pl.crop.extra = 4;
  });
  const robot = g.workers.find(w => w.kind === 'rouille');
  robot.x = FARM_CORE.plotX(3); robot.state = 'caught'; robot.caughtPlot = 3; g.s.plots[3].crop.caught = robot.id;
  g.workers.forEach(w => { if (w !== robot) w.frozenT = 999; });
})();

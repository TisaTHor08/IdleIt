// Cultures denses et robots miniatures : npm start -- --farm-shots --farm-demo=tools/demo-dense.js
(() => {
  const { game: g } = FARM_APP;
  g.s.money = 1e30;
  for (let i = 0; i < 30; i++) g.buy('plot');
  for (const id of ['carotte', 'salade', 'tomate', 'chou', 'mais']) g.buy('seed', id);
  for (let k = 0; k < 9; k++) g.buy('merge', 1);
  for (let k = 0; k < 3; k++) g.buy('merge', 2);
  g.buy('merge', 3);
  for (let k = 0; k < 2; k++) g.buy('merge', 1);
  g.buy('robot', 'rouille', 11); g.buy('rupgrade', 'rouille', 3);
  g.buy('up', 'mini_rouille');
  g.s.clock.t = Math.floor(g.s.clock.t / 480) * 480 + 240;
  g.s.clock.weather = 'soleil'; g.s.clock.weatherT = 999;
  g.s.plots.forEach((pl, i) => { pl.seed = ['tomate', 'chou', 'mais'][i % 3]; g.plant(i); pl.crop.p = 0.6 + Math.random() * 0.4; });
  FARM_APP.ui.buildSeedbar();
})();

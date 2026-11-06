// Ferme de vitrine pour la page d'accueil du wiki (captures : npm run wiki:shots).
(() => {
  const { game: g, renderer: r, ui } = FARM_APP;
  const D = FARM_DATA;
  const mode = window.HOME_MODE || 'day';
  g.s.stats.prestiges = 17; g.s.money = 1e40; g.s.market.unlocked = true;
  for (let i = 0; i < 30; i++) g.buy('plot');
  g.buy('up', 'licence'); for (let i = 0; i < 3; i++) g.buy('silo');
  for (const sd of D.SEEDS) g.s.seeds[sd.id] = true;
  const mix = ['tomate', 'tournesol', 'mais', 'citrouille', 'chou', 'fraise', 'cosmique', 'rose', 'champignon', 'ble', 'pasteque', 'mandragore', 'arbre_monde', 'carotte', 'vanille'];
  g.s.plots.forEach((pl, i) => { pl.seed = mix[i % mix.length]; g.plant(i); if (pl.crop) { pl.crop.p = 0.45 + ((i * 37) % 55) / 100; pl.crop.gold = i % 9 === 4; pl.crop.star = i === 7; } pl.moist = 1; });
  for (const id of ['rouille', 'arroseur', 'moissonneur']) g.buy('robot', id, id === 'rouille' ? 8 : 2);
  // Rouillés améliorés : 2 chromés, 2 lasers, 2 drones.
  g.buy('rupgrade', 'rouille', 6); g.buy('rupgrade', 'chrome', 4); g.buy('rupgrade', 'laser', 2);
  for (const [id, path] of [['poussin', 'phenix'], ['dragon', null], ['licorne', null], ['chat', 'cheshire']]) {
    g.s.money += 1e40; g.adoptPet(id);
    const pet = g.s.pets.list[g.s.pets.list.length - 1];
    pet.xp = 1e12;
    for (let k = 0; k < 30; k++) for (const n of D.PETS.find(p => p.id === id).nodes) g.buyPetNode(pet, n.id);
    if (path) g.choosePath(pet, path);
  }
  // Saison forcée (captures des habillages) : la moitié du champ en plantes de saison.
  if (window.HOME_SEASON) {
    g.forceSeason = window.HOME_SEASON; g.seasonT = 0; g.updateSeason(0);
    const ss = g.seasonSeeds();
    for (const sd of ss) g.s.seasonShop.bought[sd.id] = true;
    g.s.plots.forEach((pl, i) => { if (i % 2) { pl.seed = ss[(i >> 1) % ss.length].id; g.plant(i); if (pl.crop) pl.crop.p = 0.6 + (i % 4) / 10; } });
  }
    if (mode === 'factory') {
    for (const id of ['usine', 'trader_usine']) g.buy('up', id);
    for (const m of ['marmite', 'four', 'four', 'presse', 'sorbetiere', 'chocolaterie', 'alambic']) g.buy('machine', m);
    g.buy('frobot', 'porteur', 3); g.buy('fridge'); g.buy('fridge');
    for (const id of ['fraise', 'framboise', 'ble', 'tournesol', 'cacao', 'rose', 'cosmique']) g.s.trade.stock[id + '|'] = { seed: id, traits: [], units: 400, worth: 1e20, fresh: 1 };
    for (let t = 0; t < 30; t += 0.25) g.tick(0.25);
    g.view = 'factory';
  } else for (let t = 0; t < 4; t += 0.25) g.tick(0.25);
  g.s.clock.weather = 'soleil';
  if (mode === 'night') g.s.clock.t = Math.floor(g.s.clock.t / D.DAY_LEN) * D.DAY_LEN + D.DAY_LEN * 0.88;
  else g.s.clock.t = Math.floor(g.s.clock.t / D.DAY_LEN) * D.DAY_LEN + D.DAY_LEN * 0.45;
  g.events.length = 0;
  ui.closePanel();
  r.fitCanvas(); r.dirty();
  document.getElementById('hud').style.visibility = 'hidden';
})();

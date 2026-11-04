// Ferme de démonstration pour les captures : npm start -- --farm-shots --farm-demo=tools/demo-pets.js
(() => {
  const g = FARM_APP.game;
  g.s.money = 1e9;
  for (let i = 0; i < 14; i++) g.buy('plot');
  for (const id of ['carotte', 'salade', 'tomate', 'chou', 'mais']) g.buy('seed', id);
  g.buy('robot', 'rouille', 3);
  g.adoptPet('poussin');
  const pet = g.s.pets.list[0];
  pet.xp = 1e7;
  for (let i = 0; i < 5; i++) g.buyPetNode(pet, 'croissance');
  for (let i = 0; i < 3; i++) g.buyPetNode(pet, 'rayon');
  g.buyPetNode(pet, 'coq');
  for (const pl of g.s.plots) { g.plant(g.s.plots.indexOf(pl)); pl.crop.p = Math.random(); }
  FARM_APP.ui.buildSeedbar();
})();

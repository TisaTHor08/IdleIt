// Planche des voies des compagnons + effets : npm start -- --farm-shots --farm-demo=tools/demo-paths.js
(() => {
  const { game: g, renderer: r } = FARM_APP;
  const D = FARM_DATA, S = FARM_SPRITES;
  // Planche de toutes les apparences
  const sheet = document.createElement('div');
  sheet.style.cssText = 'position:absolute;left:640px;bottom:60px;display:grid;grid-template-columns:repeat(6,90px);gap:4px;background:#2a3d55;padding:6px;border-radius:6px;font:10px sans-serif;color:#fff;z-index:9';
  for (const p of D.PETS) for (const look of ['base', 'evo', ...p.paths.map(x => x.id)]) {
    const c = document.createElement('div');
    c.style.textAlign = 'center';
    const img = new Image(); img.src = S.petIconURL(p.id, look, 4); img.style.cssText = 'width:64px;height:64px;image-rendering:pixelated';
    c.append(img, document.createElement('br'), look === 'base' ? p.name : look === 'evo' ? p.evoName : p.paths.find(x => x.id === look).name);
    sheet.appendChild(c);
  }
  document.body.appendChild(sheet);
  // Ferme : coq basilic, cri et ver des sables
  g.s.money = 1e9;
  for (let i = 0; i < 16; i++) g.buy('plot');
  g.buy('robot', 'rouille', 3);
  g.s.stats.prestiges = 14; // compagnons légendaires visibles aussi
  g.adoptPet('poussin');
  const pet = g.s.pets.list[0];
  pet.xp = 1e9;
  for (let k = 0; k < 10; k++) for (const n of ['croissance', 'rayon', 'coq', 'digestion', 'nid']) g.buyPetNode(pet, n);
  g.choosePath(pet, 'basilic');
  g.s.plots.forEach((pl, i) => { g.plant(i); pl.crop.p = Math.random() * 0.6; });
  setTimeout(() => { g.petRt[pet.uid].fxT.cry = 999; r.addFx('worm', FARM_CORE.plotX(12)); }, 2200);
})();

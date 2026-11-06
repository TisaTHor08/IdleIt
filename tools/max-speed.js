// Vitesse maximale théorique : tout au niveau max (20 renaissances, améliorations, talents, talents d'or),
// les meilleurs compagnons (arbre, voie, maîtrise et gamelle optimisés, 5 exemplaires du meilleur) et la meilleure météo.
// Affiche, pour chaque graine, le temps de pousse et de récolte d'une parcelle simple dans ces conditions.
// Hors effets passagers (arc-en-ciel, comète, cris, foudre, surcharge...) et hors saisons.
// Usage : node tools/max-speed.js [graine]   (sans argument : toutes les graines)
const D = require('../src/renderer/js/data.js');
const { Game } = require('../src/renderer/js/core.js');

const RICH = 1e300;
const PR = D.PRESTIGE.thresholds.length;

function maxedGame(doctrine) {
  const g = new Game(null);
  g.forceSeason = null;
  g.s.stats.prestiges = PR;
  for (const sd of D.SEEDS) { g.s.seeds[sd.id] = true; g.s.everSeeds[sd.id] = true; }
  for (const p of D.PERKS) g.s.perks[p.id] = p.max;
  g.s.gsTotal = g.s.gsSpent = 0;
  g.s.market.unlocked = true;
  g.rebuildFx();
  const spend = (kind, id) => { let n = 0; for (;;) { g.s.money = RICH; if (!g.buy(kind, id)) return n; if (++n > 500) return n; } };
  for (let pass = 0; pass < 6; pass++) for (const t of D.TALENTS) {
    const b = D.BRANCHES.find(x => x.id === t.branch);
    if (b.group && b.id !== doctrine) continue;
    spend('tal', t.id);
  }
  // Robots : achats puis transformations (chaîne d'amélioration), jusqu'au dernier rang.
  for (let pass = 0; pass < 3; pass++) {
    for (const r of D.ROBOTS) spend('robot', r.id);
    if (D.ROBOT_CHAIN) for (let k = D.ROBOT_CHAIN.length - 2; k >= 0; k--) for (let j = 0; j <= k; j++) spend('rupgrade', D.ROBOT_CHAIN[j].id);
  }
  for (let pass = 0; pass < 4; pass++) for (const u of D.UPGRADES) if (!u.cosmetic) spend('up', u.id);
  g.rebuildFx();
  g.s.money = 0;
  return g;
}

// Parcelle 0 : simple, irriguée, humide, plantée avec la graine ; plein jour, meilleure météo pour cette graine.
function setPlot(g, seedId) {
  const pl = g.s.plots[0];
  pl.tier = 0; pl.moist = 1;
  pl.crop = { id: seedId, p: 0, gold: false, rot: false, pest: 0 };
}
function placePets(g) { for (const r of Object.values(g.petRt || {})) for (const e of r.ents) e.x = require('../src/renderer/js/core.js').plotX(0); }
function growTime(g, seedId) {
  setPlot(g, seedId);
  placePets(g);
  const sd = D.SEEDS.find(s => s.id === seedId);
  let best = 0;
  for (const w of Object.keys(D.WEATHER)) {
    g.s.clock.weather = w;
    for (const phase of [0.5, 0]) { // midi, minuit (les graines de nuit poussent mieux la nuit)
      g.s.clock.t = phase * D.DAY_LEN;
      best = Math.max(best, g.plotGrowthRate(0));
    }
  }
  g.s.clock.weather = Object.keys(D.WEATHER)[0]; g.s.clock.t = 0.5 * D.DAY_LEN;
  void sd;
  return 1 / best;
}
function harvestTime(g, seedId) {
  setPlot(g, seedId);
  let best = Infinity;
  for (const w of g.workers) {
    if (w.kind === 'farmer' || (w.def.only && w.def.only !== 'harvest')) continue;
    best = Math.min(best, g.actTime(w, 'harvest', 0));
  }
  return best;
}

// ---------- Compagnons ----------
function addPet(g, id) {
  const pet = { uid: g.s.pets.nextUid++, id, xp: 1e30, nodes: {}, path: null, mastery: {}, food: null };
  g.s.pets.list.push(pet);
  g.refreshPet();
  return pet;
}
// Répartit les points de l'arbre puis de la maîtrise en maximisant score() (glouton).
function greedy(g, pet, score) {
  const def = D.PETS.find(p => p.id === pet.id);
  const evo = def.nodes.find(n => n.evo);
  for (let guard = 0; guard < 200 && !g.petEvolved(pet); guard++) {
    // Chemin vers l'évolution : on achète le premier nœud dont les prérequis manquent.
    const st = g.petNodeState(pet, evo.id);
    if (st.reqOk) { if (!g.buyPetNode(pet, evo.id)) break; continue; }
    const need = Object.entries(evo.req || {}).find(([k, v]) => (pet.nodes[k] || 0) < v);
    if (!need || !g.buyPetNode(pet, need[0])) break;
  }
  const step = (list, buy) => {
    for (let guard = 0; guard < 100; guard++) {
      let bestId = null, bestS = -Infinity;
      for (const n of list) {
        const snap = JSON.stringify([pet.nodes, pet.mastery]);
        if (!buy(n.id)) continue;
        const s = score();
        if (s > bestS) { bestS = s; bestId = n.id; }
        [pet.nodes, pet.mastery] = JSON.parse(snap);
        g.refreshPet();
      }
      if (bestId == null) return;
      buy(bestId);
    }
  };
  step(def.nodes, id => g.buyPetNode(pet, id));
  return () => step(D.MASTERY, id => g.buyMastery(pet, id));
}
// Meilleure configuration d'un compagnon pour score(), seul dans la ferme.
function bestPet(base, id, score) {
  let best = null;
  const def = D.PETS.find(p => p.id === id);
  for (const path of [null, ...def.paths.map(p => p.id)]) {
    for (const food of [null, ...D.PET_FOODS.filter(f => !f.season).map(f => f.id)]) {
      const g = base();
      const pet = addPet(g, id);
      pet.food = food;
      g.refreshPet();
      const mastery = greedy(g, pet, () => score(g));
      if (path) { if (!g.choosePath(pet, path)) continue; mastery(); }
      const s = score(g);
      if (!best || s > best.s) best = { s, cfg: JSON.parse(JSON.stringify({ id, nodes: pet.nodes, path: pet.path, mastery: pet.mastery, food: pet.food })) };
    }
  }
  return best;
}
function withPets(base, cfgs) {
  const g = base();
  for (const c of cfgs) {
    const pet = { uid: g.s.pets.nextUid++, xp: 1e30, ...JSON.parse(JSON.stringify(c)) };
    g.s.pets.list.push(pet);
  }
  g.refreshPet();
  return g;
}

const only = process.argv[2];
const seeds = only ? D.SEEDS.filter(s => s.id === only) : D.SEEDS;
const slots = D.PRESTIGE.maxPetSlots;
const games = Object.fromEntries(['bio', 'science'].map(d => [d, () => maxedGame(d)]));
const out = [];
// Les compagnons sont choisis pour la graine la plus lente de la liste (celle qui compte), puis appliqués à toutes.
const target = seeds.reduce((a, b) => (b.grow > a.grow ? b : a));
const result = {};
for (const [doc, base] of Object.entries(games)) {
  const gScore = g => 1 / growTime(g, target.id);
  const hScore = g => 1 / harvestTime(g, target.id);
  const pick = score => {
    let best = null;
    for (const p of D.PETS) { const b = bestPet(base, p.id, score); if (b && (!best || b.s > best.s)) best = b; }
    return best;
  };
  const gp = pick(gScore), hp = pick(hScore);
  const gGame = withPets(base, Array(slots).fill(gp.cfg));
  const hGame = withPets(base, Array(slots).fill(hp.cfg));
  result[doc] = { gp, hp, gGame, hGame, noPet: base() };
}
console.log('Compagnons retenus (×' + slots + ') :');
for (const [doc, r] of Object.entries(result)) console.log(`  ${doc.padEnd(8)} pousse : ${r.gp.cfg.id}/${r.gp.cfg.path}/${r.gp.cfg.food}   récolte : ${r.hp.cfg.id}/${r.hp.cfg.path}/${r.hp.cfg.food}`);
console.log('\ngraine           base pousse  ->  min pousse   récolte min   (sans compagnon)');
for (const sd of seeds) {
  let gMin = Infinity, hMin = Infinity, g0 = Infinity, h0 = Infinity;
  for (const r of Object.values(result)) {
    gMin = Math.min(gMin, growTime(r.gGame, sd.id)); hMin = Math.min(hMin, harvestTime(r.hGame, sd.id));
    g0 = Math.min(g0, growTime(r.noPet, sd.id)); h0 = Math.min(h0, harvestTime(r.noPet, sd.id));
  }
  out.push({ id: sd.id, grow: sd.grow, gMin, hMin });
  console.log(`${sd.id.padEnd(16)} ${D.fmtTime(sd.grow).padStart(8)}  ->  ${gMin.toFixed(2).padStart(8)} s   ${hMin.toFixed(3).padStart(8)} s    (${g0.toFixed(2)} s / ${h0.toFixed(3)} s)`);
}
if (process.env.JSON) require('fs').writeFileSync(process.env.JSON, JSON.stringify(out));

// Simulateur de durée de vie : enchaîne les renaissances avec un bot (achats gloutons, compagnons, talents d'or).
// Usage : node tools/sim-life.js [heures max=200] [renaissances visées=20] [graine aléatoire]
const D = require('../src/renderer/js/data.js');
const { Game } = require('../src/renderer/js/core.js');

const maxHours = +process.argv[2] || 200;
const goal = +process.argv[3] || 20;
if (process.env.GPOW) for (const u of D.UPGRADES) if ((u.fx || process.env.GALL) && u.g > 1 && u.max > 1 && u.max < 999) u.g = Math.pow(u.g, +process.env.GPOW);
// Réglages d'essai (env).
if (process.env.PSTEP) D.PRESTIGE.step = +process.env.PSTEP;
if (process.env.PSG) D.PRESTIGE.stepGrow = +process.env.PSG;
if (process.env.PBASE) D.PRESTIGE.base = +process.env.PBASE;
if (process.env.UNLR) { D.ECO.unlockR = +process.env.UNLR; D.SEEDS.forEach(sd => { if (sd.rank > 0) sd.unlock = D.ECO.unlockBase * Math.pow(D.ECO.unlockR, sd.rank - 1); }); }
if (process.env.VALR) D.SEEDS.forEach(sd => { sd.value = Math.pow(+process.env.VALR, sd.rank); });
if (process.env.TPOW) for (const t of D.TALENTS) if (t.g > 1) t.g = Math.pow(t.g, +process.env.TPOW);
if (process.env.RPOW) for (const r of D.ROBOTS) r.g = Math.pow(r.g, +process.env.RPOW);
if (process.env.CHAINCAP) D.CHAIN_CAP.max = +process.env.CHAINCAP;
// SLOWOFF=1 : retire les durées allongées / incompressibles des légumes de haut niveau (comparaison).
if (process.env.SLOWOFF) {
  const S = D.SLOW, base = D.SEEDS.filter(sd => !sd.season);
  base.forEach((sd, i) => {
    if (!sd.minGrow && sd.harv === 1) return;
    const f = Math.max(0, (i - S.from + 1) / (base.length - S.from)), sk = Math.pow(f, S.pow);
    const grow0 = Math.round(sd.grow / (1 + S.growMult * sk));
    const cyc = (gr, mg, mh) => mg + (gr - mg) / S.mRef + mh + 1;
    sd.value = sd.value * cyc(grow0, 0, 0) / cyc(sd.grow, sd.minGrow, sd.minHarv);
    sd.grow = grow0; sd.minGrow = 0; sd.minHarv = 0; sd.harv = 1;
  });
}
const CALIB = !!process.env.CALIB;
const calibHours = p => (+process.env.CALIB_A || 4.5) + (+process.env.CALIB_B || 0.32) * p;
// Fixe le seuil n° p et en déduit les prix de l'ère suivante (mêmes règles que data.js).
function setThreshold(p, T) {
  D.PRESTIGE.thresholds[p] = T;
  const M = D.ECO.eraMult;
  for (const sd of D.SEEDS) if (sd.pr === p + 1) sd.unlock = T * M[Math.min(sd.eraK, M.length - 1)] * Math.pow(10, Math.max(0, sd.eraK - M.length + 1));
  for (const pet of D.PETS) if (pet.pr === p + 1) pet.cost = Math.round(T * 0.3);
}
if (CALIB) D.PRESTIGE.thresholds.length = 1;
const game = new Game(null);
const PET_ORDER = ['poussin', 'chat', 'abeille', 'taupe', 'chien', 'poussin'];

function petsBuy() {
  const list = game.s.pets.list;
  if (list.length < game.petSlots()) {
    // Le légendaire le plus récent s'il est débloqué, sinon l'ordre habituel.
    const legend = D.PETS.filter(p => p.pr && game.eraOk(p) && !list.some(x => x.id === p.id)).pop();
    const def = legend || D.PETS.find(p => p.id === PET_ORDER[list.length]) || D.PETS[0];
    if (game.s.money >= game.petCost(def.id) * 3) game.adoptPet(def.id);
  }
  else {
    // Emplacements pleins : un légendaire débloqué remplace un compagnon ordinaire.
    const legend = D.PETS.filter(p => p.pr && game.eraOk(p) && !list.some(x => x.id === p.id)).pop();
    const slot = list.findIndex(x => !D.PETS.find(p => p.id === x.id).pr);
    if (legend && slot >= 0 && game.s.money >= game.petCost(legend.id) * 3) game.adoptPet(legend.id, slot);
  }
  for (const pet of list) {
    const def = D.PETS.find(p => p.id === pet.id);
    const evo = def.nodes.find(n => n.evo);
    game.buyPetNode(pet, evo.id);
    for (const n of def.nodes) game.buyPetNode(pet, n.id);
    if (game.canChoosePath(pet)) game.choosePath(pet, def.paths[0].id);
    for (const m of D.MASTERY) game.buyMastery(pet, m.id);
  }
}

function botBuy() {
  const opts = [];
  for (const sd of D.SEEDS) if (!game.s.seeds[sd.id] && !game.locked('seed', sd.id)) { opts.push(['seed', sd.id, sd.unlock * 0.6]); break; }
  if (game.s.plots.length < game.maxPlots) opts.push(['plot', null, game.plotCost()]);
  if (!process.env.NODENSE) for (let t = 1; t < D.DENSE.length; t++) if (game.tierCount(t - 1) >= 3) opts.push(['merge', t, game.mergeCost(t)]);
  if (game.marketOn() && game.s.trade.silos < D.MARKET.siloMax) opts.push(['silo', null, game.siloCost() * 0.5]);
  for (const u of D.UPGRADES) {
    if (game.lvl(u.id) >= game.upMax(u.id) || u.cosmetic) continue;
    const weight = u.id === 'epouvantail' ? 3 : u.tab === 'marche' && u.id !== 'licence' && u.id !== 'trader' ? 3 : 1;
    opts.push(['up', u.id, game.upCost(u.id) * weight]);
  }
  for (const r of D.ROBOTS) if (r.chain ? false : r.chain === 0 ? game.chainCount() < game.chainMax() : (game.s.robots[r.id] || 0) < game.robotMax(r.id)) opts.push(['robot', r.id, game.robotCost(r.id)]);
  for (const r of D.ROBOT_CHAIN) if ((game.s.robots[r.id] || 0) > 0 && game.chainNext(r.id)) opts.push(['rupgrade', r.id, game.upgradeCost(r.id)]);
  for (const t of D.TALENTS) if (['meca', 'science'].includes(t.branch) && game.tal(t.id) < t.max && game.talReqOk(t.id)) opts.push(['tal', t.id, game.talCost(t.id) * (t.max === 1 ? 0.2 : 0.7)]);
  const open = opts.filter(([kind, id]) => kind === 'seed' || kind === 'plot' || !game.quote(kind, id).locked);
  open.sort((a, b) => a[2] - b[2]);
  if (open.length) game.buy(open[0][0], open[0][1]);
}

function perksBuy() {
  for (;;) {
    const opts = D.PERKS.filter(p => game.perk(p.id) < p.max).map(p => [p.id, game.perkCost(p.id)]).filter(([, c]) => c <= game.gsAvailable());
    if (!opts.length) return;
    opts.sort((a, b) => a[1] - b[1]);
    game.buyPerk(opts[0][0]);
  }
}

// Renaissance quand le gain a doublé par rapport au minimum, ou 40 % de temps en plus après avoir passé le seuil.
const dt = +process.env.DT || 0.25;
let runStart = 0, crossedAt = null, marks = {};
const runs = [];
let t = 0;
for (; t < maxHours * 3600 && runs.length < goal; t += dt) {
  game.tick(dt);
  const step = Math.round(t / dt);
  if (step % Math.max(1, Math.round(1 / dt)) === 0) { botBuy(); }
  if (step % Math.round(10 / dt) === 0) petsBuy();
  game.events.length = 0;
  if (process.env.TRACE && step % Math.round(+process.env.TRACE / dt) === 0) {
    const sd = D.SEEDS.find(x => x.id === game.bestSeed());
    console.log(`  ${(t / 3600).toFixed(2)}h argent ${D.fmt(game.s.money)} gagné ${D.fmt(game.s.runEarned)} revenu ${D.fmt(game.incomeRate())}/s récoltes ${D.fmt(game.harvestRate())}/s ${sd.id} vM ${D.fmt(game.valueMult())} hM ${D.fmt(game.harvestMult(sd, 'robot'))} fxV ${D.fmt(game.fxValue(sd))} gM ${D.fmt(game.growthMult())} plants ${game.s.plots.reduce((a, p, i) => a + game.plotPlants(i), 0)} rob ${game.robotCount()} up ${Object.values(game.s.up).reduce((a, b) => a + b, 0)} tal ${Object.values(game.s.tal).reduce((a, b) => a + b, 0)} silo ${D.fmt(game.stockWorth())} sold ${D.fmt(game.s.stats.soldValue || 0)}`);
  }
  if (step % Math.round(10 / dt) === 0) {
    const frac = game.s.runEarned / game.prestigeThreshold();
    for (const m of [0.001, 0.01, 0.1]) if (frac >= m && marks[m] == null) marks[m] = t - runStart;
    // Calibrage (CALIB=1) : la partie n° p+1 dure exactement calibHours(p) ; son seuil devient ce qui a été gagné.
    if (CALIB) {
      const p = game.prestiges();
      if (t - runStart >= calibHours(p) * 3600) setThreshold(p, game.s.runEarned);
      else D.PRESTIGE.thresholds[p] = Infinity;
    }
    const gain = game.prestigeGain();
    if (gain > 0 && crossedAt == null) crossedAt = t;
    if (gain > 0 && (CALIB || process.env.PNOW || gain >= 2 * D.PRESTIGE.gsBase || t - crossedAt > 0.4 * (crossedAt - runStart))) {
      const mk = [0.001, 0.01, 0.1].map(m => marks[m] != null ? (marks[m] / 3600).toFixed(1) : '-').join('/');
      const sd = D.SEEDS.find(x => x.id === game.bestSeed());
      const why = `vM ${D.fmt(game.valueMult())} hM ${D.fmt(game.harvestMult(sd, 'robot'))} fxV ${D.fmt(game.fxValue(sd))} gM ${D.fmt(game.growthMult())} plants ${game.s.plots.reduce((a, p, i) => a + game.plotPlants(i), 0)} rob ${Object.values(game.s.robots).reduce((a, b) => a + b, 0)} ach ${game.achCount()} pm.v ${D.fmt(game.pm.valueAll)}`;
      runs.push({ n: runs.length + 1, h: (t - runStart) / 3600, gain, plots: game.s.plots.length, best: game.bestSeed(), pets: game.s.pets.list.map(p => game.petLevel(p)).join('/') });
      const r = runs[runs.length - 1];
      console.log(`renaissance ${String(r.n).padStart(2)} après ${r.h.toFixed(1).padStart(5)} h (total ${(t / 3600).toFixed(1).padStart(6)} h) · +${gain} GO (total ${game.s.gsTotal + gain}) · ${r.plots} parcelles · ${r.best} · compagnons ${r.pets} · 0.1%/1%/10% à ${mk} h · ${why}`);
      game.prestige();
      perksBuy();
      runStart = t; crossedAt = null; marks = {};
    }
  }
}
console.log(`\nFin : ${runs.length} renaissances en ${(t / 3600).toFixed(1)} h · revenu ${D.fmt(game.incomeRate())}/s · gagné ${D.fmt(game.s.runEarned)} / seuil ${D.fmt(game.prestigeThreshold())}`);
console.log('Talents d\'or :', JSON.stringify(game.s.perks));
if (CALIB) console.log('Seuils calibrés :', JSON.stringify(D.PRESTIGE.thresholds.filter(isFinite).map(x => +x.toPrecision(3))));

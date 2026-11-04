// Simulateur d'équilibrage : joue une partie "à l'aveugle" avec un acheteur glouton.
// Usage : npm run sim -- [heures=8] [parcelles max=50] [branche=meca|bota|paysan|aucune] [compagnon]
const D = require('../src/renderer/js/data.js');
const { Game } = require('../src/renderer/js/core.js');

const hours = +process.argv[2] || 8;
const branch = process.argv[4] || 'aucune';
const branches = branch.split('+'); // ex. meca+science
const game = new Game(null);
game.maxPlots = +process.argv[3] || 50;
game.syncWorkers();
const petId = process.argv[5];
// Compagnon suffixé par '!' : déjà adopté au départ (situation des parties suivantes, il est gardé à la renaissance).
const petStart = petId && petId.endsWith('!');
const petIdClean = petStart ? petId.slice(0, -1) : petId;


// Dépense les points du compagnon : évolution dès que possible, sinon le premier nœud disponible.
if (petStart) { game.s.money += D.PETS.find(p => p.id === petIdClean).cost; game.adoptPet(petIdClean); }
function petBuy() {
  if (!petId) return;
  if (game.s.pets.active !== petIdClean) { if (game.s.money >= D.PETS.find(p => p.id === petIdClean).cost * 2) game.adoptPet(petIdClean); return; }
  const nodes = D.PETS.find(p => p.id === petIdClean).nodes;
  const evo = nodes.find(n => n.evo);
  if (game.buyPetNode(petIdClean, evo.id)) return;
  for (const n of nodes) if (!n.evo && game.buyPetNode(petIdClean, n.id)) return;
}

// Le bot achète l'option la moins chère parmi les choses utiles (approximation d'un joueur).
function botBuy() {
  const opts = [];
  for (const sd of D.SEEDS) if (!game.s.seeds[sd.id]) { opts.push(['seed', sd.id, sd.unlock * 0.6]); break; }
  if (game.s.plots.length < game.maxPlots) opts.push(['plot', null, game.plotCost()]);
  if (!branches.includes('nodense')) for (let t = 1; t < D.DENSE.length; t++) if (game.tierCount(t - 1) >= 3) opts.push(['merge', t, game.mergeCost(t)]);
  if (branches.includes('trade') && game.marketOn() && game.s.trade.silos < D.MARKET.siloMax) opts.push(['silo', null, game.siloCost() * 0.5]);
  for (const u of D.UPGRADES) {
    if (game.lvl(u.id) >= game.upMax(u.id)) continue;
    if (u.tab === 'marche' && !branches.includes('trade')) continue;
    if (u.cosmetic) continue; // la miniaturisation est un choix d'apparence
    // Un joueur prudent n'investit dans le marché (hors licence et trader) qu'une fois la ferme lancée.
    const weight = u.id === 'epouvantail' ? 3 : u.tab === 'marche' && u.id !== 'licence' && u.id !== 'trader' ? (branches.includes('lean') ? 1e9 : 3) : 1;
    opts.push(['up', u.id, game.upCost(u.id) * weight]);
  }
  // Un spécialiste "botanique" ou "paysan" n'achète que peu de robots.
  const robotCap = branches.includes('meca') || branches.includes('aucune') ? Infinity : branches.includes('bota') ? 3 : 0;
  for (const r of D.ROBOTS) if ((game.s.robots[r.id] || 0) < Math.min(game.robotMax(r.id), robotCap)) opts.push(['robot', r.id, game.robotCost(r.id)]);
  for (const t of D.TALENTS) if (branches.includes(t.branch) && game.tal(t.id) < t.max && game.talReqOk(t.id)) opts.push(['tal', t.id, game.talCost(t.id) * (t.max === 1 ? 0.2 : 0.7)]);
  // Le mécano reste sur les graines rapides (sans payer les graines lentes).
  if (branches.includes('meca')) {
    const fast = D.SEEDS.filter(sd => sd.grow < D.FAST_GROW && game.s.seeds[sd.id]).pop();
    for (const pl of game.s.plots) pl.seed = fast.id;
    for (let i = opts.length - 1; i >= 0; i--) if (opts[i][0] === 'seed' && D.SEEDS.find(sd => sd.id === opts[i][1]).grow >= D.FAST_GROW) opts.splice(i, 1);
  }
  // En bio ou science, le bot mélange ses deux meilleures graines (plantes compagnes, pas d'épidémie au-delà de 60 %).
  if ((branches.includes('bio') || branches.includes('science')) && game.seedCount() >= 4) {
    const pool = D.SEEDS.filter(sd => game.s.seeds[sd.id] && (!branches.includes('meca') || sd.grow < D.FAST_GROW));
    const a = pool[pool.length - 1], b = pool[pool.length - 2] || a;
    game.s.plots.forEach((pl, i) => { pl.seed = i % 5 === 1 || i % 5 === 3 ? b.id : a.id; }); // 60 % / 40 %
  }
  const open = opts.filter(([kind, id]) => kind === 'seed' || kind === 'plot' || !game.quote(kind, id).locked);
  open.sort((a, b) => a[2] - b[2]);
  for (const [kind, id] of open.slice(0, 1)) game.buy(kind, id);
}

const dt = 0.2;
const marks = {};
let nextReport = 0;
const seedUnlockAt = {};
for (let t = 0; t < hours * 3600; t += dt) {
  game.tick(dt);
  if (Math.round(t / dt) % 5 === 0) { botBuy(); petBuy(); }
  game.events.length = 0;
  for (const sd of D.SEEDS) if (game.s.seeds[sd.id] && seedUnlockAt[sd.id] == null) seedUnlockAt[sd.id] = t;
  if (game.s.runEarned >= D.PRESTIGE.min && marks.prestige == null) marks.prestige = t;
  if (t >= nextReport) {
    nextReport += 1800;
    console.log(`${(t / 3600).toFixed(1)}h  argent ${D.fmt(game.s.money)}  gagné ${D.fmt(game.s.runEarned)}  revenu ${D.fmt(game.incomeRate())}/s  parcelles ${game.s.plots.length}  robots ${JSON.stringify(game.s.robots)}  graine ${game.bestSeed()}  succès ${game.achCount()}`);
  }
}
console.log('\nDéblocage des graines :');
for (const [id, t] of Object.entries(seedUnlockAt)) console.log(`  ${id.padEnd(11)} ${D.fmtTime(t)}`);
console.log('\nRenaissance possible à :', marks.prestige != null ? D.fmtTime(marks.prestige) : 'jamais (pendant ' + hours + ' h)');
console.log('Améliorations :', JSON.stringify(game.s.up));
console.log('Talents :', JSON.stringify(game.s.tal));
if (branches.includes('trade')) {
  const x = game.s.stats;
  console.log(`Marché : stocké ${D.fmt(x.storedRef || 0)} (réf.) · vendu ${D.fmt(x.soldValue || 0)} pour ${D.fmt(x.soldRef || 0)} (réf.) soit ×${((x.soldValue || 0) / Math.max(1, x.soldRef || 0)).toFixed(2)} · surplus ${D.fmt(x.surplusValue || 0)} · silos ${game.s.trade.silos} · ${JSON.stringify(Object.fromEntries(D.UPGRADES.filter(u => u.tab === 'marche').map(u => [u.id, game.lvl(u.id)])))}`);
}
if (petId && game.s.pets.active) console.log('Compagnon :', game.petName(petIdClean), 'niv.', game.petLevel(petIdClean));

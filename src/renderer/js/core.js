// Logique du jeu, sans aucun DOM : utilisable dans le jeu et dans le simulateur (tools/sim.js).
// Les coordonnées sont en pixels "art", relatives au début du champ (la grange est à x=0).
// Les compagnons (pets.js), le marché (market.js) et les événements (events.js) s'ajoutent à la classe Game.
(function (root) {
  'use strict';
  const NODE = typeof module !== 'undefined' && module.exports;
  const D = NODE ? require('./data.js') : root.FARM_DATA;
  const MIXINS = NODE ? [require('./pets.js'), require('./market.js'), require('./events.js'), require('./factory.js'), require('./seasons.js')] : (root.FARM_MIXINS || []);

  const LAYOUT = { BARN_W: 26, PLOT_W: 12, PLOT_STEP: 15, PAD: 3 };
  const SAVE_VERSION = 2;
  // Les graines de saison sont connues partout (champ, silos, usine) sans entrer dans l'échelle des 44 légumes.
  const SEED_BY_ID = Object.fromEntries([...D.SEEDS, ...D.SEASON_SEEDS].map(s => [s.id, s]));
  const UP_BY_ID = Object.fromEntries(D.UPGRADES.map(u => [u.id, u]));
  const ROBOT_BY_ID = Object.fromEntries(D.ROBOTS.map(r => [r.id, r]));
  const PERK_BY_ID = Object.fromEntries(D.PERKS.map(p => [p.id, p]));
  const TAL_BY_ID = Object.fromEntries(D.TALENTS.map(t => [t.id, t]));
  const PET_BY_ID = Object.fromEntries(D.PETS.map(p => [p.id, p]));
  const MACHINE_BY_ID = Object.fromEntries(D.MACHINES.map(m => [m.id, m]));
  const RECIPE_BY_ID = Object.fromEntries(D.RECIPES.map(r => [r.id, r]));
  const FROBOT_BY_ID = Object.fromEntries(D.FACTORY_ROBOTS.map(r => [r.id, r]));
  const FOOD_BY_ID = Object.fromEntries(D.PET_FOODS.map(f => [f.id, f]));
  const BRANCH_BY_ID = Object.fromEntries(D.BRANCHES.map(b => [b.id, b]));
  const CHARGER = { from: 4, to: 21 }; // zone de recharge des robots, devant la grange

  const rand = (a, b) => a + Math.random() * (b - a);
  const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
  const plotX = i => LAYOUT.BARN_W + LAYOUT.PAD + i * LAYOUT.PLOT_STEP + LAYOUT.PLOT_W / 2;

  function defaultTrade() {
    return { silos: 0, siloTiers: [], stock: {}, trend: {}, sold: {}, made: {}, demands: [], shocks: [], trendT: 0, demandT: 45, shockT: 120, traderT: 0, managerT: 5 };
  }

  // Usine : remise à zéro à la renaissance (la nourriture des compagnons, elle, est gardée dans s.pantry).
  function defaultFactory() {
    return { machines: [], robots: {}, fridges: 0, stock: {}, trend: {}, target: null, trendT: 0, traderT: 5, managerT: 5 };
  }

  function defaultState() {
    return {
      v: SAVE_VERSION,
      money: 0, runEarned: 0, totalEarned: 0,
      plots: [], up: {}, robots: {}, seeds: {}, tal: {},
      everSeeds: {},                               // graines débloquées au moins une fois (succès)
      stats: {}, ach: {},
      gsTotal: 0, gsSpent: 0, perks: {},
      pets: { list: [], seen: {}, nextUid: 1 },
      pantry: {},                                  // gamelles des compagnons (gardées à la renaissance)
      basket: {},                                  // légumes de saison récoltés (gamelles de saison)
      seasonShop: { key: null, base: 0, bought: {} }, // graines de saison achetées pour la saison en cours (prix figé à son début)
      factory: defaultFactory(),                   // usine : remise à zéro à la renaissance     // compagnons : gardés à la renaissance, mais remis au niveau 0
      market: { unlocked: false },                 // conservé à la renaissance
      trade: defaultTrade(),                       // silos, stock et cours : remis à zéro à la renaissance
      clock: { t: D.DAY_LEN * 0.3, weather: 'soleil', weatherT: 150, nextCrow: 80, nextCart: 240, nextFrenzy: 420, frenzyT: 0, nextBlight: 90, nextEvent: 90 },
    };
  }

  class Game {
    constructor(save) {
      this.s = defaultState();
      this.maxPlots = 60;
      this.events = [];      // file d'événements consommée par l'interface
      this.workers = [];
      this.claims = [];
      this.crows = [];
      this.cart = null;
      this.brush = null;     // graine "pinceau" sélectionnée par le joueur
      this.view = 'farm';    // scène affichée : 'farm' ou 'factory'
      this.incomeBuckets = new Array(20).fill(0);
      this.harvestBuckets = new Array(20).fill(0); // revenus des seules récoltes : base des bonus (miel, corbeaux...)
      this.bucketT = 0;
      this.achT = 0;
      this.nextWorkerId = 1;
      this.pm = { ...D.PET_MOD_DEFAULTS }; // modificateurs combinés des compagnons
      this.petRt = {};
      this.perchIds = new Set();
      this.honeyT = 0;
      this.petLoveT = 0;
      if (save && this.load(save)) { /* partie chargée */ } else this.startRun();
      this.rebuildFx();
      this.refreshPet();
      this.updateSeason(0);
    }

    // ---------- Sauvegarde ----------
    serialize() { return JSON.stringify(this.s); }

    load(json) {
      let data;
      try { data = typeof json === 'string' ? JSON.parse(json) : json; } catch { return false; }
      if (!data || typeof data !== 'object') return false;
      // Fusion avec les valeurs par défaut : un nouveau champ ajouté dans une mise à jour ne casse pas les anciennes sauvegardes.
      const def = defaultState();
      const s = { ...def, ...data };
      for (const k of ['stats', 'ach', 'perks', 'up', 'robots', 'seeds', 'tal', 'clock', 'everSeeds']) s[k] = { ...def[k], ...(data[k] || {}) };
      const oldVersion = +data.v || 1;
      // Contenu retiré ou renommé : on nettoie.
      for (const id of Object.keys(s.up)) if (!UP_BY_ID[id]) delete s.up[id]; else s.up[id] = Math.min(s.up[id], UP_BY_ID[id].max);
      for (const id of Object.keys(s.robots)) if (!ROBOT_BY_ID[id]) delete s.robots[id];
      for (const id of Object.keys(s.perks)) if (!PERK_BY_ID[id]) delete s.perks[id]; else s.perks[id] = Math.min(s.perks[id], PERK_BY_ID[id].max);
      for (const id of Object.keys(s.tal)) if (!TAL_BY_ID[id]) delete s.tal[id]; else s.tal[id] = Math.min(s.tal[id], TAL_BY_ID[id].max);
      for (const id of Object.keys(s.seeds)) if (!SEED_BY_ID[id]) delete s.seeds[id];
      for (const id of Object.keys(s.everSeeds)) if (!SEED_BY_ID[id]) delete s.everSeeds[id];
      for (const id of Object.keys(s.seeds)) s.everSeeds[id] = true;
      if (!D.WEATHER[s.clock.weather]) s.clock.weather = 'soleil';
      s.market = { ...def.market, ...(data.market || {}) };
      const tr = { ...defaultTrade(), ...(data.trade || {}) };
      tr.silos = Math.min(D.MARKET.siloMax, +tr.silos || 0);
      // Un niveau par silo (anciennes parties : tous de niveau 0), du plus gros au plus petit.
      tr.siloTiers = Array.from({ length: tr.silos }, (_, k) => Math.max(0, Math.min(D.SILO_TIERS.length - 1, (Array.isArray(tr.siloTiers) ? tr.siloTiers[k] : 0) | 0))).sort((a, b) => b - a);
      tr.stock = Object.fromEntries(Object.entries(tr.stock || {}).filter(([, e]) => e && SEED_BY_ID[e.seed] && e.units > 0)
        .map(([k, e]) => [k, { seed: e.seed, traits: Array.isArray(e.traits) ? e.traits : [], units: +e.units, worth: +e.worth || 0, fresh: e.fresh == null ? 1 : +e.fresh }]));
      tr.demands = (Array.isArray(tr.demands) ? tr.demands : []).filter(d => d && SEED_BY_ID[d.seed] && D.TRAITS[d.trait]);
      tr.shocks = (Array.isArray(tr.shocks) ? tr.shocks : []).filter(k => k && SEED_BY_ID[k.seed]);
      for (const k of ['trend', 'sold', 'made']) tr[k] = { ...(tr[k] || {}) };
      s.trade = tr;
      s.pets = this.loadPets(data.pets, oldVersion);
      s.basket = Object.fromEntries(Object.entries(data.basket || {}).filter(([k, v]) => SEED_BY_ID[k] && SEED_BY_ID[k].season && v > 0).map(([k, v]) => [k, Math.floor(+v)]));
      s.pantry = Object.fromEntries(Object.entries(data.pantry || {}).filter(([k, v]) => FOOD_BY_ID[k] && v > 0).map(([k, v]) => [k, Math.floor(+v)]));
      for (const pet of s.pets.list) if (!FOOD_BY_ID[pet.food]) pet.food = null;
      s.factory = this.loadFactory(data.factory);
      s.seeds[D.SEEDS[0].id] = true;
      s.plots = (Array.isArray(data.plots) ? data.plots : []).map(p => ({
        seed: p && (p.seed === 'auto' || SEED_BY_ID[p.seed]) ? p.seed : 'auto',
        crop: p && p.crop && SEED_BY_ID[p.crop.id] ? {
          id: p.crop.id, p: +p.crop.p || 0, gold: !!p.crop.gold, rot: !!p.crop.rot, pest: +p.crop.pest || 0, energized: +p.crop.energized || 0,
          mutant: D.MUTATIONS[p.crop.mutant] ? p.crop.mutant : null, extra: +p.crop.extra || 0, star: !!p.crop.star, wild: !!p.crop.wild,
        } : null,
        moist: p ? +p.moist || 0 : 0,
        last: p && SEED_BY_ID[p.last] ? p.last : null,
        tier: p ? Math.max(0, Math.min(D.DENSE.length - 1, p.tier | 0)) : 0,
      }));
      if (!s.plots.length) for (let i = 0; i < D.PLOTS.start; i++) s.plots.push(this.newPlot());
      // Version 1 → 2 : l'ancienne renaissance donnait des montagnes de graines d'or (+10% chacune).
      // On convertit en 12 graines d'or par renaissance effectuée, et tous les talents sont remboursés (la boutique a changé).
      if (oldVersion < 2) {
        s.gsTotal = 12 * (s.stats.prestiges || 0);
        s.gsSpent = 0;
        s.perks = {};
        s.migratedFrom = oldVersion;
      }
      delete s.auto;
      s.v = SAVE_VERSION;
      this.s = s;
      return true;
    }

    loadFactory(f) {
      const out = defaultFactory();
      if (!f || typeof f !== 'object') return out;
      out.machines = (Array.isArray(f.machines) ? f.machines : []).filter(m => m && MACHINE_BY_ID[m.type]).map(m => ({
        type: m.type, recipe: m.recipe === 'auto' || (RECIPE_BY_ID[m.recipe] && RECIPE_BY_ID[m.recipe].machine === m.type) ? m.recipe : 'auto',
        st: m.lot && RECIPE_BY_ID[m.lot.id] ? (m.st === 2 ? 2 : 1) : 0, t: +m.t || 0, lot: m.lot && RECIPE_BY_ID[m.lot.id] ? { id: m.lot.id, worth: +m.lot.worth || 0, lots: +m.lot.lots || 1 } : null,
      }));
      for (const r of D.FACTORY_ROBOTS) if (f.robots && f.robots[r.id] > 0) out.robots[r.id] = Math.min(r.max, Math.floor(f.robots[r.id]));
      out.fridges = Math.min(D.FACTORY.fridgeMax, Math.floor(+f.fridges || 0));
      out.stock = Object.fromEntries(Object.entries(f.stock || {}).filter(([k, e]) => RECIPE_BY_ID[k] && e && e.units > 0)
        .map(([k, e]) => [k, { id: k, units: +e.units, worth: +e.worth || 0, fresh: e.fresh == null ? 1 : +e.fresh }]));
      out.trend = { ...(f.trend || {}) };
      out.target = FOOD_BY_ID[f.target] ? f.target : null;
      return out;
    }

    loadPets(pets, oldVersion) {
      const out = { list: [], seen: {}, nextUid: 1 };
      if (!pets || typeof pets !== 'object') return out;
      for (const id of Object.keys(pets.seen || {})) if (PET_BY_ID[id]) out.seen[id] = true;
      const clean = (id, d) => {
        const def = PET_BY_ID[id];
        const nodes = {}, mastery = {};
        for (const n of def.nodes) if (d.nodes && d.nodes[n.id]) nodes[n.id] = Math.min(d.nodes[n.id], n.max);
        for (const m of D.MASTERY) if (d.mastery && d.mastery[m.id]) mastery[m.id] = Math.min(d.mastery[m.id], m.max);
        const path = def.paths.some(x => x.id === d.path) ? d.path : null;
        return { uid: out.nextUid++, id, xp: +d.xp || 0, nodes, path, mastery, food: d.food || null };
      };
      if (oldVersion < 2) {
        // Ancien format : un seul compagnon actif.
        if (PET_BY_ID[pets.active] && pets.own && pets.own[pets.active]) out.list.push(clean(pets.active, pets.own[pets.active]));
      } else {
        for (const d of Array.isArray(pets.list) ? pets.list : []) if (d && PET_BY_ID[d.id]) out.list.push(clean(d.id, d));
      }
      return out;
    }

    newPlot() { return { seed: 'auto', crop: null, moist: 0, last: null, tier: 0 }; }
    // Cultures denses
    plotPlants(i) { return D.DENSE[this.s.plots[i].tier || 0].plants; }
    plotEquiv() { return this.s.plots.reduce((a, p) => a + D.DENSE[p.tier || 0].plants, 0); }
    tierCount(t) { return this.s.plots.reduce((a, p) => a + ((p.tier || 0) === t ? 1 : 0), 0); }
    mergeCost(t, k = this.tierCount(t)) { const d = D.DENSE[t]; return d.costMult * this.plotCost() * Math.pow(d.g, k) * this.fxMul('dense'); }
    // Fusionne 3 parcelles du niveau t-1 (les premières trouvées) en une parcelle de niveau t.
    mergePlots(t) {
      const idx = [];
      this.s.plots.forEach((p, i) => { if ((p.tier || 0) === t - 1 && idx.length < 3) idx.push(i); });
      if (idx.length < 3) return false;
      const first = this.s.plots[idx[0]];
      const merged = { ...this.newPlot(), seed: first.seed, moist: 1, tier: t };
      this.s.plots = this.s.plots.flatMap((p, i) => (i === idx[0] ? [merged] : idx.includes(i) ? [] : [p]));
      // Les indices ont bougé : on libère les tâches et les corbeaux en cours.
      this.claims = [];
      for (const w of this.workers) if (w.task) { this.release(w); if (w.state === 'walk' || w.state === 'act') { w.state = 'idle'; w.pause = 0; } }
      for (const c of this.crows) if (c.state === 'fly' || c.state === 'eat') c.state = 'leave';
      this.emit('merge', { tier: t, plot: idx[0] });
      return true;
    }

    // Début de partie (nouvelle partie ou après une renaissance) : les talents de départ s'appliquent ici.
    startRun() {
      const s = this.s;
      // Les revenus récents de la partie précédente ne doivent pas gonfler le miel, les primes, etc.
      if (this.incomeBuckets) { this.incomeBuckets.fill(0); this.harvestBuckets.fill(0); }
      s.money = this.perk('tresor') ? 100 * Math.pow(6, this.perk('tresor') - 1) : 0;
      s.runEarned = 0;
      s.stats.runTime = 0;
      s.up = {};
      s.tal = {};
      s.trade = defaultTrade();
      s.factory = defaultFactory();
      this.belt = []; this.porters = [];
      s.robots = this.perk('fidele') ? { rouille: this.perk('fidele') } : {};
      s.seeds = {};
      const keep = 1 + this.perk('memoire');
      D.SEEDS.filter(sd => sd.pr === 0).slice(0, keep).forEach(sd => { s.seeds[sd.id] = true; s.everSeeds[sd.id] = true; });
      s.plots = [];
      const n = Math.min(this.maxPlots, D.PLOTS.start + this.perk('terres'));
      for (let i = 0; i < n; i++) s.plots.push(this.newPlot());
      this.claims = [];
      this.crows = [];
      this.workers = [];
      this.ev = null;
    }

    // ---------- Effets génériques (améliorations, talents de renaissance) ----------
    // Cache reconstruit après chaque achat : liste d'effets avec leur valeur cumulée.
    rebuildFx() {
      const list = [];
      const add = (src, lvl) => {
        if (!src.fx || !lvl) return;
        for (const e of src.fx) list.push({ ...e, val: e.mult != null ? Math.pow(e.mult, lvl) : e.add * lvl });
      };
      for (const u of D.UPGRADES) add(u, this.lvl(u.id));
      for (const p of D.PERKS) add(p, this.perk(p.id));
      // Bonus et modificateurs de la saison en cours.
      const season = this.seasonDef && this.seasonDef();
      if (season && season.fx) for (const e of season.fx) list.push({ ...e, val: e.mult != null ? e.mult : e.add });
      this.fxList = list;
      this.fxMemo = {};
    }
    fxMatch(e, ctx) {
      return (!e.fam || e.fam === ctx.fam) && (!e.seed || e.seed === ctx.seed) && (!e.robot || e.robot === ctx.robot) && (!e.tag || e.tag === ctx.tag) && (!e.ev || e.ev === ctx.ev);
    }
    fxMul(k, ctx = {}) {
      const key = k + '|' + (ctx.fam || '') + '|' + (ctx.seed || '') + '|' + (ctx.robot || '') + '|' + (ctx.tag || '') + '|' + (ctx.ev || '');
      const memo = this.fxMemo || (this.fxMemo = {});
      if (memo[key] != null) return memo[key];
      let m = 1;
      for (const e of this.fxList || []) if (e.k === k && e.mult != null && this.fxMatch(e, ctx)) m *= e.val;
      return (memo[key] = m);
    }
    fxAdd(k, ctx = {}) {
      let a = 0;
      for (const e of this.fxList || []) if (e.k === k && e.add != null && this.fxMatch(e, ctx)) a += e.val;
      return a;
    }
    fxValue(sd) { return this.fxMul('value', { fam: sd.fam, seed: sd.id }); }

    // ---------- Accesseurs ----------
    lvl(id) { return this.s.up[id] || 0; }
    perk(id) { return this.s.perks[id] || 0; }
    tal(id) { return this.s.tal[id] || 0; }
    prestiges() { return this.s.stats.prestiges || 0; }
    branchLevels(b) { return D.TALENTS.reduce((a, t) => a + (t.branch === b ? this.tal(t.id) : 0), 0); }
    robotMax(id) {
      if (ROBOT_BY_ID[id].chain != null) return this.chainMax();
      return ROBOT_BY_ID[id].max + (ROBOT_BY_ID[id].only === 'none' ? 0 : 2 * this.tal('usine'));
    }
    // Robots polyvalents : un plafond commun à tous les rangs de la chaîne (rouillé, chromé, laser...).
    chainMax() { return D.CHAIN_CAP.max + D.CHAIN_CAP.perUsine * this.tal('usine'); }
    chainCount() { return D.ROBOT_CHAIN.reduce((a, r) => a + (this.s.robots[r.id] || 0), 0); }
    chainNext(id) { const r = ROBOT_BY_ID[id]; return r && r.chain != null ? D.ROBOT_CHAIN[r.chain + 1] || null : null; }
    bio() { return this.tal('certif') > 0; }
    science() { return this.tal('labo') > 0; }
    branchLocked(branch) {
      const b = BRANCH_BY_ID[branch];
      return !!b.group && D.BRANCHES.some(o => o.group === b.group && o.id !== branch && this.branchLevels(o.id) > 0);
    }
    // Contenu verrouillé par les renaissances (pr = nombre de renaissances requises).
    eraOk(item) { return (item.pr || 0) <= this.prestiges(); }
    upReqOk(id) {
      const u = UP_BY_ID[id];
      if (!this.eraOk(u)) return false;
      if (u.needRobots && (this.s.robots[u.needRobots.id] || 0) < u.needRobots.n) return false;
      return (!u.market || this.s.market.unlocked) && Object.entries(u.req || {}).every(([k, v]) => this.lvl(k) >= v);
    }
    talReqOk(id) { return Object.entries(TAL_BY_ID[id].req || {}).every(([k, v]) => this.tal(k) >= v); }
    // Rendement des OGM : quantité ×yield et valeur unitaire ×unit à chaque palier.
    ogmYield() { return Math.pow(D.SCIENCE.yield, this.tal('ogm')); }
    ogmUnit() { return Math.pow(D.SCIENCE.unit, this.tal('ogm')); }
    robotCount() { return Object.values(this.s.robots).reduce((a, b) => a + b, 0); }
    seedCount() { return Object.keys(this.s.seeds).length; }
    anyUpgradeMaxed() { return D.UPGRADES.some(u => u.max < 900 && this.lvl(u.id) >= u.max); }
    activePlots() { return Math.min(this.s.plots.length, this.maxPlots); }
    weather() { return D.WEATHER[this.s.clock.weather]; }
    dayPhase() { return (this.s.clock.t % D.DAY_LEN) / D.DAY_LEN; } // 0 = minuit, 0.5 = midi
    isNight() { if (this.ev && this.ev.timers.eclipse > 0) return true; const p = this.dayPhase(); return p < 0.22 || p > 0.82; }
    darkness() {
      // 0 en plein jour, 1 en pleine nuit, avec aube et crépuscule progressifs (l'éclipse plonge tout dans le noir).
      if (this.ev && this.ev.timers.eclipse > 0) return Math.min(1, this.ev.timers.eclipse / 4, (D.EVENTS.eclipse.dur - this.ev.timers.eclipse) / 4 + 0.2);
      const p = this.dayPhase();
      const edge = (a, b, x) => Math.min(1, Math.max(0, (x - a) / (b - a)));
      if (p < 0.18) return 1;
      if (p < 0.28) return 1 - edge(0.18, 0.28, p);
      if (p < 0.78) return 0;
      if (p < 0.88) return edge(0.78, 0.88, p);
      return 1;
    }
    isRaining() { return !!this.weather().rain; }
    irrigated(i) { return i < this.lvl('irrigation') + this.pm.irrigateExtra; }
    frenzy() { return this.s.clock.frenzyT > 0; }
    bestSeed() { let best = D.SEEDS[0].id, bv = -1; for (const sd of D.SEEDS) if (this.s.seeds[sd.id] && sd.value > bv) { best = sd.id; bv = sd.value; } return best; }
    seedFor(i) {
      const id = this.s.plots[i].seed;
      return id !== 'auto' && (this.s.seeds[id] || this.seasonSeedOk(id)) ? id : this.bestSeed();
    }
    achCount() { return Object.keys(this.s.ach).length; }
    gsAvailable() { return this.s.gsTotal - this.s.gsSpent; }

    valueMult() {
      return Math.pow(1.12, this.lvl('compost')) * Math.pow(1.4, this.lvl('contrat'))
        * (1 + D.PRESTIGE.bonus * this.s.gsTotal) * (1 + D.ACH_BONUS * this.achCount());
    }
    // Multiplicateur propre à une graine et à qui récolte ('click' | 'farmer' | 'robot' | 'pet' | 'fair' | 'tourist').
    harvestMult(seed, source) {
      let m = Math.pow(1.1, this.tal('selection'));
      m *= seed.grow < D.FAST_GROW ? Math.pow(1.25, this.tal('serie')) : Math.pow(1.3, this.tal('rares'));
      if (source === 'robot') m *= 1 + 0.01 * this.tal('echelle') * this.robotCount();
      else m *= Math.pow(1.3, this.tal('artisan'));
      if (source === 'farmer') m *= this.pm.farmerHarvest;
      if (this.bio()) m *= D.BIO.value * Math.pow(1.2, this.tal('label'));
      if (this.science()) m *= this.ogmYield() * this.ogmUnit() * Math.pow(0.97, this.tal('pesticides'));
      return m * this.pm.valueAll;
    }
    eventMult() { return Math.pow(1.5, this.tal('flair')); }
    growthMult() {
      let m = (1 + 0.1 * this.lvl('engrais')) * (1 + 0.15 * this.tal('croissance'));
      if (this.bio()) m *= D.BIO.growth + 0.03 * this.tal('purin');
      if (this.science()) m *= D.SCIENCE.growth * (1 + 0.12 * this.tal('chimie'));
      if (this.ev && this.ev.timers.rainbow > 0) m *= 2;
      if (this.ev && this.ev.timers.comet > 0 && this.isNight()) m *= 2;
      if (this.isRaining()) m *= this.fxMul('rain');
      return m;
    }
    // Plantes compagnes (bio) : voisines d'une autre espèce.
    companions(i) {
      const pl = this.s.plots[i];
      if (!pl.crop || !this.tal('compagnes')) return 0;
      let n = 0;
      for (const j of [i - 1, i + 1]) { const o = this.s.plots[j]; if (j >= 0 && j < this.activePlots() && o.crop && o.crop.id !== pl.crop.id) n++; }
      return n;
    }
    nightGrowth(seed) {
      const night = this.isNight();
      if (seed.night) return night ? 2 : 0.6;
      if (!night) return seed.id === 'tournesol' && this.s.clock.weather === 'soleil' ? 1.25 : 1;
      if (this.tal('gene_froid')) return 1;
      return (this.lvl('serre') ? 1 : 1 - 0.2 * (1 - this.pm.nightRelief)) * this.fxMul('night');
    }
    evapRate(i) {
      const pl = this.s.plots[i];
      const seed = SEED_BY_ID[pl.crop ? pl.crop.id : this.seedFor(i)];
      let e = this.weather().evap;
      if (this.s.clock.weather === 'canicule' && (this.lvl('serre') || this.tal('gene_chaleur'))) e = 1;
      const aura = this.auraAt(i);
      if (aura) e *= aura.evap;
      e *= this.pm.evapAll;
      e *= (1 + 0.08 * this.tal('chimie')) * this.fxMul('evap', { fam: seed.fam });
      return e * seed.thirst * this.plotPlants(i) / (30 * (1 + 0.1 * this.lvl('arrosoir')));
    }
    plotGrowthRate(i) {
      const pl = this.s.plots[i];
      if (!pl.crop || pl.crop.pest) return 0;
      const seed = SEED_BY_ID[pl.crop.id];
      let r = (1 + 0.06 * this.tal('compagnes') * this.companions(i)) * this.growthMult() * this.weather().growth * this.nightGrowth(seed) * (pl.moist > 0 ? 1 : this.tal('gene_sec') ? 0.75 : 0.35) / seed.grow;
      r *= seed.grow < D.FAST_GROW ? this.pm.fastGrowth : this.pm.slowGrowth;
      r *= this.fxMul('growth', { fam: seed.fam, seed: seed.id });
      if (this.irrigated(i)) r *= this.pm.irrigGrowth;
      const aura = this.auraAt(i);
      if (aura) {
        r *= aura.mult;
        if (aura.noNight) r /= this.nightGrowth(seed); // le phénix efface la nuit
      }
      r *= this.pm.growthAll * D.DENSE[pl.tier || 0].growth;
      if (pl.crop.mutant && D.MUTATIONS[pl.crop.mutant].growth) r *= D.MUTATIONS[pl.crop.mutant].growth;
      return this.slowRate(seed, r * seed.grow);
    }
    // Légumes de haut niveau : une part de la pousse est incompressible (seed.minGrow), les bonus n'agissent que sur le reste.
    // m = multiplicateur total de croissance ; renvoie la vitesse (fraction de pousse par seconde).
    slowRate(seed, m) {
      if (!seed.minGrow) return m / seed.grow;
      return m > 0 ? 1 / (seed.minGrow + (seed.grow - seed.minGrow) / m) : 0;
    }
    // Temps de pousse d'une graine avec un multiplicateur de croissance m (pour l'affichage et les estimations).
    seedGrowTime(seed, m = this.growthMult()) { const r = this.slowRate(seed, m); return r > 0 ? 1 / r : Infinity; }
    incomeRate() { return this.incomeBuckets.reduce((a, b) => a + b, 0) / this.incomeBuckets.length; }
    harvestRate() { return this.harvestBuckets.reduce((a, b) => a + b, 0) / this.harvestBuckets.length; }

    // ---------- Coûts ----------
    discount() { return Math.pow(0.95, this.perk('rabais')) * this.seasonDiscount(); }
    upCost(id, level = this.lvl(id)) { const u = UP_BY_ID[id]; return u.base * Math.pow(u.g, level) * this.discount(); }
    upMax(id) { return id === 'irrigation' || id === 'paratonnerres' ? this.s.plots.length : UP_BY_ID[id].max; }
    robotCost(id, n = ROBOT_BY_ID[id].chain === 0 ? this.chainCount() : this.s.robots[id] || 0) { const r = ROBOT_BY_ID[id]; return r.cost * Math.pow(r.g, n) * this.discount(); }
    // Transformation d'un robot du rang `id` au rang suivant : le prix monte avec le nombre de robots déjà à ce rang.
    upgradeCost(id, n) { const next = this.chainNext(id); return next ? next.cost * Math.pow(next.g, n == null ? this.s.robots[next.id] || 0 : n) * this.discount() : Infinity; }
    plotCost(n = this.plotEquiv()) { return D.PLOTS.base * Math.pow(D.PLOTS.g, n - D.PLOTS.start) * this.discount(); }
    seedCost(id) { return SEED_BY_ID[id].unlock * Math.pow(0.85, this.tal('recherche')); }
    talCost(id, level = this.tal(id)) {
      const t = TAL_BY_ID[id];
      if (BRANCH_BY_ID[t.branch].group) return t.base * Math.pow(t.g, level);
      const others = D.TALENTS.reduce((a, o) => a + (o.branch !== t.branch && !BRANCH_BY_ID[o.branch].group ? this.tal(o.id) : 0), 0);
      return t.base * Math.pow(t.g, level) * Math.pow(D.SPEC_PENALTY, others);
    }
    perkCost(id, level = this.perk(id)) { const p = PERK_BY_ID[id]; return Math.ceil(p.base * Math.pow(p.g, level)); }

    // Description d'un achat : niveau actuel, max, et coût du niveau k au-dessus.
    buyable(kind, id) {
      switch (kind) {
        case 'sseed': return { level: this.s.seasonShop.bought[id] ? 1 : 0, max: 1, cost: () => this.seasonSeedCost(id) };
        case 'up': return { level: this.lvl(id), max: this.upMax(id), cost: k => this.upCost(id, k) };
        case 'silo': return { level: this.s.trade.silos, max: D.MARKET.siloMax, cost: k => this.siloCost(k) };
        case 'robot':
          if (ROBOT_BY_ID[id].chain === 0) return { level: this.chainCount(), max: this.chainMax(), cost: k => this.robotCost(id, k) };
          return { level: this.s.robots[id] || 0, max: this.robotMax(id), cost: k => this.robotCost(id, k) };
        case 'rupgrade': {
          const next = this.chainNext(id), lvl = next ? this.s.robots[next.id] || 0 : 0;
          return { level: lvl, max: next ? lvl + (this.s.robots[id] || 0) : 0, cost: k => this.upgradeCost(id, k) };
        }
        case 'plot': return { level: this.s.plots.length, max: this.maxPlots, cost: k => this.plotCost(this.plotEquiv() + k - this.s.plots.length) };
        case 'smerge': { const t = +id, lvl = this.siloTierCount(t); return { level: lvl, max: lvl + Math.floor(this.siloTierCount(t - 1) / 3), cost: k => this.siloMergeCost(t, k) }; }
        case 'merge': { const t = +id, lvl = this.tierCount(t); return { level: lvl, max: lvl + Math.floor(this.tierCount(t - 1) / 3), cost: k => this.mergeCost(t, k) }; }
        case 'seed': return { level: this.s.seeds[id] ? 1 : 0, max: 1, cost: () => this.seedCost(id) };
        case 'tal': return { level: this.tal(id), max: TAL_BY_ID[id].max, cost: k => this.talCost(id, k) };
        case 'machine': return { level: this.machineCount(id), max: MACHINE_BY_ID[id].max, cost: k => this.machineCost(id, k) };
        case 'frobot': return { level: this.s.factory.robots[id] || 0, max: FROBOT_BY_ID[id].max, cost: k => this.frobotCost(id, k) };
        case 'fridge': return { level: this.s.factory.fridges, max: D.FACTORY.fridgeMax, cost: k => this.fridgeCost(k) };
        default: return null;
      }
    }

    locked(kind, id) {
      if (kind === 'tal') return this.branchLocked(TAL_BY_ID[id].branch) || !this.talReqOk(id);
      if (kind === 'up') return !this.upReqOk(id);
      if (kind === 'silo' || kind === 'smerge') return !this.marketOn();
      if (kind === 'seed') return !this.eraOk(SEED_BY_ID[id]);
      if (kind === 'sseed') return !SEED_BY_ID[id] || SEED_BY_ID[id].season !== this.seasonId;
      if (kind === 'robot') return !this.eraOk(ROBOT_BY_ID[id]) || ROBOT_BY_ID[id].chain > 0; // on n'achète que des rouillés
      if (kind === 'rupgrade') { const next = this.chainNext(id); return !next || !this.eraOk(next); }
      if (kind === 'machine') return !this.factoryOn() || !this.eraOk(MACHINE_BY_ID[id]);
      if (kind === 'frobot' || kind === 'fridge') return !this.factoryOn();
      return false;
    }

    // Combien de niveaux acheter (n = 1, 10 ou Infinity pour "max") et pour quel prix.
    quote(kind, id, n = 1) {
      if (this.locked(kind, id)) return { count: 0, total: 0, maxed: false, affordable: false, locked: true };
      const b = this.buyable(kind, id);
      let total = 0, count = 0;
      for (let k = b.level; k < b.max && count < n; k++) {
        const c = b.cost(k);
        if (n === Infinity && total + c > this.s.money) break;
        total += c; count++;
      }
      if (count === 0 && b.level < b.max) { total = b.cost(b.level); count = 1; }
      return { count, total, maxed: b.level >= b.max, affordable: count > 0 && total <= this.s.money };
    }

    buy(kind, id, n = 1) {
      const q = this.quote(kind, id, n);
      if (q.maxed || !q.affordable) return false;
      this.s.money -= q.total;
      for (let i = 0; i < q.count; i++) {
        if (kind === 'up') this.s.up[id] = this.lvl(id) + 1;
        else if (kind === 'robot') this.s.robots[id] = (this.s.robots[id] || 0) + 1;
        else if (kind === 'rupgrade') this.upgradeRobot(id);
        else if (kind === 'plot') this.s.plots.push(this.newPlot());
        else if (kind === 'silo') { this.s.trade.silos++; this.s.trade.siloTiers.push(0); }
        else if (kind === 'smerge') this.mergeSilos(+id);
        else if (kind === 'merge') this.mergePlots(+id);
        else if (kind === 'seed') { this.s.seeds[id] = true; this.s.everSeeds[id] = true; this.emit('seed', { id }); }
        else if (kind === 'sseed') { this.s.seasonShop.bought[id] = true; this.emit('seed', { id }); }
        else if (kind === 'tal') this.s.tal[id] = this.tal(id) + 1;
        else if (kind === 'machine') this.addMachine(id);
        else if (kind === 'frobot') this.s.factory.robots[id] = (this.s.factory.robots[id] || 0) + 1;
        else if (kind === 'fridge') this.s.factory.fridges++;
      }
      if (kind === 'robot' || kind === 'rupgrade') this.syncWorkers();
      if (kind === 'up') this.rebuildFx();
      this.emit('buy', { kind, id });
      return true;
    }

    buyPerk(id) {
      const p = PERK_BY_ID[id];
      if (this.perk(id) >= p.max) return false;
      const c = this.perkCost(id);
      if (this.gsAvailable() < c) return false;
      this.s.gsSpent += c;
      this.s.perks[id] = this.perk(id) + 1;
      this.rebuildFx();
      this.emit('buy', { kind: 'perk', id });
      return true;
    }

    // ---------- Renaissance ----------
    // Seuil à atteindre (gagné dans la partie) : il grandit à chaque renaissance.
    prestigeThreshold() { return D.threshold(this.prestiges()); }
    prestigeGain() {
      const T = this.prestigeThreshold();
      if (this.s.runEarned < T) return 0;
      return Math.max(1, Math.floor(D.PRESTIGE.gsBase * Math.pow(this.s.runEarned / T, D.PRESTIGE.gsExp)));
    }
    prestige() {
      const gain = this.prestigeGain();
      if (gain <= 0) return false;
      this.s.gsTotal += gain;
      this.addStat('prestiges');
      this.resetPetsForPrestige();
      this.startRun();
      this.rebuildFx();
      this.refreshPet();
      this.emit('prestige', { gain });
      return true;
    }

    hardReset() { this.s = defaultState(); this.startRun(); this.rebuildFx(); this.petRt = {}; this.refreshPet(); }

    // ---------- Ouvriers ----------
    syncWorkers() {
      const want = [{ kind: 'farmer', def: D.FARMER }];
      if (this.petWorkerDefs) want.push(...this.petWorkerDefs());
      for (const r of D.ROBOTS) for (let i = 0; i < (this.s.robots[r.id] || 0); i++) want.push({ kind: r.id, def: r });
      const have = this.workers;
      const next = [];
      for (const w of want) {
        const idx = have.findIndex(h => h.kind === w.kind);
        if (idx >= 0) { const h = have.splice(idx, 1)[0]; h.def = w.def; next.push(h); }
        else next.push(this.makeWorker(w.kind, w.def));
      }
      for (const w of have) this.release(w);
      this.workers = next;
      this.hubBoost = D.ROBOTS.reduce((a, r) => a * Math.pow(1 + (r.hub || 0), this.s.robots[r.id] || 0), 1);
      this.scare = D.ROBOTS.reduce((a, r) => a * Math.pow(1 - (r.scare || 0), this.s.robots[r.id] || 0), 1);
    }

    // Transforme un robot du rang `id` au rang suivant, sur place : de préférence un robot à la recharge (il est à la grange),
    // sinon le premier trouvé. Il ressort de l'atelier batterie pleine.
    upgradeRobot(id) {
      const next = this.chainNext(id);
      if (!next || !(this.s.robots[id] > 0)) return false;
      this.s.robots[id]--;
      if (!this.s.robots[id]) delete this.s.robots[id];
      this.s.robots[next.id] = (this.s.robots[next.id] || 0) + 1;
      const w = this.workers.find(x => x.kind === id && x.state === 'charge') || this.workers.find(x => x.kind === id);
      if (w) {
        w.kind = next.id; w.def = next; w.upT = 1.2; w.bat = 1;
        if (w.state === 'charge' || w.state === 'queue' || (w.state === 'goto' && w.goal === 'charge')) { w.state = 'idle'; w.pause = 0; w.scan = 0; }
        this.emit('robot-upgrade', { from: id, to: next.id, x: w.x });
      }
      return true;
    }

    makeWorker(kind, def) {
      return { id: this.nextWorkerId++, kind, def, x: rand(4, LAYOUT.BARN_W - 4), dir: 1, state: 'idle', task: null, t: 0, dur: 0, pause: rand(0, 1), anim: Math.random() * 10, scan: 0, bat: 1, turboT: 0, ocT: 0, calib: 0 };
    }

    // Multiplicateur de rythme d'un ouvrier (marche et travail), hors outils.
    workerPace(w) {
      if (w.kind === 'farmer') {
        let p = (1 + 0.25 * this.tal('vigueur')) * this.pm.farmerSpeed * this.fxMul('farmer');
        if (this.isNight() && !this.pm.farmerNoSleep) p *= 1 - 0.35 * (1 - this.pm.nightRelief) * (1 - 0.3 * this.tal('levetot')); // ne travaille la nuit qu'avec la lampe
        return p;
      }
      if (w.def.harvestOnly) return 1;
      const w8 = this.weather();
      return (1 + 0.15 * this.lvl('batterie')) * (1 + 0.2 * this.tal('surcadence')) * this.pm.robotSpeed * (this.perchIds && this.perchIds.has(w.id) ? 2 : 1)
        * (w.shockT > 0 ? 2 : 1) * (w.superT > 0 ? D.STORM.rodRobotMult : 1) * (this.lvl('mini_' + w.kind) ? D.MINI.pace : 1)
        * this.fxMul('robot', { robot: w.kind, tag: w.def.tag }) * (this.hubBoost || 1)
        * (w8.fog ? 0.85 : 1) * (w8.wind && w.def.fly ? 0.7 : 1);
    }

    walkSpeed(w) { return w.def.walk * (1 + 0.12 * this.lvl('bottes')) * this.workerPace(w) * (w.turboT > 0 ? 1.6 : 1); }

    usesBattery(w) { return w.kind !== 'farmer' && !w.def.harvestOnly && !w.def.noBattery; }
    batteryCapacity() { return D.BATTERY.capacity * (1 + 0.25 * this.lvl('capacite')); }
    chargeSlots() { return D.BATTERY.slots + this.lvl('bornes'); }
    chargingCount() { let n = 0; for (const w of this.workers) if (w.state === 'charge') n++; return n; }
    queueCount() { let n = 0; for (const w of this.workers) if (w.state === 'queue' || (w.state === 'goto' && w.goal === 'charge')) n++; return n; }
    canWork(w) { return w.def.only ? w.def.only : w.def.harvestOnly ? 'harvest' : null; }

    // Sur une culture dense, planter et récolter prennent autant de fois plus de temps qu'il y a de plants.
    actTime(w, type, plot = -1) {
      const tool = { plant: Math.pow(0.9, this.lvl('houe')) * this.fxMul('plantTime'), water: Math.pow(0.88, this.lvl('arrosoir')), harvest: Math.pow(0.9, this.lvl('faucille')) * this.fxMul('harvestTime'), treat: 1 }[type];
      let dense = plot >= 0 && (type === 'plant' || type === 'harvest') ? this.plotPlants(plot) : 1;
      const crop = plot >= 0 && this.s.plots[plot].crop;
      if (type === 'harvest' && crop && crop.mutant && D.MUTATIONS[crop.mutant].harvest) dense *= D.MUTATIONS[crop.mutant].harvest;
      const t = D.ACTIONS[type] * tool * w.def.act / this.workerPace(w) / (w.ocT > 0 ? 2 : 1);
      // Récolte d'un légume de haut niveau : plus longue, avec une part incompressible par plant.
      const sd = type === 'harvest' && crop ? SEED_BY_ID[crop.id] : null;
      if (sd && sd.minHarv) return dense * (sd.minHarv + sd.harv * t);
      return dense * t;
    }

    taskFor(i) {
      const pl = this.s.plots[i];
      if (!pl.crop) return 'plant';
      if (pl.crop.pest) return 'treat';
      if (pl.crop.p >= 1) return this.infiniWaits(pl.crop) ? null : 'harvest'; // l'infinie grandit jusqu'à ×300
      if (pl.moist < 0.3 && !this.irrigated(i) && !this.isRaining()) return 'water';
      return null;
    }

    // Une plante infinie est laissée de côté par les ouvriers (et pets, touristes) tant qu'elle vaut moins de ×autoAt.
    // Le gestionnaire peut la marquer à renouveler (crop.renew) : elle est alors récoltée tout de suite.
    infiniWaits(crop) { return crop.mutant === 'infini' && !crop.renew && 1 + (crop.extra || 0) < D.MUTATIONS.infini.autoAt; }

    // Taille de la récolte : une géante ou une infinie donne plus d'unités au silo (même valeur par unité).
    cropSize(crop) {
      const M = crop.mutant ? D.MUTATIONS[crop.mutant] : null;
      if (!M) return 1;
      if (M.infinite) return 1 + (crop.extra || 0);
      return crop.mutant === 'giant' ? M.value : 1;
    }

    findTask(w) {
      const only = this.canWork(w);
      if (only === 'none') return null;
      let best = -1, bestScore = Infinity, bestType = null;
      const n = this.activePlots();
      for (let i = 0; i < n; i++) {
        if (this.claims[i]) continue;
        const type = this.taskFor(i);
        if (!type || (only && type !== only)) continue;
        const crop = this.s.plots[i].crop;
        const hot = type === 'harvest' && (crop.energized > 0 || crop.star); // plante énergisée ou étoilée : priorité
        const score = Math.abs(plotX(i) - w.x) - (hot ? 300 : type === 'harvest' ? 25 : type === 'treat' ? 35 : 0);
        if (score < bestScore) { bestScore = score; best = i; bestType = type; }
      }
      return best < 0 ? null : { plot: best, type: bestType };
    }

    release(w) {
      if (w.task && this.claims[w.task.plot] === w.id) this.claims[w.task.plot] = 0;
      w.task = null;
    }

    assign(w, task) {
      w.task = task;
      this.claims[task.plot] = w.id;
      w.state = 'walk';
      w.tx = plotX(task.plot) + (w.def.fly ? 0 : rand(-2, 2));
    }

    goTo(w, goal, x) {
      this.release(w);
      w.state = 'goto'; w.goal = goal; w.tx = x;
    }

    freeze(w, secs) { w.frozenT = Math.max(w.frozenT || 0, secs * this.fxMul('frozen')); }

    updateWorker(w, dt) {
      w.anim += dt;
      if (w.turboT > 0) w.turboT -= dt;
      if (w.ocT > 0) w.ocT -= dt;
      if (w.shockT > 0) w.shockT -= dt;
      if (w.superT > 0) w.superT -= dt;
      if (w.upT > 0) w.upT -= dt;
      if (w.frozenT > 0) { // figé par le cri du basilic, la foudre, un corbeau maudit ou une tornade
        w.frozenT -= dt;
        if (w.frozenT <= 0 && w.shockNext) { w.shockT = w.shockNext; w.shockNext = 0; }
        return;
      }
      if (w.state === 'caught') { // prisonnier d'une plante carnivore jusqu'à ce qu'un autre la récolte
        const c = this.s.plots[w.caughtPlot] && this.s.plots[w.caughtPlot].crop;
        if (!c || c.caught !== w.id) { w.state = 'idle'; w.pause = 0; }
        return;
      }
      const busy = w.state === 'act' || w.state === 'goto' || w.state === 'charge' || w.state === 'queue' || w.state === 'sleep';

      // Le fermier dort la nuit dans la grange (sauf lampe frontale ou Saint-Bernard) ; Cerbère, lui, dort le jour.
      const sleepy = w.kind === 'farmer' ? this.isNight() && !this.lvl('lampe') && !this.pm.farmerNoSleep
        : w.def.onlyAt === 'night' ? !this.isNight() : false;
      if (sleepy && !busy) { this.goTo(w, 'sleep', rand(9, 15)); return; }
      if (w.state === 'sleep') { if (!sleepy) { w.state = 'idle'; w.pause = 0; } return; }

      // Batterie des robots : usure, puis retour à la grange pour recharger.
      if (this.usesBattery(w)) {
        if (w.state !== 'charge') {
          const active = w.state === 'walk' || w.state === 'act' || w.state === 'goto';
          let drain = dt / this.batteryCapacity() * (active ? 1 : D.BATTERY.idleDrain) * (w.def.drain || 1);
          if (this.lvl('solaire') && !this.pm.noSolar && !this.isNight()) drain *= 0.5;
          drain *= this.pm.batteryDrain;
          w.bat = Math.max(0, w.bat - drain);
        }
        if (w.bat <= D.BATTERY.low && !busy) { this.goTo(w, 'charge', rand(CHARGER.from, CHARGER.to)); return; }
        if (w.state === 'queue') { if (this.chargingCount() < this.chargeSlots()) w.state = 'charge'; return; }
        if (w.state === 'charge') {
          if (this.ev && this.ev.timers.outage > 0) return; // panne de courant
          w.bat += dt / D.BATTERY.charge * (1 + 0.3 * this.lvl('charge_rapide')) * this.pm.chargeMult;
          if (w.bat >= 1) {
            w.bat = 1;
            w.state = 'idle'; w.pause = 0; w.scan = 0;
            this.addStat('charges');
            if (this.lvl('turbo')) w.turboT = 20;
            if (this.lvl('overclock')) w.ocT = 15;
            if (this.lvl('calibrage')) w.calib = 4;
          }
          return;
        }
      }

      if (w.state === 'goto') {
        const dx = w.tx - w.x;
        w.dir = dx >= 0 ? 1 : -1;
        const step = this.walkSpeed(w) * dt;
        if (Math.abs(dx) > step) { w.x += Math.sign(dx) * step; return; }
        w.x = w.tx;
        if (w.goal === 'sleep') w.state = 'sleep';
        else w.state = this.chargingCount() < this.chargeSlots() ? 'charge' : 'queue';
        return;
      }

      if (w.state === 'idle' || w.state === 'wander') {
        w.scan -= dt;
        if (w.scan <= 0) {
          w.scan = 0.25;
          const task = this.findTask(w);
          if (task) { this.assign(w, task); return; }
        }
      }
      if (w.state === 'idle') {
        w.pause -= dt;
        if (w.pause <= 0) {
          const right = plotX(Math.max(0, this.activePlots() - 1)) + 6;
          w.tx = Math.max(3, Math.min(right, w.x + rand(-30, 30)));
          w.state = 'wander';
        }
        return;
      }
      if (w.state === 'walk' || w.state === 'wander') {
        const speed = this.walkSpeed(w) * (w.state === 'wander' ? 0.35 : 1);
        const dx = w.tx - w.x;
        w.dir = dx >= 0 ? 1 : -1;
        const step = speed * dt;
        if (Math.abs(dx) <= step) {
          w.x = w.tx;
          if (w.state === 'wander') { w.state = 'idle'; w.pause = rand(1, 4); return; }
          const type = this.taskFor(w.task.plot);
          if (type !== w.task.type) { this.release(w); w.state = 'idle'; w.pause = 0; return; }
          const prey = type === 'harvest' && this.s.plots[w.task.plot].crop;
          if (prey && prey.mutant === 'carnivore' && !prey.caught && this.usesBattery(w)) {
            prey.caught = w.id; w.caughtPlot = w.task.plot;
            this.release(w); w.state = 'caught';
            this.emit('caught', { plot: w.caughtPlot });
            return;
          }
          w.state = 'act'; w.t = 0; w.dur = this.actTime(w, type, w.task.plot);
        } else w.x += Math.sign(dx) * step;
        return;
      }
      if (w.state === 'act') {
        w.t += dt;
        if (w.t >= w.dur) {
          const { plot, type } = w.task;
          if (this.taskFor(plot) === type) this.doAction(plot, type, w);
          this.release(w);
          w.state = 'idle'; w.pause = 0; w.scan = 0;
        }
      }
    }

    doAction(i, type, who) {
      const pl = this.s.plots[i];
      if (type === 'plant') { this.plant(i, pl.head || 0); delete pl.head; }
      else if (type === 'water') { pl.moist = 1; this.emit('water', { plot: i }); }
      else if (type === 'treat') this.treat(i);
      else if (type === 'harvest') {
        const source = !who ? 'click' : who.kind === 'farmer' ? 'farmer' : who.def.harvestOnly ? 'pet' : 'robot';
        const calib = who && who.calib > 0;
        if (calib) who.calib--;
        this.harvest(i, source, calib ? 2 : 1);
      }
    }

    plant(i, head = 0) {
      const pl = this.s.plots[i];
      const id = this.seedFor(i);
      pl.crop = { id, p: Math.min(0.95, head), gold: false, rot: !!pl.last && pl.last !== id, pest: 0 };
      const mutant = this.rollMutation();
      if (mutant) { pl.crop.mutant = mutant; this.emit('mutation', { plot: i, kind: mutant }); }
      pl.moist = Math.max(pl.moist, 0.4);
    }

    // Science : une plante sur ~50 mute à la plantation (plus avec les paliers OGM).
    rollMutation() {
      if (!this.science() || Math.random() >= D.SCIENCE.mutation + 0.01 * this.tal('ogm')) return null;
      const good = Math.random() < D.SCIENCE.goodShare + 0.1 * this.tal('crispr');
      const pool = Object.entries(D.MUTATIONS).filter(([, m]) => !!m.good === good);
      let r = Math.random() * pool.reduce((a, [, m]) => a + m.w, 0);
      for (const [id, m] of pool) { r -= m.w; if (r <= 0) return id; }
      return pool[0][0];
    }
    mutation(i) { const c = this.s.plots[i].crop; return c && c.mutant ? D.MUTATIONS[c.mutant] : null; }
    // Une plante moisie à moins de `radius` cases divise la valeur.
    moldNear(i) {
      for (let j = 0; j < this.activePlots(); j++) {
        if (j === i) continue;
        const m = this.mutation(j);
        if (m && m.mold && Math.abs(j - i) <= m.mold.radius) return m.mold.div;
      }
      return 1;
    }

    freeCaught(crop) {
      const w = this.workers.find(x => x.id === crop.caught);
      crop.caught = 0;
      if (w && w.state === 'caught') { w.state = 'idle'; w.pause = 0; this.emit('freed', { x: w.x }); }
    }

    treat(i) {
      const crop = this.s.plots[i].crop;
      if (!crop || !crop.pest) return;
      crop.pest = 0;
      this.addStat('pests');
      this.emit('treat', { plot: i });
    }

    harvest(i, source, bonus = 1) {
      const pl = this.s.plots[i];
      const crop = pl.crop;
      if (!crop) return 0;
      const seed = SEED_BY_ID[crop.id];
      // Champignon sauvage : vaut un multiple de ta meilleure graine (pas la valeur d'un champignon d'une ère lointaine).
      const base = crop.wild ? SEED_BY_ID[this.bestSeed()].value * D.EVENT_FX.wildMult : this.seedValue(seed);
      let v = base * this.valueMult() * this.harvestMult(seed, source) * this.fxValue(seed) * bonus * this.plotPlants(i);
      if (crop.rot) v *= 1 + 0.15 * this.tal('rotation');
      if (crop.energized > 0) { v *= D.STORM.energyMult * this.fxMul('energy'); this.addStat('energized'); this.emit('energy-harvest', { plot: i }); }
      // Nouvel an chinois : une récolte sur 8 vaut ×8.
      if (this.seasonDef() && this.seasonDef().lucky8 && (this.luckyN = (this.luckyN || 0) + 1) % 8 === 0) { v *= 8; this.emit('lucky8', { plot: i }); }
      if (crop.star) { v *= D.EVENT_FX.starMult; this.addStat('stars'); this.emit('star-harvest', { plot: i }); }
      const mutant = crop.mutant || null, M = mutant ? D.MUTATIONS[mutant] : null;
      if (M) {
        if (M.value != null) v *= M.value;
        if (M.infinite) v *= 1 + (crop.extra || 0);
        if (M.fail && Math.random() < M.fail) { v = 0; this.emit('fever-fail', { plot: i }); }
        if (mutant === 'giant') this.addStat('giants');
      }
      v /= this.moldNear(i);
      if (crop.caught) this.freeCaught(crop);
      const aura = this.auraAt(i);
      if (aura) v *= aura.value;
      if (crop.gold) { v *= (source === 'click' ? 25 : 10) * this.pm.goldenMult; this.addStat('golden'); }
      if (this.frenzy()) v *= 2;
      const double = Math.random() < 0.05 * this.lvl('panier') + this.pm.double;
      if (double) v *= 2;
      const lost = !crop.gold && Math.random() < this.pm.nothing;
      if (lost) { v = 0; this.emit('pet-lost', { plot: i }); }
      let stored = null;
      if (v > 0 && this.marketOn() && source !== 'tourist' && source !== 'fair') stored = this.store(seed, crop.gold ? this.produceTraits().concat('dore') : this.produceTraits(), v, this.plotPlants(i) * this.cropSize(crop));
      else this.earn(v);
      this.harvestBuckets[this.harvestBuckets.length - 1] += v;
      this.addStat('harvest');
      if (seed.season) this.s.basket[seed.id] = (this.s.basket[seed.id] || 0) + this.plotPlants(i);
      this.petXp(D.PET_LEVEL.perHarvest);
      if (this.pm.gem && Math.random() < this.pm.gem.chance) {
        const gem = v * (this.pm.gem.mult - 1);
        this.earn(gem);
        this.emit('gem', { plot: i, value: gem });
      }
      if (seed.night && this.isNight()) this.addStat('nightMandrake');
      if (stored) { if (stored.put) this.emit('stored', { plot: i, units: stored.put }); if (stored.surplus) this.emit('harvest', { plot: i, value: stored.surplus, seed: seed.id }); }
      else if (!lost && v > 0) this.emit('harvest', { plot: i, value: v, gold: crop.gold || crop.star || (M && M.good), double, seed: seed.id });
      pl.last = crop.id;
      pl.crop = null;
      if (this.lvl('replant')) this.plant(i, this.pm.headStart);
      else if (this.pm.headStart) pl.head = this.pm.headStart;
      return v;
    }

    earn(v) {
      this.s.money += v;
      this.s.runEarned += v;
      this.s.totalEarned += v;
      this.incomeBuckets[this.incomeBuckets.length - 1] += v;
    }

    addStat(k, n = 1) { this.s.stats[k] = (this.s.stats[k] || 0) + n; }
    emit(type, data = {}) { this.events.push({ type, ...data }); if (this.events.length > 300) this.events.shift(); }

    // ---------- Actions du joueur ----------
    clickPlot(i) {
      if (i < 0 || i >= this.activePlots()) return null;
      const pl = this.s.plots[i];
      if (this.brush) {
        pl.seed = this.brush;
        if (pl.crop && pl.crop.p < 0.05 && pl.crop.id !== this.seedFor(i)) pl.crop = null;
        this.emit('assign', { plot: i });
        return 'assign';
      }
      this.addStat('clicks');
      if (!pl.crop) { this.plant(i, pl.head || 0); delete pl.head; this.emit('plant', { plot: i }); return 'plant'; }
      if (pl.crop.pest) { this.treat(i); return 'treat'; }
      if (pl.crop.p >= 1) { this.harvest(i, 'click'); return 'harvest'; }
      if (pl.moist < 0.3 && !this.irrigated(i)) { pl.moist = 1; this.emit('water', { plot: i }); return 'water'; }
      pl.crop.p = Math.min(1, pl.crop.p + this.clickBoost());
      if (pl.crop.p >= 1) this.ripen(i);
      this.emit('boost', { plot: i });
      return 'boost';
    }

    clickBoost() { return 0.05 + 0.02 * this.lvl('mainverte') + 0.05 * this.tal('doigte') + this.pm.clickBoost + this.fxAdd('click'); }

    setAllPlots(seed) { for (const pl of this.s.plots) pl.seed = seed; }

    goldChance(i) {
      const cr = this.s.plots[i].crop;
      let c = 0.01 + this.pm.golden + this.fxAdd('gold') + (cr && SEED_BY_ID[cr.id].goldBonus || 0);
      if (this.ev && this.ev.timers.rainbow > 0) c *= 5;
      return c / this.plotPlants(i);
    }
    ripen(i) {
      const crop = this.s.plots[i].crop;
      if (Math.random() < this.goldChance(i)) { crop.gold = true; this.emit('golden', { plot: i }); }
    }

    scareCrow(c) {
      if (c.state === 'leave') return;
      c.state = 'leave';
      const season = this.seasonDef();
      const reward = Math.max(5, this.harvestRate() * 15) * this.rewardMult() * (season && season.crowReward || 1);
      this.earn(reward);
      this.addStat('crows');
      this.emit('crow-scared', { x: c.x, value: reward });
    }

    clickCart() {
      const c = this.cart;
      if (!c || c.done) return;
      c.done = true;
      const reward = Math.max(25, this.harvestRate() * 60) * this.eventMult() * this.pm.cartMult * (1 + 0.5 * this.perk('negociant'));
      this.earn(reward);
      this.addStat('merchants');
      this.emit('cart', { x: c.x, value: reward });
    }

    // ---------- Boucle ----------
    tick(dt) {
      const s = this.s, c = s.clock;
      s.stats.playTime = (s.stats.playTime || 0) + dt;
      s.stats.runTime = (s.stats.runTime || 0) + dt;
      c.t += dt * (this.isNight() ? this.pm.nightSpeed : 1);

      this.bucketT += dt;
      if (this.bucketT >= 1) { this.bucketT -= 1; this.incomeBuckets.shift(); this.incomeBuckets.push(0); this.harvestBuckets.shift(); this.harvestBuckets.push(0); }

      this.updateSeason(dt);
      this.updateWeather(dt);
      this.updateWeatherEffects(dt);
      this.updateEvents(dt);
      this.updateRandomEvents(dt);

      const raining = this.isRaining();
      const n = this.activePlots();
      for (let i = 0; i < n; i++) {
        const pl = s.plots[i];
        // L'aura brûlante du phénix assèche plus vite que l'irrigation n'arrose (la pluie protège encore).
        const aura = this.auraAt(i);
        const scorched = aura && aura.evap > 3;
        if (raining || (aura && aura.wet) || (this.irrigated(i) && !scorched)) pl.moist = 1;
        else pl.moist = Math.max(0, pl.moist - dt * this.evapRate(i));
        if (pl.crop && pl.crop.energized > 0) {
          pl.crop.energized -= dt;
          if (pl.crop.energized <= 0) { pl.crop = null; this.addStat('plantsLost'); this.emit('energy-lost', { plot: i }); }
          continue;
        }
        if (pl.crop && pl.crop.pest) {
          pl.crop.pest += dt;
          if (pl.crop.pest >= D.BIO.pestDeath) { pl.crop = null; this.addStat('plantsLost'); this.emit('pest-dead', { plot: i }); }
          continue;
        }
        if (pl.crop && pl.crop.p < 1 && this.bio() && !this.pm.noPests && Math.random() < dt / D.BIO.pestEvery * (1 - 0.15 * this.tal('coccinelles'))) {
          pl.crop.pest = 0.001;
          this.emit('pest', { plot: i });
          continue;
        }
        if (pl.crop && pl.crop.p >= 1 && pl.crop.mutant === 'infini') pl.crop.extra = (pl.crop.extra || 0) + this.plotGrowthRate(i) * dt;
        if (pl.crop && pl.crop.p < 1) {
          pl.crop.p += this.plotGrowthRate(i) * dt;
          if (pl.crop.p >= 1) { pl.crop.p = 1; this.ripen(i); }
        }
      }

      for (const w of this.workers) this.updateWorker(w, dt);
      this.updatePets(dt);
      this.updateStorm(dt);
      this.updateCrows(dt);
      this.updateCart(dt);
      this.updateMarket(dt);
      this.updateFactory(dt);

      this.achT += dt;
      if (this.achT >= 1) { this.achT = 0; this.checkAchievements(); }
    }

    updateWeather(dt) {
      const c = this.s.clock;
      c.weatherT -= dt;
      if (c.weatherT > 0) return;
      const ciel = 1 + 0.25 * this.perk('ciel');
      const entries = Object.entries(D.WEATHER).filter(([id]) => id !== c.weather);
      const sw = (this.seasonDef() && this.seasonDef().weather) || {};
      const weights = entries.map(([id, w]) => w.w * (w.rain ? ciel : 1) * (w.storm ? this.pm.stormMult : 1) * (sw[id] || 1));
      let r = Math.random() * weights.reduce((a, b) => a + b, 0);
      let pick = entries[0][0];
      for (let i = 0; i < entries.length; i++) { r -= weights[i]; if (r <= 0) { pick = entries[i][0]; break; } }
      c.weather = pick;
      c.weatherT = rand(100, 260);
      if (D.WEATHER[pick].storm) this.addStat('storms');
      this.emit('weather', { id: pick });
    }

    crowChance() {
      return (1 - 0.25 * this.lvl('epouvantail')) * (1 - 0.25 * this.tal('pesticides')) * this.pm.crowMult * this.fxMul('crow')
        * (this.scare == null ? 1 : this.scare) * (this.weather().fog ? 2 : 1);
    }

    updateEvents(dt) {
      const c = this.s.clock;
      if (c.frenzyT > 0) { c.frenzyT -= dt; if (c.frenzyT <= 0) this.emit('frenzy-end'); }
      c.nextFrenzy -= dt;
      if (c.nextFrenzy <= 0) { c.nextFrenzy = rand(360, 660) * this.pm.frenzyFreq; c.frenzyT = 45 + 15 * this.tal('flair'); this.emit('frenzy', { dur: c.frenzyT }); }

      c.nextCrow -= dt;
      if (c.nextCrow <= 0) {
        c.nextCrow = rand(60, 140);
        const chance = this.crowChance();
        const n = 1 + Math.floor(this.activePlots() / 20);
        if (!this.pm.noCrows) for (let k = 0; k < n; k++) if (Math.random() < chance) this.spawnCrow();
      }

      if (this.science()) {
        c.nextBlight -= dt;
        if (c.nextBlight <= 0) { c.nextBlight = D.SCIENCE.blightEvery; this.blightCheck(); }
      }

      c.nextCart -= dt;
      if (c.nextCart <= 0 && !this.cart) {
        c.nextCart = rand(300, 540);
        if (this.pm.noCart) return;
        this.cart = { x: plotX(this.activePlots()) + 30, speed: 10, done: false, anim: 0 };
        this.emit('cart-arrive');
      }
    }

    // Perte de biodiversité : plus une espèce domine le champ, plus une épidémie risque de la frapper.
    monoculture() {
      const n = this.activePlots(), counts = {};
      let top = null;
      for (let i = 0; i < n; i++) {
        const c = this.s.plots[i].crop;
        if (!c) continue;
        counts[c.id] = (counts[c.id] || 0) + 1;
        if (!top || counts[c.id] > counts[top]) top = c.id;
      }
      return { id: top, share: top ? counts[top] / Math.max(1, n) : 0 };
    }
    blightRisk() {
      const m = this.monoculture();
      return Math.max(0, (m.share - D.SCIENCE.blightShare) / (1 - D.SCIENCE.blightShare)) * 0.6 * (1 - 0.15 * this.tal('banque'));
    }
    blightCheck() {
      const m = this.monoculture();
      if (!m.id || Math.random() >= this.blightRisk()) return;
      let lost = 0;
      for (let i = 0; i < this.activePlots(); i++) {
        const pl = this.s.plots[i];
        if (pl.crop && pl.crop.id === m.id && Math.random() < 0.7) { pl.crop = null; lost++; }
      }
      this.addStat('plantsLost', lost);
      this.emit('blight', { id: m.id, lost });
    }

    spawnCrow() {
      const n = this.activePlots();
      const targets = [];
      for (let i = 0; i < n; i++) if (this.s.plots[i].crop && !this.crows.some(c => c.plot === i)) targets.push(i);
      if (!targets.length) return;
      const plot = targets[Math.floor(Math.random() * targets.length)];
      this.crows.push({ plot, x: plotX(n) + rand(20, 60), y: rand(14, 20), state: 'fly', t: 0, anim: Math.random() * 5 });
      this.emit('crow', { plot });
    }

    updateCrows(dt) {
      const hunters = this.allPetEnts().length || this.workers.some(w => w.def.harvestOnly);
      for (const c of this.crows) {
        c.anim += dt;
        const tx = plotX(c.plot) + 2;
        if (c.state === 'fly') {
          const dx = tx - c.x;
          c.x += Math.sign(dx) * Math.min(Math.abs(dx), 30 * dt);
          c.y = Math.max(0, c.y - 8 * dt);
          if (Math.abs(dx) < 0.5 && c.y <= 0.1) { c.state = 'eat'; c.t = 0; c.y = 0; }
        } else if (c.state === 'eat') {
          c.t += dt;
          const pl = this.s.plots[c.plot];
          const hunt = this.pm.crowHunter;
          if (!pl || !pl.crop) c.state = 'leave';
          else if (hunt && c.t >= hunt.delay && hunters) this.huntCrow(c, hunt.reward);
          else if (c.t >= 7) {
            pl.crop = null;
            this.addStat('plantsLost');
            this.emit('crow-ate', { plot: c.plot });
            c.state = 'leave';
          }
        } else if (c.state === 'cursed') {
          // Corbeau maudit : fonce sur les robots et les fige un par un.
          c.cursed -= dt;
          const targets = this.workers.filter(w => this.usesBattery(w) && !c.hit.includes(w.id));
          if (c.cursed <= 0 || !targets.length) { c.state = 'leave'; continue; }
          const w = targets.reduce((a, b) => (Math.abs(b.x - c.x) < Math.abs(a.x - c.x) ? b : a));
          const dx = w.x - c.x;
          c.x += Math.sign(dx) * Math.min(Math.abs(dx), 55 * dt);
          c.y += (5 - c.y) * Math.min(1, dt * 4);
          if (Math.abs(dx) < 2) { this.freeze(w, D.STORM.crowFreeze); c.hit.push(w.id); this.emit('crow-zap', { x: w.x }); }
        } else if (c.state === 'leave') {
          c.x += 40 * dt;
          c.y += 14 * dt;
        }
      }
      this.crows = this.crows.filter(c => c.y < 40);
    }

    // ---------- Orages ----------
    rodded(i) { return i >= this.activePlots() - this.lvl('paratonnerres'); }

    updateStorm(dt) {
      if (!this.weather().storm) { this.strikeT = 0; return; }
      if (!this.strikeT) this.strikeT = rand(D.STORM.every[0], D.STORM.every[1]);
      this.strikeT -= dt;
      if (this.strikeT > 0) return;
      this.strikeT = rand(D.STORM.every[0], D.STORM.every[1]);
      this.strike(this.pickStrikeTarget());
    }

    pickStrikeTarget() {
      const W = D.STORM.weights, n = this.activePlots();
      const list = [{ kind: 'ground', w: W.ground, x: rand(LAYOUT.BARN_W, plotX(Math.max(0, n - 1))) }];
      for (let i = 0; i < n; i++) {
        const pl = this.s.plots[i], rod = this.rodded(i);
        const w = (pl.crop ? W.plot : 0) + (rod ? W.rod : 0);
        if (w) list.push({ kind: 'plot', i, w });
      }
      for (const wk of this.workers) {
        if (wk.kind === 'farmer') list.push({ kind: 'farmer', worker: wk, w: W.farmer });
        else if (this.usesBattery(wk)) list.push({ kind: 'robot', worker: wk, w: wk.def.rod ? W.rodRobot : W.robot });
      }
      for (const c of this.crows) if (c.state !== 'leave' && c.state !== 'cursed') list.push({ kind: 'crow', crow: c, w: W.crow });
      let r = Math.random() * list.reduce((a, t) => a + t.w, 0);
      for (const t of list) { r -= t.w; if (r <= 0) return t; }
      return list[0];
    }

    // Un éclair frappe une cible (voir pickStrikeTarget).
    strike(t) {
      const S = D.STORM;
      let x = t.x, effect = t.kind;
      if (t.kind === 'plot') {
        const pl = this.s.plots[t.i], c = pl.crop;
        x = plotX(t.i);
        if (c && c.gold && c.p >= 1 && !(c.energized > 0)) { c.energized = S.energyTime; effect = 'energized'; }
        else if (this.rodded(t.i)) effect = 'rod';
        else if (c) { pl.crop = null; this.addStat('plantsLost'); effect = 'burned'; }
      } else if (t.kind === 'robot') {
        const w = t.worker;
        x = w.x;
        w.bat = 1;
        if (w.def.rod) { w.superT = S.rodRobotTime; this.addStat('superRobots'); effect = 'super'; }
        else { this.freeze(w, S.robotFreeze); w.shockNext = S.robotBoost; }
      } else if (t.kind === 'farmer') {
        this.freeze(t.worker, S.farmerFreeze);
        x = t.worker.x;
      } else if (t.kind === 'crow') {
        const c = t.crow;
        c.state = 'cursed'; c.cursed = S.cursedTime; c.hit = []; c.cursedLook = true;
        x = c.x;
        this.addStat('cursedCrows');
      }
      this.addStat('strikes');
      this.emit('lightning', { x, kind: t.kind, effect, plot: t.i });
    }

    updateCart(dt) {
      const c = this.cart;
      if (!c) return;
      c.anim += dt;
      c.x -= (c.done ? 25 : c.speed) * dt;
      if (c.x < -40) this.cart = null;
    }

    checkAchievements() {
      for (const a of D.ACHIEVEMENTS) {
        if (this.s.ach[a.id]) continue;
        let ok = false;
        try { ok = a.check(this); } catch { ok = false; }
        if (ok) { this.s.ach[a.id] = true; this.emit('ach', { id: a.id, name: a.name }); }
      }
    }
  }

  // Les modules ajoutent leurs méthodes à Game (compagnons, marché, événements).
  const HELPERS = { D, LAYOUT, plotX, rand, gauss, SEED_BY_ID, PET_BY_ID, ROBOT_BY_ID };
  for (const install of MIXINS) install(Game.prototype, HELPERS);

  const CORE = { Game, LAYOUT, plotX, SEED_BY_ID, UP_BY_ID, ROBOT_BY_ID, PERK_BY_ID, PET_BY_ID, TAL_BY_ID, RECIPE_BY_ID, MACHINE_BY_ID, FOOD_BY_ID, SILO: { W: 7, STEP: 9, GAP: 6, RESERVE: 80 } };
  if (NODE) module.exports = CORE;
  else root.FARM_CORE = CORE;
})(this);

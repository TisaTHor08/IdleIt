// Marché : silos (avec péremption), cours aléatoires, chocs (pénuries, krachs), commandes, trader et gestionnaire.
(function (root) {
  'use strict';

  function install(G, H) {
    const { D, rand, gauss, SEED_BY_ID } = H;
    const M = D.MARKET;
    const N = D.SEEDS.length - 1;
    // 0 pour le légume le plus cher, 1 pour le moins cher : les légumes bon marché sont bien plus volatils.
    const cheapness = seedId => 1 - SEED_BY_ID[seedId].rank / N;
    const lerp = (r, c) => r[0] + (r[1] - r[0]) * c;

    Object.assign(G, {
      marketOn() { return this.lvl('licence') > 0; },
      siloCapacity() { return this.s.trade.silos * M.siloCap * (1 + 0.5 * this.lvl('silo_cap')); },
      stockUnits() { let n = 0; for (const e of Object.values(this.s.trade.stock)) n += e.units; return n; },
      stockWorth() { let v = 0; for (const e of Object.values(this.s.trade.stock)) v += e.units * e.worth * e.fresh * this.priceFactor(e, e.units); return v; },
      siloCost(n = this.s.trade.silos) { return M.siloCost * Math.pow(M.siloG, n) * this.discount(); },

      // Unités absorbées par le marché avant que le prix ne chute (les OGM en produisent beaucoup plus).
      marketDepth(seedId) {
        const seed = SEED_BY_ID[seedId];
        const kind = seed.depth || Math.max(M.depthMin, Math.pow(2, (M.depthTier - seed.rank) / M.depthSlope));
        const base = (M.depth + M.depthPerPlot * this.activePlots()) * kind * Math.sqrt(this.science() ? this.ogmYield() : 1);
        return Math.max(base, M.supplyDepth * (this.s.trade.made[seedId] || 0)) * (1 + 0.25 * this.lvl('reseau'));
      },
      produceTraits() {
        const t = [];
        if (this.bio()) t.push('bio');
        if (this.science() && this.tal('ogm')) t.push('ogm');
        if (this.tal('gene_froid')) t.push('froid');
        if (this.tal('gene_chaleur')) t.push('chaleur');
        if (this.tal('gene_sec')) t.push('sec');
        return t;
      },
      productName(e) {
        const tr = e.traits.filter(t => D.TRAITS[t]).map(t => D.TRAITS[t].name);
        return SEED_BY_ID[e.seed].name + (tr.length ? ' (' + tr.join(', ') + ')' : '');
      },

      // ---------- Silos et fraîcheur ----------
      // Durée de conservation effective (s) : famille, chambre froide, frigo de famille.
      shelfLife(seedId) { const sd = SEED_BY_ID[seedId]; return sd.shelf / this.fxMul('spoil', { fam: sd.fam, seed: seedId }); },
      // Une récolte part au silo ; ce qui ne rentre pas est vendu au marché classique (prix fixe, plus bas).
      store(seed, traits, v, plants = 1) {
        const units = Math.max(1, Math.round((this.science() ? this.ogmYield() : 1) * plants));
        const worth = v / units;
        this.s.trade.made[seed.id] = (this.s.trade.made[seed.id] || 0) + units;
        const put = Math.max(0, Math.min(units, Math.floor(this.siloCapacity() - this.stockUnits())));
        if (put > 0) {
          const key = seed.id + '|' + traits.join(',');
          const st = this.s.trade.stock;
          const e = st[key] || (st[key] = { seed: seed.id, traits, units: 0, worth: 0, fresh: 1 });
          e.worth = (e.worth * e.units + worth * put) / (e.units + put);
          e.fresh = (e.fresh * e.units + put) / (e.units + put);
          e.units += put;
        }
        const surplus = (units - put) * worth * M.surplus;
        if (surplus > 0) { this.earn(surplus); this.addStat('surplusValue', surplus); }
        this.addStat('storedRef', worth * put);
        return { put, surplus };
      },
      updateFreshness(dt) {
        const st = this.s.trade.stock;
        const floor = this.lvl('conserverie') ? 0.4 : 0;
        for (const key of Object.keys(st)) {
          const e = st[key];
          e.fresh = Math.max(floor, e.fresh * Math.exp(-dt / this.shelfLife(e.seed)));
          if (e.fresh < M.rotten) {
            this.addStat('rotten');
            this.emit('rotten', { seed: e.seed, units: e.units });
            delete st[key];
          }
        }
      },

      // ---------- Cours ----------
      trend(seedId) { return (this.s.trade.trend[seedId] || 1) * this.shockMult(seedId); },
      // Les légumes dorés sont un produit à part : leur cours (clé « graine* ») bouge indépendamment.
      entryTrend(e) { return e.traits.includes('dore') ? (this.s.trade.trend[e.seed + '*'] || 1) : this.trend(e.seed); },
      shockMult(seedId) { let m = 1; for (const k of this.s.trade.shocks) if (k.seed === seedId) m *= k.mult; return m; },
      shockFor(seedId) { return this.s.trade.shocks.find(k => k.seed === seedId) || null; },
      // Cours affiché d'une espèce (prime du marché × aléa × chocs × saturation), hors commandes.
      seedPrice(seedId) { return M.premium * this.trend(seedId) * this.saturation(seedId) * this.fxMul('price', { fam: SEED_BY_ID[seedId].fam }); },
      saturation(seedId, extra = 0) { return 1 / (1 + ((this.s.trade.sold[seedId] || 0) + extra) / this.marketDepth(seedId)); },

      // ---------- Commandes ----------
      demandMatches(d, e) {
        if (d.seed && d.seed !== e.seed) return false;
        if (d.trait === 'any') return true;
        if (d.trait === 'sansogm') return !e.traits.includes('ogm');
        return e.traits.includes(d.trait);
      },
      demandFor(e) {
        let best = null;
        for (const d of this.s.trade.demands) if (d.left > 0 && this.demandMatches(d, e) && (!best || d.mult > best.mult)) best = d;
        return best;
      },
      // Rentabilité (valeur par seconde et par parcelle) d'une graine, pour les commandes et le gestionnaire.
      seedRate(sd) {
        const g = sd.grow < D.FAST_GROW ? this.pm.fastGrowth : this.pm.slowGrowth;
        return sd.value * this.fxValue(sd) * this.harvestMult(sd, 'robot') * g * this.fxMul('growth', { fam: sd.fam, seed: sd.id }) / sd.grow;
      },
      bestSeedRate() { let top = 0; for (const sd of D.SEEDS) if (this.s.seeds[sd.id]) top = Math.max(top, this.seedRate(sd)); return top; },
      demandCap() { return M.demandMax + this.fxAdd('demand'); },
      newDemand() {
        const seeds = D.SEEDS.filter(sd => this.s.seeds[sd.id]);
        if (!seeds.length) return;
        const traits = Object.entries(D.TRAITS).filter(([, t]) => t.w > 0);
        let r = Math.random() * traits.reduce((a, [, t]) => a + t.w, 0);
        let trait = 'any';
        for (const [id, t] of traits) { r -= t.w; if (r <= 0) { trait = id; break; } }
        // Les commandes visent plutôt les légumes bon marché, et les paient à parité avec ton meilleur légume.
        const weights = seeds.map(sd => 0.5 + 2 * cheapness(sd.id));
        let pick = Math.random() * weights.reduce((a, b) => a + b, 0);
        let seed = seeds[0];
        for (let i = 0; i < seeds.length; i++) { pick -= weights[i]; if (pick <= 0) { seed = seeds[i]; break; } }
        const T = D.TRAITS[trait];
        const parity = Math.max(1, this.bestSeedRate() / Math.max(1e-300, this.seedRate(seed)));
        const mult = parity * rand(M.demandParity[0], M.demandParity[1]) * rand(T.mult[0], T.mult[1]) * this.fxMul('demandMult');
        const left = Math.round(rand(20, 50) * (1 + this.activePlots() / 15) * (this.science() ? Math.sqrt(this.ogmYield()) : 1));
        const d = { seed: seed.id, trait, mult: mult < 10 ? +mult.toFixed(1) : Math.round(mult), t: M.demandLife, left, total: left };
        this.s.trade.demands.push(d);
        this.emit('demand', d);
      },

      // Plafond du prix relatif : au mieux `parityCap` fois la rentabilité de ton meilleur légume.
      // Le blé peut battre le chou cosmique, mais cours, pénurie et commande ne se multiplient pas sans fin.
      priceCap(seedId) {
        const ratio = this.bestSeedRate() / Math.max(1e-300, this.seedRate(SEED_BY_ID[seedId]));
        return Math.max(M.parityCap, M.parityCap * ratio) * this.fxMul('price', { fam: SEED_BY_ID[seedId].fam });
      },
      // Prix relatif d'un produit (1 = prix de référence de la récolte) pour une vente de `units` unités.
      priceFactor(e, units = 1) {
        const d = this.demandFor(e);
        const du = d ? Math.min(units, d.left) : 0;
        const sat = this.saturation(e.seed, units / 2);
        const f = M.premium * this.entryTrend(e) * sat * this.fxMul('price', { fam: SEED_BY_ID[e.seed].fam }) * (units ? (du * (d ? d.mult : 1) + (units - du)) / units : 1);
        return Math.min(f, this.priceCap(e.seed));
      },

      sellStock(key, fraction = 1, commission = 0) {
        const tr = this.s.trade;
        const e = tr.stock[key];
        if (!e) return 0;
        const units = Math.min(e.units, fraction >= 1 ? e.units : Math.max(1, Math.floor(e.units * fraction)));
        const base = e.worth * e.fresh * M.premium * this.entryTrend(e) * this.fxMul('price', { fam: SEED_BY_ID[e.seed].fam });
        let total = 0, rest = units;
        const d = this.demandFor(e);
        if (d) {
          const du = Math.min(rest, d.left);
          total += du * base * this.saturation(e.seed, du / 2) * d.mult;
          tr.sold[e.seed] = (tr.sold[e.seed] || 0) + du;
          d.left -= du; rest -= du;
          if (d.left <= 0) { this.addStat('demands'); this.emit('demand-done', { seed: d.seed, trait: d.trait }); }
        }
        if (rest > 0) {
          total += rest * base * this.saturation(e.seed, rest / 2);
          tr.sold[e.seed] = (tr.sold[e.seed] || 0) + rest;
        }
        total = Math.min(total, units * e.worth * e.fresh * this.priceCap(e.seed)) * (1 - commission);
        if (this.shockFor(e.seed) && this.shockFor(e.seed).mult > 1) this.addStat('shortageSales');
        this.addStat('soldRef', units * e.worth);
        this.addStat('soldValue', total);
        e.units -= units;
        if (e.units <= 0) delete tr.stock[key];
        this.earn(total);
        this.addStat('marketSales');
        this.emit('sale', { value: total, units });
        return total;
      },
      sellAll(commission = 0) {
        let t = 0;
        for (const k of Object.keys(this.s.trade.stock)) t += this.sellStock(k, 1, commission);
        return t;
      },
      traderCommission() { return Math.max(0, M.commission - 0.02 * this.lvl('trader_comm') - 0.02 * this.perk('negociant')); },

      // ---------- Boucle du marché ----------
      updateMarket(dt) {
        const tr = this.s.trade;
        if (!this.s.market.unlocked && this.s.runEarned >= M.unlockAt) { this.s.market.unlocked = true; this.emit('market-unlock'); }
        const forget = Math.exp(-dt / M.memory);
        for (const id of Object.keys(tr.sold)) { tr.sold[id] *= forget; if (tr.sold[id] < 0.01) delete tr.sold[id]; }
        const forgetMade = Math.exp(-dt / M.supplyMemory);
        for (const id of Object.keys(tr.made)) { tr.made[id] *= forgetMade; if (tr.made[id] < 0.01) delete tr.made[id]; }
        tr.trendT -= dt;
        if (tr.trendT <= 0) {
          tr.trendT = M.trendStep;
          for (const sd of D.SEEDS) {
            const c = cheapness(sd.id);
            let x = (tr.trend[sd.id] || 1) * Math.exp(gauss() * lerp(M.trendVol, c));
            x += (1 - x) * M.trendPull;
            tr.trend[sd.id] = Math.max(M.trendMin, Math.min(lerp(M.trendMax, c), x));
            if (!this.s.seeds[sd.id]) continue;
            // Cours des légumes dorés : plus nerveux, entre ×0.3 et ×4.
            let y = (tr.trend[sd.id + '*'] || 1) * Math.exp(gauss() * M.goldVol);
            y += (1 - y) * M.trendPull;
            tr.trend[sd.id + '*'] = Math.max(M.goldTrend[0], Math.min(M.goldTrend[1], y));
          }
        }
        if (!this.marketOn()) return;
        this.updateFreshness(dt);
        // Chocs : pénuries et krachs.
        for (const k of tr.shocks) k.t -= dt;
        tr.shocks = tr.shocks.filter(k => k.t > 0);
        tr.shockT -= dt;
        if (tr.shockT <= 0) { tr.shockT = rand(M.shockEvery[0], M.shockEvery[1]); this.newShock(); }
        for (const d of tr.demands) d.t -= dt;
        tr.demands = tr.demands.filter(d => d.t > 0 && d.left > 0);
        tr.demandT -= dt;
        if (tr.demandT <= 0) { tr.demandT = rand(M.demandEvery[0], M.demandEvery[1]); if (tr.demands.length < this.demandCap()) this.newDemand(); }
        if (this.lvl('trader')) {
          tr.traderT -= dt;
          if (tr.traderT <= 0) { tr.traderT = Math.max(2, M.traderEvery - this.lvl('trader_vif')); this.traderAct(); }
        }
        if (this.lvl('gestion')) {
          tr.managerT -= dt;
          if (tr.managerT <= 0) { tr.managerT = M.managerEvery; this.managerAct(); }
        }
      },

      // Pénurie (souvent sur un légume bon marché) ou krach (n'importe lequel) sur une graine débloquée.
      newShock() {
        const seeds = D.SEEDS.filter(sd => this.s.seeds[sd.id] && !this.shockFor(sd.id));
        if (!seeds.length) return;
        const shortage = Math.random() < 0.65;
        const weights = seeds.map(sd => shortage ? 0.3 + 3 * cheapness(sd.id) : 1);
        let r = Math.random() * weights.reduce((a, b) => a + b, 0);
        let seed = seeds[0];
        for (let i = 0; i < seeds.length; i++) { r -= weights[i]; if (r <= 0) { seed = seeds[i]; break; } }
        const mult = shortage ? rand(M.shortage[0], M.shortage[1]) * (0.5 + cheapness(seed.id)) : rand(M.crash[0], M.crash[1]);
        const k = { seed: seed.id, mult: Math.max(shortage ? 2 : 0.05, mult), t: rand(M.shockLife[0], M.shockLife[1]), kind: shortage ? 'shortage' : 'crash' };
        this.s.trade.shocks.push(k);
        this.emit('shock', k);
      },

      // Le trader vend dès que le cours dépasse sa cible, quand un lot va pourrir, ou écoule le meilleur produit quand les silos débordent.
      traderAct() {
        const st = this.s.trade.stock;
        const lot = 1 / (1 + this.lvl('trader_lots'));
        const comm = this.traderCommission();
        // Jamais en dessous de ce que rapporterait le marché classique (le surplus y part tout seul)... sauf si ça va pourrir.
        const floor = M.surplus / (1 - comm);
        const fill = this.stockUnits() / Math.max(1, this.siloCapacity());
        const target = Math.max(floor, fill >= M.traderBusy ? M.traderBusyTarget : M.traderTarget);
        let best = null, bestF = 0;
        for (const key of Object.keys(st)) {
          const e = st[key];
          const f = this.priceFactor(e, Math.ceil(e.units * lot)) * e.fresh;
          if (f >= target || (e.fresh < M.traderFresh && !this.lvl('conserverie'))) this.sellStock(key, e.fresh < M.traderFresh ? 1 : lot, comm);
          else if (f > bestF) { bestF = f; best = key; }
        }
        if (best && st[best] && bestF >= floor && this.stockUnits() >= this.siloCapacity() * M.traderFull) this.sellStock(best, lot, comm);
      },

      // Le gestionnaire choisit les deux graines les plus rentables au cours actuel (60 % / 40 %, sous le seuil d'épidémie).
      managerAct() {
        const n = this.activePlots();
        const managed = Math.floor(n * Math.min(1, 0.25 * (1 + this.lvl('gestion_part'))));
        if (!managed) return;
        const traits = this.produceTraits();
        const scored = D.SEEDS.filter(sd => this.s.seeds[sd.id]).map(sd => {
          const d = this.demandFor({ seed: sd.id, traits });
          return { id: sd.id, score: this.seedRate(sd) * this.seedPrice(sd.id) * (d ? d.mult : 1) };
        }).sort((a, b) => b.score - a.score);
        if (!scored.length) return;
        const second = scored[1] || scored[0];
        // Mélange seulement si la 2e graine est presque aussi rentable, ou en Science (risque d'épidémie).
        const mix = this.science() || second.score >= scored[0].score * 0.7;
        const a = scored[0].id, b = mix ? second.id : scored[0].id;
        for (let i = 0; i < managed; i++) this.s.plots[n - 1 - i].seed = i % 5 === 1 || i % 5 === 3 ? b : a;
        this.emit('manager', { a, b });
      },
    });
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = install;
  else (root.FARM_MIXINS = root.FARM_MIXINS || []).push(install);
})(this);

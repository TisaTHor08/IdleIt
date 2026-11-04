// Usine de transformation (à partir de FACTORY.pr renaissances) : les ingrédients des silos partent en machine,
// les produits arrivent au frigo par le tapis, puis se vendent au grossiste (prix fixe) ou au marché (avec le trader).
// Les gamelles des compagnons se cuisinent à partir des produits du frigo.
(function (root) {
  'use strict';

  function install(G, H) {
    const { D, rand, gauss, SEED_BY_ID } = H;
    const F = D.FACTORY;
    const MACHINE_BY_ID = Object.fromEntries(D.MACHINES.map(m => [m.id, m]));
    const RECIPE_BY_ID = Object.fromEntries(D.RECIPES.map(r => [r.id, r]));
    const FROBOT_BY_ID = Object.fromEntries(D.FACTORY_ROBOTS.map(r => [r.id, r]));
    const FOOD_BY_ID = Object.fromEntries(D.PET_FOODS.map(f => [f.id, f]));

    Object.assign(G, {
      factoryOn() { return this.lvl('usine') > 0; },
      factoryUnlocked() { return this.prestiges() >= F.pr; },
      fac() { return this.s.factory; },

      // ---------- Achats ----------
      machineCount(type) { return this.s.factory.machines.filter(m => m.type === type).length; },
      machineCost(type, k = this.machineCount(type)) { const m = MACHINE_BY_ID[type]; return F.base * m.cost * Math.pow(m.g, k) * this.discount(); },
      frobotCost(id, k = this.s.factory.robots[id] || 0) { const r = FROBOT_BY_ID[id]; return F.base * r.cost * Math.pow(r.g, k) * this.discount(); },
      fridgeCost(k = this.s.factory.fridges) { return F.base * F.fridgeCost * Math.pow(F.fridgeG, k) * this.discount(); },
      addMachine(type) { this.s.factory.machines.push({ type, recipe: 'auto', st: 0, t: 0, lot: null }); },
      setMachineRecipe(type, recipe) {
        for (const m of this.s.factory.machines) if (m.type === type) m.recipe = recipe;
        this.emit('factory-recipe', { type, recipe });
      },
      machineRecipe(type) { const m = this.s.factory.machines.find(x => x.type === type); return m ? m.recipe : 'auto'; },

      // ---------- Ingrédients ----------
      // Une entrée du silo convient-elle à cet ingrédient ? (doré = produit à part)
      inputMatches(inp, e) {
        if (inp.seed ? e.seed !== inp.seed : SEED_BY_ID[e.seed].fam !== inp.fam) return false;
        return !!inp.gold === e.traits.includes('dore');
      },
      inputUnits(inp) {
        let n = 0;
        for (const e of Object.values(this.s.trade.stock)) if (this.inputMatches(inp, e)) n += e.units;
        return n;
      },
      lotSize() { return 1 + this.lvl('cuves'); },
      canCook(recipe, lots = this.lotSize()) { return recipe.inputs.every(inp => this.inputUnits(inp) >= inp.n * lots); },
      // Prend les ingrédients dans les silos (les lots les plus anciens d'abord) ; renvoie leur valeur.
      takeInputs(recipe, lots) {
        const st = this.s.trade.stock;
        let worth = 0;
        for (const inp of recipe.inputs) {
          let need = inp.n * lots;
          const keys = Object.keys(st).filter(k => this.inputMatches(inp, st[k])).sort((a, b) => st[a].fresh - st[b].fresh);
          for (const k of keys) {
            if (need <= 0) break;
            const e = st[k], u = Math.min(need, e.units);
            worth += u * e.worth * e.fresh;
            e.units -= u; need -= u;
            if (e.units <= 0) delete st[k];
          }
        }
        return worth;
      },

      // ---------- Vitesses ----------
      machineSpeed(type) { return MACHINE_BY_ID[type].speed * this.fxMul('facSpeed') * (1 + 0.12 * (this.s.factory.robots.cuistot || 0)); },
      beltSpeed() { return F.beltSpeed * (1 + 0.25 * this.lvl('tapis')); },
      loadTime() { return F.loadTime * this.fxMul('facLoad'); },
      productValueMult() { return this.fxMul('facValue') * (1 + 0.08 * (this.s.factory.robots.emballeur || 0)); },
      fridgeCapacity() { return this.s.factory.fridges * F.fridgeCap * (1 + 0.5 * this.lvl('frigo_xxl')); },
      fridgeUnits() { let n = 0; for (const e of Object.values(this.s.factory.stock)) n += e.units; return n; },
      machineX(i) { return F.slot0 + i * F.slotStep; },
      fridgeX() { return this.machineX(this.s.factory.machines.length) + 4; },
      productShelf(rid) { return RECIPE_BY_ID[rid].shelf / this.fxMul('prodSpoil'); },

      // ---------- Cours des produits ----------
      productTrend(rid) { return this.s.factory.trend[rid] || 1; },
      productPrice(rid) {
        const frenzy = this.pm.frenzyFactory && this.frenzy && this.frenzy() ? 2 : 1;
        return this.lvl('trader_usine') ? F.premium * this.productTrend(rid) * frenzy : F.wholesale;
      },
      productWorth(e) { return e.units * e.worth * e.fresh * this.productPrice(e.id); },
      fridgeWorth() { let v = 0; for (const e of Object.values(this.s.factory.stock)) v += this.productWorth(e); return v; },
      // Rentabilité estimée d'une recette ($/s par machine), pour le gestionnaire.
      recipeScore(r) {
        let inWorth = 0;
        for (const inp of r.inputs) {
          const e = Object.values(this.s.trade.stock).find(x => this.inputMatches(inp, x));
          inWorth += inp.n * (e ? e.worth : 0);
        }
        return inWorth * r.mult * this.productTrend(r.id) / r.time;
      },
      recipeOk(r) { return this.eraOk(MACHINE_BY_ID[r.machine]); },

      sellProduct(rid, fraction = 1, commission = 0) {
        const st = this.s.factory.stock, e = st[rid];
        if (!e) return 0;
        const units = fraction >= 1 ? e.units : Math.max(1, Math.floor(e.units * fraction));
        const v = units * e.worth * e.fresh * this.productPrice(rid) * (1 - commission);
        e.units -= units;
        if (e.units <= 0) delete st[rid];
        this.earn(v);
        this.addStat('productsSold', units);
        this.addStat('productValue', v);
        this.emit('product-sale', { id: rid, units, value: v });
        return v;
      },
      sellAllProducts() { let t = 0; for (const k of Object.keys(this.s.factory.stock)) t += this.sellProduct(k, 1); return t; },
      factoryCommission() { return Math.max(0, F.commission - 0.02 * this.lvl('negoce')); },

      // ---------- Nourriture des compagnons ----------
      foodFee(fid) {
        const f = FOOD_BY_ID[fid], e = this.s.factory.stock[f.recipe];
        return F.foodFee * f.units * (e ? e.worth * e.fresh : 0);
      },
      canCraftFood(fid) {
        const f = FOOD_BY_ID[fid], e = this.s.factory.stock[f.recipe];
        return this.lvl('cuisine') > 0 && !!e && e.units >= f.units && this.s.money >= this.foodFee(fid);
      },
      craftFood(fid) {
        if (!this.canCraftFood(fid)) return false;
        const f = FOOD_BY_ID[fid], st = this.s.factory.stock;
        this.s.money -= this.foodFee(fid);
        st[f.recipe].units -= f.units;
        if (st[f.recipe].units <= 0) delete st[f.recipe];
        this.s.pantry[fid] = (this.s.pantry[fid] || 0) + 1;
        this.addStat('foodsCrafted');
        this.emit('food-crafted', { id: fid });
        return true;
      },
      setFoodTarget(fid) { this.s.factory.target = fid; this.emit('food-target', { id: fid }); },

      // ---------- Boucle ----------
      updateFactory(dt) {
        const f = this.s.factory;
        if (!this.factoryOn()) return;
        const st = f.stock;
        // Cours des produits transformés
        f.trendT -= dt;
        if (f.trendT <= 0) {
          f.trendT = F.trendStep;
          for (const r of D.RECIPES) {
            let x = (f.trend[r.id] || 1) * Math.exp(gauss() * F.trendVol);
            x += (1 - x) * F.trendPull;
            f.trend[r.id] = Math.max(F.trendMin, Math.min(F.trendMax, x));
          }
        }
        // Fraîcheur du frigo
        for (const k of Object.keys(st)) {
          const e = st[k];
          e.fresh *= Math.exp(-dt / this.productShelf(k));
          if (e.fresh < F.rotten) { this.addStat('productsRotten', e.units); this.emit('product-rotten', { id: k, units: e.units }); delete st[k]; }
        }
        // Machines : choix de la recette, attente du porteur, cuisson
        const belt = this.belt || (this.belt = []);
        const lots = this.lotSize();
        f.machines.forEach((m, i) => {
          if (m.st === 0 && belt.length < F.beltMax) {
            const r = this.pickRecipe(m, lots);
            if (r) { m.lot = { id: r.id, worth: this.takeInputs(r, lots), lots }; m.st = 1; }
          } else if (m.st === 2) {
            m.t += dt * this.machineSpeed(m.type);
            const r = RECIPE_BY_ID[m.lot.id];
            if (m.t >= r.time) {
              const units = r.out * m.lot.lots;
              belt.push({ x: this.machineX(i), id: r.id, units, worth: m.lot.worth * r.mult * this.productValueMult() / units });
              this.addStat('batches');
              m.st = 0; m.t = 0; m.lot = null;
            }
          }
        });
        this.updatePorters(dt);
        // Tapis : les produits glissent jusqu'au frigo
        const fx = this.fridgeX(), speed = this.beltSpeed();
        for (let k = belt.length - 1; k >= 0; k--) {
          const it = belt[k];
          it.x += speed * dt;
          if (it.x < fx) continue;
          belt.splice(k, 1);
          this.storeProduct(it);
        }
        // Trader et gestionnaire
        if (this.lvl('trader_usine')) { f.traderT -= dt; if (f.traderT <= 0) { f.traderT = F.traderEvery; this.factoryTraderAct(); } }
        if (this.lvl('gestion_usine')) { f.managerT -= dt; if (f.managerT <= 0) { f.managerT = F.managerEvery; this.factoryManagerAct(); } }
      },

      pickRecipe(m, lots) {
        const f = this.s.factory;
        if (m.recipe !== 'auto') { const r = RECIPE_BY_ID[m.recipe]; return r && this.canCook(r, lots) ? r : null; }
        const options = D.RECIPES.filter(r => r.machine === m.type && this.canCook(r, lots));
        if (!options.length) return null;
        // La nourriture visée passe en premier.
        const target = f.target && FOOD_BY_ID[f.target] && RECIPE_BY_ID[FOOD_BY_ID[f.target].recipe];
        if (target && options.includes(target)) return target;
        if (!this.lvl('gestion_usine')) return options[0];
        return options.reduce((a, b) => (this.recipeScore(b) > this.recipeScore(a) ? b : a));
      },

      storeProduct(it) {
        const st = this.s.factory.stock;
        const room = Math.max(0, Math.floor(this.fridgeCapacity() - this.fridgeUnits()));
        const put = Math.min(room, it.units);
        if (put > 0) {
          const e = st[it.id] || (st[it.id] = { id: it.id, units: 0, worth: 0, fresh: 1 });
          e.worth = (e.worth * e.units + it.worth * put) / (e.units + put);
          e.fresh = (e.fresh * e.units + put) / (e.units + put);
          e.units += put;
          this.addStat('productsMade', put);
        }
        const rest = it.units - put;
        if (rest > 0) {
          // Frigo plein : le grossiste prend le reste.
          const v = rest * it.worth * F.wholesale;
          this.earn(v);
          this.addStat('productValue', v);
        }
        this.emit('product', { id: it.id, units: it.units });
      },

      // Porteurs : le manutentionnaire (lent) et les robots porteurs vont du quai à la machine qui attend.
      porterList() {
        const want = 1 + (this.s.factory.robots.porteur || 0);
        const ps = this.porters || (this.porters = []);
        while (ps.length < want) ps.push({ x: F.dockX, task: null, robot: ps.length > 0, dir: 1, anim: 0 });
        ps.length = want;
        return ps;
      },
      updatePorters(dt) {
        const ms = this.s.factory.machines;
        const taken = new Set();
        const ps = this.porterList();
        for (const p of ps) if (p.task) taken.add(p.task.m);
        for (const p of ps) {
          p.anim += dt;
          if (!p.task) {
            const m = ms.findIndex((x, i) => x.st === 1 && !taken.has(i));
            if (m < 0) { p.moving = false; continue; }
            p.task = { m, phase: 0, t: 0 };
            taken.add(m);
          }
          const tk = p.task, mach = ms[tk.m];
          if (!mach || mach.st !== 1) { p.task = null; continue; }
          const target = tk.phase === 0 ? F.dockX : this.machineX(tk.m);
          if (tk.phase < 2) {
            const speed = p.robot ? FROBOT_BY_ID.porteur.walk : F.porterWalk;
            const d = target - p.x;
            p.moving = Math.abs(d) > 0.5;
            p.dir = Math.sign(d) || p.dir;
            p.x += Math.sign(d) * Math.min(Math.abs(d), speed * dt);
            if (!p.moving) { tk.phase++; tk.t = 0; }
            p.carry = tk.phase === 1 ? mach.lot.id : null;
          } else {
            p.moving = false;
            tk.t += dt;
            if (tk.t >= this.loadTime()) { mach.st = 2; mach.t = 0; p.task = null; p.carry = null; }
          }
        }
      },

      factoryTraderAct() {
        const st = this.s.factory.stock;
        const fill = this.fridgeUnits() / Math.max(1, this.fridgeCapacity());
        const comm = this.factoryCommission();
        for (const k of Object.keys(st)) {
          const e = st[k], trend = this.productTrend(k);
          if (trend >= F.traderTarget || fill > 0.9 || e.fresh < 0.35) this.sellProduct(k, fill > 0.9 ? 0.5 : 1, comm);
        }
      },

      // Le gestionnaire d'usine cuisine la gamelle visée dès que possible, et fait planter les ingrédients qui manquent.
      factoryManagerAct() {
        const f = this.s.factory;
        if (f.target && FOOD_BY_ID[f.target] && this.canCraftFood(f.target)) {
          this.craftFood(f.target);
          this.emit('food-target-done', { id: f.target });
          f.target = null;
        }
        if (!this.lvl('coordination') || !this.lvl('gestion')) return;
        // Ingrédients voulus : ceux de la gamelle visée, sinon ceux qui bloquent les machines en « Auto ».
        const want = [];
        const targetR = f.target && FOOD_BY_ID[f.target] && RECIPE_BY_ID[FOOD_BY_ID[f.target].recipe];
        const recipes = targetR ? [targetR] : D.RECIPES.filter(r => f.machines.some(m => m.type === r.machine && m.recipe === 'auto'));
        for (const r of recipes) for (const inp of r.inputs) if (this.inputUnits(inp) < inp.n * this.lotSize() * 3) want.push(inp);
        if (!want.length) return;
        const owned = D.SEEDS.filter(sd => this.s.seeds[sd.id]);
        const seeds = want.map(inp => inp.seed ? (this.s.seeds[inp.seed] ? inp.seed : null) : (owned.filter(sd => sd.fam === inp.fam).pop() || {}).id).filter(Boolean);
        if (!seeds.length) return;
        // Les parcelles juste avant celles du gestionnaire de champ.
        const n = this.activePlots();
        const field = Math.floor(n * Math.min(1, 0.25 * (1 + this.lvl('gestion_part'))));
        const k = Math.floor(n * 0.08 * this.lvl('coordination'));
        for (let j = 0; j < k; j++) {
          const i = n - 1 - field - j;
          if (i < 0) break;
          this.s.plots[i].seed = seeds[j % seeds.length];
        }
        this.emit('factory-manager', { seeds });
      },
    });
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = install;
  else (root.FARM_MIXINS = root.FARM_MIXINS || []).push(install);
})(this);

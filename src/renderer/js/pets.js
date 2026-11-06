// Compagnons : plusieurs emplacements (1 + 1 par renaissance), chacun avec son arbre, sa voie, sa maîtrise.
// Les effets de tous les compagnons sont combinés dans game.pm ; les effets « de terrain » (aura, cri, ver, perchoir...)
// restent propres à chaque compagnon (game.petRt[uid]).
(function (root) {
  'use strict';

  // Règles de combinaison des modificateurs de plusieurs compagnons.
  const MULT = ['nightSpeed', 'farmerSpeed', 'robotSpeed', 'farmerHarvest', 'goldenMult', 'frenzyFreq', 'cartMult', 'irrigGrowth',
    'fastGrowth', 'slowGrowth', 'valueAll', 'chargeMult', 'batteryDrain', 'crowMult', 'growthAll', 'stormMult', 'evapAll', 'petXpMult'];
  const ADD = { nightRelief: 1, clickBoost: Infinity, golden: Infinity, double: 0.9, nothing: 0.9, irrigateExtra: Infinity, headStart: 0.9, ripenStar: 1 };
  const OR = ['noCrows', 'autoCart', 'noCart', 'farmerNoSleep', 'noPests', 'noSolar', 'chaseBoar', 'guardSilo', 'perch', 'noTourists', 'frenzyFactory'];

  function install(G, H) {
    const { D, LAYOUT, plotX, rand, SEED_BY_ID } = H;
    const PET_BY_ID = H.PET_BY_ID;
    const MASTERY_BY_ID = Object.fromEntries(D.MASTERY.map(m => [m.id, m]));
    const FOOD_BY_ID = Object.fromEntries(D.PET_FOODS.map(f => [f.id, f]));

    Object.assign(G, {
      // ---------- Emplacements ----------
      // 1 + 1 par renaissance ; une sauvegarde éditée peut en avoir plus : on les montre tous.
      petSlots() { return Math.max(this.s.pets.list.length, D.PRESTIGE.petSlotAt.filter(p => p <= (this.s.stats.prestiges || 0)).length); },
      // Renaissance qui donne le prochain emplacement (null s'il n'y en a plus).
      nextPetSlotAt() { const p = this.s.stats.prestiges || 0; const n = D.PRESTIGE.petSlotAt.find(x => x > p); return n == null ? null : n; },
      petList() { return this.s.pets.list; },
      petByUid(uid) { return this.s.pets.list.find(p => p.uid === uid) || null; },
      petCost(id) { return PET_BY_ID[id].cost * this.fxMul('petCost'); },

      // Adopte un compagnon dans un emplacement (libre, ou en remplaçant celui qui y est : sa progression est perdue).
      adoptPet(id, slot = this.s.pets.list.length) {
        const def = PET_BY_ID[id];
        const cost = def ? this.petCost(id) : Infinity;
        if (!def || !this.eraOk(def) || slot >= this.petSlots() || slot > this.s.pets.list.length || this.s.money < cost) return false;
        this.s.money -= cost;
        const pet = { uid: this.s.pets.nextUid++, id, xp: 0, nodes: {}, path: null, mastery: {}, food: null };
        const old = this.s.pets.list[slot];
        if (old && old.food && !(FOOD_BY_ID[old.food] && FOOD_BY_ID[old.food].lost)) this.s.pantry[old.food] = (this.s.pantry[old.food] || 0) + 1;
        if (slot < this.s.pets.list.length) this.s.pets.list[slot] = pet; else this.s.pets.list.push(pet);
        this.s.pets.seen[id] = true;
        this.refreshPet();
        this.emit('pet-adopt', { id, uid: pet.uid });
        return true;
      },

      // ---------- Niveaux ----------
      petXpFor(level) {
        const L = D.PET_LEVEL;
        return level < L.max ? L.base * Math.pow(L.g, level) : L.masteryBase * Math.pow(L.masteryG, level - L.max);
      },
      petProgress(pet) {
        const L = D.PET_LEVEL, top = L.max + (pet && pet.path ? L.masteryMax : 0);
        let level = 0, xp = pet ? pet.xp : 0;
        while (level < top && xp >= this.petXpFor(level)) { xp -= this.petXpFor(level); level++; }
        return { level, xp, need: level < top ? this.petXpFor(level) : 0, top };
      },
      petLevel(pet) { return this.petProgress(pet).level; },
      petNode(pet, node) { return pet ? (pet.nodes[node] || pet.mastery[node] || 0) : 0; },
      petSpent(pet) { return PET_BY_ID[pet.id].nodes.reduce((a, n) => a + (pet.nodes[n.id] || 0) * n.cost, 0); },
      petPoints(pet) { return Math.min(D.PET_LEVEL.max, this.petLevel(pet)) - this.petSpent(pet); },
      masteryPoints(pet) {
        if (!pet.path) return 0;
        const spent = D.MASTERY.reduce((a, m) => a + (pet.mastery[m.id] || 0) * m.cost, 0);
        return Math.max(0, this.petLevel(pet) - D.PET_LEVEL.max) - spent;
      },
      petEvolved(pet) { return !!pet && PET_BY_ID[pet.id].nodes.some(n => n.evo && pet.nodes[n.id] > 0); },
      anyPetEvolved() { return this.s.pets.list.some(p => this.petEvolved(p)); },
      petPath(pet) { return pet && pet.path ? PET_BY_ID[pet.id].paths.find(x => x.id === pet.path) || null : null; },
      // Apparence pour le rendu : 'base', 'evo' ou l'id de la voie.
      petLook(pet) { const p = this.petPath(pet); return p ? p.id : this.petEvolved(pet) ? 'evo' : 'base'; },
      petName(pet) { const def = PET_BY_ID[pet.id]; const p = this.petPath(pet); return p ? p.name : this.petEvolved(pet) ? def.evoName : def.name; },

      petNodeState(pet, nodeId) {
        const node = PET_BY_ID[pet.id].nodes.find(n => n.id === nodeId);
        const level = pet.nodes[nodeId] || 0;
        const reqOk = Object.entries(node.req || {}).every(([k, v]) => (pet.nodes[k] || 0) >= v);
        return { node, level, maxed: level >= node.max, reqOk, affordable: this.petPoints(pet) >= node.cost };
      },
      buyPetNode(pet, nodeId) {
        const st = this.petNodeState(pet, nodeId);
        if (st.maxed || !st.reqOk || !st.affordable) return false;
        pet.nodes[nodeId] = st.level + 1;
        if (st.node.evo) { this.addStat('evolutions'); this.emit('pet-evo', { id: pet.id, uid: pet.uid }); }
        this.refreshPet();
        return true;
      },
      buyMastery(pet, mId) {
        const m = MASTERY_BY_ID[mId];
        const lvl = pet.mastery[mId] || 0;
        if (!m || !pet.path || lvl >= m.max || this.masteryPoints(pet) < m.cost) return false;
        pet.mastery[mId] = lvl + 1;
        this.refreshPet();
        return true;
      },
      canChoosePath(pet) { return !!pet && !pet.path && this.petEvolved(pet) && this.petLevel(pet) >= D.PET_LEVEL.max; },
      choosePath(pet, pathId) {
        if (!this.canChoosePath(pet) || !PET_BY_ID[pet.id].paths.some(x => x.id === pathId)) return false;
        pet.path = pathId;
        this.addStat('paths');
        if (this.petRt[pet.uid]) this.petRt[pet.uid].fxT = {};
        this.refreshPet();
        this.emit('pet-path', { id: pet.id, uid: pet.uid, path: pathId });
        return true;
      },

      // ---------- Modificateurs ----------
      petMods(pet) {
        const def = PET_BY_ID[pet.id];
        const L = n => this.petNode(pet, n);
        const pm = { ...D.PET_MOD_DEFAULTS, ...def.mods(L, this.petEvolved(pet)) };
        const path = this.petPath(pet);
        if (path) Object.assign(pm, path.mods(L, { ...pm }));
        const food = this.foodEffect(pet);
        if (food) Object.assign(pm, food.mods({ ...pm }));
        return pm;
      },

      // ---------- Nourriture ----------
      // Effet d'une gamelle sur ce compagnon : celui de sa voie, sinon de son espèce, sinon l'effet général.
      foodEffectFor(pet, foodId) { return FOOD_BY_ID[foodId] ? D.foodEffect(pet.id, pet.path, foodId) : null; },
      foodEffect(pet) { return pet && pet.food ? this.foodEffectFor(pet, pet.food) : null; },
      // Costume : la saison de sa gamelle de saison, si elle a un effet spécial pour lui (sinon null).
      petSkin(pet) {
        const f = pet && pet.food && FOOD_BY_ID[pet.food];
        if (!f || !f.season) return null;
        const e = this.foodEffectFor(pet, pet.food);
        return e && e.special ? f.season : null;
      },
      // Donne une gamelle du placard (celle qu'il avait déjà y retourne), ou la retire (foodId = null).
      equipFood(pet, foodId) {
        if (!pet) return false;
        if (foodId && !(this.s.pantry[foodId] > 0)) return false;
        // Une gamelle de saison retirée est perdue ; les autres reviennent au placard.
        if (pet.food && FOOD_BY_ID[pet.food] && FOOD_BY_ID[pet.food].lost) this.emit('food-lost', { id: pet.food });
        else if (pet.food) this.s.pantry[pet.food] = (this.s.pantry[pet.food] || 0) + 1;
        pet.food = null;
        if (foodId) { this.s.pantry[foodId]--; pet.food = foodId; this.addStat('petMeals'); }
        this.refreshPet();
        this.emit('pet-food', { uid: pet.uid, food: foodId });
        return true;
      },

      // Recalcule tout après un changement de compagnon, d'arbre, de voie ou de maîtrise.
      refreshPet() {
        const rt = this.petRt || (this.petRt = {});
        const alive = new Set();
        const pm = { ...D.PET_MOD_DEFAULTS, crowHunter: null, honey: null, gem: null };
        const start = this.workers.length ? this.workers[0].x : LAYOUT.BARN_W;
        for (const pet of this.s.pets.list) {
          alive.add(pet.uid);
          const r = rt[pet.uid] || (rt[pet.uid] = { ents: [], fxT: {}, honeyT: 0 });
          r.pm = this.petMods(pet);
          r.look = this.petLook(pet);
          const p = r.pm;
          for (const k of MULT) pm[k] *= p[k];
          for (const [k, cap] of Object.entries(ADD)) pm[k] = Math.min(cap, pm[k] + p[k]);
          for (const k of OR) pm[k] = pm[k] || p[k];
          if (p.crowHunter && (!pm.crowHunter || p.crowHunter.delay < pm.crowHunter.delay)) pm.crowHunter = { delay: p.crowHunter.delay, reward: Math.max(p.crowHunter.reward, pm.crowHunter ? pm.crowHunter.reward : 0) };
          if (p.honey) pm.honey = { every: 60, secs: (pm.honey ? pm.honey.secs : 0) + p.honey.secs * p.honey.every / 60 };
          if (p.gem) pm.gem = { chance: Math.min(0.5, (pm.gem ? pm.gem.chance : 0) + p.gem.chance), mult: Math.max(pm.gem ? pm.gem.mult : 0, p.gem.mult) };
          // Entités dans le champ (le compagnon et ses poussins ; aucune s'il travaille comme ouvrier).
          const want = p.petWorker ? 0 : 1 + p.chicks + (pet.id === 'poussin' ? this.seasonChicks() : 0);
          while (r.ents.length < want) {
            const main = !r.ents.length;
            r.ents.push({ kind: main ? 'pet' : 'chick', x: start + rand(-6, 6), tx: start, dir: 1, pause: rand(0, 2), anim: Math.random() * 5 });
          }
          r.ents.length = want;
        }
        for (const uid of Object.keys(rt)) if (!alive.has(+uid)) delete rt[uid];
        this.applySeasonMods(pm);
        this.pm = pm;
        this.syncWorkers();
      },

      // Ouvriers-compagnons voulus (chien de berger et sa meute), lus par syncWorkers.
      petWorkerDefs() {
        const out = [];
        for (const pet of this.s.pets.list) {
          const r = this.petRt && this.petRt[pet.uid];
          if (!r || !r.pm.petWorker) continue;
          for (let k = 0; k < r.pm.petWorkerCount; k++) out.push({ kind: `pet:${pet.uid}:${k}`, def: { ...r.pm.petWorker, pack: k > 0, petId: pet.id, petUid: pet.uid, look: r.look, skin: this.petSkin(pet) } });
        }
        return out;
      },

      allPetEnts() {
        const out = [];
        for (const r of Object.values(this.petRt || {})) out.push(...r.ents);
        return out;
      },

      // Aura combinée des compagnons au-dessus d'une parcelle (null si aucune).
      auraAt(i) {
        let a = null;
        const x = plotX(i);
        for (const r of Object.values(this.petRt || {})) {
          const au = r.pm.aura;
          if (!au || !r.ents.some(e => Math.abs(e.x - x) <= au.radius)) continue;
          a = a || { mult: 1, value: 1, evap: 1, noNight: false, wet: false };
          a.mult *= au.mult; a.value *= au.value; a.evap *= au.evap; a.noNight = a.noNight || r.pm.auraNoNight; a.wet = a.wet || !!au.wet;
        }
        return a;
      },
      inAura(i) { return !!this.auraAt(i); },

      petXp(n) {
        const mult = this.fxMul('petXp') * this.pm.petXpMult;
        for (const pet of this.s.pets.list) {
          const before = this.petLevel(pet);
          pet.xp += n * mult;
          const after = this.petLevel(pet);
          if (after > before) {
            if (after >= D.PET_LEVEL.max + D.PET_LEVEL.masteryMax) this.addStat('masterPets');
            this.emit('pet-level', { id: pet.id, uid: pet.uid, level: after, mastery: after > D.PET_LEVEL.max });
          }
        }
      },

      petClick(uid) {
        if (!this.s.pets.list.length || this.petLoveT > 0) return;
        this.petLoveT = 0.4;
        const pet = this.petByUid(uid) || this.s.pets.list[0];
        const before = this.petLevel(pet);
        pet.xp += D.PET_LEVEL.perPet * this.fxMul('petXp');
        if (this.petLevel(pet) > before) this.emit('pet-level', { id: pet.id, uid: pet.uid, level: this.petLevel(pet) });
        this.addStat('petting');
        const r = this.petRt[pet.uid];
        const w = this.workers.find(x => x.def.petUid === pet.uid);
        this.emit('pet-love', { x: w ? w.x : r && r.ents.length ? r.ents[0].x : 0 });
      },

      huntCrow(c, rewardFrac) {
        c.state = 'leave';
        const reward = Math.max(5, this.harvestRate() * 15) * this.eventMult() * rewardFrac;
        this.earn(reward);
        this.addStat('crows');
        const hunter = Object.values(this.petRt || {}).find(r => r.pm.crowHunter && r.ents.length);
        if (hunter) hunter.ents[0].tx = c.x;
        this.emit('crow-scared', { x: c.x, value: reward, pet: true });
      },

      // ---------- Effets de terrain ----------
      updatePathEffects(r, dt) {
        const pm = r.pm, fx = r.fxT;
        const n = this.activePlots();
        const tick = (k, every) => { fx[k] = (fx[k] || 0) + dt; if (fx[k] >= every) { fx[k] = 0; return true; } return false; };
        const main = r.ents[0];

        if (pm.cry && main && tick('cry', pm.cry.every)) {
          const at = Math.round((main.x - plotX(0)) / LAYOUT.PLOT_STEP);
          const b = pm.cry.block;
          let blocked = false;
          if (b) for (let i = Math.max(0, at - b.radius); i <= Math.min(n - 1, at + b.radius); i++) {
            const c = this.s.plots[i].crop;
            if (c && c.id === b.seed) blocked = true;
          }
          if (blocked) this.emit('cry-blocked', { x: main.x });
          else {
            for (let i = 0; i < n; i++) {
              const c = this.s.plots[i].crop;
              if (c && c.p < 1 && !c.pest) { c.p = Math.min(1, c.p + pm.cry.boost); if (c.p >= 1) this.ripen(i); }
            }
            for (const w of this.workers) if (this.usesBattery(w)) w.frozenT = pm.cry.freeze * this.fxMul('frozen');
            if (pm.cry.star) this.makeStars(pm.cry.star);
            this.emit('cry', { x: main.x });
          }
        }

        if (pm.ripenEvery && main && tick('ripen', pm.ripenEvery)) {
          const growing = [];
          for (let i = 0; i < n; i++) { const c = this.s.plots[i].crop; if (c && c.p < 1 && !c.pest) growing.push(i); }
          if (growing.length) {
            const i = growing[Math.floor(Math.random() * growing.length)];
            this.s.plots[i].crop.p = 1;
            this.ripen(i);
            if (Math.random() < pm.ripenStar) { this.s.plots[i].crop.star = true; this.emit('star', { plot: i }); }
            main.x = main.tx = plotX(i); main.pause = 3;
            this.emit('cheshire', { plot: i });
          }
        }

        if (pm.worm && main && pm.worm.sweep && tick('worm', pm.worm.every) && n) {
          // Ver cosmique : il traverse tout le champ sans rien manger.
          for (let i = 0; i < n; i++) {
            const c = this.s.plots[i].crop;
            if (!c) continue;
            if (c.p < 1) { c.p = 1; c.pest = 0; this.ripen(i); }
            if (Math.random() < (pm.worm.star || 0)) c.star = true;
            if (pm.worm.giant && !c.mutant) c.mutant = 'giant';
          }
          this.emit('worm-sweep', { from: plotX(0), to: plotX(n - 1) });
        } else if (pm.worm && main && tick('worm', pm.worm.every) && n) {
          const at = Math.floor(Math.random() * n);
          for (let i = Math.max(0, at - pm.worm.radius); i <= Math.min(n - 1, at + pm.worm.radius); i++) {
            const pl = this.s.plots[i];
            if (i === at && !pm.worm.noEat) { if (pl.crop) { pl.crop = null; this.addStat('plantsLost'); } continue; }
            if (pl.crop && pl.crop.p < 1) { pl.crop.p = 1; pl.crop.pest = 0; this.ripen(i); if (pm.worm.giant && !pl.crop.mutant) pl.crop.mutant = 'giant'; }
          }
          main.x = main.tx = plotX(at); main.pause = 3;
          this.emit('worm', { plot: at });
        }

        if (pm.powers) pm.powers.forEach((pw, k) => { if (tick('pw' + k, pw.every)) this.petPower(pw, r, main); });

        if (pm.autoCart && this.cart && !this.cart.done && tick('cart', 2)) {
          if (main) { main.x = main.tx = this.cart.x; main.pause = 2; }
          this.clickCart();
        }

        // Le rapace se perche sur un robot au hasard quand il n'a rien à chasser.
        if (pm.perch && main) {
          const robots = this.workers.filter(w => this.usesBattery(w) && w.state !== 'charge' && w.state !== 'queue' && !this.perchIds.has(w.id));
          const hunting = this.crows.some(c => c.state !== 'leave');
          if (!hunting && robots.length) {
            if (!main.perchOn || !robots.some(w => w.id === main.perchOn) || tick('perch', 25)) main.perchOn = robots[Math.floor(Math.random() * robots.length)].id;
            const w = robots.find(x => x.id === main.perchOn);
            main.x = main.tx = w.x; main.dir = w.dir; main.moving = false; main.perched = true;
            this.perchIds.add(w.id);
          } else { main.perchOn = 0; main.perched = false; }
        }
      },

      updatePets(dt) {
        if (this.petLoveT > 0) this.petLoveT -= dt;
        this.perchIds = new Set();
        if (!this.s.pets.list.length) return;
        this.petXp(dt);
        const right = plotX(Math.max(0, this.activePlots() - 1)) + 6;
        const farmer = this.workers[0];
        for (const pet of this.s.pets.list) {
          const r = this.petRt[pet.uid];
          if (!r) continue;
          this.updatePathEffects(r, dt);
          const move = r.pm.move;
          // Costume de saison : sa propre allure (traîneau qui file, fantôme qui flâne...).
          const skinSpeed = { noel: 1.8, halloween: 0.7, fete_musique: 1.2, paques: 1.3, nouvel_an_chinois: 1.4 }[this.petSkin(pet)] || 1;
          r.ents.forEach((e, k) => {
            e.anim += dt;
            if (e.perched) return;
            let speed = (move === 'dig' ? 5 : move === 'fly' ? 14 : 9) * skinSpeed;
            if (move === 'farmer' && k === 0 && farmer) {
              const want = farmer.x - farmer.dir * 7;
              if (Math.abs(want - e.x) > 4) { e.tx = want; speed = Math.max(10, this.walkSpeed(farmer) * 1.2); }
            }
            const dx = e.tx - e.x;
            if (Math.abs(dx) <= speed * dt) {
              e.x = e.tx;
              e.moving = false;
              e.pause -= dt;
              if (e.pause <= 0) {
                e.pause = rand(1.5, 5);
                const t = e.kind === 'chick' ? r.ents[0].x + rand(-18, 18) : rand(LAYOUT.BARN_W, right);
                e.tx = Math.max(2, Math.min(right, t));
              }
            } else { e.x += Math.sign(dx) * speed * dt; e.dir = Math.sign(dx); e.moving = true; }
          });
        }
        // Miel : combiné entre toutes les abeilles.
        const h = this.pm.honey;
        if (h) {
          this.honeyT = (this.honeyT || 0) + dt;
          if (this.honeyT >= h.every) {
            this.honeyT = 0;
            const v = Math.max(10, this.harvestRate() * h.secs);
            this.earn(v);
            this.emit('honey', { value: v });
          }
        }
      },

      // Plantes au hasard (filtre optionnel).
      randomCrops(k, ok = () => true) {
        const pool = [];
        for (let i = 0; i < this.activePlots(); i++) { const c = this.s.plots[i].crop; if (c && ok(c, i)) pool.push(i); }
        for (let j = pool.length - 1; j > 0; j--) { const m = Math.floor(Math.random() * (j + 1)); [pool[j], pool[m]] = [pool[m], pool[j]]; }
        return pool.slice(0, k);
      },
      makeStars(k) { for (const i of this.randomCrops(k, c => !c.star)) { this.s.plots[i].crop.star = true; this.emit('star', { plot: i }); } },

      // Pouvoirs donnés par la nourriture (voir PET_FOODS dans data.js).
      petPower(pw, r, main) {
        const n = this.activePlots();
        const near = i => !pw.aura || !main || Math.abs(plotX(i) - main.x) <= (pw.radius || (r.pm.aura ? r.pm.aura.radius : 20));
        const crop = i => this.s.plots[i].crop;
        switch (pw.kind) {
          case 'rain': case 'storm': {
            const w = pw.kind === 'rain' ? 'pluie' : 'orage';
            if (this.s.clock.weather !== 'orage') { this.s.clock.weather = w; this.s.clock.weatherT = pw.dur || 30; this.emit('weather', { id: w }); }
            break;
          }
          case 'star': this.makeStars(pw.n || 1); break;
          case 'gold':
            for (const i of this.randomCrops(pw.n || 1, (c, i) => !c.gold && near(i))) {
              const c = crop(i);
              c.gold = true;
              if (pw.ripen && c.p < 1) c.p = 1;
              this.emit('golden', { plot: i });
            }
            break;
          case 'ripen':
            for (const i of this.randomCrops(pw.n || 1, (c, i) => c.p < 1 && !c.pest && near(i))) { crop(i).p = 1; this.ripen(i); }
            break;
          case 'boost':
            for (let i = 0; i < n; i++) { const c = crop(i); if (c && c.p < 1 && !c.pest) { c.p = Math.min(1, c.p + pw.n); if (c.p >= 1) this.ripen(i); } }
            break;
          case 'harvestAura': {
            const R = pw.radius || 30;
            for (let i = 0; i < n; i++) {
              const c = crop(i);
              if (!c || c.p < 1 || this.infiniWaits(c) || c.caught) continue;
              if (pw.fam && SEED_BY_ID[c.id].fam !== pw.fam) continue;
              if (!pw.all && main && Math.abs(plotX(i) - main.x) > R) continue;
              this.harvest(i, 'pet');
            }
            break;
          }
          case 'plant': for (let i = 0; i < n; i++) if (!crop(i)) this.plant(i); break;
          case 'water': for (let i = 0; i < n; i++) this.s.plots[i].moist = 1; break;
          case 'energize':
            for (const i of this.randomCrops(pw.n || 1, c => c.p >= 1 && !(c.energized > 0))) crop(i).energized = D.STORM.energyTime;
            break;
          case 'giant': for (const i of this.randomCrops(pw.n || 1, c => !c.mutant && c.p < 1)) crop(i).mutant = 'giant'; break;
          case 'cart': if (!this.cart && !this.pm.noCart) { this.cart = { x: plotX(n) + 30, speed: 10, done: false, anim: 0 }; this.emit('cart-arrive'); } break;
          case 'frenzy': if (!(this.s.clock.frenzyT > 0)) { this.s.clock.frenzyT = 45; this.emit('frenzy', { dur: 45 }); } break;
          case 'event': if (this.startEvent) this.startEvent(pw.ev); break;
          case 'money': { const v = Math.max(50, this.harvestRate() * (pw.secs || 60)) * this.rewardMult(); this.earn(v); this.emit('season-money', { value: v }); break; }
          case 'crowGold': {
            for (const c of this.crows) {
              if (c.state === 'leave') continue;
              c.state = 'leave';
              const [i] = this.randomCrops(1, x => !x.gold);
              if (i != null) { crop(i).gold = true; this.emit('golden', { plot: i }); }
              this.addStat('crows');
            }
            break;
          }
        }
        this.emit('pet-power', { kind: pw.kind, x: main ? main.x : 0 });
      },

      // Renaissance : on garde les animaux (et les emplacements), mais ils reviennent au niveau 0.
      resetPetsForPrestige() {
        for (const pet of this.s.pets.list) { pet.xp = 0; pet.nodes = {}; pet.path = null; pet.mastery = {}; } // la gamelle reste équipée
        this.petRt = {};
      },
    });
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = install;
  else (root.FARM_MIXINS = root.FARM_MIXINS || []).push(install);
})(this);

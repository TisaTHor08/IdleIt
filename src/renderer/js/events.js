// Événements aléatoires (sanglier, sauterelles, étoile filante, foire, voleur, tornade...) et effets des météos spéciales
// (gel, brouillard, vent). Tout ce qui bouge à l'écran vit dans game.ev (non sauvegardé : les événements sont courts).
(function (root) {
  'use strict';

  function install(G, H) {
    const { D, LAYOUT, plotX, rand } = H;
    const X = D.EVENT_FX;
    const plotAt = x => Math.round((x - plotX(0)) / LAYOUT.PLOT_STEP);

    Object.assign(G, {
      evState() { return this.ev || (this.ev = { boar: null, swarm: null, thief: null, judge: null, tornado: null, geese: null, timers: {} }); },
      evTimer(k) { return this.evState().timers[k] || 0; },
      evActive(k) { return this.evTimer(k) > 0; },

      // Conditions d'apparition des événements.
      eventAllowed(id) {
        const c = this.s.clock, w = this.weather();
        if (id === 'touristes' && this.pm.noTourists) return false;
        if (D.EVENTS[id].season && D.EVENTS[id].season !== this.seasonId) return false;
        switch (D.EVENTS[id].when) {
          case 'night': return this.isNight();
          case 'day': return !this.isNight();
          case 'hot': return !this.isNight() && (c.weather === 'canicule' || c.weather === 'soleil');
          case 'afterRain': return !w.rain && (c.sinceRain || Infinity) < 180;
          case 'afterStorm': return (c.sinceStorm || Infinity) < 120;
          case 'nightStock': return this.isNight() && this.marketOn() && this.stockUnits() > 0;
          case 'windy': return !!w.wind || !!w.storm;
          default: return true;
        }
      },
      eventWeight(id) {
        const e = D.EVENTS[id];
        let w = e.w * this.fxMul('event', { ev: id });
        if (e.good) w *= this.fxMul('event', { ev: 'good' });
        return w;
      },

      // Déclenche un événement (aussi utilisé par les tests et la démo).
      startEvent(id) {
        const ev = this.evState(), n = this.activePlots();
        const right = plotX(Math.max(0, n - 1)) + 30;
        const E = D.EVENTS[id];
        switch (id) {
          case 'sanglier': if (ev.boar) return false; ev.boar = { x: right, speed: 24, anim: 0, last: -1, scared: false, t: 0 }; break;
          case 'sauterelles': {
            if (ev.swarm || !n) return false;
            const at = Math.floor(Math.random() * n);
            ev.swarm = { x: plotX(at), plot: at, radius: 3, t: 30, anim: 0, bite: 0 };
            break;
          }
          case 'etoile': {
            const crops = [];
            for (let i = 0; i < n; i++) if (this.s.plots[i].crop && !this.s.plots[i].crop.star) crops.push(i);
            if (!crops.length) return false;
            const i = crops[Math.floor(Math.random() * crops.length)];
            this.s.plots[i].crop.star = true;
            this.emit('star', { plot: i });
            break;
          }
          case 'arcenciel': ev.timers.rainbow = E.dur; break;
          case 'eclipse': ev.timers.eclipse = E.dur; break;
          case 'comete': {
            // Jusqu'à l'aube (phase 0.22 du jour).
            const p = this.dayPhase();
            ev.timers.comet = ((p < 0.22 ? 0.22 - p : 1.22 - p) * D.DAY_LEN) / Math.max(1, this.pm.nightSpeed);
            break;
          }
          case 'foire': ev.timers.fair = E.dur; ev.judge = { x: -10, tx: right - 30, anim: 0 }; break;
          case 'voleur': if (ev.thief) return false; ev.thief = { x: right + 40, anim: 0, t: 0 }; break;
          case 'tornade': if (ev.tornado) return false; ev.tornado = { x: right + 20, anim: 0, hit: {} }; break;
          case 'panne': ev.timers.outage = E.dur; break;
          case 'oies': ev.geese = { x: right + 20, anim: 0, done: {} }; break;
          case 'touristes': ev.timers.tourists = E.dur; break;
          case 'champignons_sauvages': {
            const empty = [];
            for (let i = 0; i < n; i++) if (!this.s.plots[i].crop) empty.push(i);
            if (!empty.length) return false;
            for (let k = 0; k < Math.min(4, empty.length); k++) {
              const i = empty.splice(Math.floor(Math.random() * empty.length), 1)[0];
              this.s.plots[i].crop = { id: 'champignon', p: 0.3, gold: false, pest: 0, wild: true };
            }
            break;
          }
          default:
            // Événements de saison : une suite de pouvoirs.
            if (!E.powers) return false;
            for (const pw of E.powers) this.petPower({ every: 1, ...pw }, { pm: {} }, null);
        }
        this.addStat('events');
        this.emit('event', { id });
        return true;
      },

      updateRandomEvents(dt) {
        const c = this.s.clock, ev = this.evState();
        for (const k of Object.keys(ev.timers)) { ev.timers[k] -= dt; if (ev.timers[k] <= 0) { delete ev.timers[k]; this.endTimedEvent(k); } }
        c.nextEvent = (c.nextEvent == null ? rand(D.EVENTS_EVERY[0], D.EVENTS_EVERY[1]) : c.nextEvent) - dt;
        if (c.nextEvent <= 0) {
          c.nextEvent = rand(D.EVENTS_EVERY[0], D.EVENTS_EVERY[1]);
          const pool = Object.keys(D.EVENTS).filter(id => this.eventAllowed(id));
          const weights = pool.map(id => this.eventWeight(id));
          let r = Math.random() * weights.reduce((a, b) => a + b, 0);
          for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) { this.startEvent(pool[i]); break; } }
        }
        this.updateBoar(dt);
        this.updateSwarm(dt);
        this.updateThief(dt);
        this.updateTornado(dt);
        this.updateGeese(dt);
        this.updateJudge(dt);
        if (this.evActive('tourists')) this.updateTourists(dt);
      },

      endTimedEvent(k) {
        if (k === 'fair') this.judgeFair();
        this.emit('event-end', { id: k });
      },

      rewardMult() { return this.eventMult() * Math.pow(1.5, this.perk('chasseur')); },

      // ---------- Sanglier ----------
      updateBoar(dt) {
        const b = this.evState().boar;
        if (!b) return;
        b.anim += dt; b.t += dt;
        b.x -= (b.scared ? 60 : b.speed) * dt;
        // Le chien (ou le rapace) le chasse au bout de 3 s.
        if (!b.scared && this.pm.chaseBoar && b.t > 3) this.scareBoar(true);
        const at = plotAt(b.x);
        if (!b.scared && at !== b.last && at >= 0 && at < this.activePlots()) {
          b.last = at;
          const pl = this.s.plots[at];
          if (pl.crop && Math.random() < X.boarTrample * this.fxMul('event', { ev: 'sanglier' })) {
            pl.crop = null; this.addStat('plantsLost'); this.emit('trampled', { plot: at });
          }
        }
        if (b.x < -20) this.evState().boar = null;
      },
      scareBoar(byPet) {
        const b = this.evState().boar;
        if (!b || b.scared) return;
        b.scared = true;
        const v = Math.max(20, this.harvestRate() * 20) * this.rewardMult() * (byPet ? 0.5 : 1);
        this.earn(v);
        this.addStat('boars');
        this.emit('boar-scared', { x: b.x, value: v });
      },

      // ---------- Sauterelles ----------
      updateSwarm(dt) {
        const s = this.evState().swarm;
        if (!s) return;
        s.anim += dt; s.t -= dt; s.bite += dt;
        if (this.pm.noPests && s.t < 27) { this.disperseSwarm(true); return; }
        if (s.bite >= 1) {
          s.bite = 0;
          const pest = this.fxMul('event', { ev: 'sauterelles' }) * Math.pow(0.75, this.tal('pesticides'));
          for (let i = Math.max(0, s.plot - s.radius); i <= Math.min(this.activePlots() - 1, s.plot + s.radius); i++) {
            const c = this.s.plots[i].crop;
            if (!c) continue;
            const fam = H.SEED_BY_ID[c.id].fam;
            if (fam !== 'feuille' && fam !== 'fleur' && fam !== 'cereale') continue;
            c.p -= X.locustEat * 3 * pest;
            if (c.p <= 0) { this.s.plots[i].crop = null; this.addStat('plantsLost'); }
          }
        }
        if (s.t <= 0) this.evState().swarm = null;
      },
      disperseSwarm(byPet) {
        const s = this.evState().swarm;
        if (!s) return;
        this.evState().swarm = null;
        this.addStat('locusts');
        const v = byPet ? 0 : Math.max(10, this.harvestRate() * 10) * this.rewardMult();
        if (v) this.earn(v);
        this.emit('swarm-gone', { x: s.x, value: v });
      },

      // ---------- Voleur ----------
      updateThief(dt) {
        const th = this.evState().thief;
        if (!th) return;
        th.anim += dt; th.t += dt;
        const target = this.siloX0 ? this.siloX0() : plotX(this.activePlots()) + 6;
        if (th.fleeing) { th.x += 50 * dt; if (th.x > target + 200) this.evState().thief = null; return; }
        if (this.lvl('cadenas') || this.pm.guardSilo) {
          if (th.t > 3) { th.fleeing = true; this.emit('thief-blocked', { x: th.x }); }
          return;
        }
        th.x -= 9 * dt;
        if (th.x <= target + 4) {
          let stolen = 0;
          for (const e of Object.values(this.s.trade.stock)) { const u = Math.floor(e.units * X.thiefSteal); e.units -= u; stolen += u; }
          for (const [k, e] of Object.entries(this.s.trade.stock)) if (e.units <= 0) delete this.s.trade.stock[k];
          th.fleeing = true;
          this.emit('thief-stole', { units: stolen });
        }
      },
      catchThief() {
        const th = this.evState().thief;
        if (!th || th.fleeing) return;
        th.fleeing = true;
        const v = Math.max(50, this.harvestRate() * 30) * this.rewardMult();
        this.earn(v);
        this.addStat('thieves');
        this.emit('thief-caught', { x: th.x, value: v });
      },

      // ---------- Tornade ----------
      updateTornado(dt) {
        const t = this.evState().tornado;
        if (!t) return;
        t.anim += dt;
        t.x -= 20 * dt;
        const at = plotAt(t.x);
        if (at >= 0 && at < this.activePlots() && !t.hit[at]) {
          t.hit[at] = true;
          const pl = this.s.plots[at];
          if (pl.crop && Math.random() < 0.35) { pl.crop = null; this.addStat('plantsLost'); this.emit('uprooted', { plot: at }); }
        }
        for (const w of this.workers) {
          if (w.kind === 'farmer' || t.hit['w' + w.id] || Math.abs(w.x - t.x) > 4) continue;
          t.hit['w' + w.id] = true;
          this.release(w);
          w.x = Math.max(4, w.x + rand(-60, 60));
          w.frozenT = 3 * this.fxMul('frozen');
          w.state = 'idle';
          this.emit('thrown', { x: w.x });
        }
        if (t.x < -20) { this.evState().tornado = null; this.addStat('tornados'); }
      },

      // ---------- Oies sauvages ----------
      updateGeese(dt) {
        const g = this.evState().geese;
        if (!g) return;
        g.anim += dt;
        g.x -= 35 * dt;
        const at = plotAt(g.x);
        if (at >= 0 && at < this.activePlots() && !g.done[at]) {
          g.done[at] = true;
          const c = this.s.plots[at].crop;
          if (c && c.p < 1) { c.p = Math.min(1, c.p + X.geeseBoost); if (c.p >= 1) this.ripen(at); }
        }
        if (g.x < -30) this.evState().geese = null;
      },

      // ---------- Foire agricole ----------
      updateJudge(dt) {
        const j = this.evState().judge;
        if (!j) return;
        j.anim += dt;
        const dx = j.tx - j.x;
        if (Math.abs(dx) > 1) j.x += Math.sign(dx) * 12 * dt;
        else j.tx = rand(LAYOUT.BARN_W, plotX(Math.max(0, this.activePlots() - 1)));
      },
      judgeFair() {
        this.evState().judge = null;
        let best = -1, bestV = 0;
        for (let i = 0; i < this.activePlots(); i++) {
          const c = this.s.plots[i].crop;
          if (!c || c.p < 1) continue;
          const sd = H.SEED_BY_ID[c.id];
          const v = this.seedValue(sd) * this.plotPlants(i) * (c.gold ? 10 : 1) * (c.star ? X.starMult : 1) * (c.mutant === 'giant' ? 8 : 1);
          if (v > bestV) { bestV = v; best = i; }
        }
        if (best < 0) { this.emit('fair-none'); return; }
        const v = this.harvest(best, 'fair', X.fairMult);
        this.addStat('fairs');
        this.emit('fair-won', { plot: best, value: v });
      },

      // ---------- Touristes ----------
      updateTourists(dt) {
        const ev = this.evState();
        ev.touristCd = (ev.touristCd || 0) - dt;
        if (ev.touristCd > 0) return;
        ev.touristCd = 1;
        const ripe = [];
        for (let i = 0; i < this.activePlots(); i++) { const c = this.s.plots[i].crop; if (c && c.p >= 1 && !this.claims[i] && !this.infiniWaits(c)) ripe.push(i); }
        if (!ripe.length) return;
        const i = ripe[Math.floor(Math.random() * ripe.length)];
        this.harvest(i, 'tourist', X.touristMult);
        this.emit('tourist', { plot: i });
      },

      // ---------- Météos spéciales ----------
      updateWeatherEffects(dt) {
        const w = this.weather(), c = this.s.clock;
        // Temps écoulé depuis la dernière pluie / le dernier orage (pour arc-en-ciel, champignons, panne).
        if (w.rain) c.sinceRain = 0; else c.sinceRain = (c.sinceRain == null ? Infinity : c.sinceRain) + dt;
        if (w.storm) c.sinceStorm = 0; else c.sinceStorm = (c.sinceStorm == null ? Infinity : c.sinceStorm) + dt;
        const n = this.activePlots();
        if (w.frost && !this.lvl('serre_chauffee') && !this.tal('gene_froid')) {
          for (let i = 0; i < n; i++) {
            const cr = this.s.plots[i].crop;
            if (!cr || cr.p >= 1 || Math.random() >= dt / 45) continue;
            if (H.SEED_BY_ID[cr.id].fam === 'feuille' && this.lvl('voiles')) continue;
            cr.p = Math.max(0, cr.p - 0.25);
            this.emit('frost', { plot: i });
          }
        }
        if (w.wind) {
          // Des graines s'envolent et se plantent toutes seules sur les parcelles vides.
          for (let i = 0; i < n; i++) if (!this.s.plots[i].crop && Math.random() < dt / 70) { this.plant(i); this.emit('windseed', { plot: i }); }
        }
      },
    });
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = install;
  else (root.FARM_MIXINS = root.FARM_MIXINS || []).push(install);
})(this);

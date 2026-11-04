// Rendu de la bande : le canvas travaille en pixels "art", agrandis sans lissage par le CSS.
(function (root) {
  'use strict';
  const D = root.FARM_DATA, S = root.FARM_SPRITES, C = root.FARM_CORE;
  const { LAYOUT, plotX, SEED_BY_ID } = C;
  const H = 20;            // hauteur en pixels art
  const GROUND = H;        // les pieds touchent le bas de la fenêtre (haut de la barre des tâches)
  const SOIL_TOP = GROUND - 3;
  const LAYER_HZ = 4;    // rafraîchissements du décor par seconde

  class Renderer {
    constructor(canvas, game) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.game = game;
      this.scale = 2;        // pixels physiques par pixel art
      this.u = 1;            // pixels CSS par pixel art
      this.fieldX = 0;
      this.W = 0;
      this.floaters = [];
      this.rain = [];
      this.fireflies = [];
      this.flash = 0;
      this.hover = null;
      this.fx = []; // effets éphémères : cri du basilic, ver des sables...
      this.t = 0;
    }

    resize(scale, hudRightCss) {
      this.scale = scale;
      const dpr = window.devicePixelRatio || 1;
      this.u = scale / dpr;
      this.full = Math.ceil(window.innerWidth / this.u); // largeur disponible (place pour les parcelles)
      this.W = 0;
      this.fitCanvas();
      this.fieldX = Math.ceil(hudRightCss / this.u) + 3;
      // Une fois le marché débloqué, on garde de la place au bout du champ pour les silos.
      const free = this.full - this.fieldX - LAYOUT.BARN_W - LAYOUT.PAD - 4 - (this.game.s.market.unlocked ? C.SILO.RESERVE : 0);
      this.game.maxPlots = Math.max(D.PLOTS.start, Math.floor(free / LAYOUT.PLOT_STEP));
      this.ctx.imageSmoothingEnabled = false;
    }

    // Coordonnées CSS (relatives au canvas) -> objet survolé
    hitTest(cx, cy) {
      const g = this.game;
      const ax = cx / this.u - this.fieldX, ay = cy / this.u;
      if (ax < -2) return null;
      if (g.view === 'factory') return this.hitFactory(ax, ay);
      if (g.factoryUnlocked() && ax <= LAYOUT.BARN_W - 2 && ay >= H - 18) return { type: 'barn' };
      if (g.cart && !g.cart.done && ax >= g.cart.x - 3 && ax <= g.cart.x + 21 && ay >= H - 17) return { type: 'cart' };
      const ev = g.ev || {};
      if (ev.boar && !ev.boar.scared && Math.abs(ax - ev.boar.x) <= 6 && ay >= H - 9) return { type: 'boar' };
      if (ev.thief && !ev.thief.fleeing && Math.abs(ax - ev.thief.x) <= 5 && ay >= H - 10) return { type: 'thief' };
      if (ev.swarm && Math.abs(ax - ev.swarm.x) <= 30 && ay >= H - 15 && ay <= H - 3) return { type: 'swarm' };
      for (const pet of g.s.pets.list) {
        const r = g.petRt[pet.uid];
        if (!r) continue;
        const petTop = r.pm.move === 'fly' ? H - 16 : H - 12;
        for (const e of r.ents) if (Math.abs(ax - e.x) <= 5 && ay >= petTop) return { type: 'pet', uid: pet.uid };
      }
      for (const w of g.workers) if (w.def.harvestOnly && Math.abs(ax - w.x) <= 5 && ay >= H - 10) return { type: 'pet', uid: w.def.petUid };
      for (const c of g.crows) {
        if (c.state === 'leave') continue;
        const top = GROUND - 2 - c.y - 7;
        if (Math.abs(ax - c.x) <= 5 && ay >= top && ay <= top + 9) return { type: 'crow', crow: c };
      }
      const silos = g.s.trade.silos;
      if (silos && ay >= H - 17) {
        const x0 = this.siloX0();
        if (ax >= x0 - 1 && ax <= x0 + silos * C.SILO.STEP) return { type: 'silo' };
      }
      if (ay < H - 15) return null;
      const n = g.activePlots();
      for (let i = 0; i < n; i++) {
        const left = plotX(i) - LAYOUT.PLOT_W / 2;
        if (ax >= left - 1 && ax < left + LAYOUT.PLOT_W + 1) return { type: 'plot', i };
      }
      return null;
    }

    hitFactory(ax, ay) {
      const g = this.game, F = D.FACTORY;
      if (ax <= LAYOUT.BARN_W - 2 && ay >= H - 20) return { type: 'factory-exit' };
      if (ay < H - 18) return null;
      const fx = g.fridgeX();
      if (g.s.factory.fridges && ax >= fx && ax <= fx + g.s.factory.fridges * 10) return { type: 'fridge' };
      const ms = g.s.factory.machines;
      for (let i = 0; i < ms.length; i++) if (Math.abs(ax - g.machineX(i)) <= F.slotStep / 2) return { type: 'machine', i };
      return null;
    }

    siloX0() { return plotX(Math.max(this.game.activePlots(), 1) - 1) + LAYOUT.PLOT_W / 2 + C.SILO.GAP; }

    addFloater(plotOrX, text, color, isX) {
      const x = isX ? plotOrX : plotX(plotOrX);
      this.floaters.push({ x, y: H - 12, text, color, t: 0 });
      if (this.floaters.length > 60) this.floaters.shift();
    }

    // Sobriété : le décor (grange, terre, plantes, silos) change lentement ; il est dessiné dans un calque
    // rafraîchi LAYER_HZ fois par seconde, et seuls les personnages et effets sont redessinés à chaque image.
    draw(dt) {
      if (!this.full) return;
      if (this.layerT <= 0 || !this.layer) this.fitCanvas();
      const g = this.game, ctx = this.ctx, t = (this.t += dt);
      const fx = this.fieldX;
      const n = g.activePlots();
      const fieldEnd = plotX(Math.max(n, 1) - 1) + LAYOUT.PLOT_W / 2 + 4;
      this.layerT = (this.layerT || 0) - dt;
      if (!this.layer || this.layer.width !== this.W) { this.layer = document.createElement('canvas'); this.layer.width = this.W; this.layer.height = H; this.layerT = 0; }
      if (this.layerT <= 0) {
        this.layerT = 1 / LAYER_HZ;
        const lc = this.layer.getContext('2d');
        lc.clearRect(0, 0, this.W, H);
        lc.save(); lc.translate(fx, 0);
        if (g.view === 'factory') this.drawFactoryStatic(lc, t); else this.drawField(lc, t, n);
        lc.restore();
      }
      ctx.clearRect(0, 0, this.W, H);
      ctx.drawImage(this.layer, 0, 0);
      ctx.save();
      ctx.translate(fx, 0);
      if (g.view === 'factory') {
        this.drawFactoryActors(ctx, t);
        ctx.restore();
        this.drawNight(dt, fx, g.fridgeX());
        this.drawFloaters(dt, fx);
        return;
      }
      if (this.hover && this.hover.type === 'plot') {
        const left = plotX(this.hover.i) - LAYOUT.PLOT_W / 2;
        ctx.globalAlpha = 0.35;
        S.px(ctx, left - 1, H - 15, LAYOUT.PLOT_W + 2, 15, g.brush ? '#9fe8ff' : '#ffffff');
        ctx.globalAlpha = 1;
      }
      this.drawActors(ctx, t, dt);
      ctx.restore();

      this.drawWeather(dt, fx, fieldEnd);
      this.drawNight(dt, fx, fieldEnd);
      this.drawFloaters(dt, fx);
    }

    // ---------- Usine ----------
    drawFactoryStatic(ctx, t) {
      const g = this.game, f = g.s.factory, F = D.FACTORY;
      S.drawFactory(ctx, 0, GROUND);
      // Quai : caisses des silos
      S.drawCrate(ctx, F.dockX - 3, GROUND - 3, '#7cae4a'); S.drawCrate(ctx, F.dockX, GROUND - 3, '#e8a33a'); S.drawCrate(ctx, F.dockX - 1, GROUND - 6, '#c0284a');
      const fx = g.fridgeX();
      S.drawBelt(ctx, F.dockX + 4, fx, GROUND, 0);
      const cap = F.fridgeCap * (1 + 0.5 * g.lvl('frigo_xxl'));
      let left = g.fridgeUnits();
      for (let k = 0; k < f.fridges; k++) { S.drawFridge(ctx, fx + k * 10, GROUND, Math.min(1, left / cap)); left -= cap; }
      if (!f.machines.length) S.drawText(ctx, 'usine vide', F.slot0 - 4, 4, '#e9ecf5', 'rgba(0,0,0,0.6)');
    }

    drawFactoryActors(ctx, t) {
      const g = this.game, f = g.s.factory, F = D.FACTORY;
      S.drawSmoke(ctx, 0, GROUND, t);
      // Tapis qui défile, machines, produits, porteurs
      const fx = g.fridgeX();
      for (let x = F.dockX + 4 + (Math.floor(t * g.beltSpeed() / 2) % 4); x < fx; x += 4) S.px(ctx, x, GROUND - 3, 1, 1, '#9a9aa8');
      f.machines.forEach((m, i) => {
        const r = m.lot && C.RECIPE_BY_ID[m.lot.id];
        S.drawMachine(ctx, m.type, g.machineX(i), GROUND, m.st === 2, t + i, m.st ? (m.st === 2 && r ? m.t / r.time : 0) : null, r && r.color);
        if (this.hover && this.hover.type === 'machine' && this.hover.i === i) { ctx.globalAlpha = 0.25; S.px(ctx, g.machineX(i) - 8, H - 18, 17, 18, '#ffffff'); ctx.globalAlpha = 1; }
      });
      for (const it of g.belt || []) S.drawCrate(ctx, it.x, GROUND - 3, C.RECIPE_BY_ID[it.id].color);
      for (const p of g.porterList()) { p.carryColor = p.carry && C.RECIPE_BY_ID[p.carry] ? C.RECIPE_BY_ID[p.carry].color : null; S.drawPorter(ctx, p, GROUND, t); }
    }

    // Sobriété : le canvas ne couvre que la partie dessinée (ferme, silos et une marge pour les visiteurs),
    // pas tout l'écran : moins de pixels à composer à chaque image.
    fitCanvas() {
      const g = this.game;
      const farmEnd = this.siloX0() + (g.s.trade.silos || 0) * C.SILO.STEP + 70;
      const end = g.view === 'factory' ? Math.max(farmEnd, g.fridgeX() + g.s.factory.fridges * 10 + 20) : farmEnd;
      const want = Math.min(this.full, Math.ceil((this.fieldX + end) / 32) * 32);
      if (want === this.W) return;
      this.W = want;
      this.canvas.width = this.W;
      this.canvas.height = H;
      this.canvas.style.width = (this.W * this.u) + 'px';
      this.canvas.style.height = (H * this.u) + 'px';
      this.ctx.imageSmoothingEnabled = false;
      this.layer = null;
    }

    // Force le prochain rendu du décor (clic, achat...).
    dirty() { this.layerT = 0; }

    drawField(ctx, t, n) {
      const g = this.game;
      S.drawBarn(ctx, 0, GROUND);

      // Parcelles et plantes
      for (let i = 0; i < n; i++) {
        const pl = g.s.plots[i];
        const left = plotX(i) - LAYOUT.PLOT_W / 2;
        S.drawSoil(ctx, left, GROUND, LAYOUT.PLOT_W, pl.moist, g.irrigated(i));
        if (g.rodded(i)) S.drawRod(ctx, left + LAYOUT.PLOT_W - 1, GROUND);
        if (pl.tier) for (let k = 0; k < pl.tier; k++) S.px(ctx, left + 1 + k * 2, GROUND - 1, 1, 1, D.DENSE[pl.tier].color);
        if (pl.crop) {
          const seed = SEED_BY_ID[pl.crop.id];
          const tier = pl.tier || 0;
          // Géant : dessiné 2× plus grand depuis le pied ; stérile : pâle.
          const mut = pl.crop.mutant;
          // Géante ×2, infinie qui grossit avec sa croissance en trop ; fébrile qui tremble ; stérile/moisie pâles.
          const grow = mut === 'giant' ? 2 : mut === 'infini' ? Math.min(2.5, 1 + (pl.crop.extra || 0) * 0.25) : 1;
          const shake = mut === 'febrile' ? (Math.floor(t * 12 + i) % 3) - 1 : 0;
          const scaled = grow !== 1 || shake;
          if (scaled) { ctx.save(); ctx.translate(plotX(i) + shake, SOIL_TOP); ctx.scale(grow, grow); ctx.translate(-plotX(i), -SOIL_TOP); }
          if (mut === 'sterile' || mut === 'moisi') ctx.globalAlpha = 0.45;
          if (tier >= 2) { // rangs du fond, un peu plus haut et plus sombres
            ctx.globalAlpha = 0.55;
            for (const o of [-2, 2]) S.drawPlant(ctx, seed, plotX(i) + o, SOIL_TOP - 1, pl.crop.p, pl.crop.gold, t);
            ctx.globalAlpha = 1;
          }
          if (tier >= 1) for (const o of [-4, 0, 4]) S.drawPlant(ctx, seed, plotX(i) + o, SOIL_TOP, pl.crop.p, pl.crop.gold, t);
          else S.drawPlant(ctx, seed, plotX(i), SOIL_TOP, pl.crop.p, pl.crop.gold, t);
          if (pl.crop.star) S.drawStarMark(ctx, plotX(i), GROUND, t);
          if (scaled) ctx.restore();
          ctx.globalAlpha = 1;
          if (mut) S.drawMutation(ctx, mut, plotX(i), SOIL_TOP, t, i, pl.crop);
          if (mut === 'sterile') { S.px(ctx, plotX(i) - 1, SOIL_TOP - 4, 1, 1, '#7d7d7d'); S.px(ctx, plotX(i) + 1, SOIL_TOP - 4, 1, 1, '#7d7d7d'); S.px(ctx, plotX(i), SOIL_TOP - 3, 1, 1, '#7d7d7d'); S.px(ctx, plotX(i) - 1, SOIL_TOP - 2, 1, 1, '#7d7d7d'); S.px(ctx, plotX(i) + 1, SOIL_TOP - 2, 1, 1, '#7d7d7d'); }
          if (tier >= 3 && Math.floor(t * 4 + i) % 3 === 0) S.px(ctx, plotX(i) - 5 + ((Math.floor(t * 7) + i) % 11), SOIL_TOP - 3 - (Math.floor(t * 5) % 6), 1, 1, '#e0c8ff');
          if (pl.crop.energized > 0) S.drawEnergy(ctx, plotX(i), SOIL_TOP, t);
          if (pl.crop.pest) {
            for (let k = 0; k < 4; k++) S.px(ctx, plotX(i) - 3 + ((k * 5 + Math.floor(t * 3)) % 7), SOIL_TOP - 2 - ((k * 3) % 5), 1, 1, k % 2 ? '#2b2b2b' : '#9be05a');
          } else if (pl.crop.p >= 1) S.drawSparkle(ctx, plotX(i) + 4, H - 14 + Math.round(Math.sin(t * 3 + i)), t + i * 0.3, pl.crop.gold ? '#fff3a0' : '#ffffff');
          else if (pl.moist <= 0 && !g.isRaining()) S.px(ctx, plotX(i) - 4, SOIL_TOP - 1, 1, 1, '#ffb347');
        }
        if (pl.seed !== 'auto' && g.seedFor(i) !== (pl.crop ? pl.crop.id : g.seedFor(i))) S.px(ctx, left + LAYOUT.PLOT_W - 1, GROUND - 1, 1, 1, '#ffffff');
      }

      if (g.s.trade.silos) {
        // Le stock est commun : on remplit les silos l'un après l'autre.
        const cap = g.siloCapacity() / g.s.trade.silos;
        let left = g.stockUnits();
        for (let k = 0; k < g.s.trade.silos; k++) {
          const fill = Math.max(0, Math.min(1, left / cap));
          left -= cap;
          S.drawSilo(ctx, this.siloX0() + k * C.SILO.STEP, GROUND, fill, t);
        }
      }
    }

    drawActors(ctx, t, dt) {
      const g = this.game;
      if (g.cart) S.drawCart(ctx, g.cart, GROUND);
      for (const c of g.crows) S.drawCrow(ctx, c, GROUND);
      // Les robots d'abord, le fermier par-dessus, les drones tout en haut.
      const order = w => (w.kind === 'drone' ? 2 : w.kind === 'farmer' ? 1 : 0);
      const workers = g.workers.slice().sort((a, b) => order(a) - order(b));
      for (const w of workers) S.drawWorker(ctx, w, w.x, GROUND, t, w.def.look || 'base', !!g.lvl('mini_' + w.kind));
      // Compagnons : chacun avec son apparence, son aura et ses poussins.
      for (const pet of g.s.pets.list) {
        const r = g.petRt[pet.uid];
        if (!r) continue;
        const aura = r.pm.aura;
        if (pet.id === 'abeille') S.drawHive(ctx, LAYOUT.BARN_W + 1, GROUND, r.look === 'doree');
        if (r.look === 'phenix' && aura) {
          // L'aura du phénix brille et chauffe.
          ctx.globalAlpha = 0.1 + 0.05 * Math.sin(t * 3);
          for (const e of r.ents) S.px(ctx, e.x - aura.radius, H - 15, aura.radius * 2, 15, '#ff9a3c');
          ctx.globalAlpha = 1;
        }
        for (const e of r.ents) S.drawPet(ctx, pet.id, e.kind === 'chick' ? 'base' : r.look, e, GROUND, t);
        if (this.hover && this.hover.type === 'pet' && this.hover.uid === pet.uid && aura) {
          ctx.globalAlpha = 0.18;
          for (const e of r.ents) S.px(ctx, e.x - aura.radius, H - 15, aura.radius * 2, 15, '#ffe066');
          ctx.globalAlpha = 1;
        }
      }
      // Événements aléatoires
      const ev = g.ev;
      if (ev) {
        if (ev.boar) S.drawBoar(ctx, ev.boar, GROUND);
        if (ev.swarm) S.drawSwarm(ctx, ev.swarm, GROUND, t);
        if (ev.thief) S.drawThief(ctx, ev.thief, GROUND);
        if (ev.judge) S.drawJudge(ctx, ev.judge, GROUND);
        if (ev.tornado) S.drawTornado(ctx, ev.tornado, GROUND, t);
        if (ev.geese) S.drawGeese(ctx, ev.geese, t);
      }
      this.drawFx(dt);
    }

    addFx(type, x, x2) { this.fx.push({ type, x, x2, t: 0 }); }

    drawFx(dt) {
      const ctx = this.ctx;
      for (const f of this.fx) {
        f.t += dt;
        if (f.type === 'cry') {
          // Onde de choc du basilic
          const r = f.t * 90;
          ctx.globalAlpha = Math.max(0, 1 - f.t);
          for (let a = 0; a < Math.PI; a += 0.08) S.px(ctx, f.x + Math.cos(a) * r, GROUND - 4 - Math.sin(a) * r * 0.25, 1, 1, '#c9a0ff');
          ctx.globalAlpha = 1;
        } else if (f.type === 'worm') {
          // Le ver des sables jaillit puis replonge
          const h = Math.round(Math.sin(Math.min(1, f.t / 1.4) * Math.PI) * 16);
          for (let k = 0; k < h; k++) S.px(ctx, f.x - 2 + Math.round(Math.sin(k * 0.6 + f.t * 8)), GROUND - 1 - k, 5, 1, k % 3 ? '#c98a6a' : '#a86a4e');
          if (h > 3) { S.px(ctx, f.x - 2, GROUND - h, 5, 1, '#5a1e1e'); S.px(ctx, f.x - 1, GROUND - h - 1, 1, 1, '#ffffff'); S.px(ctx, f.x + 1, GROUND - h - 1, 1, 1, '#ffffff'); }
          for (let k = 0; k < 6; k++) S.px(ctx, f.x - 6 + k * 2.4, GROUND - 2 - ((k * 7 + f.t * 20) % 6), 1, 1, '#8a5a33');
        } else if (f.type === 'bolt') {
          if (f.t < 0.3) S.drawBolt(ctx, f.x, GROUND - 2, Math.floor(f.x));
        } else if (f.type === 'smoke') {
          ctx.globalAlpha = Math.max(0, 1 - f.t / 1.5);
          for (let k = 0; k < 4; k++) S.px(ctx, f.x - 2 + k + Math.sin(f.t * 3 + k), GROUND - 4 - f.t * 6 - k, 1, 1, '#6b6b6b');
          ctx.globalAlpha = 1;
        } else if (f.type === 'star') {
          // Étoile filante qui tombe en diagonale sur sa plante
          const k = Math.min(1, f.t / 0.6);
          const sx = f.x + 40 * (1 - k), sy = -2 + (GROUND - 14) * k;
          for (let j = 0; j < 6; j++) { ctx.globalAlpha = 1 - j / 6; S.px(ctx, sx + j * 2, sy - j, 1, 1, '#fff3a0'); }
          ctx.globalAlpha = 1;
        } else if (f.type === 'sweep') {
          // Ver cosmique : il file d'un bout à l'autre du champ
          const head = f.x + (f.x2 - f.x) * Math.min(1, f.t / 1.4);
          for (let k = 0; k < 14; k++) S.px(ctx, head - k * 3, GROUND - 2 - Math.round(Math.abs(Math.sin(k * 0.7 + f.t * 10)) * 3), 3, 2, k % 3 ? '#9a7bff' : '#ffe14d');
        } else if (f.type === 'puff') {
          ctx.globalAlpha = Math.max(0, 1 - f.t / 0.8);
          for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; S.px(ctx, f.x + Math.cos(a) * f.t * 10, GROUND - 6 + Math.sin(a) * f.t * 5, 1, 1, '#ff9ad5'); }
          ctx.globalAlpha = 1;
        }
      }
      this.fx = this.fx.filter(f => f.t < 1.6);
    }

    drawWeather(dt, fx, fieldEnd) {
      const g = this.game, ctx = this.ctx, w = g.weather();
      const width = fieldEnd + 4;
      if (w.rain) {
        const target = Math.floor(width / (w.storm ? 6 : 10));
        while (this.rain.length < target) this.rain.push({ x: Math.random() * width, y: Math.random() * H });
        if (this.rain.length > target) this.rain.length = target;
        ctx.fillStyle = w.storm ? 'rgba(170,200,255,0.85)' : 'rgba(140,190,255,0.75)';
        for (const d of this.rain) {
          d.y += dt * (w.storm ? 55 : 38); d.x -= dt * (w.storm ? 10 : 4);
          if (d.y > H - 2) { d.y = -2; d.x = Math.random() * width; }
          ctx.fillRect(Math.round(fx + d.x), Math.round(d.y), 1, 2);
        }
        if (w.storm) {
          // Les éclairs viennent du jeu (événement 'lightning') : flash à chaque impact.
          if (this.flash > 0) {
            this.flash -= dt;
            ctx.globalCompositeOperation = 'source-atop';
            ctx.fillStyle = 'rgba(255,255,255,0.45)';
            ctx.fillRect(fx, 0, width, H);
            ctx.globalCompositeOperation = 'source-over';
          }
        }
      } else this.rain.length = 0;
      if (w.fog) {
        // Brouillard : nappes claires qui dérivent sur le champ
        ctx.globalAlpha = 0.22;
        for (let k = 0; k < width; k += 24) S.px(ctx, fx + ((k + this.t * 4) % (width + 24)) - 12, H - 9 - ((k / 24) % 3) * 3, 20, 3, '#e6e9ee');
        ctx.globalAlpha = 1;
      }
      if (w.frost) {
        // Gel : teinte bleutée et flocons
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = 'rgba(190,225,255,0.18)';
        ctx.fillRect(fx, 0, width, H);
        ctx.globalCompositeOperation = 'source-over';
        for (let k = 0; k < width; k += 17) S.px(ctx, fx + k + Math.round(Math.sin(this.t + k) * 2), (k * 7 + this.t * 6) % H, 1, 1, '#f2f8ff');
      }
      if (w.wind) {
        // Vent : feuilles et graines emportées
        for (let k = 0; k < width; k += 31) S.px(ctx, fx + width - ((k * 3 + this.t * 40) % (width + 10)), 3 + (k % 13), 1, 1, k % 2 ? '#9bd06a' : '#d9c27a');
      }
      if (g.s.clock.weather === 'canicule') {
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = 'rgba(255,140,40,0.12)';
        ctx.fillRect(fx, 0, width, H);
        ctx.globalCompositeOperation = 'source-over';
      }
    }

    drawNight(dt, fx, fieldEnd) {
      const g = this.game, ctx = this.ctx, dark = g.darkness();
      if (dark <= 0) { this.fireflies.length = 0; return; }
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = `rgba(12,18,58,${0.5 * dark})`;
      ctx.fillRect(0, 0, this.W, H);
      ctx.globalCompositeOperation = 'source-over';
      // Yeux des robots et lucarne qui brillent dans le noir
      ctx.globalAlpha = dark;
      S.px(ctx, fx + 11, H - 16, 2, 2, '#ffd34d');
      for (const w of g.workers) {
        if (w.kind === 'farmer') continue;
        const y = w.kind === 'drone' ? H - 13 + Math.round(Math.sin(w.anim * 3) * 1.5) - 2 : H - 8;
        S.px(ctx, fx + Math.round(w.x) - 1, y, 1, 1, '#9ff');
      }
      const want = Math.floor(fieldEnd / 40);
      while (this.fireflies.length < want) this.fireflies.push({ x: Math.random() * fieldEnd, y: 3 + Math.random() * 12, p: Math.random() * 6 });
      for (const f of this.fireflies) {
        f.p += dt; f.x += Math.sin(f.p * 0.7) * dt * 3; f.y += Math.cos(f.p * 1.1) * dt * 2;
        if (Math.sin(f.p * 2) > 0.2) S.px(ctx, fx + f.x, f.y, 1, 1, '#f6ff8a');
      }
      ctx.globalAlpha = 1;
    }

    drawFloaters(dt, fx) {
      const ctx = this.ctx;
      for (const f of this.floaters) {
        f.t += dt;
        const y = f.y - f.t * 9;
        ctx.globalAlpha = Math.max(0, 1 - Math.max(0, f.t - 0.8) / 0.6);
        S.drawText(ctx, f.text, fx + f.x - S.textWidth(f.text) / 2, Math.max(0, y), f.color, 'rgba(20,14,8,0.85)');
      }
      ctx.globalAlpha = 1;
      this.floaters = this.floaters.filter(f => f.t < 1.4);
    }
  }

  root.FARM_RENDER = { Renderer, H };
})(this);

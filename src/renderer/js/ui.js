// Interface DOM : HUD dans la bande, panneau dépliable, info-bulles et notifications.
(function (root) {
  'use strict';
  const D = root.FARM_DATA, S = root.FARM_SPRITES, C = root.FARM_CORE;
  const { fmt, fmtTime } = D;
  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  const TABS = [
    { id: 'graines', name: 'Graines', icon: 'seeds' },
    { id: 'champ', name: 'Champ', icon: 'field' },
    { id: 'outils', name: 'Outils', icon: 'tools' },
    { id: 'robots', name: 'Robots', icon: 'robots' },
    { id: 'spec', name: 'Spécialisation', icon: 'spec' },
    { id: 'pets', name: 'Compagnon', icon: 'pets' },
    { id: 'marche', name: 'Marché', icon: 'market' },
    { id: 'usine', name: 'Usine', icon: 'factory' },
    { id: 'prestige', name: 'Renaissance', icon: 'prestige' },
    { id: 'succes', name: 'Succès', icon: 'ach' },
    { id: 'reglages', name: 'Réglages', icon: 'settings' },
  ];
  const MULTS = [{ n: 1, label: 'x1' }, { n: 10, label: 'x10' }, { n: Infinity, label: 'Max' }];

  class UI {
    constructor(game, renderer, api) {
      this.game = game;
      this.renderer = renderer;
      this.api = api;
      this.tab = null;
      this.mult = 1;
      this.rows = new Map();
      this.settings = null;
      this.lastToast = {};
      this.resetArmed = 0;
      this.buildHud();
      this.buildPanel();
      this.bindTooltips();
    }

    // ---------- HUD ----------
    buildHud() {
      const menu = $('menu');
      for (const t of TABS) {
        const b = el('button', 'ib');
        b.dataset.tip = t.name;
        b.dataset.tab = t.id;
        const img = el('img'); img.src = S.iconURL(t.icon, 4);
        b.appendChild(img);
        b.onclick = () => this.toggleTab(t.id);
        menu.appendChild(b);
      }
      this.envWeather = el('img', 'env-ic');
      this.envTime = el('img', 'env-ic');
      this.envFrenzy = el('img', 'env-ic');
      for (const e of [this.envTime, this.envWeather, this.envFrenzy]) $('env').appendChild(e);
      $('env').dataset.tip = 'env';
      let open = false;
      try { open = localStorage.getItem('idleit-drawer') === '1'; } catch { /* stockage indisponible */ }
      $('drawer-toggle').onclick = () => this.setDrawer($('drawer').classList.contains('hidden'));
      this.setDrawer(open);
      this.buildSeedbar();
    }

    // Flèche du HUD : déplie / replie le tiroir vertical (onglets + graines).
    setDrawer(open) {
      $('drawer').classList.toggle('hidden', !open);
      $('drawer-toggle').querySelector('img').src = S.iconURL(open ? 'down' : 'up', 4);
      $('drawer-toggle').dataset.tip = open ? 'Replier le menu' : 'Menu et graines';
      try { localStorage.setItem('idleit-drawer', open ? '1' : '0'); } catch { /* ignore */ }
      this.layoutOverlays();
    }

    // Le tiroir est aligné sur la flèche ; panneau et notifications se placent à sa droite quand il est ouvert.
    layoutOverlays() {
      const tg = $('drawer-toggle').getBoundingClientRect();
      const dr = $('drawer');
      dr.style.left = Math.max(0, tg.left - 4) + 'px';
      const left = dr.classList.contains('hidden') ? null : dr.getBoundingClientRect().right + 6;
      document.documentElement.style.setProperty('--panel-left', left == null ? 'calc(var(--u) * 2)' : left + 'px');
    }

    buildSeedbar() {
      const bar = $('seedbar');
      bar.innerHTML = '';
      const g = this.game;
      const add = (id, url, tip, auto) => {
        const b = el('button', 'ib seed-b' + (auto ? ' auto' : ''));
        b.dataset.tip = tip;
        b.dataset.seed = id;
        const img = el('img'); img.src = url; b.appendChild(img);
        b.onclick = () => { g.brush = g.brush === id ? null : id; this.refreshSeedbar(); };
        bar.appendChild(b);
      };
      add('auto', S.iconURL('auto', 4), 'Pinceau : Auto (toujours la meilleure graine)', true);
      for (const sd of D.SEEDS) if (g.s.seeds[sd.id]) add(sd.id, S.seedIconURL(sd, 4), 'Pinceau : ' + sd.name);
      for (const sd of g.seasonSeeds()) if (g.seasonSeedBought(sd.id)) add(sd.id, S.seedIconURL(sd, 4), 'Pinceau : ' + sd.name + ' (saison)');
      this.seedKey = this.seedbarKey();
      this.refreshSeedbar();
      requestAnimationFrame(() => this.layoutOverlays());
    }

    refreshSeedbar() {
      for (const b of $('seedbar').children) b.classList.toggle('on', this.game.brush === b.dataset.seed);
      // Pinceau actif, tiroir fermé : la flèche le signale.
      $('drawer-toggle').classList.toggle('armed', !!this.game.brush);
    }

    hudRight() { return $('hud').getBoundingClientRect().right; }

    updateHud() {
      const g = this.game;
      $('money').textContent = fmt(g.s.money) + ' $';
      $('rate').textContent = fmt(g.incomeRate()) + ' $/s';
      const night = g.isNight();
      this.setSrc(this.envTime, S.iconURL(night ? 'lune' : 'soleil', 4));
      this.setSrc(this.envWeather, S.iconURL(g.s.clock.weather === 'soleil' ? 'nuageux' : g.s.clock.weather, 4));
      this.envWeather.classList.toggle('off', g.s.clock.weather === 'soleil');
      this.setSrc(this.envFrenzy, S.iconURL('frenzy', 4));
      this.envFrenzy.classList.toggle('off', !g.frenzy());
      if (this.seedbarKey() !== this.seedKey) this.buildSeedbar();
      for (const b of $('menu').children) b.classList.toggle('on', b.dataset.tab === this.tab);
    }

    setSrc(img, src) { if (img.getAttribute('src') !== src) img.src = src; }

    envTip() {
      const g = this.game, w = g.weather();
      const phase = g.dayPhase();
      const h = Math.floor(phase * 24), m = Math.floor((phase * 24 - h) * 60);
      let s = `<b>${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}</b> · ${g.isNight() ? 'Nuit (le fermier ralentit, les plantes poussent moins)' : 'Jour'}`;
      s += `<br><b>${w.name}</b> · ${w.desc} (encore ${fmtTime(g.s.clock.weatherT)})`;
      if (g.frenzy()) s += `<br><b>Marché en folie !</b> Prix ×2 (encore ${fmtTime(g.s.clock.frenzyT)})`;
      const T = { rainbow: 'Arc-en-ciel : croissance ×2, dorés ×5', eclipse: 'Éclipse : la nuit en plein jour', comet: 'Comète : croissance ×2 cette nuit', outage: 'Panne de courant : bornes hors service', tourists: 'Touristes : ils achètent tes plantes mûres ×3', fair: 'Foire agricole : la plus belle plante mûre sera primée' };
      for (const [k, txt] of Object.entries(T)) if (g.evActive(k)) s += `<br><b>${txt}</b> (encore ${fmtTime(g.evTimer(k))})`;
      return s;
    }

    // ---------- Panneau ----------
    buildPanel() {
      const tabs = $('tabs');
      for (const t of TABS) {
        const b = el('button', 'tab');
        const img = el('img'); img.src = S.iconURL(t.icon, 2);
        b.appendChild(img); b.appendChild(document.createTextNode(t.name));
        b.dataset.tab = t.id;
        b.onclick = () => this.openTab(t.id);
        tabs.appendChild(b);
      }
      for (const m of MULTS) {
        const b = el('button', null, m.label);
        b.onclick = () => { this.mult = m.n; this.renderMult(); this.update(); };
        b.dataset.n = m.n;
        $('mult').appendChild(b);
      }
      this.renderMult();
      $('panel-close').onclick = () => this.closePanel();
    }

    renderMult() { for (const b of $('mult').children) b.classList.toggle('on', +b.dataset.n === this.mult); }

    toggleTab(id) { if (this.tab === id) this.closePanel(); else this.openTab(id); }

    closePanel() { this.tab = null; $('panel').classList.add('hidden'); this.updateHud(); }

    openTab(id) {
      this.tab = id;
      $('panel').classList.remove('hidden');
      for (const b of $('tabs').children) b.classList.toggle('on', b.dataset.tab === id);
      $('mult').classList.toggle('hidden', !['champ', 'outils', 'robots', 'spec', 'marche', 'usine'].includes(id));
      const body = $('panel-body');
      body.innerHTML = '';
      body.scrollTop = 0;
      this.rows.clear();
      this.special = null;
      if (id === 'reglages') this.buildSettings(body);
      else if (id === 'succes') this.buildAchievements(body);
      else if (id === 'prestige') this.buildPrestige(body);
      else if (id === 'spec') this.buildSpec(body);
      else if (id === 'pets') this.buildPets(body);
      else if (id === 'marche') this.buildMarket(body);
      else if (id === 'usine') this.buildFactory(body);
      this.update();
      this.updateHud();
    }

    // Lignes génériques d'achat, mises à jour sans recréer le DOM (pour ne pas perdre les clics).
    renderRows(container, items) {
      const seen = new Set();
      for (const it of items) {
        seen.add(it.key);
        let r = this.rows.get(it.key);
        if (!r) {
          const row = el('div', 'row');
          const ico = el('img', 'ico');
          const info = el('div', 'info');
          const ttl = el('div', 'ttl');
          const name = el('span', 'name'), lvl = el('span', 'lvl');
          ttl.append(name, lvl);
          const desc = el('div', 'desc');
          info.append(ttl, desc);
          const btns = el('div', 'btns');
          row.append(ico, info, btns);
          container.appendChild(row);
          r = { row, ico, name, lvl, desc, btns, btnMap: new Map() };
          this.rows.set(it.key, r);
        }
        if (it.icon && r.ico.getAttribute('src') !== it.icon) r.ico.src = it.icon;
        setText(r.name, it.title);
        setText(r.lvl, it.level || '');
        setHtml(r.desc, it.desc || '');
        r.row.classList.toggle('locked', !!it.locked);
        for (const bd of it.buttons || []) {
          let b = r.btnMap.get(bd.id);
          if (!b) {
            b = el('button', 'buy');
            b.onclick = () => { const cur = this.rowButtons.get(it.key + '/' + bd.id); if (cur && cur.onClick) { cur.onClick(); this.update(); } };
            r.btns.appendChild(b);
            r.btnMap.set(bd.id, b);
          }
          setText(b, bd.label);
          b.disabled = !bd.enabled;
          b.className = 'buy' + (bd.cls ? ' ' + bd.cls : '');
          b.dataset.tip = bd.tip || '';
          this.rowButtons.set(it.key + '/' + bd.id, bd);
        }
      }
      for (const [k, r] of this.rows) if (!seen.has(k) && r.row.parentNode === container) { r.row.remove(); this.rows.delete(k); }
    }

    buyButton(kind, id, label = 'Acheter') {
      const g = this.game;
      const n = kind === 'seed' ? 1 : this.mult;
      const q = g.quote(kind, id, n);
      if (q.maxed) return { id: 'buy', label: 'MAX', enabled: false };
      if (q.locked) return { id: 'buy', label: 'Verrouillé', enabled: false };
      const cnt = q.count > 1 ? ` ×${q.count}` : '';
      return { id: 'buy', label: `${label}${cnt} · ${fmt(q.total)} $`, enabled: q.affordable, onClick: () => g.buy(kind, id, n) };
    }

    update() {
      if (!this.tab) return;
      this.rowButtons = this.rowButtons || new Map();
      const body = $('panel-body');
      const g = this.game;
      if (this.special) this.special();
      if (this.tab === 'graines') this.renderRows(body, this.seedItems());
      else if (this.tab === 'champ') this.renderRows(body, this.fieldItems());
      else if (this.tab === 'outils') this.renderRows(body, this.upgradeItems('outils'));
      else if (this.tab === 'robots') this.renderRows(body, this.robotItems().concat(this.upgradeItems('robots')));
      else if (this.tab === 'prestige') for (const cat of Object.keys(D.PERK_CATS)) this.renderRows(this.perkBoxes[cat], this.perkItems(cat));
      else if (this.tab === 'spec') for (const b of D.BRANCHES) this.renderRows(this.specBoxes[b.id], this.talentItems(b.id));
      else if (this.tab === 'marche') { this.renderRows(this.mkUps, this.marketItems()); this.renderRows(this.mkStock, this.stockItems()); }
      else if (this.tab === 'usine') { this.renderRows(this.fcBuild, this.factoryItems()); this.renderRows(this.fcStock, this.productItems()); this.renderRows(this.fcFood, this.foodItems()); }
      else if (this.tab === 'pets') { this.renderRows(this.petFood, this.petFoodItems()); this.renderRows(this.petPaths, this.petPathItems()); this.renderRows(this.petTree, this.petNodeItems()); this.renderRows(this.petMast, this.petMasteryItems()); this.renderRows(this.petList, this.petItems()); }
      void g;
    }

    // Contenu d'une ère encore trop lointaine : on le tait (une ère d'avance est visible, verrouillée).
    seedbarKey() { const g = this.game; return Object.keys(g.s.seeds).join() + '|' + g.seasonId + '|' + Object.keys((g.s.seasonShop && g.s.seasonShop.bought) || {}).join(); }
    // Légumes de haut niveau : temps actuel avec tes bonus, et durées incompressibles.
    slowNote(sd) {
      if (!sd.minGrow) return '';
      const t = v => v < 10 ? v.toFixed(1).replace('.', ',') + ' s' : fmtTime(v);
      const now = this.game.seedGrowTime(sd);
      return ` (${t(now)} avec tes bonus, jamais moins de ${t(sd.minGrow)}) · récolte d'au moins ${t(sd.minHarv)} par plant`;
    }
    eraVisible(item) { return (item.pr || 0) <= this.game.prestiges() + 1; }
    eraNote(item) { return this.game.eraOk(item) ? '' : ` <span style="color:var(--bad)">Se débloque après ${item.pr} renaissance${item.pr > 1 ? 's' : ''}.</span>`; }

    seedItems() {
      const g = this.game;
      const items = [{
        key: 'auto', icon: S.iconURL('auto', 4), title: 'Auto', desc: 'Chaque parcelle plante la graine la plus chère débloquée.',
        buttons: [
          { id: 'all', label: 'Partout', enabled: true, tip: 'Mettre toutes les parcelles en Auto', onClick: () => g.setAllPlots('auto') },
          { id: 'brush', label: 'Pinceau', enabled: true, cls: g.brush === 'auto' ? 'on' : '', onClick: () => { g.brush = g.brush === 'auto' ? null : 'auto'; this.refreshSeedbar(); } },
        ],
      }];
      // Saison en cours : ses bonus et ses deux plantes (à acheter à chaque saison, prix figé à son début).
      const season = g.seasonDef();
      if (season) {
        const end = g.seasonInfo.end ? g.seasonInfo.end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : '';
        items.push({ key: 'season', icon: S.iconURL('prestige', 3), title: `${season.name} à la ferme`, level: end ? `jusqu’au ${end}` : '', desc: `${season.desc} ${season.boosts.join(' · ')}.`, buttons: [] });
        for (const sd of g.seasonSeeds()) {
          const val = g.seedValue(sd) * g.valueMult() * g.harvestMult(sd, g.robotCount() ? 'robot' : 'farmer') * g.fxValue(sd);
          items.push({
            key: 'ss-' + sd.id, icon: S.seedIconURL(sd, 3), title: sd.name + ' (saison)',
            desc: `<span class="muted">${D.FAMILIES[sd.fam].name}</span> · ${sd.desc} Pousse en ${fmtTime(sd.grow)}${this.slowNote(sd)} · vaut <b>${fmt(val)} $</b>.`,
            locked: !g.seasonSeedBought(sd.id),
            buttons: g.seasonSeedBought(sd.id) ? [
              { id: 'all', label: 'Partout', enabled: true, onClick: () => g.setAllPlots(sd.id) },
              { id: 'brush', label: 'Pinceau', enabled: true, cls: g.brush === sd.id ? 'on' : '', onClick: () => { g.brush = g.brush === sd.id ? null : sd.id; this.refreshSeedbar(); } },
            ] : [{ ...this.buyButton('sseed', sd.id, 'Acheter pour la saison'), tip: 'Débloquée jusqu’à la fin de la saison, même après une renaissance. Prix fixé au début de la saison.' }],
          });
        }
      }
      let hidden = 0;
      for (const sd of D.SEEDS) {
        if (!this.eraVisible(sd)) { hidden++; continue; }
        const unlocked = !!g.s.seeds[sd.id];
        const val = sd.value * g.valueMult() * g.harvestMult(sd, g.robotCount() ? 'robot' : 'farmer') * g.fxValue(sd);
        const rate = val / sd.grow;
        const fam = D.FAMILIES[sd.fam].name;
        const desc = `<span class="muted">${fam}</span> · ${sd.desc} Pousse en ${fmtTime(sd.grow)}${this.slowNote(sd)} · vaut <b>${fmt(val)} $</b> (${fmt(rate)} $/s par parcelle)`
          + (sd.thirst > 1.2 ? ' · assoiffée' : '') + (sd.night ? ' · nocturne' : '') + (g.marketOn() ? ` · se garde ~${fmtTime(g.shelfLife(sd.id))}` : '') + this.eraNote(sd);
        const buttons = unlocked ? [
          { id: 'all', label: 'Partout', enabled: true, tip: 'Planter cette graine sur toutes les parcelles', onClick: () => g.setAllPlots(sd.id) },
          { id: 'brush', label: 'Pinceau', enabled: true, cls: g.brush === sd.id ? 'on' : '', tip: 'Puis clique sur les parcelles', onClick: () => { g.brush = g.brush === sd.id ? null : sd.id; this.refreshSeedbar(); } },
        ] : [this.buyButton('seed', sd.id, 'Débloquer')];
        items.push({ key: sd.id, icon: S.seedIconURL(sd, 3), title: sd.name, desc, locked: !unlocked, buttons });
      }
      if (hidden) items.push({ key: 'mystery', icon: S.iconURL('prestige', 3), title: `??? · encore ${hidden} graine${hidden > 1 ? 's' : ''} à découvrir`, desc: 'De nouvelles graines apparaissent à chaque renaissance.', buttons: [] });
      return items;
    }

    fieldItems() {
      const g = this.game;
      const items = [{
        key: 'plot', icon: S.iconURL('field', 3), title: 'Nouvelle parcelle', level: `${g.s.plots.length} / ${g.maxPlots}`,
        desc: 'Agrandit le champ vers la droite, jusqu\'au bout de l\'écran. Le prix dépend du nombre total de plants.', buttons: [this.buyButton('plot')],
      }];
      // Cultures denses : on n'affiche un niveau que si le précédent existe.
      for (let t = 1; t < D.DENSE.length; t++) {
        const d = D.DENSE[t], prev = D.DENSE[t - 1];
        if (t > 1 && !g.tierCount(t - 1) && !g.tierCount(t)) break;
        items.push({
          key: 'dense-' + d.id, icon: S.iconURL('field', 3), title: d.name, level: `${g.tierCount(t)} parcelle(s) · ${d.plants} plants`,
          desc: d.desc + (g.tierCount(t - 1) < 3 ? ` <span style="color:var(--bad)">Requiert 3 × ${prev.name.toLowerCase()} (${g.tierCount(t - 1)})</span>` : ''),
          locked: g.tierCount(t - 1) < 3, buttons: [this.buyButton('merge', t, 'Fusionner')],
        });
      }
      items.push(...this.upgradeItems('champ'));
      return items;
    }

    upgradeItems(tab) {
      const g = this.game;
      // La miniaturisation d'un modèle n'apparaît qu'une fois assez de robots de ce modèle ; une ère d'avance est visible.
      return D.UPGRADES.filter(u => u.tab === tab && this.eraVisible(u) && (!u.needRobots || g.lvl(u.id) || (g.s.robots[u.needRobots.id] || 0) >= u.needRobots.n)).map(u => {
        const max = g.upMax(u.id);
        const level = u.max === 1 ? (g.lvl(u.id) ? 'acquis' : '') : `niv. ${g.lvl(u.id)}${max < 900 ? ' / ' + max : ''}`;
        return { key: u.id, icon: S.iconURL(u.tab === 'robots' ? 'robots' : u.tab === 'champ' ? 'field' : 'tools', 3), title: u.name, level, desc: u.desc + this.upEffect(u.id) + this.eraNote(u), locked: !g.eraOk(u), buttons: [this.buyButton('up', u.id)] };
      });
    }

    upEffect(id) {
      const g = this.game, l = g.lvl(id);
      const pct = v => ` <b>(${v >= 0 ? '+' : ''}${Math.round(v * 100)}%)</b>`;
      switch (id) {
        case 'bottes': return pct(0.12 * l);
        case 'engrais': return pct(0.1 * l);
        case 'compost': return ` <b>(×${fmt(Math.pow(1.12, l))})</b>`;
        case 'contrat': return ` <b>(×${fmt(Math.pow(1.4, l))})</b>`;
        case 'irrigation': return ` <b>(${l} irriguées)</b>`;
        case 'batterie': return pct(0.15 * l);
        case 'panier': return ` <b>(${5 * l}%)</b>`;
        case 'mainverte': return ` <b>(${5 + 2 * l}% par clic)</b>`;
        default: return '';
      }
    }

    robotItems() {
      const g = this.game;
      const bat = {
        key: 'r-bat', icon: S.iconURL('robots', 3), title: 'Recharge',
        level: `${g.chargingCount()} / ${g.chargeSlots()} places`,
        desc: `${g.queueCount()} robot(s) en route ou en attente · autonomie ${fmtTime(g.batteryCapacity())} de travail · recharge complète en ${fmtTime(D.BATTERY.charge / (1 + 0.3 * g.lvl('charge_rapide')))}`
          + (g.evActive('outage') ? ' · <b style="color:var(--bad)">PANNE DE COURANT</b>' : ''),
        buttons: [],
      };
      const stats = r => r.only === 'none' ? '' : ` Vitesse ×${(r.walk / D.FARMER.walk).toFixed(1)}, travail ×${(1 / r.act).toFixed(1)}${r.noBattery ? ', sans batterie' : ''}.`;
      // Robots polyvalents : on achète des rouillés, puis on les transforme un par un au rang suivant.
      const chain = D.ROBOT_CHAIN.filter(r => this.eraVisible(r) && (r.chain === 0 || g.eraOk(r) || g.eraOk(D.ROBOT_CHAIN[r.chain - 1]))).map(r => {
        const next = g.chainNext(r.id), n = g.s.robots[r.id] || 0;
        const buttons = [];
        if (r.chain === 0) buttons.push(this.buyButton('robot', r.id));
        if (next) buttons.push({ ...this.buyButton('rupgrade', r.id, 'Améliorer'), id: 'up', tip: `Transforme un ${r.name.toLowerCase()} en ${next.name.toLowerCase()}.` });
        const head = r.chain === 0 ? ` <span class="muted">On n'achète que des rouillés, puis on les améliore un par un.</span>` : '';
        const up = next ? (g.eraOk(next) ? ` Améliorable en <b>${next.name}</b>.` : ` <span class="muted">${next.name} : après ${next.pr} renaissance${next.pr > 1 ? 's' : ''}.</span>`) : ' <b>Dernier rang.</b>';
        return {
          key: 'r-' + r.id, icon: S.robotIconURL(r.id), title: `${r.chain + 1}. ${r.name}`, level: r.chain === 0 ? `${n} · total ${g.chainCount()} / ${g.chainMax()}` : `${n}`,
          desc: r.desc + stats(r) + (g.eraOk(r) ? up : this.eraNote(r)) + head, locked: !g.eraOk(r), buttons,
        };
      });
      const specialists = D.ROBOTS.filter(r => r.chain == null && this.eraVisible(r)).map(r => ({
        key: 'r-' + r.id, icon: S.robotIconURL(r.id), title: r.name, level: `${g.s.robots[r.id] || 0} / ${g.robotMax(r.id)}`,
        desc: `<span class="muted">Spécialiste</span> · ${r.desc}` + stats(r) + this.eraNote(r),
        locked: !g.eraOk(r), buttons: [this.buyButton('robot', r.id)],
      }));
      return [bat, ...chain, ...specialists];
    }

    buildSpec(body) {
      const head = el('div', 'box');
      body.appendChild(head);
      this.specBoxes = {};
      const heads = {};
      for (const b of D.BRANCHES) {
        heads[b.id] = el('div', 'spec-head');
        this.specBoxes[b.id] = el('div');
        body.append(heads[b.id], this.specBoxes[b.id]);
      }
      this.special = () => {
        const g = this.game;
        setHtml(head, `Choisis ta voie : chaque niveau acheté dans une branche rend les <b>autres</b> branches ${Math.round((D.SPEC_PENALTY - 1) * 100)}% plus chères. Tout est remis à zéro à la renaissance : change de stratégie à chaque partie !`);
        for (const b of D.BRANCHES) {
          let h = `<b>${b.name}</b>${b.group ? ' (doctrine, exclusive)' : ''} · niv. ${g.branchLevels(b.id)} <span class="muted">— ${b.desc}</span>`;
          if (g.branchLocked(b.id)) h += ' <span style="color:var(--bad)">Verrouillée pour cette partie.</span>';
          if (b.id === 'bio' && g.bio()) h += `<br><span class="muted">Valeur ×${fmt(D.BIO.value * Math.pow(1.2, g.tal('label')))} · croissance ×${(D.BIO.growth + 0.03 * g.tal('purin')).toFixed(2)} · ravageurs : 1 toutes les ~${fmtTime(D.BIO.pestEvery / Math.max(0.01, 1 - 0.15 * g.tal('coccinelles')))} par plante</span>`;
          if (b.id === 'science' && g.science()) h += `<br><span class="muted">Rendement ×${fmt(g.ogmYield())} · valeur unitaire ×${g.ogmUnit().toFixed(2)} · mutations ${Math.round((D.SCIENCE.mutation + 0.01 * g.tal('ogm')) * 100)}% · risque d'épidémie ${Math.round(g.blightRisk() * 100)}% (espèce dominante : ${Math.round(g.monoculture().share * 100)}% du champ)</span>`;
          setHtml(heads[b.id], h);
        }
      };
    }

    talentItems(branch) {
      const g = this.game;
      const icon = S.iconURL('spec', 3);
      const locked = g.branchLocked(branch);
      return D.TALENTS.filter(t => t.branch === branch).map(t => {
        const req = Object.entries(t.req || {}).filter(([k, v]) => g.tal(k) < v).map(([k]) => C.TAL_BY_ID[k].name).join(', ');
        return {
          key: 't-' + t.id, icon, title: t.name, level: t.max > 1 ? `niv. ${g.tal(t.id)} / ${t.max}` : (g.tal(t.id) ? 'acquis' : ''),
          desc: t.desc + (req && !locked ? ` <span style="color:var(--bad)">Requiert : ${req}</span>` : ''),
          locked: locked || !!req, buttons: [this.buyButton('tal', t.id)],
        };
      });
    }

    buildMarket(body) {
      const head = el('div', 'box');
      const demands = el('div', 'box');
      this.mkStock = el('div');
      this.mkUps = el('div');
      const prices = el('div', 'box muted');
      const sellAll = el('button', 'buy gold', 'Tout vendre');
      sellAll.onclick = () => { this.game.sellAll(); this.update(); };
      const bar = el('div', 'set');
      bar.append(el('span', 'muted', 'Stock des silos (clic sur un silo dans le champ = tout vendre)'), sellAll);
      const shocks = el('div', 'box');
      body.append(head, shocks, demands, bar, this.mkStock, prices, el('div', 'spec-head', 'Silos, trader et gestionnaire'), this.mkUps);
      this.special = () => {
        const g = this.game, M = D.MARKET;
        const on = g.marketOn();
        sellAll.disabled = !g.stockUnits();
        for (const e of [demands, bar, prices, shocks]) e.classList.toggle('hidden', !on);
        if (!g.s.market.unlocked) {
          setHtml(head, `Le marché se débloque quand tu as gagné <b>${fmt(M.unlockAt)} $</b> dans une même partie (actuellement ${fmt(g.s.runEarned)} $). Ensuite il reste débloqué pour toujours.`);
          return;
        }
        if (!on) { setHtml(head, 'Achète la <b>licence de trading</b> pour stocker tes récoltes et les revendre au cours du marché. Sans silo, tout part au marché classique à 75%.'); return; }
        const staff = [g.lvl('trader') ? `trader actif (commission ${Math.round(g.traderCommission() * 100)}%)` : 'pas de trader', g.lvl('gestion') ? `gestionnaire sur ${Math.round(Math.min(1, 0.25 * (1 + g.lvl('gestion_part'))) * 100)}% du champ` : 'pas de gestionnaire'];
        setHtml(head, `Silos : <b>${fmt(g.stockUnits())} / ${fmt(g.siloCapacity())}</b> unités · valeur au cours ≈ <b>${fmt(g.stockWorth())} $</b> · surplus au marché classique : ${Math.round(M.surplus * 100)}% · ${staff.join(' · ')}`);
        const ks = g.s.trade.shocks;
        shocks.classList.toggle('hidden', !ks.length);
        setHtml(shocks, ks.map(k => k.kind === 'shortage'
          ? `<b style="color:var(--ok)">Pénurie de ${C.SEED_BY_ID[k.seed].name}</b> : cours ×${k.mult.toFixed(1)} (encore ${fmtTime(k.t)})`
          : `<b style="color:var(--bad)">Krach du ${C.SEED_BY_ID[k.seed].name}</b> : cours ×${k.mult.toFixed(2)} (encore ${fmtTime(k.t)})`).join('<br>'));
        const ds = g.s.trade.demands;
        setHtml(demands, ds.length ? `<b>Commandes</b> <span class="muted">(${ds.length} / ${g.demandCap()}, payées à parité avec ton meilleur légume)</span><br>` + ds.map(d => `${C.SEED_BY_ID[d.seed].name}${d.trait !== 'any' ? ' <b>' + D.TRAITS[d.trait].name + '</b>' : ''} : <b>×${fmt(d.mult)}</b> pour ${fmt(d.left)} unités (encore ${fmtTime(d.t)})`).join('<br>') : '<span class="muted">Aucune commande pour le moment.</span>');
        const unlocked = D.SEEDS.filter(sd => g.s.seeds[sd.id]);
        setHtml(prices, 'Cours : ' + unlocked.map(sd => {
          const f = g.seedPrice(sd.id);
          const c = f >= 1.2 ? 'var(--ok)' : f <= 0.8 ? 'var(--bad)' : 'var(--text)';
          return `${sd.name} <span style="color:${c}">×${f.toFixed(2)}</span>`;
        }).join(' · '));
      };
    }

    marketItems() {
      const g = this.game;
      const items = D.UPGRADES.filter(u => u.tab === 'marche').map(u => {
        const req = Object.entries(u.req || {}).filter(([k, v]) => g.lvl(k) < v).map(([k]) => C.UP_BY_ID[k].name).join(', ');
        return {
          key: u.id, icon: S.iconURL('market', 3), title: u.name, level: u.max === 1 ? (g.lvl(u.id) ? 'acquis' : '') : `niv. ${g.lvl(u.id)} / ${u.max}`,
          desc: u.desc + (req ? ` <span style="color:var(--bad)">Requiert : ${req}</span>` : ''), locked: !g.upReqOk(u.id), buttons: [this.buyButton('up', u.id)],
        };
      });
      const silos = [{
        key: 'silo', icon: S.iconURL('market', 3), title: 'Silo', level: `${g.s.trade.silos} / ${D.MARKET.siloMax} emplacements`,
        desc: `Stocke ${fmt(D.MARKET.siloCap * (1 + 0.5 * g.lvl('silo_cap')))} unités de récolte. Capacité totale : ${fmt(g.siloCapacity())} unités (${fmt(g.siloEquiv())} silos équivalents).`, locked: !g.marketOn(), buttons: [this.buyButton('silo', null, 'Construire')],
      }];
      // Fusion des silos : on n'affiche un niveau que si le précédent existe.
      for (let t = 1; t < D.SILO_TIERS.length; t++) {
        const T = D.SILO_TIERS[t], prev = D.SILO_TIERS[t - 1];
        if (!g.marketOn() || (t > 1 && !g.siloTierCount(t - 1) && !g.siloTierCount(t))) break;
        silos.push({
          key: 'smerge-' + T.id, icon: S.iconURL('market', 3), title: T.name, level: `${g.siloTierCount(t)} silo(s) · ×${T.mult}`,
          desc: T.desc + ' Libère 2 emplacements pour construire d’autres silos.' + (g.siloTierCount(t - 1) < 3 ? ` <span style="color:var(--bad)">Requiert 3 × ${prev.name.toLowerCase()} (${g.siloTierCount(t - 1)})</span>` : ''),
          locked: g.siloTierCount(t - 1) < 3, buttons: [this.buyButton('smerge', t, 'Fusionner')],
        });
      }
      items.splice(1, 0, ...silos);
      return items;
    }

    stockItems() {
      const g = this.game;
      return Object.entries(g.s.trade.stock).sort((a, b) => b[1].units * b[1].worth - a[1].units * a[1].worth).map(([key, e]) => {
        const f = g.priceFactor(e, e.units);
        const d = g.demandFor(e);
        const c = f >= 1.2 ? 'var(--ok)' : f <= 0.8 ? 'var(--bad)' : 'var(--text)';
        const fc = e.fresh > 0.7 ? 'var(--ok)' : e.fresh > 0.35 ? 'var(--gold)' : 'var(--bad)';
        return {
          key: 'st-' + key, icon: S.seedIconURL(C.SEED_BY_ID[e.seed], 3), title: g.productName(e), level: `${fmt(e.units)} unités`,
          desc: `Cours <span style="color:${c}">×${f.toFixed(2)}</span>${d ? ' (commande ×' + fmt(d.mult) + ')' : ''} · fraîcheur <span style="color:${fc}">${Math.round(e.fresh * 100)}%</span> · tout vendre ≈ <b>${fmt(e.units * e.worth * e.fresh * f)} $</b>`,
          buttons: [
            { id: 'q', label: 'Vendre 25%', enabled: true, onClick: () => g.sellStock(key, 0.25) },
            { id: 'a', label: 'Tout', enabled: true, cls: 'gold', onClick: () => g.sellStock(key, 1) },
          ],
        };
      });
    }

    // Onglet Usine : bâtiment, machines (et leur recette), robots, frigos, améliorations, produits, gamelles.
    buildFactory(body) {
      const head = el('div', 'box');
      const sell = el('button', 'buy gold', 'Tout vendre');
      sell.onclick = () => { this.game.sellAllProducts(); this.update(); };
      const bar = el('div', 'set');
      bar.append(el('span', 'muted', 'Frigos (clic sur un frigo dans l’usine = tout vendre avec le trader)'), sell);
      this.fcBuild = el('div');
      this.fcStock = el('div');
      this.fcFood = el('div');
      const book = el('div', 'box muted');
      body.append(head, el('div', 'spec-head', 'Usine, machines et robots'), this.fcBuild, bar, this.fcStock,
        el('div', 'spec-head', 'Cuisine pour compagnons'), this.fcFood, el('div', 'spec-head', 'Livre de recettes'), book);
      setHtml(book, D.RECIPES.map(r => `<b>${r.name}</b> (${C.MACHINE_BY_ID[r.machine].name}) : ` + r.inputs.map(i => `${i.n} ${i.seed ? C.SEED_BY_ID[i.seed].name : D.FAMILIES[i.fam].name.toLowerCase()}${i.gold ? ' <span style="color:var(--gold)">doré(e)s</span>' : ''}`).join(' + ') + ` → ${r.out} · valeur ×${r.mult}`).join('<br>'));
      this.special = () => {
        const g = this.game, F = D.FACTORY;
        sell.disabled = !g.fridgeUnits();
        bar.classList.toggle('hidden', !g.factoryOn());
        if (!g.factoryUnlocked()) { setHtml(head, `L'usine de transformation se débloque après <b>${F.pr} renaissances</b> (tu en as ${g.prestiges()}). Elle transforme les récoltes des silos en compotes, tartes, glaces, parfums… et en nourriture pour tes compagnons.`); return; }
        if (!g.factoryOn()) { setHtml(head, 'Construis l’<b>usine</b> : elle prend ses ingrédients dans tes silos (il faut la licence de trading et des silos). Ensuite, clique sur la grange pour passer à l’usine, et sur l’usine pour revenir au champ.'); return; }
        const staff = [g.lvl('trader_usine') ? `trader de produits (commission ${Math.round(g.factoryCommission() * 100)}%)` : `pas de trader : le grossiste paie ${Math.round(F.wholesale * 100)}%`, g.lvl('gestion_usine') ? 'gestionnaire d’usine' : 'pas de gestionnaire'];
        const busy = g.s.factory.machines.filter(m => m.st).length;
        const target = g.s.factory.target ? C.FOOD_BY_ID[g.s.factory.target].name : null;
        setHtml(head, `Machines : <b>${busy} / ${g.s.factory.machines.length}</b> au travail · lots de ${g.lotSize()} · frigos <b>${fmt(g.fridgeUnits())} / ${fmt(g.fridgeCapacity())}</b> (≈ ${fmt(g.fridgeWorth())} $)<br>${staff.join(' · ')}`
          + (target ? `<br>Nourriture visée : <b>${target}</b>` : '') + ` <span class="muted">· clique sur l’usine pour revenir au champ</span>`);
      };
    }

    factoryItems() {
      const g = this.game, F = D.FACTORY;
      const ups = D.UPGRADES.filter(u => u.tab === 'usine');
      const upRow = u => {
        const req = Object.entries(u.req || {}).filter(([k, v]) => g.lvl(k) < v).map(([k]) => C.UP_BY_ID[k].name).join(', ');
        return {
          key: u.id, icon: S.iconURL(u.id === 'cuisine' ? 'food' : 'factory', 3), title: u.name, level: u.max === 1 ? (g.lvl(u.id) ? 'acquis' : '') : `niv. ${g.lvl(u.id)} / ${u.max}`,
          desc: u.desc + this.eraNote(u) + (req ? ` <span style="color:var(--bad)">Requiert : ${req}</span>` : ''), locked: !g.eraOk(u) || !g.upReqOk(u.id), buttons: [this.buyButton('up', u.id, u.id === 'usine' ? 'Construire' : 'Acheter')],
        };
      };
      const items = [upRow(ups[0])];
      if (!g.factoryOn()) return items;
      for (const m of D.MACHINES) {
        const cur = g.machineRecipe(m.id);
        const opts = ['auto', ...D.RECIPES.filter(r => r.machine === m.id).map(r => r.id)];
        const label = cur === 'auto' ? (g.lvl('gestion_usine') ? 'Auto (gestionnaire)' : 'Auto') : C.RECIPE_BY_ID[cur].name;
        const n = g.machineCount(m.id);
        items.push({
          key: 'mc-' + m.id, icon: S.iconURL('factory', 3), title: m.name, level: `${n} / ${m.max}`,
          desc: m.desc + ` Vitesse ×${fmt(g.machineSpeed(m.id))}.` + this.eraNote(m), locked: !g.eraOk(m),
          buttons: [
            { id: 'rc', label: 'Recette : ' + label, enabled: n > 0, onClick: () => g.setMachineRecipe(m.id, opts[(opts.indexOf(cur) + 1) % opts.length]) },
            this.buyButton('machine', m.id),
          ],
        });
      }
      for (const r of D.FACTORY_ROBOTS) items.push({ key: 'fr-' + r.id, icon: S.iconURL('robots', 3), title: r.name, level: `${g.s.factory.robots[r.id] || 0} / ${r.max}`, desc: r.desc, buttons: [this.buyButton('frobot', r.id)] });
      items.push({ key: 'fridge', icon: S.iconURL('factory', 3), title: 'Frigo', level: `${g.s.factory.fridges} / ${F.fridgeMax}`, desc: `Stocke ${fmt(F.fridgeCap * (1 + 0.5 * g.lvl('frigo_xxl')))} produits transformés. Frigo plein : le grossiste prend le reste.`, buttons: [this.buyButton('fridge', null, 'Installer')] });
      for (const u of ups.slice(1)) items.push(upRow(u));
      return items;
    }

    productItems() {
      const g = this.game;
      return Object.entries(g.s.factory.stock).sort((a, b) => g.productWorth(b[1]) - g.productWorth(a[1])).map(([k, e]) => {
        const r = C.RECIPE_BY_ID[k], f = g.productPrice(k);
        const fc = e.fresh > 0.7 ? 'var(--ok)' : e.fresh > 0.35 ? 'var(--gold)' : 'var(--bad)';
        const course = g.lvl('trader_usine') ? `cours ×${(f / D.FACTORY.premium).toFixed(2)}` : 'grossiste';
        return {
          key: 'pr-' + k, icon: S.iconURL('food', 3), title: r.name, level: `${fmt(e.units)} unités`,
          desc: `${course} · fraîcheur <span style="color:${fc}">${Math.round(e.fresh * 100)}%</span> · tout vendre ≈ <b>${fmt(g.productWorth(e))} $</b>`,
          buttons: [{ id: 'q', label: 'Vendre 25%', enabled: true, onClick: () => g.sellProduct(k, 0.25) }, { id: 'a', label: 'Tout', cls: 'gold', enabled: true, onClick: () => g.sellProduct(k, 1) }],
        };
      });
    }

    foodItems() {
      const g = this.game;
      if (!g.factoryUnlocked()) return [];
      return D.PET_FOODS.filter(f => !f.season).map(f => {
        const r = C.RECIPE_BY_ID[f.recipe], have = g.s.factory.stock[f.recipe];
        const owned = g.s.pantry[f.id] || 0;
        const targeted = g.s.factory.target === f.id;
        const pathName = id => { for (const p of D.PETS) { const q = p.paths.find(x => x.id === id); if (q) return q.name; } return id; };
        const fx = f.special.map(x => `<b>${x.path ? pathName(x.path) : C.PET_BY_ID[x.pet].name}</b> : ${x.desc}` + (x.bal === 'R' ? ' <span style="color:var(--ok)">(+ sa contrepartie disparaît)</span>' : Array.isArray(x.bal) ? ` <span style="color:var(--bad)">Contrepartie : ${D.foodEffect(x.pet || D.PETS.find(p => p.paths.some(q => q.id === x.path)).id, x.path || null, f.id).malus}.</span>` : '')).join('<br>');
        return {
          key: 'fd-' + f.id, icon: S.iconURL('food', 3), title: f.name, level: owned ? `${owned} au placard` : '',
          desc: `${f.units} × ${r.name} (${have ? fmt(have.units) : 0} au frigo) + frais ≈ ${fmt(g.foodFee(f.id) || 0)} $. Pour tous : ${f.any.desc}<br>${fx}`,
          buttons: [
            { id: 't', label: targeted ? 'Visée ✓' : 'Viser', enabled: g.lvl('gestion_usine') > 0, tip: 'Le gestionnaire d’usine fait pousser, fabriquer puis cuisiner cette gamelle.', onClick: () => g.setFoodTarget(targeted ? null : f.id) },
            { id: 'c', label: 'Cuisiner', cls: 'gold', enabled: g.canCraftFood(f.id), onClick: () => g.craftFood(f.id) },
          ],
        };
      });
    }

    // Gamelles : celle du compagnon choisi, et celles du placard.
    petFoodItems() {
      const g = this.game, pet = g.s.pets.list[this.petSlot];
      if (!pet) return [];
      const items = [];
      // Cuisine de saison : seulement pendant la fête, avec les légumes de saison récoltés.
      for (const f of g.seasonFoods()) {
        const need = f.ingredients.map(i => `${Math.min(g.s.basket[i.seed] || 0, i.n)} / ${i.n} ${C.SEED_BY_ID[i.seed].name}`).join(' · ');
        items.push({
          key: 'sf-' + f.id, icon: S.iconURL('food', 3), title: f.name + ' (gamelle de saison)', level: (g.s.pantry[f.id] || 0) ? `${g.s.pantry[f.id]} au placard` : '',
          desc: `${f.any.desc} <span style="color:var(--bad)">Contrepartie : ${f.any.malus}.</span>${f.special.length ? ` <span style="color:var(--gold)">Effets spéciaux : ${f.special.map(x => C.PET_BY_ID[x.pet].name).join(', ')}.</span>` : ''} <span class="muted">Ingrédients : ${need} + ${fmt(g.seasonFoodFee())} $. Se cuisine seulement pendant la fête, se garde ensuite. La retirer la détruit.</span>`,
          buttons: [{ id: 'c', label: 'Cuisiner', cls: 'gold', enabled: g.canCraftSeasonFood(f.id), onClick: () => g.craftSeasonFood(f.id) }],
        });
      }
      if (!g.factoryUnlocked() && !items.length && !Object.keys(g.s.pantry).length && !pet.food) return [];
      for (const f of D.PET_FOODS) {
        const owned = g.s.pantry[f.id] || 0, on = pet.food === f.id;
        if (!owned && !on) continue;
        const eff = g.foodEffectFor(pet, f.id);
        const special = eff.special;
        items.push({
          key: 'pf-' + pet.uid + f.id, icon: S.iconURL('food', 3), title: f.name + (on ? ' (équipée)' : ''), level: owned ? `${owned} au placard` : '',
          desc: (f.lost ? `<b style="color:var(--gold)">Gamelle de saison${special ? ' · costume de ' + D.SEASONS.find(x => x.id === f.season).name : ''}.</b> ` : special ? '<b style="color:var(--gold)">Effet spécial !</b> ' : '') + eff.desc + (eff.relief ? ` <span style="color:var(--ok)">Plus de contrepartie : ${eff.relief}.</span>` : '') + (eff.malus ? ` <span style="color:var(--bad)">Contrepartie : ${eff.malus}.</span>` : ''),
          buttons: [on ? (f.lost
            ? { id: 'e', label: this.foodArmed === pet.uid ? 'Confirmer (détruite)' : 'Retirer et perdre', cls: this.foodArmed === pet.uid ? 'gold' : '', enabled: true, onClick: () => { if (this.foodArmed === pet.uid) { this.foodArmed = null; g.equipFood(pet, null); } else this.foodArmed = pet.uid; } }
            : { id: 'e', label: 'Retirer', enabled: true, onClick: () => g.equipFood(pet, null) })
            : { id: 'e', label: 'Donner', cls: 'gold', enabled: owned > 0, tip: f.lost ? 'Gamelle de saison : la retirer plus tard la détruira.' : '', onClick: () => g.equipFood(pet, f.id) }],
        });
      }
      if (!items.length) items.push({ key: 'pf-none', icon: S.iconURL('food', 3), title: 'Aucune gamelle', desc: 'Cuisine des gamelles à l’usine (onglet Usine, « Cuisine pour animaux ») : chacune change les capacités de ton compagnon tant qu’il la porte.', buttons: [] });
      return items;
    }

    // Onglet Compagnons : un emplacement par renaissance ; on choisit un emplacement pour voir son arbre ou y adopter.
    buildPets(body) {
      const head = el('div', 'box');
      this.petSlotsBox = el('div', 'pet-slots');
      this.petPathHead = el('div', 'spec-head');
      this.petPaths = el('div');
      this.petTreeHead = el('div', 'spec-head');
      this.petTree = el('div');
      this.petMastHead = el('div', 'spec-head');
      this.petMast = el('div');
      this.petListHead = el('div', 'spec-head');
      this.petList = el('div');
      this.petFoodHead = el('div', 'spec-head');
      this.petFood = el('div');
      body.append(head, this.petSlotsBox, this.petFoodHead, this.petFood, this.petPathHead, this.petPaths, this.petTreeHead, this.petTree, this.petMastHead, this.petMast, this.petListHead, this.petList);
      this.petSlot = Math.min(this.petSlot || 0, this.game.petSlots() - 1);
      this.special = () => {
        const g = this.game;
        this.renderPetSlots();
        const pet = g.s.pets.list[this.petSlot];
        this.petTreeHead.classList.toggle('hidden', !pet);
        this.petFoodHead.classList.toggle('hidden', !pet || (!g.factoryUnlocked() && !g.seasonFoods().length && !Object.keys(g.s.pantry).length));
        setHtml(this.petFoodHead, '<b>Nourriture</b> <span class="muted">— active tant qu’elle est équipée</span>');
        this.petMastHead.classList.toggle('hidden', !pet || !pet.path);
        setHtml(this.petListHead, pet ? 'Remplacer ce compagnon <span class="muted">(sa progression sera perdue)</span>' : 'Adopter un compagnon dans cet emplacement');
        if (!pet) {
          setHtml(head, `Emplacement ${this.petSlot + 1} libre. Tu as <b>${g.petSlots()}</b> emplacement(s)` + (g.nextPetSlotAt() != null ? ` ; le prochain arrive à la renaissance n° ${g.nextPetSlotAt()} (emplacements aux renaissances ${D.PRESTIGE.petSlotAt.slice(1).join(', ')}).` : ' : le maximum.') + ' Le même animal peut en occuper plusieurs.');
          return;
        }
        const def = C.PET_BY_ID[pet.id], pr = g.petProgress(pet);
        const xp = pr.need ? `${Math.floor(pr.xp)} / ${Math.ceil(pr.need)} XP` : 'niveau max';
        const lvlTxt = pr.level > D.PET_LEVEL.max ? `niv. ${D.PET_LEVEL.max} + maîtrise ${pr.level - D.PET_LEVEL.max}` : `niv. ${pr.level}`;
        setHtml(head, `<b>${g.petName(pet)}</b> · ${lvlTxt} / ${pr.top} (${xp}) · <b>${g.petPoints(pet)}</b> point(s)`
          + (pet.path ? ` · <b>${g.masteryPoints(pet)}</b> point(s) de maîtrise` : '') + '<br>'
          + `${def.desc}<br><span style="color:var(--bad)">${def.malus}</span><br><span class="muted">Idéal avec : ${def.meta}. Il revient au niveau 0 à chaque renaissance. Clique sur lui dans le champ pour le caresser (+XP).</span>`);
        setHtml(this.petTreeHead, '<b>Arbre</b>');
        setHtml(this.petMastHead, '<b>Maîtrise</b> <span class="muted">— niveaux 21 à 30, une fois la voie choisie</span>');
      };
    }

    renderPetSlots() {
      const g = this.game, box = this.petSlotsBox;
      const n = g.petSlots();
      const key = n + '|' + g.s.pets.list.map(p => p.uid + g.petLook(p)).join(',') + '|' + this.petSlot;
      if (box._k === key) return;
      box._k = key;
      box.innerHTML = '';
      for (let i = 0; i < n; i++) {
        const pet = g.s.pets.list[i];
        const b = el('button', 'pet-slot' + (i === this.petSlot ? ' on' : ''));
        const img = el('img');
        img.src = pet ? S.petIconURL(pet.id, g.petLook(pet), 3) : S.iconURL('pets', 3);
        b.append(img, el('span', null, pet ? g.petName(pet) : 'Libre'));
        b.onclick = () => { this.petSlot = i; this.update(); };
        box.appendChild(b);
      }
    }

    petPathItems() {
      const g = this.game, pet = g.s.pets.list[this.petSlot];
      this.petPathHead.classList.toggle('hidden', !pet);
      if (!pet) return [];
      const def = C.PET_BY_ID[pet.id];
      const chosen = g.petPath(pet);
      setHtml(this.petPathHead, chosen ? `<b>Voie : ${chosen.name}</b>` : g.canChoosePath(pet) ? '<b>Choisis une voie</b> (jusqu\'à la prochaine renaissance)'
        : `<b>Voies</b> <span class="muted">— se débloquent une fois ${def.evoName} au niveau ${D.PET_LEVEL.max}</span>`);
      return def.paths.map(p => {
        const armed = this.pathArmed === pet.uid + p.id && Date.now() - this.pathArmedT < 4000;
        const btn = chosen ? { id: 'b', label: chosen.id === p.id ? 'Choisie' : '—', enabled: false, cls: chosen.id === p.id ? 'on' : '' }
          : { id: 'b', label: armed ? 'Confirmer ?' : 'Choisir', cls: 'gold', enabled: g.canChoosePath(pet),
            onClick: () => { if (armed) { this.pathArmed = null; g.choosePath(pet, p.id); } else { this.pathArmed = pet.uid + p.id; this.pathArmedT = Date.now(); } } };
        return {
          key: 'path-' + pet.uid + p.id, icon: S.petIconURL(pet.id, p.id), title: p.name, locked: !!chosen && chosen.id !== p.id,
          desc: `${p.desc} <span style="color:var(--bad)">${p.malus}</span>`, buttons: [btn],
        };
      });
    }

    petNodeItems() {
      const g = this.game, pet = g.s.pets.list[this.petSlot];
      if (!pet) return [];
      const def = C.PET_BY_ID[pet.id];
      return def.nodes.map(n => {
        const st = g.petNodeState(pet, n.id);
        const req = Object.entries(n.req || {}).filter(([k, v]) => (pet.nodes[k] || 0) < v)
          .map(([k, v]) => `${def.nodes.find(x => x.id === k).name} ${v}`).join(', ');
        const label = st.maxed ? (n.evo ? 'ÉVOLUÉ' : 'MAX') : `${n.cost} point${n.cost > 1 ? 's' : ''}`;
        return {
          key: 'pn-' + pet.uid + n.id, icon: S.petIconURL(pet.id, n.evo ? 'evo' : 'base'), title: n.name, level: n.max > 1 ? `niv. ${st.level} / ${n.max}` : '',
          desc: n.desc + (req ? ` <span style="color:var(--bad)">Requiert : ${req}</span>` : ''), locked: !st.reqOk,
          buttons: [{ id: 'buy', label, cls: n.evo ? 'gold' : '', enabled: !st.maxed && st.reqOk && st.affordable, onClick: () => g.buyPetNode(pet, n.id) }],
        };
      });
    }

    petMasteryItems() {
      const g = this.game, pet = g.s.pets.list[this.petSlot];
      if (!pet || !pet.path) return [];
      return D.MASTERY.map(m => {
        const lvl = pet.mastery[m.id] || 0;
        return {
          key: 'pm-' + pet.uid + m.id, icon: S.iconURL('prestige', 3), title: m.name, level: `niv. ${lvl} / ${m.max}`, desc: m.desc,
          buttons: [{ id: 'buy', label: lvl >= m.max ? 'MAX' : `${m.cost} point`, cls: 'gold', enabled: lvl < m.max && g.masteryPoints(pet) >= m.cost, onClick: () => g.buyMastery(pet, m.id) }],
        };
      });
    }

    petItems() {
      const g = this.game, slot = this.petSlot;
      const cur = g.s.pets.list[slot];
      return D.PETS.map(p => {
        const cost = g.petCost(p.id);
        const armedKey = slot + p.id;
        let btn;
        if (this.petArmed === armedKey && Date.now() - this.petArmedT < 4000) {
          btn = { id: 'b', label: `Confirmer · ${fmt(cost)} $`, cls: 'gold', enabled: g.s.money >= cost, onClick: () => { this.petArmed = null; g.adoptPet(p.id, slot); } };
        } else {
          const label = cur ? `Remplacer · ${fmt(cost)} $` : `Adopter · ${fmt(cost)} $`;
          const tip = cur ? `${g.petName(cur)} (niv. ${g.petLevel(cur)}) partira : sa progression sera perdue.` : '';
          btn = { id: 'b', label, tip, enabled: g.s.money >= cost && g.eraOk(p), onClick: () => { if (cur) { this.petArmed = armedKey; this.petArmedT = Date.now(); } else g.adoptPet(p.id, slot); } };
        }
        return {
          key: 'pet-' + p.id, icon: S.petIconURL(p.id, 'base'), title: p.name,
          desc: `${p.desc} <span style="color:var(--bad)">${p.malus}</span> Évolue en ${p.evoName}.` + this.eraNote(p),
          locked: !g.eraOk(p), buttons: [btn],
        };
      });
    }

    buildPrestige(body) {
      const info = el('div', 'box');
      body.appendChild(info);
      const act = el('div', 'set');
      const btn = el('button', 'buy gold');
      act.appendChild(el('span', 'muted', 'Recommence avec des graines d\'or. Tu gardes les succès, les talents, les compagnons (remis au niveau 0), et certaines renaissances donnent un emplacement de compagnon de plus. Chaque renaissance débloque de nouvelles graines, robots et améliorations.'));
      act.appendChild(btn);
      body.appendChild(act);
      this.perkBoxes = {};
      for (const [cat, name] of Object.entries(D.PERK_CATS)) {
        body.appendChild(el('div', 'spec-head', name));
        this.perkBoxes[cat] = el('div');
        body.appendChild(this.perkBoxes[cat]);
      }
      btn.onclick = () => {
        if (this.game.prestigeGain() <= 0) return;
        if (Date.now() - this.prestigeArmed > 4000 || !this.prestigeArmed) { this.prestigeArmed = Date.now(); btn.textContent = 'Confirmer ?'; return; }
        this.prestigeArmed = 0;
        this.game.prestige();
        this.buildSeedbar();
      };
      this.special = () => {
        const g = this.game;
        const gain = g.prestigeGain();
        const T = g.prestigeThreshold();
        const next = D.SEEDS.filter(sd => sd.pr === g.prestiges() + 1).map(sd => sd.name);
        setHtml(info, `Graines d'or : <b>${fmt(g.gsAvailable())}</b> disponibles · ${fmt(g.s.gsTotal)} gagnées au total (revenus <b>+${fmt(g.s.gsTotal * D.PRESTIGE.bonus * 100)}%</b>)<br>`
          + `Renaissances : <b>${g.prestiges()}</b> · gagné pendant cette partie : <b>${fmt(g.s.runEarned)} $</b> / seuil <b>${fmt(T)} $</b> (seuil suivant : <b>${fmt(D.threshold(g.prestiges() + 1))} $</b>)`
          + `<br>Renaître maintenant rapporte <b>${fmt(gain)}</b> graine(s) d'or` + (gain ? ` <span class="muted">(aller plus loin en rapporte un peu plus : ${D.PRESTIGE.gsBase} × (gagné / seuil)^${D.PRESTIGE.gsExp})</span>` : '')
          + (next.length ? `<br>La prochaine renaissance débloque : <b>${next.join(', ')}</b>` : '')
          + (g.s.migratedFrom ? '<br><span class="muted">Ta partie vient d\'une ancienne version : tes graines d\'or ont été converties (12 par renaissance) et tes talents remboursés.</span>' : ''));
        if (!this.prestigeArmed || Date.now() - this.prestigeArmed > 4000) { setText(btn, gain > 0 ? `Renaître (+${fmt(gain)})` : 'Pas encore'); this.prestigeArmed = 0; }
        btn.disabled = gain <= 0;
      };
    }

    perkItems(cat) {
      const g = this.game;
      const icon = S.iconURL('prestige', 3);
      return D.PERKS.filter(p => p.cat === cat).map(p => {
        const l = g.perk(p.id);
        const maxed = l >= p.max;
        const cost = g.perkCost(p.id);
        return {
          key: 'p-' + p.id, icon, title: p.name, level: p.max > 1 ? `niv. ${l} / ${p.max}` : (l ? 'acquis' : ''), desc: p.desc,
          buttons: [maxed ? { id: 'buy', label: 'MAX', enabled: false } : { id: 'buy', label: `${fmt(cost)} graine${cost > 1 ? 's' : ''} d'or`, enabled: g.gsAvailable() >= cost, cls: 'gold', onClick: () => g.buyPerk(p.id) }],
        };
      });
    }

    buildAchievements(body) {
      const head = el('div', 'box');
      const grid = el('div', 'ach-grid');
      body.append(head, grid);
      const cells = D.ACHIEVEMENTS.map(a => {
        const c = el('div', 'ach');
        c.append(el('div', 'n', a.name), el('div', 'd', a.desc));
        grid.appendChild(c);
        return [a, c];
      });
      this.special = () => {
        const g = this.game;
        setHtml(head, `<b>${g.achCount()} / ${D.ACHIEVEMENTS.length}</b> succès · chacun donne <b>+${D.ACH_BONUS * 100}%</b> de revenus (total <b>+${Math.round(g.achCount() * D.ACH_BONUS * 100)}%</b>)`);
        for (const [a, c] of cells) c.classList.toggle('done', !!g.s.ach[a.id]);
      };
    }

    buildSettings(body) {
      const api = this.api;
      const s = this.settings || {};
      const line = (label, ctrl, hint) => {
        const r = el('div', 'set');
        const l = el('div'); l.appendChild(el('div', null, label));
        if (hint) l.appendChild(el('div', 'muted', hint));
        r.append(l, ctrl);
        body.appendChild(r);
      };

      const disp = el('select');
      for (const d of s.displays || []) { const o = el('option', null, d.label); o.value = d.id; if (d.id === s.currentDisplay) o.selected = true; disp.appendChild(o); }
      disp.onchange = () => api.setSetting('displayId', +disp.value);
      line('Écran', disp, 'Sur quel moniteur afficher la ferme.');

      const size = el('select');
      for (const [v, l] of [[2, 'Petite (40 px)'], [3, 'Moyenne (60 px)'], [4, 'Grande (80 px)']]) { const o = el('option', null, l); o.value = v; if (v === s.scale) o.selected = true; size.appendChild(o); }
      size.onchange = () => api.setSetting('scale', +size.value);
      line('Taille', size, 'Hauteur de la bande en pixels réels.');

      const op = el('input'); op.type = 'range'; op.min = 0.2; op.max = 1; op.step = 0.05; op.value = s.opacity || 1;
      op.oninput = () => { root.FARM_APP.applyOpacity(+op.value); };
      op.onchange = () => api.setSetting('opacity', +op.value);
      line('Opacité', op);

      const fps = el('select');
      for (const [v, l] of [[60, 'Ultra fluide (60 images/s)'], [30, 'Très fluide (30 images/s)'], [15, 'Fluide (15 images/s)'], [10, 'Équilibrée (10 images/s)'], [5, 'Sobre (5 images/s)']]) { const o = el('option', null, l); o.value = v; if (v === (s.fps || 10)) o.selected = true; fps.appendChild(o); }
      fps.onchange = () => api.setSetting('fps', +fps.value);
      line('Animation', fps, 'Moins d’images par seconde = moins de processeur. Le jeu avance pareil.');

      const al = el('input'); al.type = 'checkbox'; al.checked = !!s.autoLaunch;
      al.onchange = () => api.setSetting('autoLaunch', al.checked);
      line('Lancer au démarrage de Windows', al, 'Fonctionne avec la version installée (.exe).');

      const hk = el('input'); hk.type = 'text'; hk.value = s.hotkey || 'Control+Alt+F'; hk.style.width = '140px';
      hk.onchange = () => api.setSetting('hotkey', hk.value.trim());
      line('Raccourci afficher / masquer', hk, 'Format Electron, ex. Control+Alt+F');

      line('Sauvegarde', el('span', 'muted', 'Automatique'), 'Toutes les 5 s et à la fermeture, avec une copie de secours.');

      // Dossier de sauvegarde : toute la partie y tient (save.json). Choisir un dossier qui contient déjà une partie la charge.
      const dirBox = el('div', 'btns');
      const where = el('span', 'muted save-path', s.saveDirActive || '');
      where.title = s.saveDirActive || '';
      const choose = el('button', 'buy', 'Choisir…');
      const open = el('button', 'buy', 'Ouvrir');
      const toDefault = el('button', 'buy', 'Par défaut');
      toDefault.classList.toggle('hidden', !s.saveDir);
      dirBox.append(choose, open, toDefault);
      const hint = s.saveDirMissing ? 'Dossier introuvable (NAS débranché ?) : sauvegarde temporaire dans le dossier par défaut.'
        : 'Toute la partie tient dans ce dossier. Pour jouer sur plusieurs PC, choisis un dossier synchronisé (un seul PC à la fois).';
      line('Dossier de sauvegarde', dirBox, hint);
      const whereRow = el('div', 'set');
      whereRow.appendChild(where);
      body.appendChild(whereRow);
      const confirm = el('div', 'box hidden');
      body.appendChild(confirm);
      const apply = pick => {
        if (!pick) return;
        if (!pick.hasSave) { api.setSaveDir(pick.dir, 'move', this.game.serialize()); this.toast('Ta partie est maintenant sauvegardée dans ce dossier.'); return; }
        confirm.innerHTML = '';
        confirm.classList.remove('hidden');
        const yes = el('button', 'buy gold', 'Charger cette partie');
        const no = el('button', 'buy', 'Annuler');
        const row = el('div', 'btns');
        row.append(yes, no);
        confirm.append(el('div', null, 'Ce dossier contient déjà une partie. La charger ? (ta partie actuelle reste dans l\'ancien dossier)'), row);
        yes.onclick = () => api.setSaveDir(pick.dir, 'load');
        no.onclick = () => confirm.classList.add('hidden');
      };
      choose.onclick = async () => apply(await api.chooseSaveDir());
      toDefault.onclick = async () => apply(await api.defaultSaveDir());
      open.onclick = () => api.openSaveDir();

      // Mise à jour : automatique (vérifiée au lancement puis toutes les 4 h), ou à la demande avec ce bouton.
      if (api.checkUpdate) {
        const upBox = el('div', 'btns');
        const upBtn = el('button', 'buy', 'Mettre à jour');
        const upInfo = el('span', 'muted', '');
        upBox.append(upBtn, upInfo);
        line('Mise à jour', upBox, 'Vérifiée toute seule au lancement puis toutes les 4 h : la nouvelle version s’installe et la ferme redémarre (ta partie est gardée).');
        const show = u => {
          if (!u || !upInfo.isConnected) return;
          const cur = 'v' + u.current;
          const txt = {
            dev: cur + ' · version de dev',
            idle: cur,
            checking: cur + ' · recherche…',
            none: cur + ' · à jour',
            available: cur + ' · v' + u.version + ' disponible' + (u.portable ? ' (clique pour la télécharger)' : ''),
            downloading: cur + ' · téléchargement de v' + u.version + '… ' + (u.percent || 0) + ' %',
            downloaded: cur + ' · v' + u.version + ' prête, redémarrage…',
            error: cur + ' · échec : ' + (u.error || 'erreur inconnue'),
          }[u.status] || cur;
          upInfo.textContent = txt;
          upBtn.textContent = u.status === 'available' && u.portable ? 'Télécharger' : u.status === 'downloaded' ? 'Installer' : 'Mettre à jour';
          upBtn.disabled = u.status === 'dev' || u.status === 'checking' || u.status === 'downloading';
        };
        upBtn.onclick = async () => show(await api.checkUpdate());
        api.getUpdate().then(show);
        if (!this.updateHooked) { this.updateHooked = true; api.onUpdateStatus(u => { this.updateState = u; if (this.updateShow) this.updateShow(u); }); }
        this.updateShow = show;
      }

      const actions = el('div', 'btns');
      const hide = el('button', 'buy', 'Masquer'); hide.onclick = () => api.hide();
      const quit = el('button', 'buy', 'Quitter'); quit.onclick = () => { root.FARM_APP.save(true); api.quit(); };
      const reset = el('button', 'buy', 'Tout effacer');
      reset.onclick = () => {
        if (Date.now() - this.resetArmed < 4000) { this.game.hardReset(); this.buildSeedbar(); root.FARM_APP.save(); this.toast('Nouvelle partie.'); reset.textContent = 'Tout effacer'; this.resetArmed = 0; return; }
        this.resetArmed = Date.now(); reset.textContent = 'Sûr ? Re-clique';
      };
      actions.append(hide, quit, reset);
      line('Fenêtre', actions);

      const st = el('div', 'box muted');
      body.appendChild(st);
      this.special = () => {
        const x = this.game.s.stats;
        setHtml(st, `Temps de jeu : ${fmtTime(x.playTime || 0)} · Récoltes : ${fmt(x.harvest || 0)} · Clics : ${fmt(x.clicks || 0)} · Corbeaux chassés : ${fmt(x.crows || 0)} · Légumes dorés : ${fmt(x.golden || 0)} · Renaissances : ${x.prestiges || 0} · Total gagné : ${fmt(this.game.s.totalEarned)} $`);
      };
    }

    // ---------- Info-bulles ----------
    bindTooltips() {
      document.addEventListener('mouseover', e => {
        const t = e.target.closest('[data-tip]');
        if (!t || !t.dataset.tip) return;
        this.tipEl = t;
        this.showTip(t.dataset.tip === 'env' ? this.envTip() : escapeHtml(t.dataset.tip), t.getBoundingClientRect().left);
      });
      document.addEventListener('mouseout', e => {
        if (this.tipEl && !this.tipEl.contains(e.relatedTarget)) { this.tipEl = null; this.hideTip(); }
      });
    }

    showTip(html, x) {
      const tip = $('tooltip');
      tip.innerHTML = html;
      tip.classList.remove('hidden');
      const w = tip.offsetWidth;
      tip.style.left = Math.max(2, Math.min(window.innerWidth - w - 2, x)) + 'px';
    }
    hideTip() { $('tooltip').classList.add('hidden'); }

    sceneTip(hit, cssX) {
      const g = this.game;
      if (!hit) { if (!this.tipEl) this.hideTip(); return; }
      let html = '';
      if (hit.type === 'cart') html = '<b>Marchand ambulant</b> · clique pour commercer !';
      else if (hit.type === 'barn') html = g.factoryOn() ? '<b>Grange</b> · clic : aller à l’usine' : '<b>Grange</b> · l’usine de transformation peut être construite (onglet Usine)';
      else if (hit.type === 'factory-exit') html = '<b>Usine</b> · clic : retour au champ';
      else if (hit.type === 'fridge') html = `<b>Frigos</b> · ${fmt(g.fridgeUnits())} / ${fmt(g.fridgeCapacity())} produits · ≈ <b>${fmt(g.fridgeWorth())} $</b><br>` + (g.lvl('trader_usine') ? 'Clic : tout vendre au cours' : 'Clic : onglet Usine');
      else if (hit.type === 'machine') {
        const m = g.s.factory.machines[hit.i], r = m && m.lot && C.RECIPE_BY_ID[m.lot.id];
        html = `<b>${C.MACHINE_BY_ID[m.type].name}</b> · ` + (m.st === 2 ? `${r.name} : ${Math.round(m.t / r.time * 100)}%` : m.st === 1 ? `${r.name} : en attente des ingrédients (porteur)` : 'à l’arrêt : il manque des ingrédients dans les silos (ou le tapis est plein)');
      }
      else if (hit.type === 'silo') {
        html = `<b>Silos</b> · ${fmt(g.stockUnits())} / ${fmt(g.siloCapacity())} unités · valeur au cours ≈ <b>${fmt(g.stockWorth())} $</b><br>Clic : tout vendre`;
      }
      else if (hit.type === 'pet') {
        const pet = g.petByUid(hit.uid) || g.s.pets.list[0];
        if (pet) {
          html = `<b>${g.petName(pet)}</b> · niv. ${g.petLevel(pet)} · clique pour le caresser`;
          if (g.petPoints(pet) > 0) html += ` · <b>${g.petPoints(pet)} point(s)</b> à dépenser`;
        }
      }
      else if (hit.type === 'boar') html = '<b>Sanglier !</b> · clique pour le chasser avant qu\'il piétine tout';
      else if (hit.type === 'swarm') html = '<b>Sauterelles !</b> · clique pour disperser la nuée';
      else if (hit.type === 'thief') html = '<b>Voleur !</b> · clique pour l\'arrêter avant qu\'il pille les silos';
      else if (hit.type === 'crow') html = '<b>Corbeau !</b> · clique pour le chasser avant qu\'il mange la plante';
      else if (hit.type === 'plot') {
        const pl = g.s.plots[hit.i];
        const target = C.SEED_BY_ID[g.seedFor(hit.i)];
        if (pl.crop) {
          const sd = C.SEED_BY_ID[pl.crop.id];
          const rate = g.plotGrowthRate(hit.i);
          const left = pl.crop.p >= 1 ? 'mûr !' : `${Math.floor(pl.crop.p * 100)}% · encore ${fmtTime((1 - pl.crop.p) / Math.max(rate, 1e-9))}`;
          html = `<b>${pl.crop.gold ? sd.name + ' doré(e)' : sd.name}</b> · ${left}`;
        } else html = '<b>Parcelle vide</b>';
        html += ` · ${g.irrigated(hit.i) ? 'irriguée' : pl.moist > 0 ? 'humide' : 'sèche'}`;
        if (pl.crop && pl.crop.energized > 0) html += ` · <b style="color:#7fe3ff">ÉNERGISÉE ×${D.STORM.energyMult} : encore ${Math.ceil(pl.crop.energized)} s !</b>`;
        if (g.rodded(hit.i)) html += ' · paratonnerre';
        if (pl.crop && pl.crop.pest) html += ` · <span style="color:var(--bad)">ravageurs ! meurt dans ${fmtTime(D.BIO.pestDeath - pl.crop.pest)}</span>`;
        if (pl.crop && pl.crop.rot && g.tal('rotation')) html += ' · rotation';
        if (g.companions(hit.i)) html += ` · ${g.companions(hit.i)} compagne(s)`;
        if (g.inAura(hit.i)) html += ' · dans l\'aura';
        if (pl.tier) html += ` · <b>${D.DENSE[pl.tier].name}</b> (×${D.DENSE[pl.tier].plants})`;
        if (pl.crop && pl.crop.star) html += ` · <b style="color:#fff3a0">ÉTOILÉE ×${D.EVENT_FX.starMult}</b>`;
        if (pl.crop && pl.crop.mutant) {
          const m = D.MUTATIONS[pl.crop.mutant];
          html += `<br><b style="color:${m.color}">${m.name}</b> : ${m.desc}`;
          if (m.infinite && pl.crop.extra) html += ` <b>(valeur ×${(1 + pl.crop.extra).toFixed(1)})</b>`;
          if (pl.crop.caught) html += ' <b>Un robot est prisonnier !</b>';
        }
        if (g.moldNear(hit.i) > 1) html += '<br><span style="color:var(--bad)">Une plante moisie à côté divise sa valeur par 10.</span>';
        html += ` · graine : ${pl.seed === 'auto' ? 'Auto (' + target.name + ')' : target.name}`;
        if (g.brush) html += `<br>Clic : assigner <b>${g.brush === 'auto' ? 'Auto' : C.SEED_BY_ID[g.brush].name}</b> · clic droit : lâcher le pinceau`;
        else if (pl.crop && pl.crop.pest) html += '<br>Clic : traiter';
        else if (pl.crop && pl.crop.p >= 1) html += '<br>Clic : récolter';
        else if (!pl.crop) html += '<br>Clic : planter';
        else if (pl.moist < 0.3 && !g.irrigated(hit.i)) html += '<br>Clic : arroser';
        else html += '<br>Clic : faire pousser';
      }
      this.showTip(html, cssX - 40);
    }

    // ---------- Notifications ----------
    toast(msg, cls, throttleKey) {
      if (throttleKey) {
        const now = Date.now();
        if (now - (this.lastToast[throttleKey] || 0) < 20000) return;
        this.lastToast[throttleKey] = now;
      }
      const box = $('toasts');
      const t = el('div', 'toast' + (cls ? ' ' + cls : ''), msg);
      box.prepend(t);
      while (box.children.length > 4) box.lastChild.remove();
      setTimeout(() => t.classList.add('fade'), 4500);
      setTimeout(() => t.remove(), 5100);
    }

    handleEvents() {
      const g = this.game, r = this.renderer;
      for (const e of g.events.splice(0)) {
        switch (e.type) {
          case 'harvest': r.addFloater(e.plot, '+' + fmt(e.value), e.gold ? '#ffe55c' : e.double ? '#7ee081' : '#fff3c4'); break;
          case 'crow-scared': r.addFloater(e.x, '+' + fmt(e.value), '#9fe8ff', true); break;
          case 'cart': r.addFloater(e.x + 10, '+' + fmt(e.value), '#d9b8ff', true); this.toast(`Le marchand t'achète des légumes : +${fmt(e.value)} $`); break;
          case 'ach': this.toast(`Succès : ${e.name} (+${D.ACH_BONUS * 100}% revenus)`, 'gold'); break;
          case 'weather': { const w = D.WEATHER[e.id]; this.toast(`Météo : ${w.name} – ${w.desc}`); break; }
          case 'frenzy': this.toast('Marché en folie ! Prix ×2 pendant 45 s', 'gold'); break;
          case 'crow': this.toast('Un corbeau attaque tes cultures ! Clique dessus.', null, 'crow'); break;
          case 'crow-ate': this.toast('Un corbeau a mangé une plante…', null, 'ate'); break;
          case 'golden': this.toast('Un légume doré a poussé ! Récolte-le toi-même pour ×25.', 'gold', 'gold'); break;
          case 'cart-arrive': this.toast('Le marchand ambulant arrive !'); break;
          case 'seed': this.toast(`Nouvelle graine : ${C.SEED_BY_ID[e.id].name}`, 'gold'); break;
          case 'prestige': this.toast(`Renaissance ! +${fmt(e.gain)} graines d'or`, 'gold'); break;
          case 'pest': this.toast('Des ravageurs attaquent une plante ! Clique dessus ou envoie un robot soigneur.', null, 'pest'); break;
          case 'pest-dead': this.toast('Une plante est morte, dévorée par les ravageurs.', null, 'pestdead'); break;
          case 'treat': r.addFloater(e.plot, '+', '#9be05a'); break;
          case 'mutation':
            { const m = D.MUTATIONS[e.kind]; this.toast(`Mutation : ${m.name} — ${m.desc}`, m.good ? 'gold' : null, 'mut-' + e.kind); }
            break;
          case 'caught': this.toast('Une plante carnivore a attrapé un robot ! Un autre ouvrier doit la récolter.', null, 'caught'); break;
          case 'freed': r.addFloater(e.x, '!', '#7ee081', true); break;
          case 'fever-fail': r.addFloater(e.plot, '0', '#ff7b6b'); break;
          case 'blight': this.toast(`Épidémie ! La monoculture de ${C.SEED_BY_ID[e.id].name} a fait ${e.lost} victime(s). Diversifie tes graines.`, null); break;
          case 'market-unlock': this.toast('Le marché est débloqué ! Onglet Marché : licence de trading, silos, trader...', 'gold'); requestAnimationFrame(() => this.renderer.resize(this.renderer.scale, this.hudRight())); break;
          case 'stored': r.addFloater(e.plot, '+' + fmt(e.units), '#9fd8ff'); break;
          case 'sale': if (r.game.s.trade.silos) r.addFloater(r.siloX0() + 8, '+' + fmt(e.value), '#7ee081', true); break;
          case 'demand': this.toast(`Commande : ${fmt(e.left)} ${C.SEED_BY_ID[e.seed].name}${e.trait !== 'any' ? ' ' + D.TRAITS[e.trait].name : ''} payé(e)s ×${fmt(e.mult)} pendant ${fmtTime(e.t)}`, null, 'demand'); break;
          case 'demand-done': this.toast('Commande du marché honorée !', 'gold', 'demanddone'); break;
          case 'manager': this.toast(`Le gestionnaire plante : ${C.SEED_BY_ID[e.a].name} et ${C.SEED_BY_ID[e.b].name}`, null, 'manager'); break;
          case 'lightning':
            r.addFx('bolt', e.x); r.flash = 0.15;
            if (e.effect === 'energized') this.toast(`Foudre sur un légume doré : il est énergisé ×${D.STORM.energyMult} ! Récolte-le dans les ${D.STORM.energyTime} s !`, 'gold');
            else if (e.effect === 'burned') { r.addFx('smoke', e.x); this.toast('La foudre a grillé une plante.', null, 'burned'); }
            else if (e.effect === 'super') this.toast('Robot paratonnerre foudroyé : 200× plus rapide !', 'gold', 'super');
            else if (e.kind === 'robot') this.toast('Un robot foudroyé : figé, puis survolté, batterie pleine.', null, 'zap');
            else if (e.kind === 'farmer') this.toast('Le fermier a été foudroyé ! Sonné pendant 10 s.', null, 'farmerzap');
            else if (e.kind === 'crow') this.toast('La foudre a frappé un corbeau : il devient maudit et attaque les robots !', null, 'cursed');
            break;
          case 'energy-harvest': this.toast('Récolte énergisée !', 'gold'); break;
          case 'energy-lost': r.addFx('smoke', C.plotX(e.plot)); this.toast('Trop tard : la plante énergisée a grillé.', null, 'elost'); break;
          case 'crow-zap': r.addFloater(e.x, '!', '#c77dff', true); break;
          case 'silo-merge': this.toast(`${D.SILO_TIERS[e.tier].name} construit : ${D.SILO_TIERS[e.tier].mult}× la capacité d’un silo !`, 'gold'); break;
          case 'merge': this.toast(`${D.DENSE[e.tier].name} créée : ${D.DENSE[e.tier].plants} plants sur une seule parcelle !`, 'gold'); break;
          case 'pet-path': { const pet = g.petByUid(e.uid); this.toast(`Nouvelle voie : ${pet ? g.petName(pet) : ''} !`, 'gold'); break; }
          case 'event': { const ev = D.EVENTS[e.id]; this.toast(`${ev.name} : ${ev.desc}`, ev.good ? 'gold' : null); break; }
          case 'star': r.addFx('star', C.plotX(e.plot)); break;
          case 'star-harvest': this.toast(`Plante étoilée récoltée (×${D.EVENT_FX.starMult}) !`, 'gold'); break;
          case 'trampled': r.addFx('smoke', C.plotX(e.plot)); break;
          case 'boar-scared': r.addFloater(e.x, '+' + fmt(e.value), '#ffd08a', true); this.toast('Le sanglier détale !'); break;
          case 'swarm-gone': if (e.value) r.addFloater(e.x, '+' + fmt(e.value), '#9be05a', true); this.toast('La nuée de sauterelles est dispersée.'); break;
          case 'thief-caught': r.addFloater(e.x, '+' + fmt(e.value), '#ffd08a', true); this.toast('Voleur arrêté ! Une récompense pour toi.', 'gold'); break;
          case 'thief-blocked': this.toast('Le voleur repart bredouille : les silos sont bien gardés.'); break;
          case 'thief-stole': this.toast(`Le voleur a pillé les silos : ${fmt(e.units)} unités envolées !`); break;
          case 'uprooted': r.addFx('smoke', C.plotX(e.plot)); break;
          case 'thrown': r.addFloater(e.x, '!', '#b9c2cc', true); break;
          case 'fair-won': this.toast(`Premier prix à la foire agricole : +${fmt(e.value)} $ !`, 'gold'); break;
          case 'fair-none': this.toast('Le juge est reparti : aucune plante mûre à primer.'); break;
          case 'tourist': r.addFloater(e.plot, '$', '#7ee081'); break;
          case 'frost': r.addFloater(e.plot, '*', '#cfefff'); this.toast('Le gel abîme les plantes non protégées.', null, 'frost'); break;
          case 'windseed': r.addFloater(e.plot, '+', '#e8f2d0'); break;
          case 'shock': this.toast(e.kind === 'shortage' ? `Pénurie de ${C.SEED_BY_ID[e.seed].name} : le cours bondit ×${e.mult.toFixed(1)} !` : `Krach du ${C.SEED_BY_ID[e.seed].name} : le cours s'effondre.`, e.kind === 'shortage' ? 'gold' : null); break;
          case 'rotten': this.toast(`Un lot de ${C.SEED_BY_ID[e.seed].name} a pourri au silo (${fmt(e.units)} unités).`, null, 'rotten'); break;
          case 'cry': r.addFx('cry', e.x); break;
          case 'cry-blocked': r.addFloater(e.x, '!', '#ff7b6b', true); break;
          case 'worm': r.addFx('worm', C.plotX(e.plot)); break;
          case 'season-start': { const s = D.SEASONS.find(x => x.id === e.id); this.toast(`${s.name} à la ferme ! ${s.boosts.join(' · ')}. Deux plantes de saison sont dans le pinceau.`, 'gold'); this.buildSeedbar(); r.dirty(); break; }
          case 'season-end': { const s = D.SEASONS.find(x => x.id === e.id); this.toast(`${s.name} est terminé : ses plantes ne se replantent plus.`); this.buildSeedbar(); r.dirty(); break; }
          case 'lucky8': r.addFloater(e.plot, '×8 !', '#ff5e3a'); break;
          case 'food-lost': this.toast(`${C.FOOD_BY_ID[e.id].name} est perdue (gamelle de saison retirée).`); break;
          case 'season-money': r.addFloater(C.LAYOUT.BARN_W + 6, '+' + fmt(e.value), '#ff5e3a', true); break;
          case 'worm-sweep': r.addFx('sweep', e.from, e.to); this.toast('Le ver cosmique traverse tout le champ !', 'gold'); break;
          case 'food-crafted': this.toast(`Gamelle prête : ${C.FOOD_BY_ID[e.id].name} (onglet Compagnon pour la donner)`, 'gold'); break;
          case 'food-target-done': this.toast(`Le gestionnaire d’usine a cuisiné : ${C.FOOD_BY_ID[e.id].name}`, 'gold'); break;
          case 'pet-power': r.addFx('puff', e.x); break;
          case 'product-rotten': this.toast(`${C.RECIPE_BY_ID[e.id].name} : ${fmt(e.units)} produits ont tourné au frigo`); break;
          case 'cheshire': r.addFx('puff', C.plotX(e.plot)); break;
          case 'gem': r.addFloater(e.plot, '+' + fmt(e.value), '#7fe3ff'); this.toast('Une gemme déterrée !', 'gold', 'gem'); break;
          case 'pet-adopt': this.toast(`Tu as adopté : ${C.PET_BY_ID[e.id].name} !`, 'gold'); break;
          case 'pet-level': { const pet = g.petByUid(e.uid); if (pet) this.toast(`${g.petName(pet)} passe niveau ${e.level} : +1 point ${e.mastery ? 'de maîtrise' : 'de compétence'}`, 'gold', 'petlvl' + e.uid); break; }
          case 'pet-evo': this.toast(`Évolution ! Ton compagnon devient ${C.PET_BY_ID[e.id].evoName} !`, 'gold'); break;
          case 'pet-love': r.addFloater(e.x, '♥', '#ff8fb1', true); break;
          case 'pet-lost': r.addFloater(e.plot, '0', '#9aa3ad'); break;
          case 'honey': r.addFloater(C.LAYOUT.BARN_W + 1, '+' + fmt(e.value), '#ffc94a', true); break;
          default: break;
        }
      }
    }
  }

  function setText(e, t) { if (e.textContent !== t) e.textContent = t; }
  function setHtml(e, h) { if (e._h !== h) { e.innerHTML = h; e._h = h; } }
  function escapeHtml(s) { return s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

  root.FARM_UI = { UI };
  root.FARM_UI_TABS = TABS.map(t => t.id); // utilisé par le mode capture
})(this);

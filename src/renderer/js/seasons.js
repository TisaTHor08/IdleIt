// Saisons (fêtes) : détectées d'après la date de l'ordinateur (D.seasonAt), vérifiées chaque minute.
// Une saison active ajoute ses fx (rebuildFx), ses mods (refreshPet), ses plantes, son événement, sa météo,
// ses soldes et son habillage (sprites.js / render.js lisent game.seasonId).
(function (root) {
  'use strict';

  function install(G, H) {
    const { D, SEED_BY_ID } = H;

    Object.assign(G, {
      // forceSeason : id de saison (ou null) pour les tests et les démos ; undefined = date réelle.
      updateSeason(dt) {
        this.seasonT = (this.seasonT || 0) - dt;
        if (this.seasonT > 0 && this.seasonId !== undefined) return;
        this.seasonT = 60;
        // Hors du jeu (tests, simulateur Node) : pas de saison, sauf FARM_SEASON=<id> ou FARM_SEASON=auto (date réelle).
        if (this.forceSeason === undefined && typeof window === 'undefined' && typeof process !== 'undefined' && process.env) {
          const env = process.env.FARM_SEASON;
          if (env !== 'auto') this.forceSeason = env || null;
        }
        let info = null;
        if (this.forceSeason !== undefined) {
          const def = D.SEASONS.find(s => s.id === this.forceSeason);
          info = def ? { id: def.id, def, end: new Date(Date.now() + 7 * 864e5) } : null;
        } else info = D.seasonAt(new Date());
        const id = info ? info.id : null;
        if (id === this.seasonId) return;
        const prev = this.seasonId;
        this.seasonId = id;
        this.seasonInfo = info;
        // Le panier ne garde que les légumes de la saison en cours.
        for (const k of Object.keys(this.s.basket || {})) if (!SEED_BY_ID[k] || SEED_BY_ID[k].season !== id) delete this.s.basket[k];
        this.rebuildFx();
        this.refreshPet();
        if (id) this.emit('season-start', { id, end: info.end });
        else if (prev) this.emit('season-end', { id: prev });
      },
      seasonDef() { return this.seasonInfo ? this.seasonInfo.def : null; },
      seasonSeeds() { return this.seasonId ? D.SEASON_SEEDS.filter(sd => sd.season === this.seasonId) : []; },
      // Une graine de saison se plante tant que sa saison dure (sans être achetée).
      seasonSeedOk(id) { const sd = SEED_BY_ID[id]; return !!sd && !!sd.season && sd.season === this.seasonId; },
      seedValue(sd) { return sd.season ? SEED_BY_ID[this.bestSeed()].value * sd.mult : sd.value; },
      seasonDiscount() { const d = this.seasonDef(); return d && d.discount ? d.discount : 1; },
      // Mods de saison appliqués aux modificateurs combinés des compagnons.
      applySeasonMods(pm) {
        const d = this.seasonDef();
        if (!d) return;
        for (const [k, v] of Object.entries(d.mods || {})) if (k !== 'chicks' && typeof pm[k] === 'number') pm[k] *= v;
        for (const [k, v] of Object.entries(d.modsAdd || {})) if (typeof pm[k] === 'number') pm[k] += v;
      },
      // Panier de saison : légumes de saison récoltés (pour les gamelles de saison), vidé à la fin de la saison.
      seasonFoods() { return D.PET_FOODS.filter(f => f.season && f.season === this.seasonId); },
      seasonFoodFee() { return Math.max(100, SEED_BY_ID[this.bestSeed()].value * this.valueMult() * 40); },
      canCraftSeasonFood(fid) {
        const f = D.PET_FOODS.find(x => x.id === fid);
        return !!f && f.season === this.seasonId && f.ingredients.every(i => (this.s.basket[i.seed] || 0) >= i.n) && this.s.money >= this.seasonFoodFee();
      },
      craftSeasonFood(fid) {
        if (!this.canCraftSeasonFood(fid)) return false;
        const f = D.PET_FOODS.find(x => x.id === fid);
        this.s.money -= this.seasonFoodFee();
        for (const i of f.ingredients) this.s.basket[i.seed] -= i.n;
        this.s.pantry[fid] = (this.s.pantry[fid] || 0) + 1;
        this.addStat('seasonFoods');
        this.emit('food-crafted', { id: fid });
        return true;
      },
      seasonChicks() { const d = this.seasonDef(); return d && d.mods && d.mods.chicks ? d.mods.chicks : 0; },
    });
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = install;
  else (root.FARM_MIXINS = root.FARM_MIXINS || []).push(install);
})(this);

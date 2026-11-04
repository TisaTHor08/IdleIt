// Part des combinaisons compagnon × état (sans voie / chaque voie) × gamelle qui ont un effet spécial.
// node tools/food-coverage.js
const D = require('../src/renderer/js/data.js');
let total = 0, special = 0;
const byFood = {}, byPet = {};
const FOODS = D.PET_FOODS.filter(f => !f.season); // les gamelles de saison ont un effet unique pour tous
for (const f of FOODS) {
  for (const p of D.PETS) {
    for (const path of [null, ...p.paths.map(x => x.id)]) {
      const hit = f.special.find(x => x.path && x.path === path) || f.special.find(x => x.pet === p.id);
      total++; if (hit) special++;
      byFood[f.id] = (byFood[f.id] || 0) + (hit ? 1 : 0);
      byPet[p.id] = (byPet[p.id] || 0) + (hit ? 1 : 0);
    }
  }
}
const n = D.PETS.length * 4;
// Règle : chaque effet spécial est un soulagement ('R') ou un marché (nouvelle contrepartie) ; pas deux effets identiques par gamelle.
const kinds = { R: 0, trade: 0, T: 0 }, missing = [], dup = [];
for (const f of FOODS) {
  const seen = new Set();
  for (const x of f.special) {
    if (x.bal === 'R') kinds.R++; else if (x.bal === 'T') kinds.T++; else if (Array.isArray(x.bal)) kinds.trade++; else missing.push(f.id + '/' + (x.path || x.pet));
    if (seen.has(x.desc)) dup.push(f.id + '/' + (x.path || x.pet)); seen.add(x.desc);
  }
}
console.log(`soulagements ${kinds.R} · marchés ${kinds.trade} · contreparties intégrées ${kinds.T}` + (missing.length ? ' · SANS ÉQUILIBRE : ' + missing.join(', ') : '') + (dup.length ? ' · DOUBLONS : ' + dup.join(', ') : ''));
if (missing.length || dup.length) process.exitCode = 1;
console.log(`effets spéciaux : ${special} / ${total} = ${Math.round(special / total * 100)} %`);
console.log('par gamelle :', Object.entries(byFood).map(([k, v]) => `${k.slice(3)} ${Math.round(v / n * 100)}%`).join(' · '));
console.log('par compagnon :', Object.entries(byPet).map(([k, v]) => `${k} ${Math.round(v / (FOODS.length * 4) * 100)}%`).join(' · '));

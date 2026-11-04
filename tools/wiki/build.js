// Génère le wiki statique (wiki/dist) à partir des données du jeu (src/renderer/js/data.js).
// Usage : npm run wiki   (SITE_URL=https://wiki.exemple.fr npm run wiki pour un sitemap avec URL absolues)
// Tout est du HTML statique avec le CSS en ligne : rapide, accessible, sans JavaScript (sauf recherche et éditeur).
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const D = require(path.join(ROOT, 'src', 'renderer', 'js', 'data.js'));
const PKG = require(path.join(ROOT, 'package.json'));
const OUT = path.join(ROOT, 'wiki', 'dist');
const ASSETS = path.join(ROOT, 'wiki', 'assets');
const SITE_URL = (process.env.SITE_URL || '').replace(/\/$/, '');
const { fmt, fmtTime } = D;
const REPO = 'https://github.com/TisaTHor08/IdleIt';
const DL_SETUP = REPO + '/releases/latest/download/Farmling-Setup.exe';
const DL_PORTABLE = REPO + '/releases/latest/download/Farmling-portable.exe';
const DL_PAGE = REPO + '/releases/latest';

// ---------- Outils ----------
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const BY = list => Object.fromEntries(list.map(x => [x.id, x]));
const SEED = BY(D.SEEDS), PET = BY(D.PETS), REC = BY(D.RECIPES), MACH = BY(D.MACHINES), FOOD = BY(D.PET_FOODS), UP = BY(D.UPGRADES), TAL = BY(D.TALENTS);
const FACTORY_FOODS = D.PET_FOODS.filter(f => !f.season), SEASON_FOODS = D.PET_FOODS.filter(f => f.season);
const PATH = {}; for (const p of D.PETS) for (const x of p.paths) PATH[x.id] = { ...x, pet: p.id };
const pages = []; // { url, title }
const search = [];
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const pct = x => Math.round(x * 100) + ' %';
const plural = (n, w) => n + ' ' + w + (n > 1 ? 's' : '');
const era = pr => pr ? `après ${plural(pr, 'renaissance')}` : 'dès le départ';
const time = s => s < 60 ? Math.round(s) + ' s' : fmtTime(s);

function write(url, html) {
  const file = path.join(OUT, url, url.endsWith('.html') ? '' : 'index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}

const CSS = `:root{--bg:#fbf7ee;--card:#fff;--text:#231a10;--muted:#5b4a36;--line:#e2d6bf;--accent:#1f5c2e;--accent-bg:#e6f2e2;--gold:#7a5600;--gold-bg:#fff3cc;--bad:#a3261b;--bad-bg:#fde6e2;--ok:#1f6b2d;--head:#2c2014;--head-text:#fbf1dc}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
a{color:var(--accent);text-underline-offset:2px}a:hover{text-decoration-thickness:2px}
.skip{position:absolute;left:-999px}.skip:focus{left:8px;top:8px;background:#fff;padding:8px;z-index:9}
header.top{background:var(--head);color:var(--head-text)}header.top .in{max-width:1180px;margin:0 auto;padding:10px 16px;display:flex;flex-wrap:wrap;align-items:center;gap:8px 18px}
.brand{color:#ffe08a;font-weight:700;font-size:1.15rem;text-decoration:none;display:flex;align-items:center;gap:8px}.brand img{image-rendering:pixelated}
nav.main ul{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:2px}nav.main a{color:var(--head-text);text-decoration:none;display:block;padding:8px 9px;border-radius:6px;font-size:.92rem}nav.main a:hover,nav.main a[aria-current]{background:#4a3722}
main{max-width:1180px;margin:0 auto;padding:18px 16px 40px}h1{font-size:1.9rem;line-height:1.2;margin:.3em 0 .4em}h2{font-size:1.35rem;margin:1.6em 0 .5em;border-bottom:2px solid var(--line);padding-bottom:4px}h3{font-size:1.1rem;margin:1.2em 0 .4em}
.crumbs{font-size:.9rem;color:var(--muted);margin:0}.crumbs a{color:var(--muted)}
.lead{font-size:1.1rem;color:var(--muted);max-width:780px}
img.px{image-rendering:pixelated;image-rendering:crisp-edges;vertical-align:middle}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px;padding:0;list-style:none}
.tile{display:flex;align-items:center;gap:10px;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:8px 10px;text-decoration:none;color:var(--text);min-height:64px}.tile:hover{border-color:var(--accent)}.tile b{display:block}.tile small{color:var(--muted)}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px 16px;margin:12px 0}
.hero{display:flex;gap:18px;align-items:center;flex-wrap:wrap}
.facts{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;margin:12px 0;padding:0;list-style:none}.facts li{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:8px 10px}.facts span{display:block;font-size:.82rem;color:var(--muted)}.facts b{font-size:1.05rem}
.tw{overflow-x:auto;border:1px solid var(--line);border-radius:10px;background:var(--card);margin:10px 0}table{border-collapse:collapse;width:100%;font-size:.94rem}th,td{text-align:left;padding:7px 10px;border-bottom:1px solid var(--line);vertical-align:top}th{background:#f3ebdb;font-weight:600;white-space:nowrap}tr:last-child td{border-bottom:0}td.n{white-space:nowrap;font-variant-numeric:tabular-nums}
.tag{display:inline-block;font-size:.78rem;padding:1px 7px;border-radius:99px;background:#efe5d2;color:var(--muted);white-space:nowrap}.tag.g{background:var(--gold-bg);color:var(--gold)}.tag.ok{background:var(--accent-bg);color:var(--ok)}.tag.bad{background:var(--bad-bg);color:var(--bad)}
.bad{color:var(--bad)}.ok{color:var(--ok)}.muted{color:var(--muted)}
.cols{columns:2 320px;column-gap:24px}.cols>*{break-inside:avoid}
footer{border-top:1px solid var(--line);color:var(--muted);font-size:.9rem}footer .in{max-width:1180px;margin:0 auto;padding:16px}
.shot{max-width:100%;height:auto;border-radius:8px;border:1px solid var(--line)}
input[type=search]{font:inherit;width:100%;max-width:520px;padding:10px 12px;border:2px solid var(--line);border-radius:8px;background:#fff;color:var(--text)}
.mt{position:absolute;opacity:0;width:1px;height:1px}.ml{display:none}
@media (max-width:760px){.ml{display:block;margin-left:auto;cursor:pointer;color:var(--head-text);border:2px solid #6b5236;border-radius:6px;padding:6px 14px;font-weight:600}.mt:focus-visible+.ml{outline:3px solid #ffe08a}nav.main{display:none;width:100%}.mt:checked~nav.main{display:block}nav.main ul{flex-direction:column}nav.main a{padding:10px 8px}}
@media (max-width:640px){h1{font-size:1.5rem}main{padding:12px 12px 32px}}`;

const NAV = [
  ['wiki/', 'Wiki'], ['guide/', 'Guide'], ['legumes/', 'Légumes'], ['compagnons/', 'Compagnons'], ['nourriture/', 'Nourriture'],
  ['combinaisons/', 'Combinaisons'], ['robots/', 'Robots'], ['ameliorations/', 'Améliorations'], ['specialisation/', 'Spécialisation'],
  ['usine/', 'Usine'], ['marche/', 'Marché'], ['evenements/', 'Météo et événements'], ['cultures/', 'Cultures et mutations'],
  ['saisons/', 'Saisons'], ['renaissance/', 'Renaissance'], ['succes/', 'Succès'], ['recherche/', 'Recherche'], ['editeur/', 'Éditeur de sauvegarde'], ['telecharger/', 'Télécharger'],
];

function page(url, { title, desc, crumbs = [], body, script = '', kind = '' }) {
  const depth = url ? url.split('/').filter(Boolean).length - (url.endsWith('.html') ? 1 : 0) : 0;
  const R = depth ? '../'.repeat(depth) : './';
  const html = body(R);
  const section = NAV.filter(([u]) => url.startsWith(u)).map(([u]) => u).sort((a, b) => b.length - a.length)[0] || '';
  const nav = NAV.map(([u, t]) => `<li><a href="${R}${u}"${u === section ? ' aria-current="page"' : ''}>${t}</a></li>`).join('');
  const cr = crumbs.length ? `<p class="crumbs"><a href="${R}wiki/">Wiki</a> › ${crumbs.map(([u, t]) => u ? `<a href="${R}${u}">${esc(t)}</a>` : esc(t)).join(' › ')}</p>` : '';
  pages.push(url);
  if (kind) search.push({ t: title, u: url, k: kind });
  write(url, `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · Wiki Farmling</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#2c2014">
${SITE_URL ? `<link rel="canonical" href="${SITE_URL}/${url}">` : ''}
<link rel="icon" href="${R}img/icon-seeds.png" type="image/png">
<script>${SEASON_SCRIPT}</script>
<style>${CSS}${SEASON_CSS_WIKI}</style>
</head>
<body>
<a class="skip" href="#contenu">Aller au contenu</a>
<header class="top"><div class="in"><a class="brand" href="${R}"><img class="px" src="${R}img/logo.png" width="100" height="30" alt="Farmling"> Wiki</a>
<input type="checkbox" id="menu" class="mt"><label for="menu" class="ml">Menu</label>
<nav class="main" aria-label="Sections du wiki"><ul>${nav}</ul></nav></div></header>
<p class="sbanner"><a href="${R}saisons/">Saison</a> · </p>
<main id="contenu">${cr}${html}</main>
<footer><div class="in">Wiki généré à partir des données du jeu, version ${esc(PKG.version)}. <a href="https://github.com/TisaTHor08/IdleIt">Code source et téléchargements</a>.</div></footer>
${script}
</body>
</html>`);
}

const img = (R, name, w, h, alt = '', lazy = true) => `<img class="px" src="${R}img/${name}.png" width="${w}" height="${h}" alt="${esc(alt)}"${lazy ? ' loading="lazy"' : ''} decoding="async">`;
const seedImg = (R, sd, k = 1, lazy = true, alt = '') => img(R, 'seed-' + sd.id, 24 * k, 36 * k, alt, lazy);
const lookName = (id, look) => look === 'base' ? PET[id].name : look === 'evo' ? PET[id].evoName : PATH[look].name;
const petImg = (R, id, look, k = 1, lazy = true, alt = '') => img(R, `pet-${id}-${look}`, 32 * k, 32 * k, alt, lazy);
const robotImg = (R, id, k = 1, lazy = true) => img(R, 'robot-' + id, 30 * k, 30 * k, '', lazy);
const icon = (R, name, k = 1) => img(R, 'icon-' + name, 20 * k, 20 * k, '');
const table = (label, head, rows) => `<div class="tw" role="region" aria-label="${esc(label)}" tabindex="0"><table><thead><tr>${head.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => i === 0 ? `<th scope="row">${c}</th>` : `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const facts = list => `<ul class="facts">${list.map(([k, v]) => `<li><span>${k}</span><b>${v}</b></li>`).join('')}</ul>`;
const famName = f => D.FAMILIES[f].name;
const seedLink = (R, sd) => `<a href="${R}legumes/${sd.id}/">${esc(sd.name)}</a>`;
const petLink = (R, id) => `<a href="${R}compagnons/${id}/">${esc(PET[id].name)}</a>`;
const foodLink = (R, f) => `<a href="${R}nourriture/${f.id.replace(/^gl_/, '')}/">${esc(f.name)}</a>`;
const recipeName = r => r.name;
const inputText = (R, i) => `${i.n} ${i.seed ? seedLink(R, SEED[i.seed]) : esc(famName(i.fam).toLowerCase())}${i.gold ? ' <span class="tag g">doré(e)s</span>' : ''}`;
const upCost = (u, k) => u.base * Math.pow(u.g, k);
const states = p => [{ id: null, name: 'Sans voie', look: 'base' }, ...p.paths.map(x => ({ id: x.id, name: x.name, look: x.id }))];
const effectCell = e => `${e.special ? '<span class="tag g">spécial</span> ' : '<span class="tag">général</span> '}${esc(e.desc)}${e.relief ? ` <span class="ok">Contrepartie retirée : ${esc(e.relief)}.</span>` : ''}${e.malus ? ` <span class="bad">Contrepartie : ${esc(e.malus)}.</span>` : ''}`;
const effectType = e => !e.special ? 'général' : e.bal === 'R' ? 'soulagement' : 'marché';


// ---------- Saisons du site : habillage automatique selon la date du visiteur ----------
// Petit script en ligne dans <head> (mêmes dates et même durée que le jeu, générées depuis data.js) :
// il pose data-season sur <html> ; le CSS fait le reste (couleurs, bannière, scène de l'accueil).
// ?saison=noel force une saison pour la prévisualiser.
const SEASON_RULES = D.SEASONS.map(def => {
  const dates = {};
  for (let y = 2024; y <= 2040; y++) dates[y] = def.date(y);
  return [def.id, dates];
});
const SEASON_SCRIPT = `(()=>{const R=${JSON.stringify(Object.fromEntries(SEASON_RULES))},N=${D.SEASON_DAYS},h=document.documentElement,q=new URLSearchParams(location.search).get('saison'),n=new Date(),t=new Date(n.getFullYear(),n.getMonth(),n.getDate());let b=null;for(const id in R)for(const y of[t.getFullYear()-1,t.getFullYear(),t.getFullYear()+1]){const md=R[id][y];if(!md)continue;const a=new Date(y,md[0]-1,md[1]),k=Math.round((t-a)/864e5);if((q?q===id&&y===t.getFullYear():Math.abs(k)<=N)&&(!b||Math.abs(k)<Math.abs(b[1])))b=[id,k,new Date(y,md[0]-1,md[1]+N)]}if(b){h.dataset.season=b[0];h.style.setProperty('--season-end','"'+(q?'aperçu':'jusqu’au '+b[2].toLocaleDateString('fr-FR',{day:'numeric',month:'long'}))+'"')}})()`;
const SEASON_GRAD = {
  nouvel_an: '#05040f 0%,#1a1440 45%,#4a2a7a 75%,#c77dff 100%', nouvel_an_chinois: '#2a0508 0%,#6a0f14 45%,#b5372f 75%,#ffb84a 100%',
  saint_valentin: '#2a0a1a 0%,#5a1a3a 45%,#a0305a 75%,#ff8fb0 100%', paques: '#2a3a7a 0%,#4a5aa8 45%,#a06aa8 75%,#ff8fd0 100%',
  fete_musique: '#0e0a2a 0%,#2a1a5a 45%,#4a3a9a 72%,#5fb548 100%', halloween: '#0e0818 0%,#2a1240 45%,#6a2a6a 72%,#ff7a1e 100%',
  noel: '#0b1630 0%,#1d3a6a 50%,#4a6fa8 80%,#cfe0f4 100%',
};
const bannerText = def => `${def.name} à la ferme : ${def.boosts[0].charAt(0).toLowerCase() + def.boosts[0].slice(1)}… `;
// CSS commun : bannière (cachée hors saison) et couleurs par saison.
const SEASON_CSS_WIKI = `.sbanner{display:none;margin:0;padding:8px 16px;font-weight:600;color:#231a10;background:#fff3cc;border-bottom:3px solid var(--sc,#7a5600);text-align:center}.sbanner a{color:#231a10}
${D.SEASONS.map(def => `[data-season=${def.id}]{--sc:${def.color}}[data-season=${def.id}] .sbanner{display:block}[data-season=${def.id}] .sbanner::before{content:${JSON.stringify(bannerText(def))}}[data-season=${def.id}] header.top{box-shadow:inset 0 -5px 0 ${def.color}}`).join('')}
.sbanner::after{content:var(--season-end,"")}`;
const SEASON_CSS_HOME = R => `.sbanner{display:none;max-width:720px;margin:0 auto 18px;padding:10px 16px;font-weight:700;color:#fdf6e3;background:#0b0714;border:4px solid var(--sc,#ffd84a);box-shadow:0 0 0 4px var(--edge)}
.scene .sc{display:block;flex:none;width:3312px;height:120px;background:var(--scene) repeat-x;background-size:3312px 120px;image-rendering:pixelated}
:root{--scene:url(${R}shots/scene-day.webp)}
${D.SEASONS.map(def => `[data-season=${def.id}]{--sc:${def.color};--scene:url(${R}shots/scene-${def.id}.webp)}[data-season=${def.id}] .sbanner{display:block}[data-season=${def.id}] .sbanner::before{content:${JSON.stringify(bannerText(def))}}[data-season=${def.id}] .hero{background:radial-gradient(1.5px 1.5px at 12% 18%,#fff 98%,transparent),radial-gradient(1.5px 1.5px at 78% 12%,#fff 98%,transparent),radial-gradient(2px 2px at 40% 30%,#ffe9a8 98%,transparent),linear-gradient(${SEASON_GRAD[def.id]})}`).join('')}
.sbanner::after{content:var(--season-end,"")}`;

// ---------- Accueil ----------
const counts = {
  seeds: D.SEEDS.length, pets: D.PETS.length, paths: D.PETS.reduce((a, p) => a + p.paths.length, 0), foods: D.PET_FOODS.length,
  combos: D.PETS.length * 4 * D.PET_FOODS.length, specials: D.PET_FOODS.reduce((a, f) => a + f.special.length, 0),
  robots: D.ROBOTS.length, ups: D.UPGRADES.filter(u => !u.cosmetic).length, recipes: D.RECIPES.length, ach: D.ACHIEVEMENTS.length,
};
page('wiki/', {
  title: 'Wiki', kind: 'Section', crumbs: [], desc: `Wiki complet de Farmling : ${counts.seeds} légumes, ${counts.pets} compagnons, ${counts.combos} combinaisons de nourriture, l'usine, le marché et l'éditeur de sauvegarde.`,
  body: R => `<div class="hero">${img(R, 'barn', 104, 80, 'La grange', false)}${img(R, 'factory', 104, 88, 'L’usine', false)}<div>
<h1>Le wiki de Farmling</h1><p class="lead">Une ferme idle miniature qui vit au-dessus de ta barre des tâches. Ce wiki contient toutes les données du jeu : chaque légume, chaque compagnon, chaque combinaison de nourriture, l’usine, le marché, les événements et la renaissance.</p></div></div>
${facts([['Légumes', counts.seeds], ['Compagnons', counts.pets + ' (dont 4 légendaires)'], ['Voies', counts.paths], ['Gamelles', counts.foods], ['Combinaisons', counts.combos], ['Effets spéciaux', counts.specials], ['Robots', counts.robots], ['Améliorations', counts.ups], ['Recettes', counts.recipes], ['Succès', counts.ach]])}
<h2>Par où commencer</h2>
<ul class="grid">
${[['guide/', 'seeds', 'Guide', 'Les bases du jeu'], ['legumes/', 'field', 'Légumes', 'Les 44 légumes et leurs ères'], ['compagnons/', 'pets', 'Compagnons', 'Arbres, voies et maîtrise'], ['nourriture/', 'food', 'Nourriture', 'Les gamelles et leurs effets'], ['combinaisons/', 'food', 'Combinaisons', 'Tous les effets spéciaux'], ['usine/', 'factory', 'Usine', 'Machines et recettes'], ['renaissance/', 'prestige', 'Renaissance', 'Seuils et déblocages'], ['editeur/', 'settings', 'Éditeur', 'Modifie ta sauvegarde']].map(([u, ic, t, s]) => `<li><a class="tile" href="${R}${u}">${icon(R, ic, 2)}<span><b>${t}</b><small>${s}</small></span></a></li>`).join('')}
</ul>
<h2>Le jeu en images</h2>
<p><img class="shot" src="${R}shots/band.webp" width="896" height="281" alt="La ferme au-dessus de la barre des tâches" loading="lazy" decoding="async"></p>
<p><a href="${R}telecharger/">Télécharger le jeu</a> : installateur ou version portable pour Windows.</p>`,
});

// ---------- Page d'accueil : présentation du jeu, style jeu vidéo ----------
const LOGO = JSON.parse(fs.readFileSync(path.join(ASSETS, 'logo-size.json'), 'utf8'));
const HOME_CSS = `:root{--night:#140e24;--ink:#fdf6e3;--soft:#d9cfee;--gold:#ffd84a;--grass:#5fb548;--panel:#21183a;--edge:#0b0714}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}body{margin:0;background:var(--night);color:var(--ink);font:17px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
a{color:var(--gold)}img{image-rendering:pixelated;image-rendering:crisp-edges}
.skip{position:absolute;left:-999px}.skip:focus{left:8px;top:8px;background:#fff;color:#000;padding:8px;z-index:9}
.bar{position:sticky;top:0;z-index:5;background:rgba(11,7,20,.92);border-bottom:4px solid var(--edge)}.bar .in{max-width:1180px;margin:0 auto;padding:8px 16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.bar .brand{display:flex}.bar nav{margin-left:auto}.bar ul{list-style:none;margin:0;padding:0;display:flex;gap:4px;flex-wrap:wrap}.bar nav a{display:block;padding:8px 12px;color:var(--ink);text-decoration:none;font-weight:700;text-transform:uppercase;letter-spacing:.06em;font-size:.82rem}.bar nav a:hover{color:var(--gold)}
.hero{position:relative;overflow:hidden;text-align:center;padding:56px 16px 0;background:radial-gradient(1.5px 1.5px at 12% 18%,#fff 98%,transparent),radial-gradient(1.5px 1.5px at 78% 12%,#fff 98%,transparent),radial-gradient(2px 2px at 40% 30%,#ffe9a8 98%,transparent),radial-gradient(1.5px 1.5px at 63% 44%,#fff 98%,transparent),radial-gradient(1.5px 1.5px at 88% 36%,#fff 98%,transparent),radial-gradient(2px 2px at 24% 48%,#cfe3ff 98%,transparent),linear-gradient(#140e24 0%,#2a1d55 38%,#6a3d7a 64%,#e8784a 88%,#f6b35c 100%)}
.hero h1{margin:0}.hero .logo{width:min(800px,92vw);height:auto}
.tag{max-width:720px;margin:14px auto 26px;font-size:1.2rem;color:var(--ink);text-shadow:0 2px 0 var(--edge)}
.btns{display:flex;gap:16px;justify-content:center;flex-wrap:wrap;margin-bottom:40px}
.btn{display:inline-block;padding:14px 26px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;text-decoration:none;color:#13240f;background:var(--grass);box-shadow:inset -5px -5px 0 #2f6a2a,inset 5px 5px 0 #9be07a,0 0 0 4px var(--edge);transition:transform .1s}
.btn:hover{transform:translateY(-2px)}.btn:active{transform:translateY(2px)}.btn.alt{color:#2b1d00;background:var(--gold);box-shadow:inset -5px -5px 0 #c9962a,inset 5px 5px 0 #fff3b0,0 0 0 4px var(--edge)}
.scene{height:120px;overflow:hidden;position:relative;background:linear-gradient(transparent 92%,#3a2516 92%)}.scene .track{display:flex;width:max-content;animation:roll 70s linear infinite;will-change:transform}.scene img{height:120px;width:auto;flex:none}
@keyframes roll{to{transform:translateX(-50%)}}@media (prefers-reduced-motion:reduce){.scene .track{animation:none}}
.ground{height:22px;background:repeating-linear-gradient(90deg,#4c9a3b 0 12px,#5fb548 12px 24px);box-shadow:0 6px 0 #3a2516,0 14px 0 #2b1b10}
section{max-width:1180px;margin:0 auto;padding:56px 16px}
h2{font-size:1.7rem;text-transform:uppercase;letter-spacing:.08em;color:var(--gold);text-shadow:0 3px 0 var(--edge);margin:0 0 8px}.sub{color:var(--soft);margin:0 0 26px;max-width:760px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px;list-style:none;padding:0;margin:0}
.card{background:var(--panel);padding:20px;box-shadow:inset -4px -4px 0 #150f26,inset 4px 4px 0 #3a2d5e,0 0 0 4px var(--edge)}.card h3{margin:10px 0 6px;font-size:1.1rem;color:var(--ink)}.card p{margin:0;color:var(--soft);font-size:.96rem}.card img{height:72px;width:auto}
.steps{counter-reset:s;list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px}.steps li{position:relative;padding:20px 20px 20px 74px;background:var(--panel);box-shadow:0 0 0 4px var(--edge)}.steps li::before{counter-increment:s;content:counter(s);position:absolute;left:18px;top:18px;width:40px;height:40px;display:grid;place-items:center;font-weight:900;color:#2b1d00;background:var(--gold);box-shadow:inset -3px -3px 0 #c9962a,0 0 0 3px var(--edge)}.steps b{display:block;color:var(--ink)}.steps span{color:var(--soft);font-size:.95rem}
.strip{overflow:hidden;box-shadow:0 0 0 4px var(--edge);margin:0 0 10px;background:#1a1330}.strip img{height:120px;width:auto;display:block}
.cap{color:var(--soft);font-size:.9rem;margin:0 0 28px}
.shots{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px}.shots figure{margin:0}.shots img{width:100%;height:auto;image-rendering:auto;box-shadow:0 0 0 4px var(--edge)}.shots figcaption{color:var(--soft);font-size:.9rem;margin-top:8px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:16px;list-style:none;padding:0;margin:0}.stats li{background:#0f0a1c;padding:16px;text-align:center;box-shadow:0 0 0 4px var(--edge)}.stats b{display:block;font:900 2rem/1.1 ui-monospace,Consolas,monospace;color:var(--gold)}.stats span{color:var(--soft);font-size:.9rem}
.cta{text-align:center;background:linear-gradient(#140e24,#2a1d55)}.cta p{color:var(--soft)}
footer{border-top:4px solid var(--edge);color:var(--soft);font-size:.9rem}footer .in{max-width:1180px;margin:0 auto;padding:18px 16px}
@media (max-width:640px){.hero{padding-top:36px}.tag{font-size:1.05rem}h2{font-size:1.35rem}section{padding:40px 14px}}`;

function downloadPage() {
  const R = '../';
  pages.push('telecharger/');
  search.push({ t: 'Télécharger Farmling', u: 'telecharger/', k: 'Page' });
  write('telecharger/', `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Télécharger Farmling · Windows</title>
<meta name="description" content="Télécharge Farmling gratuitement pour Windows : installateur avec mises à jour automatiques, ou version portable sans installation.">
<meta name="theme-color" content="#140e24">
${SITE_URL ? `<link rel="canonical" href="${SITE_URL}/telecharger/">` : ''}
<link rel="icon" href="${R}img/icon-seeds.png" type="image/png">
<script>${SEASON_SCRIPT}</script>
<style>${HOME_CSS}${SEASON_CSS_HOME(R)}.dl{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px;list-style:none;padding:0;margin:0}.dl .card{display:flex;flex-direction:column;gap:12px}.dl .card .btn{align-self:flex-start;margin-top:auto}.req{columns:2 280px;color:var(--soft)}.req li{margin-bottom:6px}</style>
</head>
<body>
<a class="skip" href="#contenu">Aller au contenu</a>
<header class="bar"><div class="in"><a class="brand" href="${R}" aria-label="Farmling, accueil"><img src="${R}img/logo.png" width="120" height="36" alt=""></a>
<nav aria-label="Navigation principale"><ul><li><a href="${R}wiki/">Wiki</a></li><li><a href="${R}guide/">Guide</a></li><li><a href="${R}editeur/">Éditeur</a></li></ul></nav></div></header>
<main id="contenu">
<section aria-labelledby="t-dl"><h1 id="t-dl" style="margin:0 0 8px;font-size:2rem;text-transform:uppercase;letter-spacing:.08em;color:var(--gold);text-shadow:0 3px 0 var(--edge)">Télécharger Farmling</h1>
<p class="sub">Gratuit, pour Windows 10 et 11 (64 bits). Version actuelle : <b>${esc(PKG.version)}</b>.</p>
<ul class="dl">
<li class="card"><img src="${R}img/barn.png" width="78" height="60" alt=""><h2 style="font-size:1.25rem">Installateur</h2><p>Recommandé. Le jeu se met à jour tout seul (téléchargement en arrière-plan, puis redémarrage), et la mise à jour garde toujours ta partie. Lancement automatique avec Windows en option.</p><a class="btn" href="${DL_SETUP}">▶ Farmling-Setup.exe</a></li>
<li class="card"><img src="${R}img/factory.png" width="78" height="66" alt=""><h2 style="font-size:1.25rem">Version portable</h2><p>Un seul fichier, sans installation : pratique sur une clé USB. Elle partage la même sauvegarde que la version installée, et te prévient quand une nouvelle version sort.</p><a class="btn alt" href="${DL_PORTABLE}">Farmling-portable.exe</a></li>
</ul>
<p class="cap" style="margin-top:20px">Les fichiers viennent directement des <a href="${DL_PAGE}">versions publiées sur GitHub</a> (notes de version et anciennes versions).</p>
</section>
<section aria-labelledby="t-install"><h2 id="t-install">Installation</h2>
<ol class="steps">
<li><b>Lance le fichier</b><span>Windows peut afficher « Windows a protégé votre ordinateur » (le jeu n’est pas signé) : clique sur « Informations complémentaires », puis « Exécuter quand même ».</span></li>
<li><b>Regarde en bas de l’écran</b><span>La ferme apparaît juste au-dessus de la barre des tâches. Ctrl+Alt+F l’affiche ou la masque.</span></li>
<li><b>Joue… ou pas</b><span>Elle pousse toute seule. Clique sur la flèche à gauche pour ouvrir la boutique et le pinceau de graines.</span></li>
</ol></section>
<section aria-labelledby="t-req"><h2 id="t-req">Configuration et sauvegarde</h2>
<ul class="req"><li>Windows 10 ou 11, 64 bits</li><li>Environ 250 Mo de mémoire et 2 % d’un cœur de processeur</li><li>Aucune connexion nécessaire (sauf pour les mises à jour)</li>
<li>Sauvegarde automatique toutes les 5 s dans <code>%APPDATA%\\IdleIt Ferme</code>, ou dans un dossier de ton choix (cloud, NAS)</li>
<li>Désinstaller le jeu ne supprime jamais ta sauvegarde</li><li>Ta partie se modifie avec l’<a href="${R}editeur/">éditeur de sauvegarde</a></li></ul>
<div class="btns" style="justify-content:flex-start;margin-top:24px"><a class="btn" href="${DL_SETUP}">▶ Télécharger l’installateur</a><a class="btn alt" href="${R}wiki/">Explorer le wiki</a></div>
</section>
</main>
<footer><div class="in">Farmling ${esc(PKG.version)} · <a href="${R}">Accueil</a> · <a href="${R}wiki/">Wiki</a> · <a href="${REPO}">Code source</a></div></footer>
</body>
</html>`);
}

function homePage() {
  const R = './';
  const scene = (name, w, alt, lazy) => `<img src="${R}shots/${name}.webp" width="${w}" height="120" alt="${esc(alt)}"${lazy ? ' loading="lazy"' : ''} decoding="async">`;
  const sp = (name, w, h, alt = '') => `<img src="${R}img/${name}.png" width="${w}" height="${h}" alt="${esc(alt)}" loading="lazy" decoding="async">`;
  const DL = DL_SETUP;
  const features = [
    [sp('seed-cosmique', 48, 72, 'Chou cosmique'), `${counts.seeds} légumes`, `Du radis à l’Arbre-monde, en ${Object.keys(D.FAMILIES).length} familles et 20 ères. Chaque renaissance ouvre de nouvelles cultures.`],
    [sp('pet-poussin-phenix', 72, 72, 'Phénix'), `${counts.pets} compagnons`, `Chacun avec son arbre, son évolution, 3 voies et une maîtrise. Le poussin devient coq, puis basilic, phénix ou rapace.`],
    [sp('icon-food', 72, 72, 'Gamelle'), `${counts.combos} combinaisons`, `${counts.foods} gamelles qui transforment tes compagnons : un phénix givré qui humidifie la terre, un ver cosmique qui traverse le champ…`],
    [sp('robot-drone', 72, 72, 'Drone agricole'), `${counts.robots} robots`, 'Ils travaillent jour et nuit, puis filent se recharger à la grange. Du robot rouillé à l’intelligence centrale.'],
    [sp('machine-alambic', 72, 72, 'Alambic'), 'Une usine', `${D.MACHINES.length} machines, ${counts.recipes} recettes : compotes, glaces, chocolats, élixirs… et des recettes dorées.`],
    [sp('icon-market', 72, 72, 'Marché'), 'Un marché vivant', 'Cours qui bougent, pénuries, krachs, commandes et produits qui s’abîment au silo. Vends au bon moment.'],
  ];
  pages.push('');
  write('', `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Farmling · la ferme idle au-dessus de ta barre des tâches</title>
<meta name="description" content="Farmling : une ferme idle en pixel art qui vit au-dessus de ta barre des tâches Windows. ${counts.seeds} légumes, ${counts.pets} compagnons, des robots, une usine et un marché. Gratuit.">
<meta name="theme-color" content="#140e24">
<meta property="og:title" content="Farmling"><meta property="og:description" content="La ferme idle en pixel art qui vit au-dessus de ta barre des tâches."><meta property="og:type" content="website">
${SITE_URL ? `<link rel="canonical" href="${SITE_URL}/"><meta property="og:image" content="${SITE_URL}/img/logo.png">` : ''}
<link rel="icon" href="${R}img/icon-seeds.png" type="image/png">
<link rel="preload" as="image" href="${R}img/logo.png" fetchpriority="high">
<script>${SEASON_SCRIPT}</script>
<style>${HOME_CSS}${SEASON_CSS_HOME(R)}</style>
</head>
<body>
<a class="skip" href="#contenu">Aller au contenu</a>
<header class="bar"><div class="in"><a class="brand" href="${R}" aria-label="Farmling, accueil"><img src="${R}img/logo.png" width="120" height="36" alt=""></a>
<nav aria-label="Navigation principale"><ul><li><a href="${R}wiki/">Wiki</a></li><li><a href="${R}guide/">Guide</a></li><li><a href="${R}compagnons/">Compagnons</a></li><li><a href="${R}editeur/">Éditeur</a></li><li><a href="${R}telecharger/">Télécharger</a></li></ul></nav></div></header>
<main id="contenu">
<div class="hero">
<h1><img class="logo" src="${R}img/logo.png" width="${LOGO.w}" height="${LOGO.h}" alt="Farmling" fetchpriority="high"></h1>
<p class="tag">La ferme idle en pixel art qui vit <b>au-dessus de ta barre des tâches</b>. Elle pousse pendant que tu travailles.</p>
<p class="sbanner"></p>
<div class="btns"><a class="btn" href="${DL}">▶ Télécharger pour Windows</a><a class="btn alt" href="${R}wiki/">Explorer le wiki</a></div>
<p class="tag" style="font-size:.95rem;margin-top:-26px">Gratuit · installateur ~75 Mo · <a href="${R}telecharger/">version portable et détails</a></p>
<div class="scene" aria-hidden="true"><div class="track"><span class="sc"></span><span class="sc"></span></div></div>
</div>
<div class="ground" aria-hidden="true"></div>

<section aria-labelledby="t-quoi"><h2 id="t-quoi">Une ferme vivante, toute petite</h2>
<p class="sub">Une bande de 40 pixels, transparente et toujours au premier plan. Le fermier, les robots et les animaux cultivent tout seuls ; les clics traversent les zones vides, la ferme ne gêne jamais. Et elle ne consomme presque rien : environ 2 % d’un cœur.</p>
<ul class="cards">${features.map(([im, t, d]) => `<li class="card">${im}<h3>${t}</h3><p>${d}</p></li>`).join('')}</ul></section>

<section aria-labelledby="t-comment"><h2 id="t-comment">Comment on joue</h2><p class="sub">Une partie idle qui dure environ 160 heures, sans jamais te demander d’attention.</p>
<ol class="steps">
<li><b>Plante et automatise</b><span>Choisis tes graines au pinceau, achète des parcelles, des outils et des robots.</span></li>
<li><b>Spécialise ta ferme</b><span>Mécanique, Botanique ou Paysannerie ; Bio ou Science, avec ses OGM et ses mutations.</span></li>
<li><b>Élève tes compagnons</b><span>Fais-les évoluer, choisis leur voie, puis nourris-les avec les gamelles de l’usine.</span></li>
<li><b>Renais plus fort</b><span>Échange ta ferme contre des graines d’or, débloque de nouvelles ères et des compagnons légendaires.</span></li>
</ol></section>

<section aria-labelledby="t-jour"><h2 id="t-jour">Jour, nuit, usine</h2><p class="sub">La météo change, les orages énergisent les légumes dorés, des sangliers, des voleurs ou des touristes passent… Après 13 renaissances, un clic sur la grange ouvre l’usine.</p>
<div class="strip">${scene('scene-night', 3312, 'La ferme la nuit', true)}</div><p class="cap">La nuit : le fermier dort, les robots continuent.</p>
<div class="strip">${scene('scene-factory', 2892, 'L’usine de transformation', true)}</div><p class="cap">L’usine : porteurs, machines, tapis roulant et frigos.</p>
<div class="shots">
<figure><img src="${R}shots/usine.webp" width="626" height="380" alt="Onglet Usine du jeu" loading="lazy" decoding="async"><figcaption>Machines, recettes et gestionnaire d’usine.</figcaption></figure>
<figure><img src="${R}shots/pets-food.webp" width="626" height="380" alt="Un phénix et sa gamelle" loading="lazy" decoding="async"><figcaption>Une gamelle équipée : le phénix devient givré.</figcaption></figure>
</div></section>

<section aria-labelledby="t-chiffres"><h2 id="t-chiffres">En chiffres</h2>
<ul class="stats">${[[counts.seeds, 'légumes'], [counts.pets, 'compagnons'], [counts.paths, 'voies'], [counts.specials, 'effets de nourriture'], [counts.ups, 'améliorations'], [Object.keys(D.EVENTS).length, 'événements'], [counts.ach, 'succès'], ['~160 h', 'de durée de vie']].map(([n, t]) => `<li><b>${n}</b><span>${t}</span></li>`).join('')}</ul></section>

<section class="cta" aria-labelledby="t-go"><h2 id="t-go">Prêt à semer ?</h2><p>Gratuit, pour Windows. L’installateur se met à jour tout seul et garde ta partie.</p>
<div class="btns"><a class="btn" href="${DL}">▶ Télécharger Farmling</a><a class="btn alt" href="${DL_PORTABLE}">Version portable</a></div><p><a href="${R}telecharger/">Configuration requise et installation</a> · <a href="${R}editeur/">Éditeur de sauvegarde</a></p></section>
</main>
<footer><div class="in">Farmling ${esc(PKG.version)} · <a href="${R}wiki/">Wiki</a> · <a href="https://github.com/TisaTHor08/IdleIt">Code source</a></div></footer>
</body>
</html>`);
}

// ---------- Guide ----------
page('guide/', {
  title: 'Guide du jeu', desc: 'Les bases de Farmling : le fermier, le pinceau de graines, les robots, la spécialisation, les compagnons, le marché, l’usine et la renaissance.', crumbs: [['', 'Guide']], kind: 'Guide',
  body: R => `<h1>Guide du jeu</h1>
<p class="lead">Farmling est une bande de 40 pixels, transparente et toujours au premier plan, posée au-dessus de la barre des tâches. Le fermier, les robots et les animaux cultivent tout seuls.</p>
<h2>Commandes</h2>${table('Commandes', ['Action', 'Effet'], [
    ['Ctrl+Alt+F', 'Afficher ou masquer la ferme (modifiable dans les réglages)'], ['Clic sur une plante', 'Récolter, planter, arroser, traiter ou faire pousser'],
    ['Clic sur un corbeau, un sanglier, un voleur, une nuée', 'Le chasser (et souvent gagner une récompense)'], ['Clic sur un compagnon', 'Le caresser (+XP)'],
    ['Clic sur le silo', 'Tout vendre au marché'], ['Clic sur la grange ou l’usine', `Passer du champ à l’usine (après ${D.FACTORY.pr} renaissances) et revenir`],
    ['Clic droit ou Échap', 'Lâcher le pinceau, fermer le panneau']])}
<h2>Les bases</h2><p>Le fermier plante, arrose et récolte. Il dort la nuit, sauf avec la lampe frontale. La flèche du HUD déplie le menu et le <b>pinceau</b> de graines : choisis une graine, puis clique sur des parcelles. Le pinceau « Auto » plante toujours la meilleure graine.</p>
<p>Chaque <a href="${R}legumes/">légume</a> rapporte plus que le précédent, mais pousse plus lentement et coûte plus cher. Les légumes appartiennent à 10 familles, chacune avec ses outils, ses améliorations de culture et sa durée de conservation au silo.</p>
<h2>Progression</h2><ol>
<li>Achète des parcelles, des outils et des <a href="${R}robots/">robots</a> (ils ont une batterie et se rechargent à la grange).</li>
<li>Choisis une <a href="${R}specialisation/">spécialisation</a> : Mécanique, Botanique ou Paysannerie, et Bio ou Science.</li>
<li>Adopte un <a href="${R}compagnons/">compagnon</a>, fais-le évoluer et choisis sa voie au niveau 20.</li>
<li>Débloque le <a href="${R}marche/">marché</a> (10 M$ gagnés dans une partie) : silos, cours, commandes.</li>
<li>Atteins le seuil de <a href="${R}renaissance/">renaissance</a> : repars de zéro avec des graines d’or et de nouveaux légumes.</li>
<li>Après ${D.FACTORY.pr} renaissances, construis l’<a href="${R}usine/">usine</a> et cuisine de la <a href="${R}nourriture/">nourriture</a> pour tes compagnons.</li></ol>
<h2>Durée de vie</h2><p>Environ 160 heures pour 20 renaissances. La première renaissance arrive vers 5 h, et chaque partie dure ensuite un peu plus longtemps.</p>`,
});

// ---------- Légumes ----------
const recipesUsing = sd => D.RECIPES.filter(r => r.inputs.some(i => i.seed ? i.seed === sd.id : i.fam === sd.fam));
const famUps = fam => D.UPGRADES.filter(u => (u.fx || []).some(f => f.fam === fam));
page('legumes/', {
  title: 'Légumes', desc: `Les ${D.SEEDS.length} légumes de Farmling : famille, ère, valeur, temps de pousse, prix et conservation.`, crumbs: [['', 'Légumes']], kind: 'Section',
  body: R => `<h1>Légumes</h1><p class="lead">${D.SEEDS.length} légumes en ${Object.keys(D.FAMILIES).length} familles. Les légumes d’une ère ne se débloquent qu’après le nombre de renaissances indiqué. Un légume <b>doré</b> vaut 10× plus (25× récolté à la main), et se stocke à part au silo, avec son propre cours.</p>
<ul class="grid">${D.SEEDS.map((sd, i) => `<li><a class="tile" href="${R}legumes/${sd.id}/">${seedImg(R, sd, 1, i > 11)}<span><b>${esc(sd.name)}</b><small>${esc(famName(sd.fam))} · ${sd.pr ? sd.pr + ' R' : 'départ'}</small></span></a></li>`).join('')}</ul>
<h2>Tableau complet</h2>${table('Tableau des légumes', ['Légume', 'Famille', 'Ère', 'Valeur', 'Pousse', 'Prix', 'Conservation'], D.SEEDS.map(sd => [seedLink(R, sd), esc(famName(sd.fam)), sd.pr ? sd.pr + ' R' : 'départ', `<span class="n">${fmt(sd.value)} $</span>`, time(sd.grow), sd.unlock ? fmt(sd.unlock) + ' $' : 'gratuit', time(sd.shelf)]))}
<h2>Familles</h2>${table('Familles', ['Famille', 'Légumes', 'Conservation au silo', 'Améliorations'], Object.entries(D.FAMILIES).map(([id, f]) => [esc(f.name), D.SEEDS.filter(s => s.fam === id).map(s => seedLink(R, s)).join(', '), time(f.shelf), famUps(id).map(u => esc(u.name)).join(', ') || '—']))}`,
});
for (const sd of D.SEEDS) {
  const i = D.SEEDS.indexOf(sd), prev = D.SEEDS[i - 1], next = D.SEEDS[i + 1];
  page(`legumes/${sd.id}/`, {
    title: sd.name, desc: `${sd.name} dans Farmling : famille ${famName(sd.fam).toLowerCase()}, ${era(sd.pr)}, valeur ${fmt(sd.value)} $, pousse en ${time(sd.grow)}.`, crumbs: [['legumes/', 'Légumes'], ['', sd.name]], kind: 'Légume',
    body: R => `<div class="hero">${seedImg(R, sd, 3, false, sd.name)}${img(R, 'gold-' + sd.id, 72, 108, sd.name + ' doré(e)', false)}<div><h1>${esc(sd.name)}</h1><p class="lead">${esc(sd.desc || '')}</p></div></div>
${facts([['Famille', esc(famName(sd.fam))], ['Ère', era(sd.pr)], ['Valeur d’une récolte', fmt(sd.value) + ' $'], ['Temps de pousse', time(sd.grow) + (sd.grow < D.FAST_GROW ? ' (rapide)' : ' (lente)')], ['Prix de déblocage', sd.unlock ? fmt(sd.unlock) + ' $' : 'gratuit'], ['Conservation au silo', time(sd.shelf)], ['Soif', '×' + sd.thirst], ['Rang', (sd.rank + 1) + ' / ' + D.SEEDS.length]])}
${sd.night ? '<p class="card">Ce légume <b>pousse la nuit</b> sans malus.</p>' : ''}
<h2>Pousse</h2><p>${img(R, 'grow-' + sd.id, 360, 108, 'Stades de pousse : ' + sd.name)}</p>
<h2>Améliorations de sa famille</h2>${famUps(sd.fam).length ? table('Améliorations de la famille', ['Amélioration', 'Effet', 'Niveaux', 'Ère'], famUps(sd.fam).map(u => [esc(u.name), esc(u.desc), u.max, era(u.pr || 0)])) : '<p>Aucune amélioration propre à cette famille.</p>'}
<h2>Recettes de l’usine</h2>${recipesUsing(sd).length ? table('Recettes', ['Recette', 'Machine', 'Ingrédients'], recipesUsing(sd).map(r => [`<a href="${R}usine/#${r.id}">${esc(r.name)}</a>`, esc(MACH[r.machine].name), r.inputs.map(x => inputText(R, x)).join(' + ')])) : '<p>Aucune recette n’utilise ce légume.</p>'}
<p class="crumbs">${prev ? `← ${seedLink(R, prev)}` : ''} ${next ? ` · ${seedLink(R, next)} →` : ''}</p>`,
  });
}

// ---------- Compagnons ----------
page('compagnons/', {
  title: 'Compagnons', desc: `Les ${D.PETS.length} compagnons de Farmling, leurs évolutions, leurs ${counts.paths} voies, leur arbre de talents et la maîtrise.`, crumbs: [['', 'Compagnons']], kind: 'Section',
  body: R => `<h1>Compagnons</h1><p class="lead">Un emplacement de compagnon au départ, puis un de plus aux renaissances ${D.PRESTIGE.petSlotAt.slice(1).join(', ')} (${D.PRESTIGE.maxPetSlots} au total). Les compagnons gagnent de l’XP quand la ferme récolte et quand tu les caresses, évoluent, choisissent une voie au niveau ${D.PET_LEVEL.max}, puis progressent en maîtrise jusqu’au niveau ${D.PET_LEVEL.max + D.PET_LEVEL.masteryMax}. Ils reviennent au niveau 0 à chaque renaissance.</p>
<ul class="grid">${D.PETS.map(p => `<li><a class="tile" href="${R}compagnons/${p.id}/">${petImg(R, p.id, 'base', 1.5, false)}<span><b>${esc(p.name)}</b><small>${p.pr ? 'légendaire · ' + p.pr + ' R' : 'adoption ' + fmt(p.cost) + ' $'}</small></span></a></li>`).join('')}</ul>
<h2>Maîtrise</h2>${table('Maîtrise', ['Maîtrise', 'Effet', 'Niveaux'], D.MASTERY.map(m => [esc(m.name), esc(m.desc), m.max]))}
<h2>Niveaux</h2><p>Niveau k → k+1 : ${D.PET_LEVEL.base} × ${D.PET_LEVEL.g}^k XP jusqu’au niveau ${D.PET_LEVEL.max}, puis ${D.PET_LEVEL.masteryBase} × ${D.PET_LEVEL.masteryG}^(k − ${D.PET_LEVEL.max}). ${D.PET_LEVEL.perHarvest} XP par récolte, ${D.PET_LEVEL.perPet} XP par caresse.</p>`,
});
for (const p of D.PETS) {
  const st = states(p);
  page(`compagnons/${p.id}/`, {
    title: p.name, desc: `${p.name} dans Farmling : ${p.desc} Évolution, 3 voies, arbre de talents et les ${D.PET_FOODS.length * 4} combinaisons de nourriture.`, crumbs: [['compagnons/', 'Compagnons'], ['', p.name]], kind: 'Compagnon',
    body: R => `<div class="hero">${petImg(R, p.id, 'base', 3, false, p.name)}${petImg(R, p.id, 'evo', 3, false, p.evoName)}<div><h1>${esc(p.name)}</h1><p class="lead">${esc(p.desc)} <span class="bad">${esc(p.malus)}</span></p></div></div>
${facts([['Adoption', fmt(p.cost) + ' $'], ['Disponible', era(p.pr || 0)], ['Évolution', esc(p.evoName)], ['Idéal avec', esc(p.meta)]])}
<h2>Arbre de talents</h2><p>Un point par niveau, ${D.PET_LEVEL.max} points au total.</p>${table('Arbre de talents', ['Nœud', 'Effet', 'Niveaux', 'Coût', 'Prérequis'], p.nodes.map(n => [esc(n.name) + (n.evo ? ' <span class="tag g">évolution</span>' : ''), esc(n.desc), n.max, n.cost + ' pt', Object.entries(n.req || {}).map(([k, v]) => esc(p.nodes.find(x => x.id === k).name) + ' ' + v).join(', ') || '—']))}
<h2>Voies</h2><p>Une fois évolué et au niveau ${D.PET_LEVEL.max}, le compagnon choisit une voie, définitive jusqu’à la renaissance.</p>
${p.paths.map(x => `<div class="card"><h3 id="${x.id}">${petImg(R, p.id, x.id)} ${esc(x.name)}</h3><p>${esc(x.desc)}</p><p class="bad">${esc(x.malus)}</p></div>`).join('')}
<h2>Nourriture</h2><p>L’effet de chaque <a href="${R}nourriture/">gamelle</a> selon l’état du compagnon. <span class="tag ok">soulagement</span> : effet modeste et la contrepartie actuelle disparaît. <span class="tag bad">marché</span> : effet fort et contrepartie nouvelle.</p>
${table('Effets de la nourriture', ['Gamelle', ...st.map(s => esc(s.name))], D.PET_FOODS.filter(f => !f.season).map(f => [foodLink(R, f), ...st.map(s => effectCell(D.foodEffect(p.id, s.id, f.id)))]))}`,
  });
}

// ---------- Nourriture ----------
page('nourriture/', {
  title: 'Nourriture des compagnons', desc: `Les ${D.PET_FOODS.length} gamelles de Farmling : recette, quantité, effet général et effets spéciaux selon le compagnon et sa voie.`, crumbs: [['', 'Nourriture']], kind: 'Section',
  body: R => `<h1>Nourriture des compagnons</h1><p class="lead">Avec la cuisine pour animaux de l’<a href="${R}usine/">usine</a>, les produits du frigo deviennent des gamelles. Une gamelle coûte des produits et des frais (${D.FACTORY.foodFee} × la valeur des produits utilisés). Elle agit tant qu’elle est équipée ; retirée, son effet s’arrête et elle revient au placard. Les gamelles sont gardées à la renaissance.</p>
${table('Gamelles', ['Gamelle', 'Recette', 'Quantité', 'Effet général', 'Effets spéciaux'], D.PET_FOODS.filter(f => !f.season).map(f => [foodLink(R, f), esc(REC[f.recipe].name), f.units, esc(f.any.desc), f.special.length]))}
<h2 id="saison">Gamelles de saison</h2><p>Elles se cuisinent seulement pendant leur <a href="${R}saisons/">fête</a>, avec les deux légumes qui n’y poussent qu’à ce moment-là, et se gardent ensuite pour toujours. Même effet pour tous les compagnons, utile toute l’année, avec une contrepartie précise. <b>Les retirer les détruit.</b></p>
${table('Gamelles de saison', ['Gamelle', 'Fête', 'Ingrédients', 'Effet', 'Contrepartie', 'Effets spéciaux'], SEASON_FOODS.map(f => [esc(f.name), `<a href="${R}saisons/#${f.season}">${esc(D.SEASONS.find(x => x.id === f.season).name)}</a>`, f.ingredients.map(i => `${i.n} ${esc(D.SEASON_SEEDS.find(x => x.id === i.seed).name)}`).join(' + '), esc(f.any.desc), `<span class="bad">${esc(f.any.malus)}</span>`, f.special.map(x => petLink(R, x.pet)).join(', ') + ` <a href="${R}saisons/#${f.season}">(détails)</a>`]))}`,
});
for (const f of D.PET_FOODS.filter(x => !x.season)) {
  const r = REC[f.recipe];
  page(`nourriture/${f.id.replace(/^gl_/, '')}/`, {
    title: f.name, desc: `${f.name} (gamelle de Farmling) : ${f.units} × ${r.name}, son effet sur chacun des ${D.PETS.length} compagnons et chacune de leurs voies.`, crumbs: [['nourriture/', 'Nourriture'], ['', f.name]], kind: 'Gamelle',
    body: R => `<div class="hero">${icon(R, 'food', 4)}<div><h1>${esc(f.name)}</h1><p class="lead">${f.units} × <a href="${R}usine/#${r.id}">${esc(r.name)}</a> (${esc(MACH[r.machine].name)}) + frais. Effet général : ${esc(f.any.desc)}</p></div></div>
<h2>Effet sur chaque compagnon</h2>
${table('Effets par compagnon', ['Compagnon', 'État', 'Type', 'Effet'], D.PETS.flatMap(p => states(p).map(s => { const e = D.foodEffect(p.id, s.id, f.id); return [petImg(R, p.id, s.look) + ' ' + petLink(R, p.id), esc(s.name), `<span class="tag ${e.bal === 'R' ? 'ok' : e.special ? 'bad' : ''}">${effectType(e)}</span>`, effectCell(e)]; })))}`,
  });
}

// ---------- Combinaisons ----------
page('combinaisons/', {
  title: 'Toutes les combinaisons', desc: `Les ${counts.specials} effets spéciaux de nourriture de Farmling, classés par gamelle, avec leur type (soulagement ou marché) et leur contrepartie.`, crumbs: [['', 'Combinaisons']], kind: 'Section',
  body: R => {
    const n = { R: 0, M: 0 };
    for (const f of D.PET_FOODS) for (const x of f.special) if (x.bal === 'R') n.R++; else n.M++;
    return `<h1>Toutes les combinaisons</h1><p class="lead">${counts.combos} combinaisons compagnon × état × gamelle, et un effet spécial pour chacune. ${counts.specials} effets différents : ${n.R} soulagements (effet modeste, la contrepartie disparaît) et ${n.M} marchés (effet fort, contrepartie nouvelle). Un effet propre à une voie passe avant celui de l’espèce.</p>
${D.PET_FOODS.filter(f => !f.season).map(f => `<h2 id="${f.id}">${foodLink(R, f)}</h2>${table('Effets spéciaux : ' + f.name, ['Pour', 'Type', 'Effet'], f.special.map(x => {
      const pet = x.path ? PATH[x.path].pet : x.pet;
      const shown = D.foodEffect(pet, x.path || null, f.id);
      return [x.path ? `${petImg(R, pet, x.path)} ${esc(PATH[x.path].name)} <span class="muted">(voie)</span>` : `${petImg(R, pet, 'base')} ${petLink(R, pet)}`, `<span class="tag ${x.bal === 'R' ? 'ok' : 'bad'}">${x.bal === 'R' ? 'soulagement' : 'marché'}</span>`, effectCell(shown)];
    }))}`).join('')}`;
  },
});

// ---------- Robots ----------
page('robots/', {
  title: 'Robots', desc: `Les ${D.ROBOTS.length} robots de Farmling : prix, vitesse, spécialité, batterie et ère de déblocage.`, crumbs: [['', 'Robots']], kind: 'Section',
  body: R => `<h1>Robots</h1><p class="lead">Les robots vont plus vite que le fermier, mais ont une batterie et retournent se recharger à la grange. Les modèles avancés se débloquent au fil des renaissances. À partir de ${D.MINI.need} robots d’un modèle, il peut être miniaturisé (plus discret, ${pct(1 - D.MINI.pace)} moins efficace).</p>
${table('Robots', ['Robot', 'Prix', 'Hausse', 'Max', 'Vitesse', 'Spécialité', 'Ère'], D.ROBOTS.map((r, i) => [`<span id="${r.id}">${robotImg(R, r.id, 1, i > 6)} ${esc(r.name)}</span>`, fmt(r.cost) + ' $', '×' + r.g, r.max, `${r.walk} px/s`, [r.fly ? 'vole' : '', r.only ? 'seulement : ' + r.only : '', r.scare ? 'épouvantail' : '', r.hub ? 'coordonne les robots' : '', r.noBattery ? 'sans batterie' : '', r.drain ? 'consomme ×' + r.drain : ''].filter(Boolean).join(', ') || 'polyvalent', era(r.pr || 0)]))}
<h2>Batteries</h2><p>${Object.entries(D.BATTERY).filter(([, v]) => typeof v === 'number').map(([k, v]) => `${esc(k)} : ${v}`).join(' · ')}</p>`,
});

// ---------- Améliorations ----------
const TABNAME = { outils: 'Outils', champ: 'Champ', robots: 'Robots', marche: 'Marché', usine: 'Usine' };
page('ameliorations/', {
  title: 'Améliorations', desc: `Les ${counts.ups} améliorations de Farmling : effet, prix de départ, hausse par niveau, niveaux et ère.`, crumbs: [['', 'Améliorations']], kind: 'Section',
  body: R => `<h1>Améliorations</h1><p class="lead">Le prix d’un niveau est multiplié par la hausse à chaque niveau acheté. Les améliorations d’une famille de légumes n’apparaissent qu’avec le premier légume de cette famille.</p>
${Object.entries(TABNAME).map(([t, name]) => `<h2 id="${t}">${name}</h2>${table(name, ['Amélioration', 'Effet', 'Prix', 'Hausse', 'Niveaux', 'Max au total', 'Ère'], D.UPGRADES.filter(u => u.tab === t && !u.cosmetic).map(u => [esc(u.name), esc(u.desc), fmt(u.base) + ' $', u.g > 1 ? '×' + fmt(u.g) : '—', u.max >= 999 ? '1 par parcelle' : u.max, u.max > 1 && u.max < 999 ? fmt(Array.from({ length: u.max }, (_, k) => upCost(u, k)).reduce((a, b) => a + b, 0)) + ' $' : '—', era(u.pr || 0)]))}`).join('')}
<h2>Miniaturisation</h2>${table('Miniaturisation', ['Robot', 'Prix', 'Condition'], D.UPGRADES.filter(u => u.cosmetic).map(u => [esc(u.name.replace('Miniaturisation : ', '')), fmt(u.base) + ' $', u.needRobots ? u.needRobots.n + ' robots du modèle' : '—']))}`,
});

// ---------- Spécialisation ----------
page('specialisation/', {
  title: 'Spécialisation', desc: 'Les branches de spécialisation de Farmling (Mécanique, Botanique, Paysannerie, Bio, Science) et tous leurs talents.', crumbs: [['', 'Spécialisation']], kind: 'Section',
  body: R => `<h1>Spécialisation</h1><p class="lead">Les talents s’achètent avec de l’argent et repartent à zéro à la renaissance. Chaque niveau dans une branche rend les autres branches ${D.SPEC_PENALTY}× plus chères. Bio et Science s’excluent pendant une partie. Les mutations de la Science sont détaillées sur la page <a href="${R}cultures/">cultures et mutations</a>.</p>
${D.BRANCHES.map(b => `<h2 id="${b.id}">${esc(b.name)}</h2>${b.desc ? `<p>${esc(b.desc)}</p>` : ''}${table(b.name, ['Talent', 'Effet', 'Prix', 'Hausse', 'Niveaux', 'Prérequis'], D.TALENTS.filter(t => t.branch === b.id).map(t => [esc(t.name), esc(t.desc), fmt(t.base) + ' $', t.g > 1 ? '×' + fmt(t.g) : '—', t.max, Object.entries(t.req || {}).map(([k, v]) => esc(TAL[k].name) + ' ' + v).join(', ') || '—']))}`).join('')}`,
});

// ---------- Usine ----------
const foodsOf = r => FACTORY_FOODS.filter(f => f.recipe === r.id);
page('usine/', {
  title: 'Usine de transformation', desc: `L'usine de Farmling : ${D.MACHINES.length} machines, ${D.RECIPES.length} recettes, robots d'usine, frigos, trader et gestionnaire.`, crumbs: [['', 'Usine']], kind: 'Section',
  body: R => `<div class="hero">${img(R, 'factory', 104, 88, 'L’usine', false)}<div><h1>Usine de transformation</h1><p class="lead">Disponible après ${D.FACTORY.pr} renaissances. Clique sur la grange pour passer à l’usine, sur l’usine pour revenir au champ. Les compagnons restent dans le champ.</p></div></div>
<h2>Fonctionnement</h2><ol><li>Les ingrédients viennent des silos. Le manutentionnaire (${D.FACTORY.porterWalk} px/s) puis les robots porteurs les apportent du quai aux machines.</li><li>Chaque machine cuisine un lot (${D.FACTORY.loadTime} s de chargement). Les grandes cuves ajoutent un lot par niveau.</li><li>Le tapis roulant (${D.FACTORY.beltSpeed} px/s, +25 % par niveau) mène les produits aux frigos (${D.FACTORY.fridgeCap} produits chacun).</li><li>Frigo plein : le grossiste rachète le reste à ${pct(D.FACTORY.wholesale)}. Avec le trader de produits, les ventes se font au cours (×${D.FACTORY.trendMin} à ×${D.FACTORY.trendMax}).</li></ol>
<h2>Machines</h2>${table('Machines', ['Machine', 'Recettes', 'Prix', 'Hausse', 'Max', 'Vitesse', 'Ère'], D.MACHINES.map(m => [`${img(R, 'machine-' + m.id, 32, 32, '')} ${esc(m.name)}`, esc(m.desc), fmt(D.FACTORY.base * m.cost) + ' $', '×' + m.g, m.max, '×' + m.speed, era(m.pr)]))}
<h2>Recettes</h2>${table('Recettes', ['Recette', 'Machine', 'Ingrédients par lot', 'Produits', 'Durée', 'Valeur', 'Conservation', 'Gamelle'], D.RECIPES.map(r => [`<span id="${r.id}">${esc(r.name)}</span>`, esc(MACH[r.machine].name), r.inputs.map(x => inputText(R, x)).join(' + '), r.out, time(r.time), '×' + r.mult, time(r.shelf), foodsOf(r).map(f => foodLink(R, f)).join(', ') || '—']))}
<p>Valeur d’un produit = valeur des ingrédients × multiplicateur ÷ nombre de produits, puis les recettes de grand-mère et les emballeurs.</p>
<h2>Robots d’usine</h2>${table('Robots d’usine', ['Robot', 'Effet', 'Prix', 'Hausse', 'Max'], D.FACTORY_ROBOTS.map(r => [esc(r.name), esc(r.desc), fmt(D.FACTORY.base * r.cost) + ' $', '×' + r.g, r.max]))}
<h2>Améliorations</h2><p>Voir <a href="${R}ameliorations/#usine">les améliorations de l’usine</a>.</p>`,
});

// ---------- Marché ----------
const M = D.MARKET;
page('marche/', {
  title: 'Marché', desc: 'Le marché de Farmling : silos, fraîcheur, cours, pénuries, krachs, commandes, trader et gestionnaire.', crumbs: [['', 'Marché']], kind: 'Section',
  body: R => `<h1>Marché</h1><p class="lead">Débloqué pour toujours dès ${fmt(M.unlockAt)} $ gagnés dans une même partie. Avec la licence de trading, les récoltes partent dans les silos et se vendent au cours.</p>
${facts([['Silo', M.siloCap + ' unités'], ['Silos max', M.siloMax], ['Marché classique (surplus)', pct(M.surplus)], ['Prime du marché', '×' + M.premium], ['Commission du trader', pct(M.commission)], ['Commandes max', M.demandMax], ['Prix plafonné à', M.parityCap + '× ton meilleur légume'], ['Lot pourri sous', pct(M.rotten) + ' de fraîcheur']])}
<h2>Cours</h2><p>Les cours font une marche aléatoire, plus volatile pour les légumes bon marché (×${M.trendMax[0]} à ×${M.trendMax[1]} au maximum). Des <b>pénuries</b> (×${M.shortage[0]} à ×${M.shortage[1]}) et des <b>krachs</b> (×${M.crash[0]} à ×${M.crash[1]}) frappent toutes les ${time(M.shockEvery[0])} à ${time(M.shockEvery[1])}. Les légumes dorés ont leur propre cours (×${M.goldTrend[0]} à ×${M.goldTrend[1]}).</p>
<h2>Commandes</h2><p>Les commandes paient à parité avec ton légume le plus rentable (×${M.demandParity[0]} à ×${M.demandParity[1]} en plus), de quoi rendre le blé ou les carottes rentables.</p>
${table('Étiquettes', ['Étiquette', 'Multiplicateur'], Object.entries(D.TRAITS).filter(([, t]) => t.mult).map(([, t]) => [esc(t.name || 'toutes'), '×' + t.mult[0] + ' à ×' + t.mult[1]]))}
<h2>Conservation</h2>${table('Conservation par famille', ['Famille', 'Durée'], Object.values(D.FAMILIES).map(f => [esc(f.name), time(f.shelf)]))}`,
});

// ---------- Événements ----------
page('evenements/', {
  title: 'Météo et événements', desc: `La météo (${Object.keys(D.WEATHER).length} temps), les orages et les ${Object.keys(D.EVENTS).length} événements aléatoires de Farmling.`, crumbs: [['', 'Météo et événements']], kind: 'Section',
  body: R => `<h1>Météo et événements</h1>
<h2>Météo</h2>${table('Météo', ['Temps', 'Effet', 'Croissance', 'Assèchement', 'Fréquence'], Object.values(D.WEATHER).map(w => [esc(w.name), esc(w.desc || ''), '×' + (w.growth ?? 1), '×' + (w.evap ?? 1), w.w]))}
<h2>Orages</h2><p>La foudre peut détruire une plante, geler un robot, maudire un corbeau ou énergiser un légume doré (×${D.STORM.energyMult} à la récolte, pendant ${D.STORM.energyTime} s). Les paratonnerres et le robot paratonnerre attirent la foudre.</p>
<h2>Événements aléatoires</h2><p>Un événement toutes les ${time(D.EVENTS_EVERY[0])} à ${time(D.EVENTS_EVERY[1])} environ.</p>
${table('Événements', ['Événement', 'Ce qui se passe', 'Type', 'Poids'], Object.values(D.EVENTS).map(e => [esc(e.name), esc(e.desc), e.good ? '<span class="tag ok">heureux</span>' : '<span class="tag bad">gênant</span>', e.w]))}`,
});

// ---------- Cultures et mutations ----------
page('cultures/', {
  title: 'Cultures denses et mutations', desc: 'Les cultures denses (serrée, intensive, quantique) et les 8 mutations de la Science dans Farmling.', crumbs: [['', 'Cultures et mutations']], kind: 'Section',
  body: R => `<h1>Cultures denses et mutations</h1>
<h2>Cultures denses</h2>${table('Cultures denses', ['Culture', 'Plants', 'Description'], D.DENSE.map(d => [esc(d.name), d.plants, esc(d.desc || 'Une parcelle normale.')]))}
<h2>Mutations</h2><p>En Science, une mutation peut être tirée à la plantation. L’édition génétique augmente la part des bonnes mutations.</p>
${table('Mutations', ['Mutation', 'Effet', 'Type'], Object.values(D.MUTATIONS).map(m => [esc(m.name), esc(m.desc), m.good ? '<span class="tag ok">bonne</span>' : '<span class="tag bad">mauvaise</span>']))}`,
});

// ---------- Renaissance ----------
page('renaissance/', {
  title: 'Renaissance', desc: 'La renaissance dans Farmling : seuils, graines d’or, talents de renaissance et tout ce que chaque renaissance débloque.', crumbs: [['', 'Renaissance']], kind: 'Section',
  body: R => `<h1>Renaissance</h1><p class="lead">Une fois le seuil atteint, la ferme repart de zéro contre des graines d’or : ${D.PRESTIGE.gsBase} × (gagné / seuil)^${D.PRESTIGE.gsExp}. Chaque graine d’or donne +${pct(D.PRESTIGE.bonus)} de revenus et s’échange contre des talents de renaissance.</p>
<h2>Seuils et déblocages</h2>${table('Seuils et déblocages', ['Renaissance', 'Seuil', 'Légumes', 'Robots', 'Compagnons et usine'], Array.from({ length: 21 }, (_, p) => [String(p), p < 20 ? fmt(D.threshold(p)) + ' $' : '—',
    D.SEEDS.filter(s => s.pr === p).map(s => seedLink(R, s)).join(', ') || '—', D.ROBOTS.filter(r => (r.pr || 0) === p).map(r => esc(r.name)).join(', ') || '—',
    [...D.PETS.filter(x => x.pr === p).map(x => petLink(R, x.id)), ...D.MACHINES.filter(m => m.pr === p).map(m => esc(m.name)), p === D.FACTORY.pr ? '<b>Usine</b>' : ''].filter(Boolean).join(', ') || '—']))}
<p class="muted">Ligne « 0 » : ce qui est disponible dès le départ, et le seuil de la première renaissance.</p>
<h2>Talents de renaissance</h2>${Object.entries(D.PERK_CATS).map(([c, name]) => `<h3>${esc(name)}</h3>${table(name, ['Talent', 'Effet', 'Coût', 'Hausse', 'Niveaux'], D.PERKS.filter(p => p.cat === c).map(p => [esc(p.name), esc(p.desc), plural(p.base, 'graine'), '×' + p.g, p.max]))}`).join('')}`,
});

// ---------- Succès ----------
page('succes/', {
  title: 'Succès', desc: `Les ${D.ACHIEVEMENTS.length} succès de Farmling et comment les obtenir.`, crumbs: [['', 'Succès']], kind: 'Section',
  body: R => `<h1>Succès</h1><p class="lead">${D.ACHIEVEMENTS.length} succès, chacun +${pct(D.ACH_BONUS)} de revenus.</p>${table('Succès', ['Succès', 'Condition'], D.ACHIEVEMENTS.map(a => [esc(a.name), esc(a.desc)]))}`,
});


// ---------- Saisons ----------
const RULE = { nouvel_an: '1er janvier', nouvel_an_chinois: 'date lunaire (fin janvier à mi-février)', saint_valentin: '14 février', paques: 'dimanche de Pâques (date variable)', fete_musique: '21 juin', halloween: '31 octobre', noel: '25 décembre' };
const dfmt = d => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
page('saisons/', {
  title: 'Saisons et fêtes', desc: `Les ${D.SEASONS.length} saisons de Farmling (nouvel an, nouvel an chinois, Saint-Valentin, Pâques, fête de la musique, Halloween, Noël) : plantes spéciales, événements, bonus et habillage.`, crumbs: [['', 'Saisons']], kind: 'Section',
  body: R => {
    const now = new Date();
    return `<h1>Saisons et fêtes</h1><p class="lead">Pendant ${D.SEASON_DAYS} jours avant et après chaque fête (3 semaines en tout), la ferme change : 2 plantes spéciales à planter gratuitement, un événement, des bonus qui changent la meilleure stratégie, et un habillage (décor, fermier, certains compagnons). Le jeu suit la date de l’ordinateur ; quand deux fêtes se chevauchent, la plus proche l’emporte. Ce site change aussi de couleurs pendant les fêtes.</p>
${D.SEASONS.map(def => {
      const seeds = D.SEASON_SEEDS.filter(x => x.season === def.id);
      const ev = Object.values(D.EVENTS).find(e => e.season === def.id);
      const next = [now.getFullYear(), now.getFullYear() + 1, now.getFullYear() + 2].map(y => { const [m, d] = def.date(y); return new Date(y, m - 1, d); }).filter(d => new Date(d.getFullYear(), d.getMonth(), d.getDate() + D.SEASON_DAYS) >= now).slice(0, 2);
      return `<h2 id="${def.id}">${esc(def.name)}</h2><p>${esc(def.desc)} <span class="muted">${esc(RULE[def.id])} · prochaines éditions : ${next.map(d => `${dfmt(new Date(d.getFullYear(), d.getMonth(), d.getDate() - D.SEASON_DAYS))} → ${dfmt(new Date(d.getFullYear(), d.getMonth(), d.getDate() + D.SEASON_DAYS))}`).join(' ; ')}</span></p>
<div class="tw" role="region" aria-label="Scène de ${esc(def.name)}" tabindex="0"><img class="px" src="${R}shots/scene-${def.id}.webp" width="3312" height="120" alt="La ferme pendant ${esc(def.name)}" loading="lazy" decoding="async" style="max-width:none;display:block"></div>
<h3>Bonus et modificateurs</h3><ul>${def.boosts.map(b => `<li>${esc(b)}</li>`).join('')}</ul>
<h3>Plantes de saison</h3>${table('Plantes de ' + def.name, ['Plante', 'Famille', 'Valeur', 'Pousse', 'Particularité'], seeds.map(x => [`<span id="${x.id}">${img(R, 'seed-' + x.id, 24, 36, '')} ${esc(x.name)}</span>`, esc(famName(x.fam)), `${x.mult}× ta meilleure graine`, time(x.grow), esc(x.desc)]))}
${ev ? `<h3>Événement : ${esc(ev.name)}</h3><p>${esc(ev.desc)}</p>` : ''}
${SEASON_FOODS.filter(f => f.season === def.id).map(f => `<h3>Gamelle de saison : ${esc(f.name)}</h3><p>${f.ingredients.map(i => `${i.n} ${esc(D.SEASON_SEEDS.find(x => x.id === i.seed).name)}`).join(' + ')}. ${esc(f.any.desc)} <span class="bad">Contrepartie : ${esc(f.any.malus)}.</span> Se garde après la fête ; la retirer la détruit. Les compagnons qui ont un effet spécial portent le costume de la fête (palette, accessoire, particules et façon de bouger), toute l’année tant qu’ils la portent.</p>${f.special.length ? table('Effets spéciaux : ' + f.name, ['Compagnon (costume)', 'Effet', 'Contrepartie'], f.special.map(x => [`${img(R, `pet-${x.pet}-skin-${f.season}`, 32, 32, '')} ${petLink(R, x.pet)}`, esc(x.desc), `<span class="bad">${esc(x.malus)}</span>`])) : ''}`).join('')}`;
    }).join('')}`;
  },
});
for (const def of D.SEASONS) search.push({ t: def.name, u: `saisons/#${def.id}`, k: 'Saison' });
for (const f of D.PET_FOODS.filter(x => x.season)) search.push({ t: f.name, u: 'nourriture/#saison', k: 'Gamelle de saison' });
for (const x of D.SEASON_SEEDS) search.push({ t: x.name, u: `saisons/#${x.id}`, k: 'Plante de saison' });

// ---------- Recherche ----------
page('recherche/', {
  title: 'Recherche', desc: 'Rechercher un légume, un compagnon, une voie, une gamelle ou une page dans le wiki Farmling.', crumbs: [['', 'Recherche']],
  body: () => `<h1>Recherche</h1><form role="search" onsubmit="return false"><label for="q">Légume, compagnon, voie, gamelle, recette…</label><br><input id="q" type="search" autocomplete="off" placeholder="ex. phénix, glace, truffe"></form><ul id="res" class="grid" aria-live="polite"></ul><noscript><p>La recherche a besoin de JavaScript. Utilise le menu ci-dessus.</p></noscript>`,
  script: `<script>(()=>{const q=document.getElementById('q'),res=document.getElementById('res');let idx=[];fetch('../search.json').then(r=>r.json()).then(d=>{idx=d;run()});const norm=s=>s.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase();function run(){const t=norm(q.value.trim());res.innerHTML='';if(!t)return;for(const e of idx.filter(e=>norm(e.t).includes(t)).slice(0,60)){const li=document.createElement('li'),a=document.createElement('a');a.className='tile';a.href='../'+e.u;a.innerHTML='<span><b></b><small></small></span>';a.querySelector('b').textContent=e.t;a.querySelector('small').textContent=e.k;li.append(a);res.append(li)}}q.addEventListener('input',run)})()</script>`,
});
// Voies et recettes dans l'index de recherche (elles vivent dans d'autres pages).
for (const p of D.PETS) for (const x of p.paths) search.push({ t: x.name, u: `compagnons/${p.id}/#${x.id}`, k: 'Voie de ' + p.name });
for (const r of D.RECIPES) search.push({ t: r.name, u: `usine/#${r.id}`, k: 'Recette' });
for (const r of D.ROBOTS) search.push({ t: r.name, u: `robots/#${r.id}`, k: 'Robot' });

// ---------- Éditeur de sauvegarde ----------
function editor() {
  let html = fs.readFileSync(path.join(ROOT, 'editeur-de-save.html'), 'utf8');
  // Le code (données du jeu + éditeur, ~160 Ko) part dans un script différé : la page s'affiche tout de suite.
  const scripts = [];
  html = html.replace(/<script>([\s\S]*?)<\/script>/g, (_, code) => { scripts.push(code); return ''; });
  fs.mkdirSync(path.join(OUT, 'editeur'), { recursive: true });
  fs.writeFileSync(path.join(OUT, 'editeur', 'editeur.js'), scripts.join('\n;\n'));
  html = html.replace('</body>', '<script src="editeur.js" defer></script>\n</body>')
    .replace('<title>', '<meta name="description" content="Éditeur de sauvegarde de Farmling : glisse ton save.json et modifie ta partie sans les limites du jeu, directement dans le navigateur.">\n<link rel="icon" href="../img/icon-seeds.png" type="image/png">\n<title>')
    .replace('<h1>Éditeur de sauvegarde · Farmling</h1>', '<h1>Éditeur de sauvegarde · Farmling</h1><a href="../wiki/" style="color:#ffd84a">← Wiki</a>');
  write('editeur/', html);
  pages.push('editeur/');
  search.push({ t: 'Éditeur de sauvegarde', u: 'editeur/', k: 'Outil' });
}

// ---------- 404, robots, sitemap, ressources ----------
function finish() {
  // 404 dans le style du jeu (chemins absolus : la page peut être servie à n'importe quelle adresse).
  write('404.html', `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Page introuvable · Farmling</title><meta name="description" content="Cette page de Farmling n’existe pas : un corbeau l’a mangée.">
<meta name="robots" content="noindex"><meta name="theme-color" content="#140e24"><link rel="icon" href="/img/icon-seeds.png" type="image/png">
<script>${SEASON_SCRIPT}</script>
<style>${HOME_CSS}${SEASON_CSS_HOME('/')}.lost{text-align:center;padding:48px 16px 0}.lost .big{width:min(480px,80vw);height:auto}.lost p{max-width:560px;margin:16px auto 28px;font-size:1.15rem}.field{display:flex;justify-content:center;align-items:flex-end;gap:6px;margin-top:24px}.field img{height:auto}</style>
</head>
<body>
<header class="bar"><div class="in"><a class="brand" href="/" aria-label="Farmling, accueil"><img src="/img/logo.png" width="120" height="36" alt=""></a></div></header>
<main class="hero lost">
<p class="sbanner"></p>
<h1><img class="big" src="/img/err404.png" width="480" height="288" alt="Erreur 404"></h1>
<p><b>Un corbeau a mangé cette page !</b><br>Elle n’existe pas, ou plus. Le fermier replante tout de suite quelque chose d’autre.</p>
<div class="btns"><a class="btn" href="/">▶ Retour à l’accueil</a><a class="btn alt" href="/wiki/">Ouvrir le wiki</a></div>
<div class="field" aria-hidden="true"><img src="/img/plot-empty.png" width="112" height="32" alt=""><img src="/img/crow.png" width="80" height="72" alt=""><img src="/img/plot-empty.png" width="112" height="32" alt=""></div>
</main>
<div class="ground" aria-hidden="true"></div>
</body>
</html>`);
  fs.writeFileSync(path.join(OUT, 'search.json'), JSON.stringify(search));
  fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n${SITE_URL ? `Sitemap: ${SITE_URL}/sitemap.xml\n` : ''}`);
  if (SITE_URL) fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(u => `<url><loc>${SITE_URL}/${u}</loc></url>`).join('\n')}\n</urlset>\n`);
  const copy = (from, to) => { fs.mkdirSync(to, { recursive: true }); for (const f of fs.readdirSync(from)) fs.copyFileSync(path.join(from, f), path.join(to, f)); };
  copy(path.join(ASSETS, 'img'), path.join(OUT, 'img'));
  copy(path.join(ASSETS, 'shots'), path.join(OUT, 'shots'));
}

homePage();
downloadPage();
editor();
finish();
console.log(`wiki/dist : ${pages.length} pages, ${search.length} entrées de recherche${SITE_URL ? ', sitemap pour ' + SITE_URL : ''}`);

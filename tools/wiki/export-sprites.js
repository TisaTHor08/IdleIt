// Exporte les sprites du jeu en PNG pour le wiki (wiki/assets/img), avec le vrai code de dessin du jeu.
// Usage : npm run wiki:sprites   (Electron, rendu hors écran : rien ne s'affiche)
// Les images sont exportées à ×6 : nettes et assez grandes pour l'audit « taille d'image adaptée » de PageSpeed.
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'wiki', 'assets', 'img');
const SCALE = 6;
const LOGO_SCALE = 16; // le logo est affiché en grand sur l'accueil (taille réelle dans wiki/assets/logo-size.json)

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, webPreferences: { offscreen: true, contextIsolation: true } });
  await win.loadFile(path.join(__dirname, 'export.html'));
  const files = await win.webContents.executeJavaScript(`(() => {
    const D = FARM_DATA, S = FARM_SPRITES, SC = ${SCALE}, LOGO_SCALE = ${LOGO_SCALE};
    const out = {};
    const canvas = (w, h, draw, sc = SC) => {
      const c = document.createElement('canvas'); c.width = w * sc; c.height = h * sc;
      const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.scale(sc, sc); draw(x);
      return c.toDataURL('image/png');
    };
    for (const sd of D.SEEDS) out['seed-' + sd.id] = S.seedIconURL(sd, SC);
    for (const sd of D.SEASON_SEEDS) out['seed-' + sd.id] = S.seedIconURL(sd, SC);
    for (const p of D.PETS) for (const look of ['base', 'evo', ...p.paths.map(x => x.id)]) out['pet-' + p.id + '-' + look] = S.petIconURL(p.id, look, SC);
    for (const r of D.ROBOTS) out['robot-' + r.id] = S.robotIconURL(r.id, SC);
    // Costumes des gamelles de saison (compagnons qui ont leur effet spécial)
    for (const f of D.PET_FOODS.filter(x => x.season)) for (const x of f.special) out['pet-' + x.pet + '-skin-' + f.season] = S.petIconURL(x.pet, 'base', SC, f.season);
    for (const k of Object.keys(S.ICONS)) out['icon-' + k] = S.iconURL(k, SC);
    for (const m of D.MACHINES) out['machine-' + m.id] = canvas(16, 16, x => S.drawMachine(x, m.id, 8, 16, true, 0.4, 0.6, '#7ee081'));
    out['barn'] = canvas(26, 20, x => S.drawBarn(x, 0, 20));
    out['factory'] = canvas(26, 22, x => S.drawFactory(x, 0, 22));
    out['fridge'] = canvas(10, 16, x => S.drawFridge(x, 1, 16, 0.6));
    // Stades de pousse (graine -> mûr), pour les fiches des légumes
    for (const sd of D.SEEDS) out['grow-' + sd.id] = canvas(60, 18, x => { for (let k = 0; k < 5; k++) { S.drawPlant(x, sd, 6 + k * 12, 16, [0.1, 0.35, 0.6, 0.85, 1][k], false, 0); S.px(x, 1 + k * 12, 16, 10, 2, '#6b4426'); } });
    for (const sd of D.SEEDS) out['gold-' + sd.id] = canvas(12, 18, x => { S.drawPlant(x, sd, 6, 16, 1, true, 0); S.px(x, 1, 16, 10, 2, '#6b4426'); });
    // Logo « FARMLING » : police pixel 5×7 dessinée ici, dégradé doré, contour, ombre et une pousse sur le I.
    const G = {
      F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'], A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
      R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'], M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
      L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'], I: ['111', '010', '010', '010', '010', '010', '111'],
      N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'], G: ['01110', '10001', '10000', '10111', '10001', '10001', '01110'],
    };
    const word = 'FARMLING', TOP = 5, LEFT = 2;
    const cells = []; let cx = LEFT;
    for (const ch of word) { const g = G[ch]; g.forEach((row, y) => [...row].forEach((v, x) => { if (v === '1') cells.push([cx + x, TOP + y]); })); cx += g[0].length + 1; }
    const W = cx + 2, H = TOP + 7 + 3;
    const ROWS = ['#fff1a8', '#ffe066', '#ffd84a', '#ffc43a', '#f5a623', '#e8892a', '#d9701e'];
    out['logo'] = canvas(W, H, x => {
      const set = new Set(cells.map(c => c.join(',')));
      for (const [a, b] of cells) { x.fillStyle = '#5a2e12'; x.fillRect(a + 1, b + 2, 1, 1); }           // ombre portée
      for (const [a, b] of cells) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [1, -1], [-1, 1]]) if (!set.has((a + dx) + ',' + (b + dy))) { x.fillStyle = '#2b1d14'; x.fillRect(a + dx, b + dy, 1, 1); }
      for (const [a, b] of cells) { x.fillStyle = ROWS[b - TOP]; x.fillRect(a, b, 1, 1); }
      // pousse sur le I
      const ix = LEFT + 5 * 5 + 5 + 1;
      x.fillStyle = '#2b1d14'; x.fillRect(ix, TOP - 3, 1, 3); x.fillRect(ix - 2, TOP - 4, 2, 2); x.fillRect(ix + 1, TOP - 5, 2, 2);
      x.fillStyle = '#5fb548'; x.fillRect(ix, TOP - 3, 1, 2); x.fillStyle = '#7ee081'; x.fillRect(ix - 1, TOP - 4, 1, 1); x.fillRect(ix + 1, TOP - 4, 1, 1); x.fillRect(ix + 2, TOP - 5, 1, 1);
    }, LOGO_SCALE);
    out['logo-w'] = W; out['logo-h'] = H;
    // Page 404 : un « 404 » dans la police pixel du jeu, et le corbeau coupable devant une parcelle vide.
    out['err404'] = canvas(15, 9, x => S.drawText(x, '404', 2, 2, '#ffd84a', '#2b1d14'), 32);
    out['crow'] = canvas(10, 9, x => S.drawCrow(x, { x: 5, y: 0, state: 'eat', anim: 0 }, 9), 8);
    out['plot-empty'] = canvas(14, 4, x => S.drawSoil(x, 1, 4, 12, 0, false), 8);
    return out;
  })()`);
  fs.mkdirSync(OUT, { recursive: true });
  let n = 0, bytes = 0;
  const logoSize = { w: files['logo-w'] * LOGO_SCALE, h: files['logo-h'] * LOGO_SCALE };
  delete files['logo-w']; delete files['logo-h'];
  fs.writeFileSync(path.join(OUT, '..', 'logo-size.json'), JSON.stringify(logoSize));
  for (const [name, url] of Object.entries(files)) {
    const buf = Buffer.from(url.split(',')[1], 'base64');
    fs.writeFileSync(path.join(OUT, name + '.png'), buf);
    n++; bytes += buf.length;
  }
  console.log(`${n} sprites exportés dans wiki/assets/img (${Math.round(bytes / 1024)} Ko)`);
  app.quit();
}).catch(e => { console.error(e); process.exitCode = 1; app.quit(); });

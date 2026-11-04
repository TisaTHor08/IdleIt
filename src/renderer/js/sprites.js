// Pixel art dessiné en code. Toutes les coordonnées sont en pixels "art" (1 px art = scale px écran).
// Pour ajouter un sprite : une carte de caractères + une palette (lettre -> couleur), voir drawMap().
(function (root) {
  'use strict';

  function px(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }

  // Sobriété : chaque sprite n'est dessiné pixel par pixel qu'une fois, dans une petite image réutilisée ensuite
  // (un drawImage au lieu de dizaines de fillRect par image).
  const newCanvas = (w, h) => {
    if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
    const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
  };
  const canCache = typeof document !== 'undefined' || typeof OffscreenCanvas !== 'undefined';
  const mapCache = new WeakMap(); // carte -> palette -> [image, image retournée]

  // Dessine une carte ['..ab..', ...] avec son coin bas-gauche en (x, bottom).
  function drawMap(ctx, map, pal, x, bottom, flip) {
    if (canCache) {
      let byPal = mapCache.get(map);
      if (!byPal) mapCache.set(map, byPal = new WeakMap());
      let imgs = byPal.get(pal);
      if (!imgs) byPal.set(pal, imgs = []);
      const k = flip ? 1 : 0;
      if (!imgs[k]) {
        const c = newCanvas(map[0].length, map.length);
        drawMapRaw(c.getContext('2d'), map, pal, 0, map.length, flip);
        imgs[k] = c;
      }
      ctx.drawImage(imgs[k], Math.round(x), Math.round(bottom) - map.length);
      return;
    }
    drawMapRaw(ctx, map, pal, x, bottom, flip);
  }
  function drawMapRaw(ctx, map, pal, x, bottom, flip) {
    const h = map.length, w = map[0].length;
    const top = Math.round(bottom) - h;
    x = Math.round(x);
    for (let r = 0; r < h; r++) {
      const row = map[r];
      for (let c = 0; c < w; c++) {
        const ch = row[c];
        if (ch === '.' || !pal[ch]) continue;
        ctx.fillStyle = pal[ch];
        ctx.fillRect(flip ? x + w - 1 - c : x + c, top + r, 1, 1);
      }
    }
  }

  // ---------- Personnages ----------
  const FARMER_PAL = { h: '#e9c46a', H: '#b8892f', s: '#f1c193', e: '#2b1d14', r: '#d1453b', b: '#3e6db5', k: '#5a3a22' };
  const FARMER_TOP = [
    '..hhhh..',
    '.hhhhhh.',
    'HHHHHHHH',
    '..ssss..',
    '..sses..',
    '..ssss..',
    '.rbrrbr.',
    'srbbbbrs',
    '..bbbb..',
    '..bbbb..',
  ];
  const FARMER_LEGS = [['..b..b..', '.kk..kk.'], ['...bb...', '..kkkk..']];
  const FARMER_ACT = [
    '..hhhh..',
    '.hhhhhh.',
    'HHHHHHHH',
    '..ssss..',
    '..sses..',
    '..sssss.',
    '.rbrrbrs',
    '.rbbbbr.',
    '..bbbb..',
    '..bbbb..',
    '..b..b..',
    '.kk..kk.',
  ];

  const ROBOT_MAP = [
    '...aa...',
    '....n...',
    '.HHHHHH.',
    '.HeHHeH.',
    '.HHmmHH.',
    '..nnnn..',
    'nBBBBBBn',
    'nBBddBBn',
    '.BBBBBB.',
    '.nn..nn.',
  ];
  const WHEELS = [['.ww..ww.'], ['.wW..Ww.']];
  const ROBOT_PAL = {
    rouille: { H: '#b7703f', B: '#9b5a2c', n: '#5b3a25', e: '#ffd34d', a: '#e04f2f', d: '#d68a4c', m: '#3a2418', w: '#2a2a2a', W: '#555' },
    chrome: { H: '#d5dde7', B: '#aab6c4', n: '#5e6b7a', e: '#4fd1ff', a: '#ff5e5e', d: '#f2f6fa', m: '#38424e', w: '#222', W: '#666' },
    laser: { H: '#e24b4b', B: '#b83838', n: '#5a1e1e', e: '#7dfcff', a: '#ffe14d', d: '#ff9a9a', m: '#2a0c0c', w: '#1d1d1d', W: '#555' },
    quantique: { H: '#9a7bff', B: '#6b4bd6', n: '#2e1f66', e: '#ffffff', a: '#5cfff0', d: '#c9b8ff', m: '#1b1040', w: '#1b1040', W: '#5cfff0' },
    arroseur: { H: '#5aa9e6', B: '#3a7fc2', n: '#20456b', e: '#e6f6ff', a: '#9fd8ff', d: '#9fd8ff', m: '#143049', w: '#222', W: '#666' },
    semeur: { H: '#7cc25a', B: '#4f9a3a', n: '#2c5a20', e: '#fff3a0', a: '#d9b37a', d: '#b8e986', m: '#1d3a14', w: '#222', W: '#666' },
    moissonneur: { H: '#f2c94c', B: '#d9a521', n: '#6b4f10', e: '#3a2418', a: '#ff9a3c', d: '#fff1a8', m: '#3a2a08', w: '#222', W: '#666' },
    epouvantail_r: { H: '#e9c46a', B: '#a8723c', n: '#5a3a22', e: '#2b1d14', a: '#e0302a', d: '#e9c46a', m: '#5a3a22', w: '#5a3a22', W: '#7a5230' },
    tracteur: { H: '#3fae6a', B: '#2f8f3a', n: '#1d3a14', e: '#ffe14d', a: '#ffe14d', d: '#f2c94c', m: '#1d3a14', w: '#111', W: '#444' },
    golem: { H: '#8a6a43', B: '#6b4f30', n: '#4a3420', e: '#7fe3ff', a: '#5fb548', d: '#a8865a', m: '#2b1d14', w: '#4a3420', W: '#6b4f30' },
    nanoessaim: { H: '#3a3a44', B: '#2b2b38', n: '#121216', e: '#ff5e5e', a: '#ff5e5e', d: '#5e6b7a', m: '#121216', w: '#121216', W: '#5e6b7a' },
    ia: { H: '#e6f4ff', B: '#9fd8ff', n: '#3a6f9a', e: '#ff3b3b', a: '#7fe3ff', d: '#ffffff', m: '#3a6f9a', w: '#3a6f9a', W: '#7fe3ff' },
    abeille_meca: { H: '#f2b84b', B: '#2b2b2b', n: '#5e6b7a', e: '#7fe3ff', a: '#e6f4ff', d: '#f2b84b', m: '#2b2b2b', w: '#5e6b7a', W: '#9aa3ad' },
    paratonnerre: { H: '#f2c94c', B: '#2b2b2b', n: '#5e6b7a', e: '#7fe3ff', a: '#e8e8e8', d: '#f2c94c', m: '#121212', w: '#222', W: '#666' },
    soigneur: { H: '#f4f1ea', B: '#d8d2c6', n: '#7a7468', e: '#3a8fe0', a: '#e0302a', d: '#e0302a', m: '#4a463e', w: '#222', W: '#666' },
  };
  const DRONE_MAP = [
    '..n.....n..',
    '..nBBBBBn..',
    '...BeeeB...',
    '....n.n....',
  ];
  const DRONE_PAL = { n: '#3b4652', B: '#3fae6a', e: '#b9ffcf' };

  // ---------- Compagnons (cartes regardant vers la droite, deux images pour les pattes) ----------
  const PET_SPRITES = {
    poussin: {
      maps: [['..yy.', '.yyeo', 'yyyy.', '.o.o.'], ['..yy.', '.yyeo', 'yyyy.', '..oo.']],
      pal: { y: '#ffd84a', e: '#2b1d14', o: '#f28a1e' },
    },
    coq: {
      maps: [
        ['.....rr.', '....wwwo', 'g...wew.', 'gg.www..', 'ggwwwww.', '.gwwwww.', '..wwww..', '...o.o..', '..oo.oo.'],
        ['.....rr.', '....wwwo', 'g...wew.', 'gg.www..', 'ggwwwww.', '.gwwwww.', '..wwww..', '...oo...', '..oo.o..'],
      ],
      pal: { r: '#e0302a', w: '#f4f1ea', o: '#f2a21e', e: '#2b1d14', g: '#2f6a4a' },
    },
    chien: {
      maps: [
        ['......bd..', '......bbeb', 'b.....bbbn', '.bbbbbbb..', '.bbbbbbb..', '.b.b..b.b.'],
        ['......bd..', '......bbeb', 'b.....bbbn', '.bbbbbbb..', '.bbbbbbb..', '..b.b..bb.'],
      ],
      pal: { b: '#a8723c', d: '#6b4426', e: '#1a1a1a', n: '#1a1a1a' },
    },
    berger: {
      maps: null, // mêmes cartes que le chien
      pal: { b: '#353535', d: '#f2f2f2', e: '#ffd84a', n: '#000000' },
    },
    chat: {
      maps: [
        ['......k.k', 'k.....kkk', 'k.....kek', '.kkkkkkkk', '.kkkkkk..', '.k.k.k.k.'],
        ['......k.k', 'k.....kkk', 'k.....kek', '.kkkkkkkk', '.kkkkkk..', '..k.k.kk.'],
      ],
      pal: { k: '#34343e', e: '#9fe870' },
    },
    maneki: { maps: null, pal: { k: '#f2efe6', e: '#3a2a1a' } },
  };
  PET_SPRITES.berger.maps = PET_SPRITES.chien.maps;
  PET_SPRITES.maneki.maps = PET_SPRITES.chat.maps;
  // Voies : mêmes silhouettes, autres couleurs (et détails dessinés dans drawPet).
  const VARIANT = (base, pal) => ({ maps: PET_SPRITES[base].maps, pal });
  Object.assign(PET_SPRITES, {
    basilic: VARIANT('coq', { r: '#9a4bff', w: '#4f9a5a', o: '#d9c27a', e: '#ff3b3b', g: '#24503a' }),
    phenix: VARIANT('coq', { r: '#fff1a8', w: '#ff7a1e', o: '#ffd84a', e: '#ffffff', g: '#e0302a' }),
    cerbere: VARIANT('chien', { b: '#3a1414', d: '#7a1e1e', e: '#ff3b3b', n: '#000000' }),
    loup: VARIANT('chien', { b: '#7d8893', d: '#4a525c', e: '#ffd84a', n: '#1a1a1a' }),
    saintbernard: VARIANT('chien', { b: '#f2efe6', d: '#a8723c', e: '#1a1a1a', n: '#1a1a1a' }),
    noir: VARIANT('chat', { k: '#121216', e: '#c77dff' }),
    lynx: VARIANT('chat', { k: '#c9a46b', e: '#3a2a1a' }),
    cheshire: VARIANT('chat', { k: '#d16ba5', e: '#ffe14d' }),
    rapace: {
      maps: [
        ['......ww.', '.....wwwy', 'bb..bbbb.', 'bbbbbbbb.', '.bbbbbb..', '...y.y...'],
        ['b.....ww.', 'bb...wwwy', '.bb.bbbb.', '..bbbbbb.', '.bbbbbb..', '...y.y...'],
      ],
      pal: { b: '#6b4426', w: '#f4f1ea', y: '#f2b84b' },
    },
  });

  // Compagnons légendaires : silhouettes de base ; évolutions (<id>_evo) et voies en variantes de couleurs.
  Object.assign(PET_SPRITES, {
    renard: {
      maps: [
        ['.......o.o.', '.......oooo', 'wo.....oeon', '.ooooooowo.', '..oooooo...', '..d.d..d.d.'],
        ['.......o.o.', '.......oooo', 'wo.....oeon', '.ooooooowo.', '..oooooo...', '...dd...dd.'],
      ],
      pal: { o: '#e07a2e', w: '#f4f1ea', e: '#1a1a1a', n: '#1a1a1a', d: '#5a3a22' },
    },
    hibou: {
      maps: [
        ['..bb.b.', '.bbbbb.', '.bbbye.', 'bbbbbbo', 'bccbbb.', '.cccbb.', '..y.y..'],
        ['..bb.b.', 'bbbbbb.', 'bbbbye.', '.bbbbbo', 'bbccbb.', '.cccbb.', '..y.y..'],
      ],
      pal: { b: '#8a6a4a', c: '#d9c4a0', y: '#ffd84a', e: '#1a1a1a', o: '#e8a33a' },
    },
    licorne: {
      maps: [
        ['..........g.', '........mww.', '.......mwwew', 'm......mwww.', 'mwwwwwwwww..', '.wwwwwwww...', '.w.w...w.w..'],
        ['..........g.', '........mww.', '.......mwwew', 'm......mwww.', 'mwwwwwwwww..', '.wwwwwwww...', '..w.w..w.w..'],
      ],
      pal: { w: '#f4f1ea', m: '#ff8fd0', g: '#ffd84a', e: '#3a2a6a' },
    },
    dragon: {
      maps: [
        ['..........gg.', '...ww.....geg', '..wwww...gggg', 'g.wwwwgggggg.', '.ggggyyyggg..', '..ggggggg....', '..g.g..g.g...'],
        ['..........gg.', '..www.....geg', '.www.....gggg', 'g...wwgggggg.', '.ggggyyyggg..', '..ggggggg....', '...gg...gg...'],
      ],
      pal: { g: '#3f9a4a', w: '#9fe0a0', y: '#e8d27a', e: '#ff3b3b' },
    },
  });
  Object.assign(PET_SPRITES, {
    renard_evo: VARIANT('renard', { o: '#c9ced6', w: '#ffffff', e: '#1a1a1a', n: '#1a1a1a', d: '#6b7280' }),
    kitsune: VARIANT('renard', { o: '#f4f1ea', w: '#ff8fd0', e: '#e0302a', n: '#e0302a', d: '#c9962a' }),
    fennec: VARIANT('renard', { o: '#e8c98a', w: '#fff3d6', e: '#1a1a1a', n: '#1a1a1a', d: '#a8723c' }),
    renard_roux: VARIANT('renard', { o: '#b5401e', w: '#f4f1ea', e: '#ffd84a', n: '#1a1a1a', d: '#2b1d14' }),
    hibou_evo: VARIANT('hibou', { b: '#5c4330', c: '#c9a46b', y: '#ff9a1e', e: '#1a1a1a', o: '#2b1d14' }),
    effraie: VARIANT('hibou', { b: '#d9b98a', c: '#ffffff', y: '#2b1d14', e: '#2b1d14', o: '#f2d6b0' }),
    harfang: VARIANT('hibou', { b: '#f4f6fa', c: '#dfe6ee', y: '#ffd84a', e: '#1a1a1a', o: '#3a3a44' }),
    savante: VARIANT('hibou', { b: '#6a4a8a', c: '#c9b8e8', y: '#9fe8ff', e: '#1a1a1a', o: '#ffd84a' }),
    licorne_evo: VARIANT('licorne', { w: '#ffffff', m: '#9fd8ff', g: '#ffd84a', e: '#3a2a6a' }),
    irisee: VARIANT('licorne', { w: '#e9dcff', m: '#7fe3ff', g: '#ff8fd0', e: '#3a2a6a' }),
    sylvestre: VARIANT('licorne', { w: '#d8efc9', m: '#4f9a3a', g: '#c9962a', e: '#2b1d14' }),
    etoilee: VARIANT('licorne', { w: '#2a2350', m: '#ffe14d', g: '#ffffff', e: '#ffe14d' }),
    dragon_evo: VARIANT('dragon', { g: '#2c6a3a', w: '#7fd0a0', y: '#ffd84a', e: '#ffd84a' }),
    dragon_or: VARIANT('dragon', { g: '#d9a52a', w: '#ffe9a0', y: '#fff3c4', e: '#e0302a' }),
    dragon_orage: VARIANT('dragon', { g: '#2a3a6a', w: '#9fd8ff', y: '#c9ced6', e: '#ffe14d' }),
    wyverne: VARIANT('dragon', { g: '#6a1e1e', w: '#c95a3a', y: '#e8b07a', e: '#ffd84a' }),
  });
  // Compagnons qui volent (toujours, ou une fois évolués) : dessinés au-dessus du champ.
  const PET_FLY = { hibou: () => true, licorne: look => look !== 'base', dragon: look => look !== 'base' };


  // ---------- Habillage des saisons ----------
  let SEASON = null;
  function setSeason(id) { SEASON = id || null; }
  // Chapeau (et chemise) du fermier selon la saison.
  const FARMER_SEASON_PAL = {
    halloween: { ...FARMER_PAL, h: '#3a1e5a', H: '#1a0f2a', r: '#ff7a1e' },
    noel: { ...FARMER_PAL, h: '#e0302a', H: '#f4f1ea', r: '#2f7a3a' },
    nouvel_an: { ...FARMER_PAL, h: '#c77dff', H: '#ffd84a' },
    paques: { ...FARMER_PAL, h: '#ffc4e0', H: '#ff8fd0', r: '#9fe0a0' },
    nouvel_an_chinois: { ...FARMER_PAL, h: '#e0302a', H: '#ffd84a', r: '#ffd84a', b: '#b5372f' },
    saint_valentin: { ...FARMER_PAL, h: '#ff4f7a', H: '#ffc4e0', r: '#e0305a' },
    fete_musique: { ...FARMER_PAL, h: '#9a7bff', H: '#5a3a9a', r: '#7ee081' },
  };
  const farmerPal = () => (SEASON && FARMER_SEASON_PAL[SEASON]) || FARMER_PAL;
  // Accessoires au-dessus du chapeau.
  function drawFarmerHat(ctx, x, top, flip) {
    if (SEASON === 'halloween') { px(ctx, x - 1, top - 2, 3, 2, '#3a1e5a'); px(ctx, x + (flip ? -2 : 1), top - 4, 2, 2, '#3a1e5a'); px(ctx, x - 2, top, 5, 1, '#ff7a1e'); }
    else if (SEASON === 'noel') { px(ctx, x - 1, top - 1, 3, 1, '#e0302a'); px(ctx, x + (flip ? -3 : 2), top - 2, 2, 2, '#f4f1ea'); }
    else if (SEASON === 'nouvel_an') { px(ctx, x - 1, top - 1, 3, 1, '#c77dff'); px(ctx, x, top - 3, 1, 2, '#ffd84a'); px(ctx, x, top - 4, 1, 1, '#ff7b6b'); }
    else if (SEASON === 'paques') { px(ctx, x - 2, top - 4, 1, 4, '#f4f1ea'); px(ctx, x + 2, top - 4, 1, 4, '#f4f1ea'); px(ctx, x - 2, top - 3, 1, 2, '#ffc4e0'); px(ctx, x + 2, top - 3, 1, 2, '#ffc4e0'); }
    else if (SEASON === 'nouvel_an_chinois') { px(ctx, x - 1, top - 1, 3, 1, '#ffd84a'); px(ctx, x, top - 2, 1, 1, '#e0302a'); }
    else if (SEASON === 'saint_valentin') { px(ctx, x - 1, top - 3, 1, 1, '#ff4f7a'); px(ctx, x + 1, top - 3, 1, 1, '#ff4f7a'); px(ctx, x - 1, top - 2, 3, 1, '#ff4f7a'); px(ctx, x, top - 1, 1, 1, '#ff4f7a'); }
    else if (SEASON === 'fete_musique') { px(ctx, x - 4, top + 1, 1, 3, '#2b1d14'); px(ctx, x + 4, top + 1, 1, 3, '#2b1d14'); px(ctx, x - 4, top, 9, 1, '#2b1d14'); px(ctx, x - 5, top + 2, 1, 2, '#9a7bff'); px(ctx, x + 5, top + 2, 1, 2, '#9a7bff'); }
  }
  // Palettes de saison de certains compagnons (clé = sprite).
  const PET_SEASON_PAL = {
    halloween: { chat: { k: '#121216', e: '#ff7a1e' }, maneki: { k: '#2a1e3a', e: '#ff7a1e' }, hibou: { b: '#4a2a5a', c: '#8a6aaa', y: '#ff7a1e', e: '#1a1a1a', o: '#e8a33a' } },
    noel: { chien: { b: '#a8723c', d: '#6b4426', e: '#1a1a1a', n: '#e0302a' }, berger: { b: '#7a4a26', d: '#f2f2f2', e: '#1a1a1a', n: '#e0302a' } },
    paques: { poussin: { y: '#ffc4e0', e: '#2b1d14', o: '#ff8fd0' }, renard: { o: '#f4f1ea', w: '#ffc4e0', e: '#1a1a1a', n: '#ff8fd0', d: '#c9a46b' } },
    nouvel_an: { licorne: { w: '#ffffff', m: '#c77dff', g: '#ffd84a', e: '#3a2a6a' }, licorne_evo: { w: '#ffffff', m: '#ff8fd0', g: '#ffd84a', e: '#3a2a6a' } },
    saint_valentin: { chat: { k: '#e8a0b8', e: '#e0305a' }, renard: { o: '#ff4f7a', w: '#ffc4e0', e: '#1a1a1a', n: '#1a1a1a', d: '#a0304a' } },
    fete_musique: { hibou: { b: '#5a3a9a', c: '#c9b8e8', y: '#7ee081', e: '#1a1a1a', o: '#ffd84a' } },
    nouvel_an_chinois: { dragon: { g: '#d9a52a', w: '#ff5e3a', y: '#fff3c4', e: '#e0302a' }, dragon_evo: { g: '#e0302a', w: '#ffd84a', y: '#fff3c4', e: '#ffd84a' } },
  };
  // Décor fixe (dans le calque du champ) : à côté de la grange et le long du champ.
  function drawSeasonDeco(ctx, barnX, ground, plotXs) {
    if (!SEASON) return;
    const g = ground;
    if (SEASON === 'halloween') {
      for (const x of [barnX - 3, barnX + 23]) { px(ctx, x, g - 3, 4, 3, '#ff7a1e'); px(ctx, x + 1, g - 4, 1, 1, '#3a5a2a'); px(ctx, x + 1, g - 2, 1, 1, '#2b1d14'); px(ctx, x + 2, g - 2, 1, 1, '#2b1d14'); }
      px(ctx, barnX + 1, g - 12, 1, 1, '#e9ecf5'); px(ctx, barnX + 2, g - 11, 1, 1, '#e9ecf5'); px(ctx, barnX + 1, g - 10, 2, 1, '#c9ced6');
      plotXs.forEach((x, k) => { if (k % 5 === 2) { px(ctx, x - 1, g - 3, 3, 2, '#ff7a1e'); px(ctx, x, g - 4, 1, 1, '#3a5a2a'); } });
    } else if (SEASON === 'noel') {
      px(ctx, barnX, g - 14, 24, 1, '#ffffff'); for (let r = 0; r < 6; r++) px(ctx, barnX + 2 + r * 1.5, g - 14 - r, 3, 1, '#ffffff');
      for (let i = 0; i < 22; i += 2) px(ctx, barnX + 1 + i, g - 12, 1, 1, ['#e0302a', '#ffd84a', '#7ee081', '#9fd8ff'][i / 2 % 4]);
      plotXs.forEach(x => { px(ctx, x - 5, g - 3, 3, 1, '#ffffff'); px(ctx, x + 2, g - 3, 2, 1, '#f4f6fa'); });
    } else if (SEASON === 'nouvel_an') {
      for (let i = 0; i < 6; i++) { px(ctx, barnX + 2 + i * 4, g - 13, 2, 2, ['#c77dff', '#ffd84a', '#ff7b6b', '#7ee081', '#9fd8ff', '#ff8fd0'][i]); }
      px(ctx, barnX + 1, g - 14, 23, 1, '#e8d27a');
    } else if (SEASON === 'paques') {
      const eggs = ['#ffc4e0', '#9fd8ff', '#fff3a8', '#c9b8e8', '#9fe0a0'];
      plotXs.forEach((x, k) => { if (k % 3 === 1) { px(ctx, x + 6, g - 3, 2, 3, eggs[k % eggs.length]); px(ctx, x + 6, g - 2, 2, 1, '#ffffff'); } if (k % 3 === 0) { px(ctx, x - 7, g - 3, 1, 2, '#5fb548'); px(ctx, x - 7, g - 4, 1, 1, eggs[(k + 2) % eggs.length]); } });
      px(ctx, barnX - 3, g - 3, 2, 3, '#ffc4e0'); px(ctx, barnX + 24, g - 3, 2, 3, '#9fd8ff');
    } else if (SEASON === 'saint_valentin') {
      const heart = (x, y, c) => { px(ctx, x, y, 1, 1, c); px(ctx, x + 2, y, 1, 1, c); px(ctx, x, y + 1, 3, 1, c); px(ctx, x + 1, y + 2, 1, 1, c); };
      heart(barnX + 10, g - 20, '#ff4f7a'); heart(barnX + 2, g - 11, '#ffc4e0'); heart(barnX + 19, g - 11, '#ffc4e0');
      plotXs.forEach((x, k) => { if (k % 4 === 1) heart(x + 5, g - 5, '#ff4f7a'); });
    } else if (SEASON === 'fete_musique') {
      for (const x of [barnX - 4, barnX + 24]) { px(ctx, x, g - 6, 4, 6, '#2b2b33'); px(ctx, x + 1, g - 5, 2, 2, '#5a5a66'); px(ctx, x + 1, g - 2, 2, 1, '#5a5a66'); }
      for (let i = 0; i < 22; i += 3) px(ctx, barnX + 1 + i, g - 13, 2, 1, ['#9a7bff', '#7ee081', '#ffd84a', '#ff8fd0'][(i / 3) % 4]);
    } else if (SEASON === 'nouvel_an_chinois') {
      for (const x of [barnX + 3, barnX + 19]) { px(ctx, x, g - 13, 1, 2, '#2b1d14'); px(ctx, x - 1, g - 11, 3, 4, '#e0302a'); px(ctx, x - 1, g - 11, 3, 1, '#ffd84a'); px(ctx, x - 1, g - 8, 3, 1, '#ffd84a'); px(ctx, x, g - 7, 1, 1, '#ffd84a'); }
      plotXs.forEach((x, k) => { if (k % 4 === 3) { px(ctx, x - 1, g - 4, 2, 3, '#e0302a'); px(ctx, x - 1, g - 3, 2, 1, '#ffd84a'); } });
    }
  }
  // Animations de saison (à chaque image) : chauves-souris, neige, feux d'artifice, pétales, lanternes.
  function drawSeasonFx(ctx, width, ground, t) {
    if (!SEASON) return;
    if (SEASON === 'halloween') {
      for (let k = 0; k < 3; k++) {
        const x = (t * (9 + k * 4) + k * 97) % (width + 20) - 10, y = 3 + k * 3 + Math.round(Math.sin(t * 3 + k) * 2), up = Math.floor(t * 8 + k) % 2;
        px(ctx, x, y, 1, 1, '#1a0f2a'); px(ctx, x - 1, y - up, 1, 1, '#1a0f2a'); px(ctx, x + 1, y - up, 1, 1, '#1a0f2a');
      }
    } else if (SEASON === 'noel') {
      for (let k = 0; k < width; k += 23) px(ctx, k + Math.round(Math.sin(t + k) * 2), (k * 7 + t * 5) % ground, 1, 1, '#ffffff');
    } else if (SEASON === 'nouvel_an') {
      const cycle = 3.2, k = Math.floor(t / cycle), p = (t % cycle) / 1.2;
      if (p < 1) {
        const cx = 40 + ((k * 137) % Math.max(1, width - 80)), cy = 5;
        const col = ['#ffd84a', '#ff7b6b', '#c77dff', '#7ee081', '#9fd8ff'][k % 5];
        ctx.globalAlpha = 1 - p;
        for (let a = 0; a < 8; a++) px(ctx, cx + Math.cos(a * Math.PI / 4) * p * 6, cy + Math.sin(a * Math.PI / 4) * p * 4, 1, 1, col);
        ctx.globalAlpha = 1;
      }
    } else if (SEASON === 'paques') {
      for (let k = 0; k < 3; k++) { const x = (t * 6 + k * 150) % (width + 10), y = 6 + Math.round(Math.sin(t * 2 + k) * 3); px(ctx, x, y, 1, 1, '#ffc4e0'); px(ctx, x + 1, y - (Math.floor(t * 6) % 2), 1, 1, '#ffc4e0'); }
    } else if (SEASON === 'saint_valentin') {
      for (let k = 0; k < 4; k++) { const x = (k * 113 + t * 3) % (width + 10), y = ground - 6 - ((t * 5 + k * 7) % (ground - 4)); px(ctx, x, y, 1, 1, '#ff4f7a'); px(ctx, x + 2, y, 1, 1, '#ff4f7a'); px(ctx, x, y + 1, 3, 1, '#ff4f7a'); px(ctx, x + 1, y + 2, 1, 1, '#ff4f7a'); }
    } else if (SEASON === 'fete_musique') {
      // notes de musique qui montent au-dessus du champ
      for (let k = 0; k < 5; k++) { const x = (k * 89) % Math.max(1, width), y = ground - 4 - ((t * 6 + k * 9) % (ground - 4)), c = ['#9a7bff', '#7ee081', '#ffd84a', '#ff8fd0', '#9fd8ff'][k]; px(ctx, x, y, 2, 1, c); px(ctx, x + 1, y - 3, 1, 3, c); px(ctx, x + 2, y - 3, 1, 1, c); }
    } else if (SEASON === 'nouvel_an_chinois') {
      for (let k = 0; k < width; k += 61) if (Math.floor(t * 2 + k) % 3 === 0) px(ctx, k + 10, (k * 3 + t * 4) % ground, 1, 1, '#ffd84a');
    }
  }

  // Costumes des gamelles de saison : un compagnon qui a l'effet spécial d'une gamelle de saison porte le costume
  // de cette fête, toute l'année, tant qu'il la porte : palette (par espèce : toutes ses apparences partagent les
  // mêmes lettres), accessoire, particules et façon de bouger. body = couleurs des abeilles (dessinées pixel par pixel).
  const PET_SKINS = {
    halloween: {
      chat: { k: '#121216', e: '#ff7a1e' }, hibou: { b: '#4a2a5a', c: '#8a6aaa', y: '#ff7a1e', e: '#1a1a1a', o: '#e8a33a' },
      chien: { b: '#5a5a66', d: '#2b2b33', e: '#ffd84a', n: '#1a1a1a' },
    },
    noel: {
      chien: { b: '#8a5a33', d: '#5a3a22', e: '#1a1a1a', n: '#e0302a' }, renard: { o: '#f4f6fa', w: '#dfe6ee', e: '#1a1a1a', n: '#1a1a1a', d: '#9fb8d8' },
      licorne: { w: '#e6f4ff', m: '#9fd8ff', g: '#ffffff', e: '#2a4a8a' }, abeille: { body: ['#e0302a', '#f4f1ea'] },
    },
    nouvel_an: {
      poussin: { y: '#ffd84a', o: '#c77dff', e: '#2b1d14', r: '#c77dff', w: '#fff1a8', g: '#ffd84a', b: '#c77dff' },
      renard: { o: '#2a2350', w: '#ffd84a', e: '#ffd84a', n: '#ffd84a', d: '#c77dff' }, dragon: { g: '#2a2350', w: '#c77dff', y: '#ffd84a', e: '#ffd84a' },
    },
    nouvel_an_chinois: {
      dragon: { g: '#d9a52a', w: '#ff5e3a', y: '#fff3c4', e: '#e0302a' }, chat: { k: '#ffd84a', e: '#e0302a' },
      poussin: { y: '#e0302a', o: '#ffd84a', e: '#2b1d14', r: '#ffd84a', w: '#e0302a', g: '#ffd84a', b: '#e0302a' },
    },
    saint_valentin: {
      chat: { k: '#e8a0b8', e: '#e0305a' }, chien: { b: '#ff8fb0', d: '#e0305a', e: '#1a1a1a', n: '#e0305a' },
      licorne: { w: '#ffe0ec', m: '#ff4f7a', g: '#ffd84a', e: '#a0305a' },
    },
    paques: {
      poussin: { y: '#ffc4e0', e: '#2b1d14', o: '#ff8fd0', r: '#9fd8ff', w: '#fff3f8', g: '#9fe0a0', b: '#ffc4e0' },
      renard: { o: '#f4f1ea', w: '#ffc4e0', e: '#1a1a1a', n: '#ff8fd0', d: '#c9a46b' }, abeille: { body: ['#ffc4e0', '#9fd8ff'] },
    },
    fete_musique: {
      hibou: { b: '#5a3a9a', c: '#c9b8e8', y: '#7ee081', e: '#1a1a1a', o: '#ffd84a' }, chien: { b: '#2b2b33', d: '#9a7bff', e: '#7ee081', n: '#1a1a1a' },
      abeille: { body: ['#9a7bff', '#7ee081'] },
    },
  };
  let SKIN = null, SKIN_SEASON = null; // costume du compagnon en cours de dessin
  const skinPals = new Map();          // palettes fusionnées (stables : le cache des sprites reste efficace)
  function skinPal(key, base) {
    const k = SKIN_SEASON + '|' + key;
    let p = skinPals.get(k);
    if (!p) { p = { ...base }; for (const c of Object.keys(base)) if (SKIN[c]) p[c] = SKIN[c]; skinPals.set(k, p); }
    return p;
  }
  // Façon de bouger de chaque costume (décalage du dessin, sans toucher à la simulation).
  function skinMotion(skin, e, t) {
    const a = e.anim || 0, mv = e.moving;
    switch (skin) {
      case 'paques': return { dx: 0, dy: mv ? -Math.round(Math.abs(Math.sin(a * 7)) * 3) : -Math.round(Math.abs(Math.sin(a * 2))) };      // lapin qui sautille
      case 'halloween': return { dx: 0, dy: -2 + Math.round(Math.sin(a * 1.6) * 2), alpha: 0.65 + 0.35 * Math.abs(Math.sin(a * 0.9)) }; // fantôme qui flotte
      case 'fete_musique': return { dx: Math.round(Math.sin(t * 8)), dy: -(Math.floor(t * 4) % 2) };                                   // danse en rythme
      case 'saint_valentin': return { dx: 0, dy: -1 - Math.round((Math.sin(a * 3) + 1) * 0.8) };                                       // il plane d'amour
      case 'nouvel_an': return { dx: 0, dy: Math.floor(a / 3) % 3 === 0 ? -Math.round(Math.sin((a % 3) * Math.PI / 3) * 4) : 0 };    // sauts de joie
      case 'nouvel_an_chinois': return { dx: Math.round(Math.sin(a * 2.4) * 1.5), dy: Math.round(Math.cos(a * 4.8)) };                 // ondule comme le dragon de papier
      default: return null;                                                                                                             // Noël : il glisse (vitesse, pets.js)
    }
  }
  // Particules autour du compagnon costumé.
  function drawSkinParticles(ctx, skin, x, ground, t) {
    for (let k = 0; k < 3; k++) {
      const p = ((t + k * 0.8) % 2.4) / 2.4, ox = Math.round(x - 5 + ((k * 37) % 11) + Math.sin(t * 2 + k) * 2);
      ctx.globalAlpha = 1 - p * 0.9;
      if (skin === 'halloween') px(ctx, ox, ground - 6 - p * 10, 1, 1, k % 2 ? '#9a4bff' : '#c9a0ff');
      else if (skin === 'noel') px(ctx, ox, ground - 16 + p * 14, 1, 1, '#ffffff');
      else if (skin === 'nouvel_an') { ctx.globalAlpha = 1; if (Math.floor(t * 6 + k) % 3 === 0) px(ctx, ox, ground - 8 - ((k * 5) % 7), 1, 1, ['#ffd84a', '#c77dff', '#ff7b6b'][k]); }
      else if (skin === 'nouvel_an_chinois') { px(ctx, ox, ground - 4 - p * 9, 1, 1, '#ffd84a'); if (k === 0) px(ctx, ox + 1, ground - 5 - p * 9, 1, 1, '#e0302a'); }
      else if (skin === 'saint_valentin') { const hy = Math.round(ground - 8 - p * 9); px(ctx, ox, hy, 1, 1, '#ff4f7a'); px(ctx, ox + 2, hy, 1, 1, '#ff4f7a'); px(ctx, ox, hy + 1, 3, 1, '#ff4f7a'); px(ctx, ox + 1, hy + 2, 1, 1, '#ff4f7a'); }
      else if (skin === 'paques') px(ctx, ox, ground - 3 - p * 6, 1, 1, ['#ffc4e0', '#9fd8ff', '#fff3a8'][k]);
      else if (skin === 'fete_musique') { const ny = Math.round(ground - 8 - p * 10), c = ['#9a7bff', '#7ee081', '#ffd84a'][k]; px(ctx, ox, ny, 2, 1, c); px(ctx, ox + 1, ny - 3, 1, 3, c); }
    }
    ctx.globalAlpha = 1;
  }
  // Accessoire du costume, au-dessus de la tête du compagnon.
  function drawSkinMark(ctx, skin, x, ground, id, look, t) {
    const fly = id === 'abeille' || id === 'hibou' || look === 'rapace' || ((id === 'licorne' || id === 'dragon') && look !== 'base');
    const y = Math.round(ground - (id === 'taupe' ? 7 : fly ? 20 : 12)), cx = Math.round(x);
    if (skin === 'halloween') { px(ctx, cx - 1, y, 3, 1, '#3a1e5a'); px(ctx, cx, y - 2, 1, 2, '#3a1e5a'); px(ctx, cx - 1, y + 1, 3, 1, '#ff7a1e'); }
    else if (skin === 'noel') { px(ctx, cx - 1, y, 3, 1, '#e0302a'); px(ctx, cx, y - 1, 1, 1, '#e0302a'); px(ctx, cx + 1, y - 2, 1, 1, '#ffffff'); }
    else if (skin === 'nouvel_an') { px(ctx, cx, y - 2, 1, 3, '#c77dff'); px(ctx, cx, y - 3, 1, 1, '#ffd84a'); }
    else if (skin === 'nouvel_an_chinois') { px(ctx, cx - 1, y - 1, 3, 2, '#e0302a'); px(ctx, cx - 1, y - 1, 3, 1, '#ffd84a'); }
    else if (skin === 'saint_valentin') { px(ctx, cx - 1, y - 1, 1, 1, '#ff4f7a'); px(ctx, cx + 1, y - 1, 1, 1, '#ff4f7a'); px(ctx, cx - 1, y, 3, 1, '#ff4f7a'); px(ctx, cx, y + 1, 1, 1, '#ff4f7a'); }
    else if (skin === 'paques') { px(ctx, cx - 1, y - 3, 1, 3, '#f4f1ea'); px(ctx, cx + 1, y - 3, 1, 3, '#f4f1ea'); px(ctx, cx - 1, y - 2, 1, 1, '#ffc4e0'); px(ctx, cx + 1, y - 2, 1, 1, '#ffc4e0'); }
    else if (skin === 'fete_musique') { const b = Math.floor((t || 0) * 3) % 2; px(ctx, cx, y - 2 - b, 2, 1, '#9a7bff'); px(ctx, cx + 1, y - 5 - b, 1, 3, '#9a7bff'); }
  }

  function drawPetMap(ctx, key, x, bottom, flip, frame) {
    const sp = PET_SPRITES[key];
    const map = sp.maps[frame % sp.maps.length];
    const over = SKIN ? skinPal(key, sp.pal) : SEASON && PET_SEASON_PAL[SEASON] && PET_SEASON_PAL[SEASON][key];
    drawMap(ctx, map, over || sp.pal, x - (map[0].length >> 1), bottom, flip);
  }

  // e = { x, dir, anim, moving, kind }, id = compagnon, evo = évolué ?
  // look = 'base' | 'evo' | id de la voie (voir petLook() dans core.js).
  function drawPet(ctx, id, look, e, ground, t, skin) {
    SKIN_SEASON = skin || null;
    SKIN = (skin && PET_SKINS[skin] && PET_SKINS[skin][id]) || null;
    const m = skin ? skinMotion(skin, e, t) : null;
    if (m) { ctx.save(); ctx.translate(m.dx, m.dy); if (m.alpha != null) ctx.globalAlpha = m.alpha; }
    try { drawPetBody(ctx, id, look, e, ground, t); } finally { SKIN = null; SKIN_SEASON = null; if (m) ctx.restore(); }
    if (skin) { drawSkinMark(ctx, skin, e.x + (m ? m.dx : 0), ground + (m ? m.dy : 0), id, look, t); drawSkinParticles(ctx, skin, e.x, ground, t); }
  }
  function drawPetBody(ctx, id, look, e, ground, t) {
    const evo = look !== 'base';
    const flip = e.dir < 0;
    const frame = e.moving ? Math.floor(e.anim * 8) % 2 : 0;
    const x = Math.round(e.x);
    const flick = k => Math.floor(t * 10 + k * 3) % 3;
    if (id === 'poussin') {
      if (look === 'rapace') {
        // Rapace : vole au-dessus du champ, ou perché sur un robot.
        const y = e.perched ? ground - 10 : ground - 12 + Math.round(Math.sin(e.anim * 2) * 2);
        drawPetMap(ctx, 'rapace', x, y, flip, e.perched ? 0 : Math.floor(e.anim * 5) % 2);
      } else if (e.kind === 'chick' || !evo) drawPetMap(ctx, 'poussin', x, ground - 2, flip, frame);
      else {
        const key = look === 'basilic' || look === 'phenix' ? look : 'coq';
        drawPetMap(ctx, key, x, ground - 2, flip, frame);
        if (look === 'basilic') { px(ctx, x - 1, ground - 12, 3, 1, '#ffd84a'); px(ctx, x - 1, ground - 13, 1, 1, '#ffd84a'); px(ctx, x + 1, ground - 13, 1, 1, '#ffd84a'); }
        if (look === 'phenix') for (let k = 0; k < 5; k++) px(ctx, x - 3 + k * 1.5, ground - 12 - flick(k), 1, 1, k % 2 ? '#ffe14d' : '#ff7a1e');
      }
    } else if (id === 'chien') {
      const key = look === 'base' ? 'chien' : look === 'evo' ? 'berger' : look;
      drawPetMap(ctx, key, x, ground - 2, flip, frame);
      if (look === 'saintbernard') px(ctx, x + (flip ? -2 : 1), ground - 5, 2, 2, '#8a5a33');
      if (SEASON === 'noel' || SKIN_SEASON === 'noel') { const hx = x + (flip ? -3 : 2); px(ctx, hx, ground - 9, 1, 2, '#8a5a33'); px(ctx, hx + (flip ? -1 : 1), ground - 10, 1, 2, '#8a5a33'); px(ctx, hx - (flip ? -1 : 1), ground - 10, 1, 1, '#8a5a33'); }
    } else if (id === 'chat') {
      const sleeping = look !== 'cheshire' && !e.moving && Math.sin(e.anim * 0.3) > 0.6;
      const key = look === 'base' ? 'chat' : look === 'evo' ? 'maneki' : look;
      if (look === 'cheshire') ctx.globalAlpha = 0.45 + 0.55 * Math.abs(Math.sin(e.anim * 1.3));
      drawPetMap(ctx, key, x, ground - 2, flip, sleeping ? 0 : frame);
      if (look === 'cheshire') {
        for (let k = 0; k < 3; k++) px(ctx, x - 3 + k * 3, ground - 5, 1, 3, '#7d3fc4');
        px(ctx, x + (flip ? -4 : 2), ground - 5, 3, 1, '#ffffff');
      }
      ctx.globalAlpha = 1;
      if (look === 'evo') px(ctx, x + (flip ? -2 : 2), ground - 5, 1, 1, '#ffd84a');
      if (look === 'noir' && Math.floor(t * 3) % 2) px(ctx, x - 4 + flick(1) * 3, ground - 9, 1, 1, '#c77dff');
      if (look === 'lynx') { px(ctx, x + (flip ? -3 : 2), ground - 9, 1, 1, '#2b1d14'); px(ctx, x + (flip ? -1 : 4), ground - 9, 1, 1, '#2b1d14'); px(ctx, x - 2, ground - 4, 1, 1, '#7a5230'); px(ctx, x + 1, ground - 3, 1, 1, '#7a5230'); }
      if (sleeping) drawText(ctx, 'z', x + 3, ground - 13 - (Math.floor(t * 2) % 2), '#e9ecf5', 'rgba(0,0,0,0.6)');
    } else if (id === 'taupe') {
      const big = look === 'ver';
      px(ctx, x - (big ? 5 : 3), ground - 3, big ? 11 : 7, 1, '#7a5230');
      px(ctx, x - (big ? 6 : 4), ground - 2, big ? 13 : 9, 2, '#5a3a22');
      if (look === 'foreuse') {
        px(ctx, x - 2, ground - 6, 5, 3, '#c87533');
        px(ctx, x + (flip ? -4 : 3), ground - 5 + (Math.floor(t * 12) % 2), 2, 1, '#e8e8e8');
        px(ctx, x - 1, ground - 7, 1, 1, Math.floor(t * 4) % 2 ? '#ff5e5e' : '#5a1e1e');
      } else if (look === 'cristal') {
        px(ctx, x - 1, ground - 5, 4, 2, '#5b4a5e');
        px(ctx, x - 1, ground - 7, 1, 2, '#7fe3ff'); px(ctx, x + 1, ground - 8, 1, 3, '#b9f3ff'); px(ctx, x + 2, ground - 6, 1, 1, '#7fe3ff');
        if (Math.floor(t * 2) % 2) px(ctx, x + 1, ground - 9, 1, 1, '#ffffff');
      } else if (look === 'ver') {
        if (!e.moving) { px(ctx, x - 2, ground - 5, 5, 2, '#c98a6a'); px(ctx, x - 1, ground - 5, 1, 1, '#2b1d14'); px(ctx, x + 1, ground - 5, 1, 1, '#2b1d14'); }
      } else if (!e.moving) {
        px(ctx, x - 1, ground - 5, 4, 2, '#5b4a5e');
        px(ctx, x + (flip ? -2 : 3), ground - 4, 1, 1, '#f29ab0');
        if (evo) { px(ctx, x - 1, ground - 6, 4, 1, '#ffd84a'); px(ctx, x, ground - 7, 1, 1, '#ffd84a'); px(ctx, x + 2, ground - 7, 1, 1, '#ffd84a'); }
      } else if (Math.floor(e.anim * 6) % 2) px(ctx, x + (flip ? 4 : -5), ground - 4, 1, 1, '#8a5a33');
    } else if (id === 'abeille') {
      const bees = look === 'nuee' ? 16 : evo ? 5 : 1;
      const spread = look === 'nuee' ? 4 : 2;
      const body = SKIN && SKIN.body ? SKIN.body : look === 'guerriere' ? ['#e0302a', '#121216'] : look === 'doree' ? ['#ffd84a', '#c9962a'] : ['#f2b84b', '#2b1d14'];
      for (let k = 0; k < bees; k++) {
        const a = e.anim * (3 + (k % 5)) + k * 1.7;
        const bx = x + (k ? Math.cos(a) * (4 + k * spread) : 0);
        const by = ground - 11 + Math.sin(e.anim * 4 + k) * 2 + (k ? Math.sin(a) * (2 + (look === 'nuee' ? 3 : 0)) : 0);
        px(ctx, bx, by - 1, 1, 1, Math.floor(t * 20 + k) % 2 ? '#e6f4ff' : '#b9d8ee');
        px(ctx, bx - 1, by, 1, 1, body[0]); px(ctx, bx, by, 1, 1, body[1]); px(ctx, bx + 1, by, 1, 1, body[0]);
      }
    } else if (PET_SPRITES[id]) {
      // Compagnons légendaires : base, évolution (<id>_evo) ou voie.
      const key = look === 'base' ? id : look === 'evo' ? id + '_evo' : look;
      const fly = PET_FLY[id] && PET_FLY[id](look);
      const y = fly ? ground - 10 + Math.round(Math.sin(e.anim * 2) * 2) : ground - 2;
      drawPetMap(ctx, PET_SPRITES[key] ? key : id, x, y, flip, fly ? Math.floor(e.anim * 4) % 2 : frame);
      if (look === 'kitsune' || look === 'dragon_orage') for (let k = 0; k < 3; k++) px(ctx, x + (flip ? 4 : -6) + k, y - 3 - flick(k), 1, 1, look === 'kitsune' ? '#ff8fd0' : '#ffe14d');
      if (look === 'etoilee' || look === 'irisee') px(ctx, x - 4 + flick(2) * 3, y - 8, 1, 1, '#ffffff');
      if (look === 'wyverne' || look === 'dragon_evo') px(ctx, x + (flip ? -8 : 7), y - 5, 1, 1, Math.floor(t * 6) % 2 ? '#ff7a1e' : '#ffd84a');
    }
  }

  // Ouvriers-compagnons (chien de berger et sa meute).
  function drawPetWorker(ctx, w, x, ground, look, flip, frame, bob) {
    const key = look === 'cerbere' || look === 'loup' ? look : 'berger';
    const skin = w.def.skin;
    SKIN_SEASON = skin || null;
    SKIN = (skin && PET_SKINS[skin] && PET_SKINS[skin][w.def.petId]) || null;
    drawPetMap(ctx, key, x, ground - 2 + bob, flip, frame);
    SKIN = null; SKIN_SEASON = null;
    if (skin) { drawSkinMark(ctx, skin, x, ground, w.def.petId, look, w.anim || 0); drawSkinParticles(ctx, skin, x, ground, w.anim || 0); }
    if (look === 'cerbere') {
      const hx = x + (flip ? -4 : 2);
      px(ctx, hx, ground - 8, 2, 2, '#3a1414'); px(ctx, hx + (flip ? -1 : 2), ground - 7, 1, 1, '#ff3b3b');
      px(ctx, hx + (flip ? 1 : -1), ground - 9, 2, 2, '#3a1414');
    }
  }

  // Silo de profil : cylindre, dôme, niveau de grain visible par une fente.
  function drawSilo(ctx, x, ground, fill, t) {
    px(ctx, x, ground - 15, 7, 15, '#aeb7c1');
    for (let y = ground - 13; y < ground; y += 3) px(ctx, x, y, 7, 1, '#8f99a4');
    px(ctx, x + 1, ground - 17, 5, 2, '#8f99a4');
    px(ctx, x + 2, ground - 18, 3, 1, '#77818c');
    px(ctx, x + 3, ground - 14, 1, 13, '#3b4249');
    const h = Math.round(fill * 13);
    if (h) px(ctx, x + 3, ground - 1 - h, 1, h, fill >= 1 ? '#ffb347' : '#e8c15a');
    if (fill >= 1 && Math.floor(t * 2) % 2) px(ctx, x + 3, ground - 16, 1, 1, '#ff5e5e');
  }

  // Détails des mutations par-dessus la plante.
  function drawMutation(ctx, mut, cx, gy, t, i, crop) {
    const blink = k => Math.floor(t * 3 + i + k) % 2;
    if (mut === 'giant') { if (blink(0)) px(ctx, cx - 6 + ((Math.floor(t * 5) + i) % 13), gy - 4 - (Math.floor(t * 7) % 10), 1, 1, '#ff8fff'); }
    else if (mut === 'infini') { for (let k = 0; k < 2; k++) if (blink(k)) px(ctx, cx - 5 + ((Math.floor(t * 6) + i * 3 + k * 5) % 11), gy - 3 - ((Math.floor(t * 8) + k * 4) % 12), 1, 1, k ? '#b9f3ff' : '#7fe3ff'); }
    else if (mut === 'carnivore') {
      const open = crop.caught ? 0 : Math.floor(t * 2 + i) % 2;
      px(ctx, cx - 3, gy - 9 - open, 3, 2, '#e0302a'); px(ctx, cx + 1, gy - 9 - open, 3, 2, '#e0302a');
      px(ctx, cx - 2, gy - 7 - open, 1, 1, '#ffffff'); px(ctx, cx + 2, gy - 7 - open, 1, 1, '#ffffff');
    }
    else if (mut === 'febrile') { if (blink(0)) px(ctx, cx + 2, gy - 6, 1, 1, '#ff3b3b'); }
    else if (mut === 'lente') { px(ctx, cx + 3, gy - 1, 2, 1, '#c9a06b'); px(ctx, cx + 3, gy - 2, 1, 1, '#8a5a33'); px(ctx, cx + 5, gy - 2, 1, 1, '#d9c27a'); }
    else if (mut === 'solide') { px(ctx, cx - 3, gy - 2, 7, 2, '#8f99a4'); px(ctx, cx - 2, gy - 3, 5, 1, '#b9c2cc'); }
    else if (mut === 'moisi') { for (let k = 0; k < 4; k++) px(ctx, cx - 4 + ((k * 3 + Math.floor(t * 2)) % 9), gy - 2 - ((k * 5 + Math.floor(t * 3)) % 7), 1, 1, k % 2 ? '#8a9a6a' : '#cfd8b0'); }
  }

  // ---------- Événements aléatoires ----------
  const BOAR = [
    ['..bbbbb..', '.bbbbbbbb', 'bbbbbbebw', 'bbbbbbbbn', '.bbbbbbb.', '.k.k..k.k'],
    ['..bbbbb..', '.bbbbbbbb', 'bbbbbbebw', 'bbbbbbbbn', '.bbbbbbb.', '..k.kk.k.'],
  ];
  const BOAR_PAL = { b: '#5a3a22', e: '#ff3b3b', w: '#f2efe6', n: '#2b1d14', k: '#2b1d14' };
  function drawBoar(ctx, b, ground) {
    drawMap(ctx, BOAR[Math.floor(b.anim * 10) % 2], BOAR_PAL, b.x - 4, ground, !b.scared ? false : true);
    if (b.scared) px(ctx, b.x + 5, ground - 7, 1, 1, '#ffffff');
  }
  function drawSwarm(ctx, s, ground, t) {
    for (let k = 0; k < 18; k++) {
      const a = t * (2 + (k % 3)) + k * 2.1;
      const x = s.x + Math.cos(a) * (6 + (k % 5) * 5), y = ground - 9 + Math.sin(a * 1.3) * 4;
      px(ctx, x, y, 1, 1, k % 3 ? '#7a8a2a' : '#3a4a1a');
    }
  }
  const THIEF = [
    ['..kkk...', '..kmk...', '..kkk...', '.kkkkk..', 'kkkkkkbb', '.kkkkkbb', '..k.k...', '.kk.kk..'],
    ['..kkk...', '..kmk...', '..kkk...', '.kkkkk..', 'kkkkkkbb', '.kkkkkbb', '...kk...', '..kkkk..'],
  ];
  const THIEF_PAL = { k: '#2b2b38', m: '#f2c193', b: '#a8723c' };
  function drawThief(ctx, th, ground) {
    drawMap(ctx, THIEF[Math.floor(th.anim * 6) % 2], THIEF_PAL, th.x - 4, ground, !th.fleeing);
  }
  const JUDGE = ['..hhh...', '.hhhhh..', '..sss...', '..sss.c.', '.rrrrrc.', '.rrrrr..', '..r.r...', '.kk.kk..'];
  const JUDGE_PAL = { h: '#1d1d26', s: '#f2c193', r: '#7d3fc4', c: '#f2efe6', k: '#2b1d14' };
  function drawJudge(ctx, j, ground) {
    drawMap(ctx, JUDGE, JUDGE_PAL, j.x - 4, ground, false);
  }
  function drawTornado(ctx, tor, ground, t) {
    for (let k = 0; k < 18; k++) {
      const w = 2 + Math.round(k * 0.7);
      const off = Math.round(Math.sin(t * 6 + k * 0.5) * 2);
      px(ctx, tor.x - (w >> 1) + off, ground - 1 - k, w, 1, k % 3 ? '#9aa3ad' : '#c9ced6');
    }
    for (let k = 0; k < 4; k++) px(ctx, tor.x - 6 + ((k * 5 + Math.floor(t * 9)) % 13), ground - 3 - ((k * 7) % 10), 1, 1, '#8a5a33');
  }
  function drawGeese(ctx, g, t) {
    const flap = Math.floor(t * 4) % 2;
    for (let k = 0; k < 5; k++) {
      const x = g.x + Math.abs(k - 2) * 5, y = 4 + Math.abs(k - 2) * 2;
      px(ctx, x, y, 2, 1, '#e9ecf5'); px(ctx, x - 1, y - flap, 1, 1, '#b9c2cc'); px(ctx, x + 2, y - flap, 1, 1, '#b9c2cc'); px(ctx, x - 1, y, 1, 1, '#f2b84b');
    }
  }
  function drawStarMark(ctx, cx, gy, t) {
    const on = Math.floor(t * 4) % 2;
    px(ctx, cx - 1, gy - 15, 3, 1, '#fff3a0'); px(ctx, cx, gy - 16, 1, 3, '#fff3a0');
    if (on) { px(ctx, cx - 2, gy - 15, 1, 1, '#ffd84a'); px(ctx, cx + 2, gy - 15, 1, 1, '#ffd84a'); }
  }

  // Paratonnerre planté au bord d'une parcelle.
  function drawRod(ctx, x, ground) {
    px(ctx, x, ground - 15, 1, 13, '#9aa3ad');
    px(ctx, x, ground - 16, 1, 1, '#ffe14d');
  }
  // Étincelles d'une plante énergisée.
  function drawEnergy(ctx, cx, gy, t) {
    for (let k = 0; k < 4; k++) {
      const a = t * 7 + k * 1.57;
      px(ctx, cx + Math.round(Math.cos(a) * 4), gy - 5 + Math.round(Math.sin(a) * 4), 1, 1, k % 2 ? '#7fe3ff' : '#ffffff');
    }
  }
  // Éclair en zigzag jusqu'au sol.
  function drawBolt(ctx, x, ground, seed) {
    let bx = x + ((seed * 7) % 9) - 4;
    for (let y = 0; y < ground; y += 2) {
      const nx = y + 2 >= ground ? x : bx + (((seed + y) * 13) % 5) - 2;
      px(ctx, Math.min(bx, nx), y, Math.abs(nx - bx) + 1, 1, '#fffbe0');
      px(ctx, nx, y + 1, 1, 1, '#ffe14d');
      bx = nx;
    }
  }

  function drawHive(ctx, x, ground, gold) {
    px(ctx, x, ground - 3, 1, 3, '#7a5230');
    px(ctx, x - 2, ground - 8, 5, 5, gold ? '#ffd84a' : '#e0a43a');
    px(ctx, x - 2, ground - 7, 5, 1, '#b8801f');
    px(ctx, x - 2, ground - 5, 5, 1, '#b8801f');
    px(ctx, x, ground - 4, 1, 1, '#3a2418');
  }

  function drawWorker(ctx, w, x, ground, t, look, mini) {
    const flip = w.dir < 0;
    const acting = w.state === 'act';
    const moving = w.state === 'walk' || w.state === 'wander' || w.state === 'goto';
    const frame = moving ? Math.floor(w.anim * 6) % 2 : 0;
    const bob = acting ? (Math.floor(w.anim * 6) % 2) : 0;
    const left = x - 4;

    if (w.def.harvestOnly) {
      drawPetWorker(ctx, w, x, ground, look, flip, frame, bob);
      if (w.state === 'sleep') drawText(ctx, 'z', x + 3, ground - 12 - (Math.floor(t * 2) % 2), '#e9ecf5', 'rgba(0,0,0,0.6)');
      return;
    }
    if (w.frozenT > 0) ctx.globalAlpha = 0.55;

    if (w.kind === 'farmer') {
      const pal = farmerPal();
      if (acting) drawMap(ctx, FARMER_ACT, pal, left, ground + bob, flip);
      else {
        drawMap(ctx, FARMER_TOP, pal, left, ground - 2, flip);
        drawMap(ctx, FARMER_LEGS[frame], pal, left, ground, flip);
      }
      if (SEASON) drawFarmerHat(ctx, x, ground - 2 - FARMER_TOP.length - 2 + (acting ? bob + 2 : 0), flip);
      if (acting) drawTool(ctx, w, x, ground, flip);
      if (w.state === 'sleep') drawText(ctx, Math.floor(t * 1.5) % 2 ? 'z' : 'Z', x + 3, ground - 18, '#e9ecf5', 'rgba(0,0,0,0.6)');
      return;
    }
    if (mini) { drawMiniRobot(ctx, w, x, ground, t, frame); ctx.globalAlpha = 1; if (w.state === 'charge' && Math.floor(t * 4) % 2) px(ctx, x, ground - 6, 1, 1, '#ffe14d'); return; }
    drawRobot(ctx, w, x, ground, t, flip, acting, moving, frame, bob, left);
    if (w.def.rod) { px(ctx, x, ground - 15 + bob, 1, 4, '#9aa3ad'); px(ctx, x, ground - 16 + bob, 1, 1, '#ffe14d'); }
    ctx.globalAlpha = 1;
    drawBattery(ctx, w, x, ground, t);
  }

  // Éclair pendant la recharge, voyant rouge quand la batterie est faible, étincelle pendant un boost.
  function drawBattery(ctx, w, x, ground, t) {
    const top = w.kind === 'drone' ? ground - 20 : ground - 13;
    if (w.state === 'charge') {
      if (Math.floor(t * 4) % 2) { px(ctx, x, top, 1, 2, '#ffe14d'); px(ctx, x + 1, top + 1, 1, 2, '#ffe14d'); }
      const h = Math.max(1, Math.round(w.bat * 4));
      px(ctx, x - 3, top + 4 - h, 1, h, '#7ee081');
    } else if (w.bat < 0.25 && Math.floor(t * 3) % 2) px(ctx, x, top + 1, 1, 1, '#ff5e5e');
    if (w.turboT > 0 || w.ocT > 0 || w.shockT > 0) px(ctx, x - 3 + Math.floor(t * 8) % 7, top + 2, 1, 1, '#9ff');
    if (w.superT > 0) for (let k = 0; k < 3; k++) px(ctx, x - w.dir * (3 + k * 3), top + 4 + (Math.floor(t * 20 + k) % 3), 1, 1, k % 2 ? '#ffe14d' : '#ffffff');
    if (w.frozenT > 0 && w.state !== 'charge') px(ctx, x + 2, top - 1, 1, 1, Math.floor(t * 6) % 2 ? '#ffe14d' : '#ffffff');
  }

  // Robots miniaturisés : 3×4 pixels.
  const MINI_ROBOT = [['.a.', 'HeH', 'BdB', 'w.w'], ['.a.', 'HeH', 'BdB', '.w.']];
  const MINI_DRONE = ['n.n', 'BeB'];
  function drawMiniRobot(ctx, w, x, ground, t, frame) {
    if (w.kind === 'drone') { drawMap(ctx, MINI_DRONE, DRONE_PAL, x - 1, ground - 8 + Math.round(Math.sin(w.anim * 3)), false); return; }
    drawMap(ctx, MINI_ROBOT[frame], ROBOT_PAL[w.kind] || ROBOT_PAL.rouille, x - 1, ground, w.dir < 0);
  }

  function drawRobot(ctx, w, x, ground, t, flip, acting, moving, frame, bob, left) {
    if (w.kind === 'drone') {
      const y = ground - 13 + Math.round(Math.sin(w.anim * 3) * 1.5);
      const spin = Math.floor(w.anim * 20) % 2;
      drawMap(ctx, DRONE_MAP, DRONE_PAL, x - 5, y, flip);
      px(ctx, x - 6 + (spin ? 0 : 1), y - 5, 3, 1, '#c8d2dc');
      px(ctx, x + 3 + (spin ? 1 : 0), y - 5, 3, 1, '#c8d2dc');
      if (acting) { px(ctx, x, y + 1, 1, 1, '#b9ffcf'); px(ctx, x, y + 3 + bob, 1, 1, '#7fe3ff'); }
      return;
    }
    const pal = ROBOT_PAL[w.kind] || ROBOT_PAL.rouille;
    if (w.kind === 'quantique') ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t * 9 + w.id);
    drawMap(ctx, ROBOT_MAP, pal, left, ground - 1 + bob, flip);
    drawMap(ctx, WHEELS[frame], pal, left, ground, flip);
    if (w.kind === 'quantique' && moving) {
      ctx.globalAlpha = 0.25;
      drawMap(ctx, ROBOT_MAP, pal, left - w.dir * 3, ground - 1, flip);
    }
    ctx.globalAlpha = 1;
    if (acting && w.kind === 'laser') {
      const fx = flip ? left - 1 : left + 8;
      px(ctx, fx, ground - 4, 1, 3, Math.floor(w.anim * 12) % 2 ? '#ff3b3b' : '#ffd0d0');
    } else if (acting) drawTool(ctx, w, x, ground, flip);
  }

  function drawTool(ctx, w, x, ground, flip) {
    const type = w.task ? w.task.type : 'plant';
    const d = flip ? -1 : 1;
    const hx = x + d * 4;
    const swing = Math.floor(w.anim * 6) % 2;
    if (type === 'water') {
      px(ctx, hx + (flip ? -2 : 0), ground - 6, 3, 2, '#4a8fd6');
      if (swing) px(ctx, hx + d * 3, ground - 3, 1, 1, '#9fd8ff');
      else px(ctx, hx + d * 3, ground - 2, 1, 1, '#9fd8ff');
    } else if (type === 'harvest') {
      px(ctx, hx, ground - 7 + swing, 1, 3, '#7a5230');
      px(ctx, hx + (flip ? -2 : 0), ground - 8 + swing, 3, 1, '#d9dde2');
    } else {
      px(ctx, hx, ground - 8 + swing, 1, 6, '#7a5230');
      px(ctx, hx + (flip ? -1 : 0), ground - 2 + swing, 2, 1, '#9aa3ad');
    }
  }

  // ---------- Décor ----------
  let barnImg = null;
  function drawBarn(ctx, x, ground) {
    if (!canCache) return drawBarnRaw(ctx, x, ground);
    if (!barnImg) { barnImg = newCanvas(26, 20); drawBarnRaw(barnImg.getContext('2d'), 0, 20); }
    ctx.drawImage(barnImg, Math.round(x), Math.round(ground) - 20);
  }
  function drawBarnRaw(ctx, x, ground) {
    const g = ground;
    px(ctx, x + 1, g - 12, 22, 12, '#b5372f');          // murs
    for (let i = 0; i < 22; i += 3) px(ctx, x + 1 + i, g - 12, 1, 12, '#9c2c25');
    for (let r = 0; r < 7; r++) px(ctx, x + 1 + r * 1.5, g - 13 - r, 22 - r * 3, 1, '#6e2a24'); // toit
    px(ctx, x, g - 13, 24, 1, '#4d1b17');
    px(ctx, x + 8, g - 8, 8, 8, '#e9e2d0');               // porte
    px(ctx, x + 9, g - 7, 6, 7, '#8c2b24');
    for (let i = 0; i < 6; i++) { px(ctx, x + 9 + i, g - 7 + i, 1, 1, '#e9e2d0'); px(ctx, x + 14 - i, g - 7 + i, 1, 1, '#e9e2d0'); }
    px(ctx, x + 10, g - 17, 4, 3, '#e9e2d0');            // lucarne
    px(ctx, x + 11, g - 16, 2, 2, '#f2c94c');
    px(ctx, x + 3, g - 3, 3, 3, '#e8c15a');              // botte de foin
    px(ctx, x + 18, g - 3, 4, 3, '#e8c15a');
    px(ctx, x + 18, g - 2, 4, 1, '#c99a3a');
  }

  function drawGrass(ctx, x, w, ground, dark) {
    px(ctx, x, ground - 1, w, 1, dark ? '#2f6a2a' : '#4c9a3b');
    for (let i = 0; i < w; i += 5) px(ctx, x + i + ((i * 7) % 3), ground - 2, 1, 1, '#5fb548');
  }

  const SOIL_LEVELS = 8;
  const SOIL_COLORS = Array.from({ length: SOIL_LEVELS + 1 }, (_, k) => {
    const dry = [138, 90, 51], wet = [84, 52, 30], m = k / SOIL_LEVELS;
    const c = dry.map((v, i) => Math.round(v + (wet[i] - v) * m));
    return [`rgb(${c[0]},${c[1]},${c[2]})`, `rgb(${c[0] + 10},${c[1] + 8},${c[2] + 5})`];
  });
  function drawSoil(ctx, x, ground, w, moist, irrigated) {
    const c = SOIL_COLORS[Math.round(Math.max(0, Math.min(1, moist)) * SOIL_LEVELS)];
    px(ctx, x, ground - 2, w, 2, c[0]);
    px(ctx, x + 1, ground - 3, w - 2, 1, c[1]);
    if (irrigated) { px(ctx, x - 1, ground - 2, 1, 2, '#7d8893'); px(ctx, x - 1, ground - 3, 1, 1, '#9fd8ff'); }
  }

  // ---------- Usine ----------
  let factoryImg = null;
  function drawFactory(ctx, x, ground) {
    if (!factoryImg) {
      factoryImg = newCanvas(26, 20);
      const c = factoryImg.getContext('2d'), g = 20;
      px(c, 1, g - 12, 22, 12, '#7d8893');                 // murs
      for (let r = 0; r < 12; r += 3) for (let i = (r / 3) % 2 ? 0 : 2; i < 22; i += 4) px(c, 1 + i, g - 12 + r, 3, 1, '#6b7580');
      for (let k = 0; k < 3; k++) { px(c, 1 + k * 7, g - 15, 7, 3, '#5a636d'); px(c, 1 + k * 7, g - 15, 1, 3, '#4a525c'); } // toit en dents de scie
      px(c, 17, g - 20, 3, 6, '#5a636d');                   // cheminée
      px(c, 8, g - 8, 8, 8, '#3a3a44');                     // porte de quai
      for (let i = 0; i < 4; i++) px(c, 8, g - 8 + i * 2, 8, 1, '#4a4a56');
      px(c, 3, g - 10, 3, 2, '#9fd8ff'); px(c, 18, g - 10, 3, 2, '#9fd8ff');
    }
    ctx.drawImage(factoryImg, Math.round(x), Math.round(ground) - 20);
  }
  function drawSmoke(ctx, x, ground, t) {
    ctx.globalAlpha = 0.5;
    for (let k = 0; k < 3; k++) {
      const p = (t * 0.6 + k / 3) % 1;
      px(ctx, x + 18 + Math.sin(p * 6 + k) * 1.5, ground - 21 - p * 8, 2, 2, '#c9ced6');
    }
    ctx.globalAlpha = 1;
  }
  function drawBelt(ctx, x0, x1, ground, t) {
    px(ctx, x0, ground - 3, x1 - x0, 1, '#3a3a44');
    px(ctx, x0, ground - 2, x1 - x0, 1, '#22222a');
    for (let x = x0 + (Math.floor(t * 6) % 4); x < x1; x += 4) px(ctx, x, ground - 3, 1, 1, '#6b6b78');
    for (let x = x0 + 2; x < x1; x += 9) px(ctx, x, ground - 1, 1, 1, '#22222a');
  }
  const MACHINE_DRAW = {
    marmite: (c, x, g, on, t) => {
      px(c, x - 4, g - 6, 9, 4, '#3a3a44'); px(c, x - 5, g - 7, 11, 1, '#5a5a66'); px(c, x - 3, g - 2, 1, 2, '#3a3a44'); px(c, x + 3, g - 2, 1, 2, '#3a3a44');
      if (on) for (let k = 0; k < 3; k++) px(c, x - 2 + k * 2, g - 2 + (Math.floor(t * 8 + k) % 2), 1, 1, k % 2 ? '#ffd84a' : '#ff7a1e');
    },
    four: (c, x, g, on) => {
      px(c, x - 5, g - 9, 11, 9, '#b5372f'); px(c, x - 4, g - 10, 9, 1, '#b5372f'); px(c, x - 3, g - 11, 7, 1, '#9c2c25');
      px(c, x - 2, g - 5, 5, 4, on ? '#ff9a3c' : '#2b1d14'); px(c, x + 3, g - 13, 2, 3, '#5a636d');
    },
    presse: (c, x, g, on, t) => {
      px(c, x - 5, g - 12, 1, 12, '#8a5a33'); px(c, x + 5, g - 12, 1, 12, '#8a5a33'); px(c, x - 5, g - 12, 11, 1, '#6b4426');
      const y = on ? Math.round(Math.abs(Math.sin(t * 2)) * 3) : 0;
      px(c, x, g - 11, 1, 3 + y, '#c9d1d9'); px(c, x - 3, g - 8 + y, 7, 1, '#8f99a4'); px(c, x - 3, g - 3, 7, 3, '#6b4426');
    },
    sorbetiere: (c, x, g, on, t) => {
      px(c, x - 3, g - 9, 7, 9, '#e9ecf5'); px(c, x - 3, g - 9, 7, 1, '#9fd8ff'); px(c, x - 2, g - 6, 5, 3, '#bfe8ff');
      const a = on ? Math.floor(t * 6) % 4 : 0;
      px(c, x + 4, g - 10 + (a % 2), 2, 1, '#8f99a4');
    },
    chocolaterie: (c, x, g, on) => {
      px(c, x - 5, g - 8, 11, 8, '#6b3a1e'); px(c, x - 5, g - 8, 11, 1, '#8a5a33');
      px(c, x + 2, g - 12, 1, 4, '#c87533'); px(c, x + 2, g - 12, 3, 1, '#c87533');
      if (on) px(c, x - 3, g - 5, 4, 2, '#3a1e10');
    },
    alambic: (c, x, g, on, t) => {
      px(c, x - 4, g - 6, 6, 6, '#c87533'); px(c, x - 3, g - 8, 4, 2, '#d98a4a'); px(c, x - 2, g - 10, 2, 2, '#c87533');
      px(c, x, g - 10, 4, 1, '#c87533'); for (let k = 0; k < 4; k++) px(c, x + 4 - (k % 2), g - 9 + k * 2, 2, 1, '#a8602a');
      if (on && Math.floor(t * 3) % 2) px(c, x + 5, g - 1, 1, 1, '#7fe3ff');
    },
  };
  function drawMachine(ctx, type, x, ground, on, t, progress, color) {
    (MACHINE_DRAW[type] || MACHINE_DRAW.marmite)(ctx, Math.round(x), ground - 3, on, t);
    if (progress != null) {
      px(ctx, x - 4, ground - 18, 9, 1, '#22222a');
      px(ctx, x - 4, ground - 18, Math.max(1, Math.round(9 * Math.min(1, progress))), 1, color || '#7ee081');
    }
    if (on && Math.floor(t * 2 + x) % 3 === 0) { ctx.globalAlpha = 0.5; px(ctx, x - 1 + (Math.floor(t * 3) % 3), ground - 16 - (Math.floor(t * 4) % 3), 1, 1, '#e9ecf5'); ctx.globalAlpha = 1; }
  }
  function drawFridge(ctx, x, ground, fill) {
    px(ctx, x, ground - 14, 8, 14, '#e9ecf5'); px(ctx, x, ground - 14, 8, 1, '#ffffff');
    px(ctx, x, ground - 9, 8, 1, '#aeb7c1'); px(ctx, x + 6, ground - 12, 1, 2, '#8f99a4'); px(ctx, x + 6, ground - 7, 1, 3, '#8f99a4');
    const h = Math.round(12 * Math.max(0, Math.min(1, fill)));
    if (h) px(ctx, x + 1, ground - 1 - h, 1, h, fill > 0.9 ? '#ff7b6b' : '#7ee081');
  }
  function drawCrate(ctx, x, y, color) {
    px(ctx, x - 1, y - 3, 3, 3, '#8a5a33'); px(ctx, x, y - 2, 1, 1, color);
  }
  const PORTER_PAL = { b: '#8f99a4', d: '#5a636d', e: '#9fe8ff', k: '#3a3a44' };
  const PORTER = [['.bbb.', '.beb.', 'ddddd', '.ddd.', '.k.k.'], ['.bbb.', '.beb.', 'ddddd', '.ddd.', 'k...k']];
  const WORKER_PAL = { h: '#e8c15a', s: '#f1c193', b: '#4c7bd1', k: '#3a3a44' };
  const WORKER = [['.hhh.', '.sss.', 'bbbbb', '.bbb.', '.k.k.'], ['.hhh.', '.sss.', 'bbbbb', '.bbb.', 'k...k']];
  function drawPorter(ctx, p, ground, t) {
    const frame = p.moving ? Math.floor(t * 8) % 2 : 0;
    drawMap(ctx, p.robot ? PORTER[frame] : WORKER[frame], p.robot ? PORTER_PAL : WORKER_PAL, p.x - 2, ground, p.dir < 0);
    if (p.carry) drawCrate(ctx, p.x + (p.dir < 0 ? -1 : 1), ground - 5, p.carryColor || '#e8a33a');
  }

  // ---------- Plantes ----------
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, Math.round(((n >> 16) & 255) * f));
    const g = Math.min(255, Math.round(((n >> 8) & 255) * f));
    const b = Math.min(255, Math.round((n & 255) * f));
    return `rgb(${r},${g},${b})`;
  }

  // Plantes en cache : une image par (graine, dorée, stade de pousse en 24 pas, phase d'animation).
  const PLANT_W = 40, PLANT_H = 40, PLANT_OX = 20, PLANT_OY = 32, PLANT_STEPS = 24, PLANT_MAX = 800;
  const plantCache = new Map();
  function drawPlant(ctx, seed, cx, gy, g, gold, t) {
    if (!canCache) return drawPlantRaw(ctx, seed, cx, gy, g, gold, t);
    const q = g >= 1 ? PLANT_STEPS : Math.max(0, Math.floor(g * PLANT_STEPS));
    cx = Math.round(cx);
    // Seules deux formes bougent : l'étincelle du chou cosmique et la lueur du champignon du vide.
    let ph = 0, tt = 0;
    if (seed.shape === 'cosmic') { ph = ((Math.floor(t * 4 + cx) % 4) + 4) % 4; tt = ph / 4 + 0.01; }
    else if (seed.id === 'vide' && g >= 1) { ph = Math.floor(t * 3) % 7; tt = ph / 3 + 0.01; }
    const key = seed.id + (gold ? '*' : '') + q + ':' + ph;
    let img = plantCache.get(key);
    if (!img) {
      if (plantCache.size > PLANT_MAX) plantCache.clear();
      img = newCanvas(PLANT_W, PLANT_H);
      drawPlantRaw(img.getContext('2d'), seed, PLANT_OX, PLANT_OY, q / PLANT_STEPS, gold, tt);
      plantCache.set(key, img);
    }
    ctx.drawImage(img, cx - PLANT_OX, Math.round(gy) - PLANT_OY);
  }

  // cx = centre, gy = sol (haut de la butte), g = croissance 0..1
  function drawPlantRaw(ctx, seed, cx, gy, g, gold, t) {
    const leaf = gold ? '#e0b830' : seed.leaf;
    const leafD = gold ? '#b8901c' : shade(seed.leaf, 0.75);
    const fruit = gold ? '#ffd84a' : seed.fruit;
    const fruitD = gold ? '#d9a521' : shade(seed.fruit, 0.75);
    cx = Math.round(cx);
    if (g < 0.12) { px(ctx, cx, gy - 1, 1, 1, leaf); return; }
    switch (seed.shape) {
      case 'root': {
        const h = 1 + Math.round(g * 5);
        px(ctx, cx, gy - h, 1, h, leaf);
        if (g > 0.3) { px(ctx, cx - 1, gy - h + 1, 1, h - 1, leafD); px(ctx, cx + 1, gy - h + 1, 1, h - 1, leafD); }
        if (g > 0.6) { px(ctx, cx - 2, gy - h + 2, 1, 1, leaf); px(ctx, cx + 2, gy - h + 2, 1, 1, leaf); }
        if (g > 0.5) { const rw = g >= 1 ? 3 : 2; px(ctx, cx - (rw >> 1), gy, rw, 1, fruit); if (g >= 1) px(ctx, cx - 1, gy - 1, 3, 1, fruitD); }
        break;
      }
      case 'leafy': {
        const r = 1 + Math.round(g * 3);
        for (let dy = 0; dy < r * 2; dy++) {
          const ww = Math.round(Math.sqrt(Math.max(0, r * r - (dy - r + 0.5) ** 2)) * 2) + 1;
          px(ctx, cx - (ww >> 1), gy - 1 - dy * 0.5 - (dy >> 1), ww, 1, dy % 2 ? leaf : leafD);
        }
        if (g > 0.5) px(ctx, cx - 1, gy - r - 1, 3, Math.max(1, r - 1), fruit);
        break;
      }
      case 'vine': {
        const h = 3 + Math.round(g * 8);
        px(ctx, cx + 2, gy - h - 1, 1, h + 1, '#8a6a43');
        for (let i = 1; i < h; i += 2) px(ctx, cx + (i % 4 === 1 ? -1 : 0), gy - i, 2, 1, i % 4 === 1 ? leaf : leafD);
        px(ctx, cx, gy - h, 2, h, leaf);
        if (g > 0.65) {
          const n = g >= 1 ? 3 : 1;
          const ripeC = g >= 1 ? fruit : '#7bbf4a';
          for (let k = 0; k < n; k++) px(ctx, cx - 1 + (k % 2) * 2, gy - 3 - k * 3, 2, 2, ripeC);
        }
        break;
      }
      case 'stalk': {
        const h = 4 + Math.round(g * 12);
        px(ctx, cx, gy - h, 1, h, leaf);
        for (let i = 3; i < h; i += 3) { const d = (i / 3) % 2 ? 1 : -1; px(ctx, cx + d, gy - i, 1, 1, leafD); px(ctx, cx + d * 2, gy - i - 1, 1, 1, leafD); }
        if (g > 0.7) { px(ctx, cx + 1, gy - h + 4, 2, 4, g >= 1 ? fruit : '#cfe08a'); px(ctx, cx + 1, gy - h + 3, 1, 1, '#d9c27a'); }
        if (g >= 1) px(ctx, cx, gy - h - 1, 1, 1, '#e8d58a');
        break;
      }
      case 'spear': {
        const h = 2 + Math.round(g * 8);
        for (let k = -1; k <= 1; k++) {
          const hh = h - Math.abs(k) * 2;
          px(ctx, cx + k * 2, gy - hh, 1, hh, g >= 1 ? fruit : leaf);
          px(ctx, cx + k * 2, gy - hh - 1, 1, 1, g >= 1 ? fruitD : leafD);
        }
        break;
      }
      case 'ground': {
        const vine = 2 + Math.round(g * 4);
        px(ctx, cx - vine, gy - 1, vine * 2 + 1, 1, leafD);
        px(ctx, cx - 1, gy - 3, 1, 2, leaf); px(ctx, cx + 2, gy - 2, 2, 1, leaf);
        if (g > 0.35) {
          const fw = 2 + Math.round(g * 4), fh = 1 + Math.round(g * 3);
          const col = g >= 1 ? fruit : '#8cc152';
          px(ctx, cx - (fw >> 1), gy - fh, fw, fh, col);
          px(ctx, cx - (fw >> 1) + 1, gy - fh - 1, Math.max(1, fw - 2), 1, col);
          if (seed.fruit2 && g >= 0.7) for (let i = 0; i < fw; i += 2) px(ctx, cx - (fw >> 1) + i, gy - fh, 1, fh, gold ? '#fff1a8' : seed.fruit2);
          else px(ctx, cx - (fw >> 1) + 1, gy - fh, 1, fh, g >= 1 ? fruitD : '#74a843');
          px(ctx, cx, gy - fh - 2, 1, 1, '#5a4020');
        }
        break;
      }
      case 'mandrake': {
        const h = 2 + Math.round(g * 4);
        for (let k = -2; k <= 2; k++) px(ctx, cx + k, gy - h + Math.abs(k), 1, h - Math.abs(k), Math.abs(k) % 2 ? leafD : leaf);
        if (g >= 1) { px(ctx, cx - 2, gy - 1, 5, 2, fruit); px(ctx, cx - 1, gy - 1, 1, 1, '#2b1d14'); px(ctx, cx + 1, gy - 1, 1, 1, '#2b1d14'); }
        break;
      }
      case 'cosmic': {
        const r = 1 + Math.round(g * 3);
        for (let dy = 0; dy < r * 2; dy++) {
          const ww = Math.round(Math.sqrt(Math.max(0, r * r - (dy - r + 0.5) ** 2)) * 2) + 1;
          px(ctx, cx - (ww >> 1), gy - 1 - dy, ww, 1, dy % 2 ? leaf : leafD);
        }
        if (g > 0.5) px(ctx, cx - 1, gy - r - 1, 3, 2, fruit);
        const tw = Math.floor(t * 4 + cx) % 4;
        px(ctx, cx - r - 1 + tw, gy - r * 2 - 1, 1, 1, '#ffffff');
        break;
      }
      case 'grain': { // blé, riz : trois tiges fines et leurs épis
        const h = 3 + Math.round(g * 9);
        for (const o of [-2, 0, 2]) {
          const hh = h - (o ? 1 : 0);
          px(ctx, cx + o, gy - hh, 1, hh, o ? leafD : leaf);
          if (g > 0.55) px(ctx, cx + o, gy - hh - 2, 1, 3, g >= 1 ? fruit : '#c9d87a');
        }
        if (g > 0.3) { px(ctx, cx - 1, gy - 3, 1, 1, leaf); px(ctx, cx + 1, gy - 4, 1, 1, leaf); }
        break;
      }
      case 'tuber': { // pomme de terre : touffe basse, tubercules qui affleurent
        const r = 1 + Math.round(g * 2);
        px(ctx, cx - r - 1, gy - 2, r * 2 + 3, 1, leafD);
        px(ctx, cx - r, gy - 3 - r, r * 2 + 1, r + 1, leaf);
        if (g > 0.5) px(ctx, cx - 1, gy - 4 - r, 1, 1, '#f2f2f2');
        if (g >= 1) { px(ctx, cx - 4, gy, 3, 1, fruit); px(ctx, cx + 2, gy, 3, 1, fruitD); }
        break;
      }
      case 'pod': { // haricots, lentilles : tuteur, feuilles et gousses pendantes
        const h = 3 + Math.round(g * (seed.id === 'magique' ? 13 : 8));
        px(ctx, cx + 2, gy - h - 1, 1, h + 1, '#8a6a43');
        for (let i = 1; i < h; i += 2) px(ctx, cx + (i % 4 === 1 ? -1 : 0), gy - i, 2, 1, i % 4 === 1 ? leaf : leafD);
        if (g > 0.6) for (let k = 0; k < (g >= 1 ? 3 : 1); k++) px(ctx, cx - 1 + (k % 2) * 3, gy - 3 - k * 3, 1, 3, g >= 1 ? fruit : '#9bd06a');
        if (seed.id === 'magique' && g >= 1) px(ctx, cx - 2, gy - h - 2, 5, 1, '#e6f4ff');
        break;
      }
      case 'bulb': { // oignon, ail : feuilles droites et bulbe au pied
        const h = 2 + Math.round(g * 7);
        for (const o of [-1, 0, 1]) px(ctx, cx + o, gy - h + Math.abs(o), 1, h - Math.abs(o), o ? leafD : leaf);
        if (g > 0.5) { const w = g >= 1 ? 4 : 2; px(ctx, cx - (w >> 1), gy - 2, w, 2, fruit); if (g >= 1) px(ctx, cx - 1, gy - 3, 2, 1, fruitD); }
        break;
      }
      case 'bush': { // fraises, framboises : buisson bas et baies
        const r = 1 + Math.round(g * 2.5);
        px(ctx, cx - r - 1, gy - 2, r * 2 + 3, 2, leafD);
        px(ctx, cx - r, gy - 2 - r, r * 2 + 1, r, leaf);
        if (g > 0.6) {
          const ripe = g >= 1 ? fruit : '#d8e88a';
          for (let k = 0; k < 4; k++) px(ctx, cx - r + ((k * 3) % (r * 2 + 1)), gy - 1 - (k % 2) * 2, 1, 1, ripe);
        }
        break;
      }
      case 'flower': { // tournesol, safran, lotus, rose... : tige, bouton, puis fleur ouverte
        const h = 3 + Math.round(g * (seed.id === 'tournesol' ? 11 : 7));
        px(ctx, cx, gy - h, 1, h, leafD);
        if (g > 0.3) { px(ctx, cx - 1, gy - Math.round(h / 2), 1, 1, leaf); px(ctx, cx + 1, gy - Math.round(h / 2) - 1, 1, 1, leaf); }
        if (g >= 1) {
          px(ctx, cx - 1, gy - h - 2, 3, 3, fruit);
          px(ctx, cx - 2, gy - h - 1, 5, 1, fruit);
          px(ctx, cx, gy - h - 3, 1, 5, fruit);
          px(ctx, cx, gy - h - 1, 1, 1, gold ? '#fff1a8' : (seed.center || fruitD));
        } else if (g > 0.6) px(ctx, cx - 1, gy - h - 1, 2, 2, leaf);
        break;
      }
      case 'mushroom': { // champignons : pied clair, chapeau tacheté (pousse surtout la nuit)
        const w = 2 + Math.round(g * 4), h = 1 + Math.round(g * 3);
        px(ctx, cx, gy - h, 1, h, leaf);
        if (g > 0.15) {
          px(ctx, cx - (w >> 1), gy - h - 2, w + 1, 2, fruit);
          px(ctx, cx - (w >> 1) + 1, gy - h - 3, Math.max(1, w - 1), 1, fruit);
          if (g >= 0.6) { px(ctx, cx - 1, gy - h - 2, 1, 1, gold ? '#fff1a8' : '#f2efe6'); px(ctx, cx + 1, gy - h - 3, 1, 1, gold ? '#fff1a8' : '#f2efe6'); }
        }
        if (seed.id === 'vide' && g >= 1) px(ctx, cx - 3 + (Math.floor(t * 3) % 7), gy - h - 4, 1, 1, '#c9b8ff');
        break;
      }
      case 'fir': { // sapin de Noël : étages de branches en triangle, tronc, boules et étoile
        const tiers = 1 + Math.round(g * 3), tierH = 3;
        const trunk = g > 0.3 ? 2 : 1;
        px(ctx, cx, gy - trunk, 1, trunk, '#7a5230');
        let top = gy - trunk;
        for (let k = 0; k < tiers; k++) {
          const base = Math.max(1, tiers - k) + 1; // demi-largeur de la base de cet étage
          for (let r = 0; r < tierH; r++) {
            const half = Math.max(0, base - (tierH - 1 - r));
            px(ctx, cx - half, top - tierH + r, half * 2 + 1, 1, (r + k) % 2 ? leaf : leafD);
          }
          top -= tierH - 1;
        }
        if (g >= 0.6) {
          // boules (couleur du fruit et dorées) sur les bords des étages
          const cols = [fruit, '#ffd84a', '#9fd8ff'];
          for (let k = 0; k < tiers; k++) {
            const y = gy - trunk - 1 - k * (tierH - 1), half = Math.max(1, tiers - k) + 1;
            px(ctx, cx - half + 1, y, 1, 1, cols[k % 3]);
            if (half > 1) px(ctx, cx + half - 1, y - 1, 1, 1, cols[(k + 1) % 3]);
          }
        }
        if (g >= 1) { px(ctx, cx, top - 2, 1, 1, '#ffd84a'); px(ctx, cx - 1, top - 1, 3, 1, '#ffd84a'); px(ctx, cx, top, 1, 1, '#fff1a8'); }
        break;
      }
      case 'tree': { // café, cacao, fruit astral, arbre-monde : tronc et houppier
        const big = seed.id === 'arbre_monde' ? 1.6 : 1;
        const h = 2 + Math.round(g * 6 * big), r = 1 + Math.round(g * 3 * big);
        px(ctx, cx, gy - h, 1, h, '#7a5230');
        for (let dy = -r; dy <= r; dy++) {
          const ww = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy)) * 2) + 1;
          px(ctx, cx - (ww >> 1), gy - h - r + dy, ww, 1, dy % 2 ? leaf : leafD);
        }
        if (g >= 1) {
          const cols = seed.id === 'arbre_monde' ? ['#ffd84a', '#e8372e', '#7fe3ff', '#ff8fff'] : [fruit];
          for (let k = 0; k < 5; k++) px(ctx, cx - r + ((k * 7) % (r * 2 + 1)), gy - h - r + ((k * 5) % (r * 2 + 1)), 1, 1, cols[k % cols.length]);
        }
        break;
      }
      case 'cactus': { // fruit du dragon : colonne, bras, fruit rose au sommet
        const h = 2 + Math.round(g * 7);
        px(ctx, cx - 1, gy - h, 2, h, leaf);
        if (g > 0.4) { px(ctx, cx - 3, gy - h + 2, 2, 1, leafD); px(ctx, cx - 3, gy - h, 1, 2, leafD); px(ctx, cx + 1, gy - h + 3, 2, 1, leafD); px(ctx, cx + 2, gy - h + 1, 1, 2, leafD); }
        if (g >= 1) px(ctx, cx - 1, gy - h - 2, 2, 2, fruit);
        break;
      }
      default:
        px(ctx, cx, gy - 3, 1, 3, leaf);
    }
  }

  function drawSparkle(ctx, x, y, t, color) {
    const on = Math.floor(t * 3) % 2;
    px(ctx, x, y, 1, 1, color);
    if (on) { px(ctx, x - 1, y, 1, 1, color); px(ctx, x + 1, y, 1, 1, color); px(ctx, x, y - 1, 1, 1, color); px(ctx, x, y + 1, 1, 1, color); }
  }

  // ---------- Événements ----------
  const CROW = [
    ['.....kk', '..kkkky', 'kkkkkk.', '.kkkk..', '..k.k..'],
    ['k....kk', '.kkkkky', '..kkkk.', '...kk..', '..k.k..'],
  ];
  const CROW_PAL = { k: '#1d1d26', y: '#f2b84b' };
  const CURSED_PAL = { k: '#4b1d6b', y: '#ff3b3b' };
  function drawCrow(ctx, c, ground) {
    const frame = c.state === 'eat' ? (Math.floor(c.anim * 4) % 4 === 0 ? 1 : 0) : Math.floor(c.anim * 8) % 2;
    drawMap(ctx, CROW[frame], c.cursedLook ? CURSED_PAL : CROW_PAL, c.x - 3, ground - 2 - c.y, c.state !== 'leave' && c.state !== 'cursed');
    if (c.cursedLook && Math.floor(c.anim * 10) % 2) px(ctx, c.x - 4 + Math.floor(c.anim * 20) % 8, ground - 6 - c.y, 1, 1, '#c77dff');
  }

  function drawCart(ctx, cart, ground) {
    const x = Math.round(cart.x);
    const g = ground;
    // cheval
    px(ctx, x, g - 7, 6, 3, '#8a5a33');
    px(ctx, x - 2, g - 9, 3, 3, '#8a5a33');
    px(ctx, x - 2, g - 8, 1, 1, '#2b1d14');
    px(ctx, x + 1, g - 8, 4, 1, '#3a2418');
    const leg = Math.floor(cart.anim * 6) % 2;
    px(ctx, x + leg, g - 4, 1, 4, '#6b4426'); px(ctx, x + 4 - leg, g - 4, 1, 4, '#6b4426');
    // charrette
    px(ctx, x + 6, g - 5, 2, 1, '#5a3a22');
    px(ctx, x + 8, g - 9, 12, 6, '#b07a45');
    px(ctx, x + 8, g - 10, 12, 1, '#7a5230');
    px(ctx, x + 9, g - 13, 10, 3, cart.done ? '#888' : '#7d3fc4');
    px(ctx, x + 12, g - 12, 4, 1, '#f2c94c');
    px(ctx, x + 11, g - 3, 3, 3, '#3a2418');
    px(ctx, x + 12, g - 2, 1, 1, leg ? '#c9a06b' : '#3a2418');
    if (!cart.done) drawSparkle(ctx, x + 14, g - 16, cart.anim, '#ffe066');
  }

  // ---------- Police 3x5 ----------
  const GLYPHS = {
    '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111', '4': '101101111001001',
    '5': '111100111001111', '6': '111100111101111', '7': '111001010010010', '8': '111101111101111', '9': '111101111001111',
    '.': '000000000000010', '+': '000010111010000', '-': '000000111000000', '$': '011110010011110', 'x': '000101010101000',
    'K': '101110100110101', 'M': '101111111101101', 'B': '110101110101110', 'T': '111010010010010', 'Q': '111101101111001',
    'a': '000011101101011', 'i': '010000010010010', 'S': '011100010001110', 'p': '000110101110100', 'O': '111101101101111',
    'c': '000011100100011', 'N': '101111111111101', 'o': '000010101101010', 'D': '110101101101110', '!': '010010010000010',
    ' ': '000000000000000', '♥': '000101111111010', 'z': '000111001010111', 'Z': '111001010100111',
  };
  function textWidth(str) { return str.length * 4 - 1; }
  function drawText(ctx, str, x, y, color, outline) {
    x = Math.round(x); y = Math.round(y);
    for (let pass = outline ? 0 : 1; pass < 2; pass++) {
      ctx.fillStyle = pass === 0 ? outline : color;
      for (let i = 0; i < str.length; i++) {
        const gl = GLYPHS[str[i]] || GLYPHS[' '];
        for (let k = 0; k < 15; k++) {
          if (gl[k] !== '1') continue;
          const gx = x + i * 4 + (k % 3), gy = y + Math.floor(k / 3);
          if (pass === 0) ctx.fillRect(gx - 1, gy - 1, 3, 3);
          else ctx.fillRect(gx, gy, 1, 1);
        }
      }
    }
  }

  // ---------- Icônes de l'interface ----------
  const ICONS = {
    seeds: { map: ['..kkkk..', '.kbbbbk.', 'kbbbbbbk', 'kbbggbbk', 'kbgbgbbk', 'kbbggbbk', 'kbbbbbbk', '.kkkkkk.'], pal: { k: '#5a3a22', b: '#d9b37a', g: '#4fae3c' } },
    field: { map: ['...g....', '..ggg...', '...g..g.', '...g.ggg', '...g..g.', 'dddddddd', 'DdDdDdDd', 'DDDDDDDD'], pal: { g: '#5fb548', d: '#8a5a33', D: '#5a3a22' } },
    tools: { map: ['......mm', '.....mm.', '....ww..', '...ww...', '..ww....', '.ww.....', 'ww......', 'w.......'], pal: { w: '#9b6b3f', m: '#c9d1d9' } },
    robots: { map: ['...a....', '...n....', '.HHHHHH.', '.HeHHeH.', '.HHHHHH.', '.HmmmmH.', '.HHHHHH.', '..n..n..'], pal: { a: '#ff5e5e', n: '#5e6b7a', H: '#aab6c4', e: '#4fd1ff', m: '#38424e' } },
    prestige: { map: ['...yy...', '..yYYy..', '.yYYYYy.', 'yYYwYYYy', 'yYYYYYYy', '.yYYYYy.', '..yYYy..', '...yy...'], pal: { y: '#c9962a', Y: '#ffd84a', w: '#fff6c8' } },
    ach: { map: ['yyyyyyyy', 'yYYYYYYy', '.yYYYYy.', '..yYYy..', '...yy...', '...yy...', '..yyyy..', '.oooooo.'], pal: { y: '#c9962a', Y: '#ffd84a', o: '#7a5230' } },
    settings: { map: ['...gg...', '.g.gg.g.', '..gggg..', 'ggg..ggg', 'ggg..ggg', '..gggg..', '.g.gg.g.', '...gg...'], pal: { g: '#b9c2cc' } },
    soleil: { map: ['y..y..y.', '.y.y.y..', '..yyy...', 'yyyYyyy.', '..yyy...', '.y.y.y..', 'y..y..y.', '........'], pal: { y: '#ffc93c', Y: '#fff1a8' } },
    lune: { map: ['..wwww..', '.wwwwk..', 'wwwwk...', 'wwwk....', 'wwwk....', 'wwwwk...', '.wwwwk..', '..wwww..'], pal: { w: '#e9ecf5', k: '#e9ecf5' } },
    nuageux: { map: ['........', '...ww...', '..wwww..', '.wwwwww.', 'wwwwwwww', 'gggggggg', '........', '........'], pal: { w: '#e6e9ee', g: '#a8b0ba' } },
    pluie: { map: ['...ww...', '..wwww..', '.wwwwww.', 'gggggggg', '........', '.b..b..b', 'b..b..b.', '........'], pal: { w: '#c9ced6', g: '#8c95a1', b: '#5aa9ff' } },
    orage: { map: ['...ww...', '..wwww..', '.wwwwww.', 'gggggggg', '...yy...', '..yy....', '...yy...', '..y.....'], pal: { w: '#9aa2ad', g: '#6c7480', y: '#ffe14d' } },
    canicule: { map: ['.r..r..r', 'r..r..r.', '.r..r..r', '..yyyy..', '.yyYYyy.', '.yyYYyy.', '..yyyy..', '........'], pal: { r: '#ff7a45', y: '#ff9f1c', Y: '#fff1a8' } },
    pets: { map: ['.p...p..', 'ppp.ppp.', '.p...p..', '........', '..ppp...', '.ppppp..', '.ppppp..', '..p.p...'], pal: { p: '#f2c49b' } },
    up: { map: ['........', '...ww...', '..wwww..', '.wwwwww.', 'ww.ww.ww', '...ww...', '...ww...', '........'], pal: { w: '#f4ead8' } },
    down: { map: ['........', '...ww...', '...ww...', 'ww.ww.ww', '.wwwwww.', '..wwww..', '...ww...', '........'], pal: { w: '#f4ead8' } },
    factory: { map: ['.....kk.', '.....kk.', 'g.g.gkk.', 'gggggggg', 'gwggwggg', 'gggggggg', 'ggddddgg', 'ggddddgg'], pal: { g: '#7d8893', k: '#5a636d', w: '#9fd8ff', d: '#3a3a44' } },
    food: { map: ['..y..y..', '...yy...', '.bbbbbb.', 'bwwwwwwb', 'bwyywwwb', '.bwwwwb.', '..bbbb..', '........'], pal: { b: '#c9d1d9', w: '#e8a33a', y: '#ffd84a' } },
    market: { map: ['..gggg..', '.g....g.', 'gggggggg', '.ssssss.', '.s.ss.s.', '.ssssss.', '.s.ss.s.', '.ssssss.'], pal: { g: '#8f99a4', s: '#aeb7c1' } },
    spec: { map: ['...gg...', '..gGGg..', '.gGgGGg.', 'gGGgGgGg', '.gGGgGg.', '...bb...', '...bb...', '..bbbb..'], pal: { g: '#3f8f34', G: '#6fc24a', b: '#7a5230' } },
    gel: { map: ['...w....', '.w.w.w..', '..www...', 'wwwwwww.', '..www...', '.w.w.w..', '...w....', '........'], pal: { w: '#cfefff' } },
    brouillard: { map: ['........', 'gggggg..', '........', '..gggggg', '........', 'gggggg..', '........', '..gggggg'], pal: { g: '#c9ced6' } },
    vent: { map: ['........', 'wwwww...', '.....w..', 'wwwwww..', '......w.', '.wwwww..', '........', '..www...'], pal: { w: '#e6e9ee' } },
    auto: { map: ['..aaaa..', '.a....a.', 'a..aa..a', 'a.a..a.a', 'a.aaaa.a', 'a.a..a.a', '.a....a.', '..aaaa..'], pal: { a: '#e8e8e8' } },
    frenzy: { map: ['...yy...', '.yyyyyy.', 'yy.yy...', '.yyyyy..', '...yy.yy', '.yyyyyy.', '...yy...', '........'], pal: { y: '#7ee081' } },
  };
  const iconCache = new Map();
  function iconURL(name, scale = 2) {
    const key = name + '@' + scale;
    if (iconCache.has(key)) return iconCache.get(key);
    const ic = ICONS[name];
    const c = document.createElement('canvas');
    c.width = 8 * scale; c.height = 8 * scale;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false; // les sprites en cache sont agrandis : pas de flou
    x.scale(scale, scale);
    if (ic) drawMap(x, ic.map, ic.pal, 0, 8, false);
    const url = c.toDataURL();
    iconCache.set(key, url);
    return url;
  }
  function robotIconURL(kind, scale = 3) {
    const key = 'robot:' + kind + '@' + scale;
    if (iconCache.has(key)) return iconCache.get(key);
    const c = document.createElement('canvas');
    c.width = 12 * scale; c.height = 12 * scale;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false; // les sprites en cache sont agrandis : pas de flou
    x.scale(scale, scale);
    if (kind === 'drone') drawMap(x, DRONE_MAP, DRONE_PAL, 0, 9, false);
    else { const pal = ROBOT_PAL[kind] || ROBOT_PAL.rouille; drawMap(x, ROBOT_MAP, pal, 2, 11, false); drawMap(x, WHEELS[0], pal, 2, 12, false); }
    const url = c.toDataURL();
    iconCache.set(key, url);
    return url;
  }
  function petIconURL(id, look, scale = 3, skin = null) {
    if (look === true) look = 'evo'; else if (!look) look = 'base';
    const key = 'pet:' + id + ':' + look + '@' + scale + (skin ? '#' + skin : '');
    if (iconCache.has(key)) return iconCache.get(key);
    const c = document.createElement('canvas');
    c.width = 16 * scale; c.height = 16 * scale;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false; // les sprites en cache sont agrandis : pas de flou
    x.scale(scale, scale);
    drawPet(x, id, look, { x: 8, dir: 1, anim: 0, moving: id === 'taupe' ? false : true, kind: 'pet' }, id === 'abeille' || look === 'rapace' || (PET_FLY[id] && PET_FLY[id](look)) ? 23 : 15, 0, skin);
    const url = c.toDataURL();
    iconCache.set(key, url);
    return url;
  }
  function seedIconURL(seed, scale = 2) {
    const key = 'seed:' + seed.id + '@' + scale;
    if (iconCache.has(key)) return iconCache.get(key);
    const c = document.createElement('canvas');
    c.width = 12 * scale; c.height = 18 * scale;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false; // les sprites en cache sont agrandis : pas de flou
    x.scale(scale, scale);
    drawPlant(x, seed, 6, 16, 1, false, 0);
    px(x, 1, 16, 10, 2, '#6b4426');
    const url = c.toDataURL();
    iconCache.set(key, url);
    return url;
  }

  root.FARM_SPRITES = { px, drawMap, drawWorker, drawBarn, drawGrass, drawSoil, drawPlant, drawSparkle, drawCrow, drawCart, drawText, textWidth, iconURL, seedIconURL, petIconURL, robotIconURL, drawPet, drawHive, drawSilo, drawRod, drawEnergy, drawBolt, drawMutation, drawBoar, drawSwarm, drawThief, drawJudge, drawTornado, drawGeese, drawStarMark, setSeason, drawSeasonDeco, drawSeasonFx, drawFactory, drawSmoke, drawBelt, drawMachine, drawFridge, drawCrate, drawPorter, ICONS };
})(this);

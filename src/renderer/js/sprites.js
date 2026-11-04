// Pixel art dessiné en code. Toutes les coordonnées sont en pixels "art" (1 px art = scale px écran).
// Pour ajouter un sprite : une carte de caractères + une palette (lettre -> couleur), voir drawMap().
(function (root) {
  'use strict';

  function px(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }

  // Dessine une carte ['..ab..', ...] avec son coin bas-gauche en (x, bottom).
  function drawMap(ctx, map, pal, x, bottom, flip) {
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

  function drawPetMap(ctx, key, x, bottom, flip, frame) {
    const sp = PET_SPRITES[key];
    const map = sp.maps[frame % sp.maps.length];
    drawMap(ctx, map, sp.pal, x - (map[0].length >> 1), bottom, flip);
  }

  // e = { x, dir, anim, moving, kind }, id = compagnon, evo = évolué ?
  // look = 'base' | 'evo' | id de la voie (voir petLook() dans core.js).
  function drawPet(ctx, id, look, e, ground, t) {
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
      const body = look === 'guerriere' ? ['#e0302a', '#121216'] : look === 'doree' ? ['#ffd84a', '#c9962a'] : ['#f2b84b', '#2b1d14'];
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
    drawPetMap(ctx, key, x, ground - 2 + bob, flip, frame);
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
  function drawJudge(ctx, j, ground) {
    drawMap(ctx, JUDGE, { h: '#1d1d26', s: '#f2c193', r: '#7d3fc4', c: '#f2efe6', k: '#2b1d14' }, j.x - 4, ground, false);
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
      if (acting) drawMap(ctx, FARMER_ACT, FARMER_PAL, left, ground + bob, flip);
      else {
        drawMap(ctx, FARMER_TOP, FARMER_PAL, left, ground - 2, flip);
        drawMap(ctx, FARMER_LEGS[frame], FARMER_PAL, left, ground, flip);
      }
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
  function drawBarn(ctx, x, ground) {
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

  function drawSoil(ctx, x, ground, w, moist, irrigated) {
    const dry = [138, 90, 51], wet = [84, 52, 30];
    const m = Math.max(0, Math.min(1, moist));
    const c = dry.map((v, i) => Math.round(v + (wet[i] - v) * m));
    px(ctx, x, ground - 2, w, 2, `rgb(${c[0]},${c[1]},${c[2]})`);
    px(ctx, x + 1, ground - 3, w - 2, 1, `rgb(${c[0] + 10},${c[1] + 8},${c[2] + 5})`);
    if (irrigated) { px(ctx, x - 1, ground - 2, 1, 2, '#7d8893'); px(ctx, x - 1, ground - 3, 1, 1, '#9fd8ff'); }
  }

  // ---------- Plantes ----------
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, Math.round(((n >> 16) & 255) * f));
    const g = Math.min(255, Math.round(((n >> 8) & 255) * f));
    const b = Math.min(255, Math.round((n & 255) * f));
    return `rgb(${r},${g},${b})`;
  }

  // cx = centre, gy = sol (haut de la butte), g = croissance 0..1
  function drawPlant(ctx, seed, cx, gy, g, gold, t) {
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
    x.scale(scale, scale);
    if (kind === 'drone') drawMap(x, DRONE_MAP, DRONE_PAL, 0, 9, false);
    else { const pal = ROBOT_PAL[kind] || ROBOT_PAL.rouille; drawMap(x, ROBOT_MAP, pal, 2, 11, false); drawMap(x, WHEELS[0], pal, 2, 12, false); }
    const url = c.toDataURL();
    iconCache.set(key, url);
    return url;
  }
  function petIconURL(id, look, scale = 3) {
    if (look === true) look = 'evo'; else if (!look) look = 'base';
    const key = 'pet:' + id + ':' + look + '@' + scale;
    if (iconCache.has(key)) return iconCache.get(key);
    const c = document.createElement('canvas');
    c.width = 16 * scale; c.height = 16 * scale;
    const x = c.getContext('2d');
    x.scale(scale, scale);
    drawPet(x, id, look, { x: 8, dir: 1, anim: 0, moving: id === 'taupe' ? false : true, kind: 'pet' }, id === 'abeille' || look === 'rapace' || (PET_FLY[id] && PET_FLY[id](look)) ? 23 : 15, 0);
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
    x.scale(scale, scale);
    drawPlant(x, seed, 6, 16, 1, false, 0);
    px(x, 1, 16, 10, 2, '#6b4426');
    const url = c.toDataURL();
    iconCache.set(key, url);
    return url;
  }

  root.FARM_SPRITES = { px, drawMap, drawWorker, drawBarn, drawGrass, drawSoil, drawPlant, drawSparkle, drawCrow, drawCart, drawText, textWidth, iconURL, seedIconURL, petIconURL, robotIconURL, drawPet, drawHive, drawSilo, drawRod, drawEnergy, drawBolt, drawMutation, drawBoar, drawSwarm, drawThief, drawJudge, drawTornado, drawGeese, drawStarMark, ICONS };
})(this);

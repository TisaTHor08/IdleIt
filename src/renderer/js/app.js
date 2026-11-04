// Point d'entrée : boucle de jeu, sauvegarde, click-through et liaison avec Electron.
(function (root) {
  'use strict';
  const { Game } = root.FARM_CORE;
  const { Renderer } = root.FARM_RENDER;
  const { UI } = root.FARM_UI;
  const SAVE_KEY = 'idleit-save';

  // Hors Electron (ouvert dans un navigateur pour tester), on simule l'API.
  const api = root.api || {
    setIgnore() {}, hide() {}, quit() {}, onSettings() {}, onOpenTab() {},
    getSettings: async () => ({ scale: 2, opacity: 1, displays: [], hotkey: 'Control+Alt+F' }),
    setSetting: async (k, v) => ({ scale: 2, opacity: 1, displays: [], [k]: v }),
  };

  // Sauvegarde 100 % automatique : fichier via Electron, localStorage hors Electron.
  let saved = null;
  try { saved = api.loadSave ? api.loadSave() : localStorage.getItem(SAVE_KEY); } catch { /* pas de sauvegarde */ }
  const game = new Game(saved);
  const canvas = document.getElementById('scene');
  const renderer = new Renderer(canvas, game);
  const ui = new UI(game, renderer, api);

  function save(sync) {
    try {
      const txt = game.serialize();
      if (api.writeSave) sync ? api.writeSaveSync(txt) : api.writeSave(txt);
      else localStorage.setItem(SAVE_KEY, txt);
    } catch { /* ignore */ }
  }
  if (api.onFlushSave) api.onFlushSave(() => save(true));

  // Conflit de synchronisation : le joueur choisit quelle version garder.
  if (api.onSaveConflict) api.onSaveConflict(info => {
    const box = document.getElementById('conflict');
    document.getElementById('conflict-file').textContent = info.file.split(/[\\/]/).pop();
    box.classList.remove('hidden');
    document.getElementById('conflict-theirs').onclick = () => { box.classList.add('hidden'); api.resolveConflict('theirs'); };
    document.getElementById('conflict-mine').onclick = () => { box.classList.add('hidden'); api.resolveConflict('mine', game.serialize()); };
  });

  function applyOpacity(v) {
    document.getElementById('band').style.opacity = v;
  }

  function applySettings(s) {
    ui.settings = s;
    const dpr = window.devicePixelRatio || 1;
    document.documentElement.style.setProperty('--u', (s.scale / dpr) + 'px');
    applyOpacity(s.opacity);
    // Le HUD dépend de --u : on mesure après la mise en page.
    requestAnimationFrame(() => { renderer.resize(s.scale, ui.hudRight()); ui.layoutOverlays(); });
  }

  root.FARM_APP = { game, renderer, ui, save, applyOpacity };

  // ---------- Click-through : la souris ne compte que sur ce qui est dessiné ----------
  let ignoring = true;
  function setIgnore(v) { if (v !== ignoring) { ignoring = v; api.setIgnore(v); } }

  function sceneHit(e) {
    const r = canvas.getBoundingClientRect();
    if (e.clientY < r.top || e.clientX < r.left) return null;
    return renderer.hitTest(e.clientX - r.left, e.clientY - r.top);
  }

  window.addEventListener('mousemove', e => {
    const target = document.elementFromPoint(e.clientX, e.clientY);
    let interactive = false;
    let hit = null;
    if (target === canvas) { hit = sceneHit(e); interactive = !!hit; }
    else if (target && target !== document.body && target !== document.documentElement && target.id !== 'band' && target.id !== 'hud') interactive = true;
    setIgnore(!interactive);
    renderer.hover = hit;
    canvas.style.cursor = hit ? 'pointer' : 'default';
    if (target === canvas) ui.sceneTip(hit, e.clientX);
    else if (!ui.tipEl) ui.hideTip();
  });
  document.addEventListener('mouseleave', () => { setIgnore(true); renderer.hover = null; ui.hideTip(); });

  canvas.addEventListener('mousedown', e => {
    const hit = sceneHit(e);
    if (!hit) return;
    if (e.button === 2) { game.brush = null; ui.refreshSeedbar(); return; }
    if (hit.type === 'plot') game.clickPlot(hit.i);
    else if (hit.type === 'crow') game.scareCrow(hit.crow);
    else if (hit.type === 'cart') game.clickCart();
    else if (hit.type === 'pet') game.petClick(hit.uid);
    else if (hit.type === 'boar') game.scareBoar();
    else if (hit.type === 'swarm') game.disperseSwarm();
    else if (hit.type === 'thief') game.catchThief();
    else if (hit.type === 'silo') game.sellAll();
    ui.sceneTip(sceneHit(e), e.clientX);
  });
  window.addEventListener('contextmenu', e => { e.preventDefault(); if (game.brush) { game.brush = null; ui.refreshSeedbar(); } });
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (game.brush) { game.brush = null; ui.refreshSeedbar(); } else ui.closePanel(); }
  });

  // ---------- Boucles ----------
  // Simulation sur un minuteur (continue quand la fenêtre est masquée), rendu sur requestAnimationFrame.
  let last = performance.now();
  setInterval(() => {
    const now = performance.now();
    let dt = Math.min(5, (now - last) / 1000);
    last = now;
    while (dt > 0) { const step = Math.min(0.1, dt); game.tick(step); dt -= step; }
    ui.handleEvents();
  }, 50);

  let lastFrame = performance.now();
  function frame(now) {
    const dt = Math.min(0.1, (now - lastFrame) / 1000);
    lastFrame = now;
    renderer.draw(dt);
    requestAnimationFrame(frame);
  }

  setInterval(() => { ui.updateHud(); ui.update(); }, 250);
  setInterval(() => save(false), 5000);
  window.addEventListener('beforeunload', () => save(true));
  window.addEventListener('resize', () => renderer.resize(renderer.scale, ui.hudRight()));

  api.onSettings(applySettings);
  api.onOpenTab(tab => ui.openTab(tab));
  api.getSettings().then(s => {
    applySettings(s);
    ui.updateHud();
    requestAnimationFrame(frame);
    if (!saved) ui.toast('Bienvenue ! Ton fermier cultive tout seul. Clique sur les plantes pour l\'aider, ouvre la boutique à gauche.', 'gold');
  });
})(this);

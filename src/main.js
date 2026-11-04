// Processus principal : fenêtre transparente always-on-top collée au-dessus de la barre des tâches.
const { app, BrowserWindow, screen, ipcMain, globalShortcut, Tray, Menu, nativeImage, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const PANEL_H = 340; // espace au-dessus de la bande pour le panneau, les bulles et les notifications
const ART_H = 20;    // hauteur de la bande en pixels "art" ; scale = pixels physiques par pixel art (2 -> 40 px)

// Dossier de données fixe (%APPDATA%\IdleIt Ferme) : identique en dev, en portable et en version installée,
// et hors du dossier d'installation, donc une mise à jour par l'installeur ne touche jamais la sauvegarde.
app.setPath('userData', path.join(app.getPath('appData'), 'IdleIt Ferme'));
// Mode capture (tests visuels) : dossier temporaire pour ne jamais toucher à la vraie sauvegarde.
if (['--farm-shots', '--farm-savetest', '--farm-perf'].some(f => process.argv.includes(f))) app.setPath('userData', path.join(app.getPath('temp'), 'idleit-shots-' + Date.now()));

// Sobriété : une bande de 40 px n'a pas besoin du GPU (un processus et ~100 Mo de moins, rendu logiciel suffisant).
app.disableHardwareAcceleration();
// Mémoire : tas JavaScript compact (le jeu n'a besoin que de quelques Mo).
app.commandLine.appendSwitch('js-flags', '--optimize-for-size --max-old-space-size=128');

const SETTINGS_FILE = () => path.join(app.getPath('userData'), 'settings.json');
// saveDir : dossier de la partie (null = dossier utilisateur). Les réglages, eux, restent toujours propres à ce PC.
const DEFAULT_SETTINGS = { displayId: null, opacity: 1, scale: 2, autoLaunch: false, hotkey: 'Control+Alt+F', saveDir: null, fps: 10 };
let settings = { ...DEFAULT_SETTINGS };
let win = null;
let tray = null;

function loadSettings() {
  try { settings = { ...DEFAULT_SETTINGS, ...JSON.parse(fs.readFileSync(SETTINGS_FILE(), 'utf8')) }; } catch { /* premier lancement */ }
}
function saveSettings() {
  try { fs.writeFileSync(SETTINGS_FILE(), JSON.stringify(settings, null, 2)); } catch (e) { console.error(e); }
}

function targetDisplay() {
  return screen.getAllDisplays().find(d => d.id === settings.displayId) || screen.getPrimaryDisplay();
}

function layout() {
  if (!win) return;
  const d = targetDisplay();
  const wa = d.workArea;
  const h = Math.ceil(ART_H * settings.scale / d.scaleFactor) + PANEL_H;
  win.setBounds({ x: wa.x, y: wa.y + wa.height - h, width: wa.width, height: h });
}

function displayList() {
  const primary = screen.getPrimaryDisplay().id;
  return screen.getAllDisplays().map((d, i) => ({
    id: d.id,
    label: `Écran ${i + 1} (${d.size.width}×${d.size.height})${d.id === primary ? ' – principal' : ''}`,
  }));
}

function publicSettings() {
  const d = targetDisplay();
  return { ...settings, displays: displayList(), panelH: PANEL_H, artH: ART_H, currentDisplay: d.id, scaleFactor: d.scaleFactor,
    saveDirActive: saveDir(), saveDirMissing: !!settings.saveDir && saveDir() !== settings.saveDir, saveDirDefault: app.getPath('userData') };
}

function toggleVisible() {
  if (!win) return;
  if (win.isVisible()) win.hide();
  else { win.showInactive(); win.setAlwaysOnTop(true, 'screen-saver'); }
}

function registerHotkey() {
  globalShortcut.unregisterAll();
  try { globalShortcut.register(settings.hotkey, toggleVisible); } catch (e) { console.error('Raccourci invalide', e); }
}

function createWindow() {
  win = new BrowserWindow({
    transparent: true,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    alwaysOnTop: true,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setIgnoreMouseEvents(true, { forward: true });
  layout();
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.once('ready-to-show', () => win.showInactive());
  if (process.env.FARM_DEBUG || process.argv.includes('--farm-debug')) {
    win.webContents.on('console-message', (_e, level, msg, line, src) => console.log(`[renderer:${level}] ${msg} (${src}:${line})`));
  }
  // --farm-savetest : rejoue les scénarios du dossier de sauvegarde dans un dossier temporaire, puis quitte.
  if (process.argv.includes('--farm-savetest')) {
    win.setOpacity(0.01);
    win.webContents.once('did-finish-load', async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const js = code => win.webContents.executeJavaScript(code);
      const ok = (cond, msg) => { console.log((cond ? 'OK   ' : 'ÉCHEC ') + msg); if (!cond) process.exitCode = 1; };
      const tmp = path.join(app.getPath('temp'), 'idleit-savetest-' + Date.now());
      const B = path.join(tmp, 'B'), C = path.join(tmp, 'C');
      fs.mkdirSync(B, { recursive: true }); fs.mkdirSync(C, { recursive: true });
      await wait(1000);
      await js('FARM_APP.game.s.money = 777; FARM_APP.save(true)');
      // 1. Dossier vide : la partie y est copiée.
      ipcMain.emit('set-save-dir', { returnValue: null }, B, 'move', await js('FARM_APP.game.serialize()'));
      ok(JSON.parse(fs.readFileSync(path.join(B, 'save.json'), 'utf8')).money === 777, 'partie copiée dans le nouveau dossier');
      ok(saveDir() === B, 'dossier actif = nouveau dossier');
      // 2. Un autre appareil modifie le fichier : pas d'écrasement, notre version part en conflit.
      await wait(50);
      const other = JSON.parse(fs.readFileSync(path.join(B, 'save.json'), 'utf8')); other.money = 999;
      fs.writeFileSync(path.join(B, 'save.json'), JSON.stringify(other));
      await js('FARM_APP.game.s.money = 778; FARM_APP.save(true)');
      ok(JSON.parse(fs.readFileSync(path.join(B, 'save.json'), 'utf8')).money === 999, "la version de l'autre appareil n'est pas écrasée");
      const conflicts = fs.readdirSync(B).filter(f => f.startsWith('save-conflit-'));
      ok(conflicts.length === 1 && JSON.parse(fs.readFileSync(path.join(B, conflicts[0]), 'utf8')).money === 778, 'notre partie est mise de côté (' + conflicts[0] + ')');
      await wait(300);
      ok(await js("!document.getElementById('conflict').classList.contains('hidden')"), 'le joueur est prévenu');
      // 3. Garder sa partie.
      await js("document.getElementById('conflict-mine').click()");
      await wait(300);
      ok(JSON.parse(fs.readFileSync(path.join(B, 'save.json'), 'utf8')).money === 778, '« Garder ma partie » écrase avec la partie en cours');
      // 4. Dossier qui contient une autre partie : elle est chargée.
      const theirs = JSON.parse(fs.readFileSync(path.join(B, 'save.json'), 'utf8')); theirs.money = 12345;
      fs.writeFileSync(path.join(C, 'save.json'), JSON.stringify(theirs));
      ipcMain.emit('set-save-dir', { returnValue: null }, C, 'load');
      await new Promise(r => win.webContents.once('did-finish-load', r));
      await wait(1500);
      ok(await js('FARM_APP.game.s.money') >= 12345, 'la partie du dossier est chargée');
      ok(JSON.parse(fs.readFileSync(path.join(B, 'save.json'), 'utf8')).money === 778, "l'ancien dossier n'a pas été écrasé pendant le changement");
      fs.rmSync(tmp, { recursive: true, force: true });
      app.quit();
    });
  }
  // --farm-perf : mesure le CPU et la mémoire de tous les processus pendant 30 s (après 10 s de chauffe), puis quitte.
  if (process.argv.includes('--farm-perf')) {
    win.setOpacity(0.01);
    win.webContents.once('did-finish-load', async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const demo = process.argv.find(a => a.startsWith('--farm-demo='));
      if (demo) await win.webContents.executeJavaScript(fs.readFileSync(demo.slice('--farm-demo='.length), 'utf8'));
      await wait(10000);
      // Temps passé dans le rendu, la simulation et l'interface (ms par seconde).
      await win.webContents.executeJavaScript(`(() => {
        const P = window.__perf = { draw: 0, tick: 0, ui: 0, n: 0 };
        const wrap = (o, k, key) => { const f = o[k].bind(o); o[k] = (...a) => { const t = performance.now(); const r = f(...a); P[key] += performance.now() - t; if (key === 'draw') P.n++; return r; }; };
        wrap(FARM_APP.renderer, 'draw', 'draw');
        P.fn = {};
        for (const k of Object.keys(FARM_SPRITES)) if (typeof FARM_SPRITES[k] === 'function' && k !== 'px') { const f = FARM_SPRITES[k]; FARM_SPRITES[k] = (...a) => { const t = performance.now(); const r = f(...a); P.fn[k] = (P.fn[k] || 0) + performance.now() - t; return r; }; }
        for (const k of ['drawWeather', 'drawNight', 'drawFloaters', 'drawFx']) wrap(FARM_APP.renderer, k, 'r_' + k), P['r_' + k] = 0; wrap(FARM_APP.game, 'tick', 'tick'); wrap(FARM_APP.ui, 'updateHud', 'ui'); wrap(FARM_APP.ui, 'handleEvents', 'ui');
      })()`);
      const samples = [];
      for (let i = 0; i < 30; i++) {
        await wait(1000);
        const m = app.getAppMetrics();
        samples.push({ cpu: m.reduce((a, p) => a + p.cpu.percentCPUUsage, 0), mem: m.reduce((a, p) => a + p.memory.workingSetSize, 0) / 1024,
          by: m.map(p => p.type + ':' + p.cpu.percentCPUUsage.toFixed(1)).join(' ') });
      }
      const avg = k => samples.reduce((a, s) => a + s[k], 0) / samples.length;
      const P = await win.webContents.executeJavaScript('window.__perf');
      console.log('perf : détail ' + JSON.stringify(Object.fromEntries(Object.entries({ ...P.fn, ...Object.fromEntries(Object.entries(P).filter(([k]) => k.startsWith('r_'))) }).map(([k, v]) => [k, +(v / 30).toFixed(2)]).sort((a, b) => b[1] - a[1]).slice(0, 12))));
      console.log(`perf : rendu ${(P.draw / 30).toFixed(1)} ms/s (${(P.n / 30).toFixed(1)} images/s) · simulation ${(P.tick / 30).toFixed(1)} ms/s · interface ${(P.ui / 30).toFixed(1)} ms/s`);
      console.log(`perf : CPU ${avg('cpu').toFixed(2)} % (somme des processus, en % d'un cœur) · mémoire ${avg('mem').toFixed(0)} Mo · ${samples[samples.length - 1].by}`);
      app.quit();
    });
  }
  // --farm-shots : ouvre chaque onglet et enregistre une capture dans tools/shots (vérification visuelle).
  if (process.argv.includes('--farm-shots')) {
    win.setOpacity(0.01); // quasi invisible à l'écran ; capturePage lit le contenu sans tenir compte de l'opacité
    win.webContents.once('did-finish-load', async () => {
      const dir = path.join(__dirname, '..', 'tools', 'shots');
      fs.mkdirSync(dir, { recursive: true });
      const wait = ms => new Promise(r => setTimeout(r, ms));
      await wait(1500);
      const demo = process.argv.find(a => a.startsWith('--farm-demo='));
      if (demo) await win.webContents.executeJavaScript(fs.readFileSync(demo.slice('--farm-demo='.length), 'utf8'));
      await wait(1500);
      const tabs = await win.webContents.executeJavaScript('FARM_UI_TABS');
      for (const tab of tabs) {
        await win.webContents.executeJavaScript(`FARM_APP.ui.openTab('${tab}')`);
        await wait(600);
        const img = await win.webContents.capturePage();
        fs.writeFileSync(path.join(dir, tab + '.png'), img.toPNG());
      }
      await win.webContents.executeJavaScript('FARM_APP.ui.closePanel()');
      await wait(800);
      fs.writeFileSync(path.join(dir, 'band.png'), (await win.webContents.capturePage()).toPNG());
      console.log('captures terminées');
      app.quit();
    });
  }

  // D'autres fenêtres "topmost" peuvent passer devant : on se réaffirme régulièrement.
  setInterval(() => { if (win && win.isVisible()) win.setAlwaysOnTop(true, 'screen-saver'); }, 4000);
}

function createTray() {
  const iconPath = path.join(__dirname, '..', 'assets', 'icon.png');
  let img = nativeImage.createFromPath(iconPath);
  if (img.isEmpty()) img = nativeImage.createEmpty();
  else img = img.resize({ width: 16, height: 16 });
  tray = new Tray(img);
  tray.setToolTip('IdleIt Ferme');
  const send = tab => () => { if (!win.isVisible()) toggleVisible(); win.webContents.send('open-tab', tab); };
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Afficher / masquer', click: toggleVisible },
    { label: 'Réglages', click: send('reglages') },
    { type: 'separator' },
    { label: 'Quitter', click: () => app.quit() },
  ]));
  tray.on('click', toggleVisible);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => { if (win && !win.isVisible()) toggleVisible(); });

  app.whenReady().then(() => {
    loadSettings();
    createWindow();
    createTray();
    registerHotkey();
    screen.on('display-metrics-changed', layout);
    screen.on('display-added', layout);
    screen.on('display-removed', layout);
  });

  app.on('will-quit', () => globalShortcut.unregisterAll());
  app.on('window-all-closed', () => app.quit());
}

ipcMain.on('set-ignore', (_e, ignore) => {
  if (win) win.setIgnoreMouseEvents(!!ignore, { forward: true });
});

ipcMain.handle('get-settings', () => publicSettings());

ipcMain.handle('set-setting', (_e, key, value) => {
  if (!(key in DEFAULT_SETTINGS) || key === 'saveDir') return publicSettings();
  settings[key] = value;
  if (key === 'autoLaunch') app.setLoginItemSettings({ openAtLogin: !!value });
  if (key === 'hotkey') registerHotkey();
  if (key === 'displayId' || key === 'scale') layout();
  saveSettings();
  const pub = publicSettings();
  win.webContents.send('settings', pub);
  return pub;
});

// ---------- Sauvegarde automatique ----------
// Toute la partie tient dans un dossier (save.json + save.json.bak), au choix du joueur : par exemple un dossier
// synchronisé entre plusieurs PC. Écriture atomique (.tmp puis renommage).
// Si le fichier a été modifié par quelqu'un d'autre (autre appareil via la synchro) depuis notre dernière lecture ou
// écriture, on ne l'écrase pas : notre version part dans un fichier "save-conflit-...json" et le joueur choisit.
const defaultSaveDir = () => app.getPath('userData');
function saveDir() {
  const d = settings.saveDir;
  return d && fs.existsSync(d) ? d : defaultSaveDir(); // dossier absent (NAS débranché...) : dossier par défaut
}
const saveFile = (dir = saveDir()) => path.join(dir, 'save.json');
let knownMtime = 0;        // date du fichier lors de notre dernière lecture/écriture
let conflict = null;       // { file } tant que le joueur n'a pas choisi
let switching = false;     // changement de dossier en cours : on n'écrit plus rien jusqu'au rechargement

function readSaveFrom(dir) {
  for (const f of [saveFile(dir), saveFile(dir) + '.bak']) {
    try { const txt = fs.readFileSync(f, 'utf8'); JSON.parse(txt); return { txt, file: f }; } catch { /* absent ou abîmé : on essaie la copie */ }
  }
  return null;
}
function mtime(file) { try { return fs.statSync(file).mtimeMs; } catch { return 0; } }

function readSave() {
  const r = readSaveFrom(saveDir());
  knownMtime = mtime(saveFile());
  return r ? r.txt : null;
}

function stamp() { return new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '').replace(/^(\d{8})/, '$1-'); }

function writeSave(txt, force) {
  if (typeof txt !== 'string' || !txt.length || switching) return;
  const file = saveFile();
  try {
    const now = mtime(file);
    if (!force && knownMtime && now && Math.abs(now - knownMtime) > 1) {
      // Modifiée ailleurs : on met notre version de côté au lieu d'écraser.
      if (!conflict) conflict = { file: path.join(saveDir(), `save-conflit-${stamp()}.json`) };
      fs.writeFileSync(conflict.file, txt);
      if (win && !win.isDestroyed()) win.webContents.send('save-conflict', { file: conflict.file });
      return;
    }
    fs.writeFileSync(file + '.tmp', txt);
    if (fs.existsSync(file)) fs.copyFileSync(file, file + '.bak');
    fs.renameSync(file + '.tmp', file);
    knownMtime = mtime(file);
  } catch (e) { console.error('Sauvegarde impossible', e); }
}
ipcMain.on('save-load', e => { switching = false; e.returnValue = readSave(); });
ipcMain.on('save-write', (_e, txt) => writeSave(txt));
ipcMain.on('save-write-sync', (e, txt) => { writeSave(txt); e.returnValue = true; });

// Conflit : 'theirs' recharge la version du dossier, 'mine' écrase avec la partie en cours.
ipcMain.on('save-resolve', (_e, choice, txt) => {
  if (!conflict) return;
  conflict = null;
  if (choice === 'mine') writeSave(txt, true);
  else { switching = true; win.reload(); }
});

// Choix du dossier de sauvegarde. Renvoie { dir, hasSave } ; null si annulé.
ipcMain.handle('choose-save-dir', async () => {
  const r = await dialog.showOpenDialog(win, { title: 'Dossier de sauvegarde', properties: ['openDirectory', 'createDirectory'] });
  if (r.canceled || !r.filePaths[0]) return null;
  return { dir: r.filePaths[0], hasSave: !!readSaveFrom(r.filePaths[0]) };
});
ipcMain.handle('default-save-dir', () => ({ dir: null, hasSave: !!readSaveFrom(defaultSaveDir()) }));
// mode 'load' : on charge la partie du dossier (rechargement) ; mode 'move' : la partie en cours y est copiée.
ipcMain.on('set-save-dir', (e, dir, mode, txt) => {
  settings.saveDir = dir || null;
  saveSettings();
  conflict = null;
  knownMtime = 0;
  if (mode === 'load') { switching = true; win.reload(); }
  else writeSave(txt, true);
  win.webContents.send('settings', publicSettings());
  e.returnValue = true;
});
ipcMain.on('open-save-dir', () => shell.openPath(saveDir()));

// Avant de quitter (icône, menu, raccourci...), on demande une dernière sauvegarde au jeu.
let quitting = false;
app.on('before-quit', e => {
  if (quitting || !win || win.isDestroyed()) return;
  e.preventDefault();
  quitting = true;
  win.webContents.send('flush-save');
  setTimeout(() => app.quit(), 400);
});

// ---------- Mise à jour automatique (releases GitHub) ----------
// Version installée : la nouvelle version est téléchargée en arrière-plan, puis la partie est sauvegardée,
// l'installeur tourne en silence et la ferme se relance toute seule (la sauvegarde, hors du dossier
// d'installation, est conservée). Version portable : un exe ne peut pas se remplacer lui-même, on prévient
// seulement le joueur avec un lien vers la release.
const UPDATE_EVERY = 4 * 3600 * 1000;
const RELEASES_URL = 'https://github.com/TisaTHor08/IdleIt/releases/latest';
function setupAutoUpdate() {
  if (!app.isPackaged || process.argv.some(a => a === '--farm-shots' || a === '--farm-savetest')) return;
  let autoUpdater;
  try { ({ autoUpdater } = require('electron-updater')); } catch (e) { console.error('electron-updater absent', e); return; }
  const portable = !!process.env.PORTABLE_EXECUTABLE_DIR;
  autoUpdater.autoDownload = !portable;
  autoUpdater.autoInstallOnAppQuit = !portable;
  let notified = null;
  autoUpdater.on('error', e => console.error('Mise à jour :', e && e.message));
  autoUpdater.on('update-available', info => {
    if (!portable || notified === info.version || !tray) return;
    notified = info.version;
    tray.displayBalloon({ title: 'IdleIt Ferme ' + info.version + ' disponible',
      content: 'Clique ici pour télécharger la nouvelle version portable.', iconType: 'info' });
    tray.once('balloon-click', () => shell.openExternal(RELEASES_URL));
  });
  autoUpdater.on('update-downloaded', info => {
    if (portable) return;
    if (tray) tray.displayBalloon({ title: 'Mise à jour ' + info.version, content: 'La ferme se met à jour et redémarre…', iconType: 'info' });
    // Dernière sauvegarde, puis installation silencieuse et relance.
    if (win && !win.isDestroyed()) win.webContents.send('flush-save');
    setTimeout(() => { quitting = true; autoUpdater.quitAndInstall(true, true); }, 1500);
  });
  const check = () => autoUpdater.checkForUpdates().catch(e => console.error('Mise à jour :', e && e.message));
  setTimeout(check, 30 * 1000);
  setInterval(check, UPDATE_EVERY);
}
app.whenReady().then(setupAutoUpdate);

ipcMain.on('hide', () => { if (win) win.hide(); });
ipcMain.on('quit', () => app.quit());

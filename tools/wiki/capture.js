// Capture d'une page du wiki (rendu hors écran) : CAP_URL=http://localhost:8080/ CAP_OUT=x.png CAP_W=1280 electron tools/wiki/capture.js
// (l'URL passe par l'environnement : en argument, Electron l'ouvrirait lui-même)
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const url = process.env.CAP_URL, out = process.env.CAP_OUT, w = process.env.CAP_W || 1280;
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: +w, height: 900, show: false, webPreferences: { offscreen: true } });
  await win.loadURL(url);
  await new Promise(r => setTimeout(r, 1200));
  const h = await win.webContents.executeJavaScript('document.documentElement.scrollHeight');
  win.setContentSize(+w, Math.min(h, 7000));
  await new Promise(r => setTimeout(r, 1000));
  fs.writeFileSync(out, (await win.webContents.capturePage()).toPNG());
  console.log('capture', out, w, h);
  app.quit();
}).catch(e => { console.error('ERREUR', e); app.quit(); });

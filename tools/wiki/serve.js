// Aperçu local du wiki (mêmes règles que nginx : gzip, cache, 404) : node tools/wiki/serve.js [port=8080]
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const DIST = path.join(__dirname, '..', '..', 'wiki', 'dist');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.txt': 'text/plain', '.xml': 'application/xml' };
const port = +process.argv[2] || 8080;
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  let file = path.join(DIST, p);
  if (!file.startsWith(DIST)) { res.writeHead(403); return res.end(); }
  let status = 200;
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) { if (fs.existsSync(path.join(file, 'index.html'))) file = path.join(file, 'index.html'); else { file = path.join(DIST, '404.html'); status = 404; } }
  const ext = path.extname(file);
  const headers = { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' };
  let body = fs.readFileSync(file);
  if (/gzip/.test(req.headers['accept-encoding'] || '') && ['.html', '.js', '.json', '.txt', '.xml'].includes(ext)) { body = zlib.gzipSync(body, { level: 9 }); headers['Content-Encoding'] = 'gzip'; }
  res.writeHead(status, headers);
  res.end(body);
}).listen(port, () => console.log('wiki sur http://localhost:' + port));

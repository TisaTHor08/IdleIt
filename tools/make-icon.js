// Génère assets/icon.png (256x256) : une carotte en pixel art. Usage : npm run icon
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const MAP = [
  '................',
  '.........g..g...',
  '........gg.gg...',
  '.......ggggg....',
  '.......Gggg.....',
  '......oooG......',
  '.....ooooo......',
  '.....oOooo......',
  '....ooooo.......',
  '....ooOo........',
  '...oooo.........',
  '...ooo..........',
  '..oOo...........',
  '..oo............',
  '.o..............',
  '................',
];
const PAL = { g: [95, 181, 72], G: [62, 130, 50], o: [242, 138, 30], O: [200, 100, 20] };
const SIZE = 256, CELL = SIZE / 16;

const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE);
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0;
  for (let x = 0; x < SIZE; x++) {
    const c = PAL[MAP[Math.floor(y / CELL)][Math.floor(x / CELL)]];
    const o = y * (SIZE * 4 + 1) + 1 + x * 4;
    if (c) { raw[o] = c[0]; raw[o + 1] = c[1]; raw[o + 2] = c[2]; raw[o + 3] = 255; }
  }
}

const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = buf => { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0); ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0)),
]);
const out = path.join(__dirname, '..', 'assets', 'icon.png');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, png);
console.log('Icône écrite :', out);

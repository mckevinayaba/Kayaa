// Generates public/icon-192.png and public/icon-512.png
// Run from project root: node scripts/gen-icons.mjs
import { deflateSync } from 'zlib';
import { writeFileSync, mkdirSync } from 'fs';

function crc32(buf) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c >>> 0;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = (table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8)) >>> 0;
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length);
  const crcInput = Buffer.concat([typeBytes, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput));
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf]);
}

// Pixel-art "K" — 5 cols × 7 rows
const K = [
  [1,0,0,0,1],
  [1,0,0,1,0],
  [1,0,1,0,0],
  [1,1,1,0,0],
  [1,0,1,0,0],
  [1,0,0,1,0],
  [1,0,0,0,1],
];

function createIcon(size) {
  const bg = [13, 17, 23];       // #0D1117
  const fg = [57, 217, 138];     // #39D98A

  const letterH = Math.round(size * 0.55);
  const letterW = Math.round(letterH * 5 / 7);
  const startX = Math.round((size - letterW) / 2);
  const startY = Math.round((size - letterH) / 2);
  const cellW = letterW / 5;
  const cellH = letterH / 7;

  const scanlines = [];
  for (let y = 0; y < size; y++) {
    const line = [0]; // PNG filter: none
    for (let x = 0; x < size; x++) {
      const lx = x - startX;
      const ly = y - startY;
      let isK = false;
      if (lx >= 0 && lx < letterW && ly >= 0 && ly < letterH) {
        const col = Math.min(4, Math.floor(lx / cellW));
        const row = Math.min(6, Math.floor(ly / cellH));
        isK = K[row][col] === 1;
      }
      const px = isK ? fg : bg;
      line.push(px[0], px[1], px[2]);
    }
    scanlines.push(line);
  }

  const raw = Buffer.from(scanlines.flat());
  const compressed = deflateSync(raw);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type: RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

try { mkdirSync('./public', { recursive: true }); } catch {}

writeFileSync('./public/icon-192.png', createIcon(192));
console.log('✓ public/icon-192.png');

writeFileSync('./public/icon-512.png', createIcon(512));
console.log('✓ public/icon-512.png');

// Generate a .ico file with a 256x256 Tetris design using PNG format
// ICO with PNG data is the standard for 256x256 icons

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPNG(size) {
  // Create pixel data
  const pixels = [];
  for (let y = 0; y < size; y++) {
    pixels[y] = [];
    for (let x = 0; x < size; x++) {
      pixels[y][x] = [12, 12, 28, 255]; // dark background RGBA
    }
  }

  const blockSize = Math.floor(size / 5);
  const gap = 2;

  function drawBlock(bx, by, w, h, r, g, b) {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const px = bx + dx;
        const py = by + dy;
        if (px >= 0 && px < size && py >= 0 && py < size) {
          let cr = r, cg = g, cb = b;

          // Border
          if (dy < 3 || dx < 3) {
            cr = Math.min(255, r + 70);
            cg = Math.min(255, g + 70);
            cb = Math.min(255, b + 70);
          }
          if (dy >= h - 3 || dx >= w - 3) {
            cr = Math.max(0, r - 50);
            cg = Math.max(0, g - 50);
            cb = Math.max(0, b - 50);
          }
          // Inner shine
          if (dx > 4 && dx < w - 5 && dy > 4 && dy < h - 5) {
            cr = Math.min(255, r + 25);
            cg = Math.min(255, g + 25);
            cb = Math.min(255, b + 25);
          }

          pixels[py][px] = [cr, cg, cb, 255];
        }
      }
    }
  }

  // Draw a T-piece (purple) - centered at top area
  const bs = blockSize - gap;
  const tStartX = Math.floor((size - bs * 3 - gap * 2) / 2);
  const tStartY = Math.floor(size * 0.15);

  const purple = [160, 0, 240];
  drawBlock(tStartX + bs + gap, tStartY, bs, bs, ...purple);                          // top center
  drawBlock(tStartX, tStartY + bs + gap, bs, bs, ...purple);                          // mid left
  drawBlock(tStartX + bs + gap, tStartY + bs + gap, bs, bs, ...purple);               // mid center
  drawBlock(tStartX + (bs + gap) * 2, tStartY + bs + gap, bs, bs, ...purple);         // mid right

  // Draw an L-piece (orange) at bottom-left
  const smallBs = Math.floor(blockSize * 0.65);
  const lStartX = Math.floor(size * 0.12);
  const lStartY = Math.floor(size * 0.68);
  const orange = [240, 160, 0];
  drawBlock(lStartX, lStartY, smallBs, smallBs, ...orange);
  drawBlock(lStartX, lStartY + smallBs + 1, smallBs, smallBs, ...orange);
  drawBlock(lStartX, lStartY + (smallBs + 1) * 2, smallBs, smallBs, ...orange);
  drawBlock(lStartX + smallBs + 1, lStartY + (smallBs + 1) * 2, smallBs, smallBs, ...orange);

  // Draw an S-piece (green) at bottom-right
  const sStartX = Math.floor(size * 0.58);
  const sStartY = Math.floor(size * 0.72);
  const green = [0, 240, 0];
  drawBlock(sStartX + smallBs + 1, sStartY, smallBs, smallBs, ...green);
  drawBlock(sStartX + (smallBs + 1) * 2, sStartY, smallBs, smallBs, ...green);
  drawBlock(sStartX, sStartY + smallBs + 1, smallBs, smallBs, ...green);
  drawBlock(sStartX + smallBs + 1, sStartY + smallBs + 1, smallBs, smallBs, ...green);

  // Convert pixels to PNG raw data (filter byte 0 + RGBA per row)
  const rawData = Buffer.alloc(size * (1 + size * 4));
  let pos = 0;
  for (let y = 0; y < size; y++) {
    rawData[pos++] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixels[y][x];
      rawData[pos++] = r;
      rawData[pos++] = g;
      rawData[pos++] = b;
      rawData[pos++] = a;
    }
  }

  // Compress with zlib deflate
  const compressed = zlib.deflateSync(rawData);

  // Build PNG
  function crc32(buf) {
    let crc = 0xFFFFFFFF;
    const table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[n] = c;
    }
    for (let i = 0; i < buf.length; i++) {
      crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function createChunk(type, data) {
    const typeStr = Buffer.from(type, 'ascii');
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);

    const crcData = Buffer.concat([typeStr, data]);
    const crcVal = Buffer.alloc(4);
    crcVal.writeUInt32BE(crc32(crcData));

    return Buffer.concat([length, typeStr, data, crcVal]);
  }

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);     // width
  ihdr.writeUInt32BE(size, 4);     // height
  ihdr.writeUInt8(8, 8);            // bit depth
  ihdr.writeUInt8(6, 9);            // color type: RGBA
  ihdr.writeUInt8(0, 10);           // compression
  ihdr.writeUInt8(0, 11);           // filter
  ihdr.writeUInt8(0, 12);           // interlace

  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createIcoWithPNG() {
  const png256 = createPNG(256);
  const png48 = createPNG(48);
  const png32 = createPNG(32);
  const png16 = createPNG(16);

  const numImages = 4;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = dirEntrySize * numImages;
  const dataOffset = headerSize + dirSize;

  const images = [
    { size: 0, data: png256 },   // 0 = 256
    { size: 48, data: png48 },
    { size: 32, data: png32 },
    { size: 16, data: png16 },
  ];

  const totalSize = dataOffset + images.reduce((sum, img) => sum + img.data.length, 0);
  const buffer = Buffer.alloc(totalSize);
  let offset = 0;

  // ICO Header
  buffer.writeUInt16LE(0, offset); offset += 2;
  buffer.writeUInt16LE(1, offset); offset += 2;
  buffer.writeUInt16LE(numImages, offset); offset += 2;

  // Directory entries
  let imgOffset = dataOffset;
  for (const img of images) {
    buffer.writeUInt8(img.size, offset); offset += 1;       // Width (0 = 256)
    buffer.writeUInt8(img.size, offset); offset += 1;       // Height
    buffer.writeUInt8(0, offset); offset += 1;               // Palette
    buffer.writeUInt8(0, offset); offset += 1;               // Reserved
    buffer.writeUInt16LE(1, offset); offset += 2;            // Color planes
    buffer.writeUInt16LE(32, offset); offset += 2;           // BPP
    buffer.writeUInt32LE(img.data.length, offset); offset += 4;  // Data size
    buffer.writeUInt32LE(imgOffset, offset); offset += 4;    // Data offset
    imgOffset += img.data.length;
  }

  // Image data
  for (const img of images) {
    img.data.copy(buffer, offset);
    offset += img.data.length;
  }

  return buffer;
}

const ico = createIcoWithPNG();
fs.writeFileSync(path.join(__dirname, 'assets', 'icon.ico'), ico);
console.log('Icon generated: assets/icon.ico (' + ico.length + ' bytes)');

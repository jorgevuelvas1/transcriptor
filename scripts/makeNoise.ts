/**
 * Genera una textura de ruido en PNG (escala de grises, 512x512) que se usa
 * como patron repetido para el grano editorial y la textura de papel.
 *
 * MOTIVO: calcular `feTurbulence` a pantalla completa en cada fotograma cuesta
 * cientos de milisegundos por frame en render por software, y el video tiene
 * 1800 fotogramas. Una textura pregenerada y repetida da el mismo resultado
 * visual a coste practicamente nulo.
 *
 *   npx tsx scripts/makeNoise.ts
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SIZE = 512;

/** PRNG determinista (mulberry32): la textura es siempre la misma. */
const makeRandom = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

const crc32 = (buf: Buffer): number => {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type: string, data: Buffer): Buffer => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
};

const main = (): void => {
  const rand = makeRandom(20260823);

  // Un byte de filtro (0) por scanline, seguido de los pixeles en gris.
  const raw = Buffer.alloc(SIZE * (SIZE + 1));
  let offset = 0;
  for (let y = 0; y < SIZE; y++) {
    raw[offset++] = 0;
    for (let x = 0; x < SIZE; x++) {
      // Media de tres muestras: grano fino centrado en gris medio, sin
      // extremos duros que se notarian al repetir el patron.
      const n = (rand() + rand() + rand()) / 3;
      raw[offset++] = Math.max(0, Math.min(255, Math.round(n * 255)));
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8; // profundidad de bit
  ihdr[9] = 0; // tipo de color: escala de grises
  ihdr[10] = 0; // compresion
  ihdr[11] = 0; // filtro
  ihdr[12] = 0; // entrelazado

  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);

  const dir = resolve(process.cwd(), 'public/textures');
  mkdirSync(dir, { recursive: true });
  const target = resolve(dir, 'noise.png');
  writeFileSync(target, png);
  console.log(
    `escrito ${target} (${SIZE}x${SIZE}, ${(png.length / 1024).toFixed(0)} KB)`
  );
};

main();

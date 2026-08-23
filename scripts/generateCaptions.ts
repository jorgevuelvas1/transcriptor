/**
 * ============================================================================
 *  SUBTITULOS EN ESPANOL
 * ============================================================================
 *  Divide cada segmento de narracion en bloques de 4 a 7 palabras y les asigna
 *  tiempo en proporcion a su peso silabico dentro del segmento.
 *
 *  Se apoya en `src/data/voiceTimeline.json`: si ese archivo procede de audio
 *  medido (`source: "measured"`), los subtitulos quedan sincronizados con la
 *  pista real de voz.
 *
 *    npm run captions
 * ============================================================================
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { countSyllables } from '../src/data/timing';

interface TimelineFile {
  source: 'planned' | 'measured';
  segments: Array<{ id: string; text: string; start: number; end: number }>;
}

export interface CaptionToken {
  t: string;
  /** true si la palabra es un concepto esencial que debe destacarse. */
  e?: boolean;
}

export interface CaptionBlock {
  start: number;
  end: number;
  lines: CaptionToken[][];
}

/** Conceptos esenciales que pueden recibir enfasis. Nada mas. */
const EMPHASIS = new Set([
  'kinmen',
  '1958',
  'beijing',
  'parlamento',
  'disuasion',
  'billon',
]);

const normalize = (word: string): string =>
  word
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');

const MIN_WORDS = 4;
const MAX_WORDS = 7;
/** Longitud maxima por linea, pensada para 1080 px de ancho. */
const MAX_LINE_CHARS = 26;

/** Agrupa palabras en bloques de 4 a 7, cortando en signos de puntuacion. */
const chunkWords = (words: string[]): string[][] => {
  const blocks: string[][] = [];
  let current: string[] = [];

  for (const word of words) {
    current.push(word);
    const endsClause = /[.,;:?!]$/.test(word);
    if (
      current.length >= MAX_WORDS ||
      (endsClause && current.length >= MIN_WORDS)
    ) {
      blocks.push(current);
      current = [];
    }
  }
  if (current.length) blocks.push(current);

  // Ningun bloque debe quedarse corto. Si el ultimo lo esta, se fusiona con el
  // anterior; y si la fusion excede el maximo, se reparten en dos mitades
  // equilibradas. Asi nunca aparece un subtitulo de una sola palabra.
  if (blocks.length >= 2) {
    const last = blocks[blocks.length - 1];
    if (last.length < MIN_WORDS) {
      const prev = blocks[blocks.length - 2];
      const combined = [...prev, ...last];
      if (combined.length <= MAX_WORDS) {
        blocks.splice(blocks.length - 2, 2, combined);
      } else {
        const half = Math.ceil(combined.length / 2);
        blocks.splice(
          blocks.length - 2,
          2,
          combined.slice(0, half),
          combined.slice(half)
        );
      }
    }
  }
  return blocks;
};

/** Reparte un bloque en una o dos lineas equilibradas. */
const layoutLines = (words: string[]): string[][] => {
  const full = words.join(' ');
  if (full.length <= MAX_LINE_CHARS) return [words];

  let bestSplit = 1;
  let bestScore = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ').length;
    const b = words.slice(i).join(' ').length;
    const score = Math.abs(a - b) + Math.max(0, Math.max(a, b) - MAX_LINE_CHARS) * 4;
    if (score < bestScore) {
      bestScore = score;
      bestSplit = i;
    }
  }
  return [words.slice(0, bestSplit), words.slice(bestSplit)];
};

const toTokens = (words: string[]): CaptionToken[] =>
  words.map((w) => {
    const key = normalize(w);
    return EMPHASIS.has(key) ? { t: w, e: true } : { t: w };
  });

export const buildCaptions = (timeline: TimelineFile): CaptionBlock[] => {
  const blocks: CaptionBlock[] = [];

  for (const segment of timeline.segments) {
    const words = segment.text.split(/\s+/).filter(Boolean);
    const groups = chunkWords(words);
    const weights = groups.map((g) => Math.max(1, countSyllables(g.join(' '))));
    const totalWeight = weights.reduce((a, b) => a + b, 0);

    const span = segment.end - segment.start;
    let cursor = segment.start;

    groups.forEach((group, i) => {
      const duration = (span * weights[i]) / totalWeight;
      const start = cursor;
      const end = i === groups.length - 1 ? segment.end : cursor + duration;
      cursor = end;
      blocks.push({
        start: Math.round(start * 1000) / 1000,
        end: Math.round(end * 1000) / 1000,
        lines: layoutLines(group).map(toTokens),
      });
    });
  }

  return blocks;
};

const main = (): void => {
  const timelinePath = resolve(process.cwd(), 'src/data/voiceTimeline.json');
  const timeline = JSON.parse(readFileSync(timelinePath, 'utf8')) as TimelineFile;

  const blocks = buildCaptions(timeline);

  const tooLong = blocks.filter((b) =>
    b.lines.some((l) => l.map((t) => t.t).join(' ').length > MAX_LINE_CHARS + 6)
  );
  const wordCounts = blocks.map((b) =>
    b.lines.reduce((a, l) => a + l.length, 0)
  );

  const out = {
    source: timeline.source,
    generatedAt: new Date().toISOString(),
    blocks,
  };
  const target = resolve(process.cwd(), 'src/data/captions.json');
  writeFileSync(target, JSON.stringify(out, null, 1) + '\n');

  console.log(`subtitulos: ${blocks.length} bloques (fuente: ${timeline.source})`);
  console.log(
    `  palabras por bloque: min ${Math.min(...wordCounts)}  max ${Math.max(
      ...wordCounts
    )}`
  );
  console.log(`  bloques de mas de 2 lineas: ${blocks.filter((b) => b.lines.length > 2).length}`);
  console.log(`  lineas excesivamente largas: ${tooLong.length}`);
  console.log(`  escrito: ${target}`);
};

main();

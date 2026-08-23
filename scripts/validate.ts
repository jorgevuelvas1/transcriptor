/**
 * ============================================================================
 *  CONTROL TECNICO
 * ============================================================================
 *  Comprueba el MP4 y los datos que lo alimentan:
 *
 *    - duracion entre 59.8 y 60.2 s
 *    - resolucion exacta 1080x1920
 *    - 30 fps
 *    - video H.264 y audio AAC
 *    - orientacion correcta de la geometria (mar como mar, tierra como tierra)
 *    - subtitulos de 4 a 7 palabras, maximo 2 lineas y sin solapes
 *    - las escenas suman exactamente 1800 frames
 *    - la voz, si existe, cae dentro de la ventana editorial
 *
 *    npm run validate [ruta.mp4]
 * ============================================================================
 */
import { execFile } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { geoContains } from 'd3-geo';

import {
  DURATION_FRAMES,
  FPS,
  HEIGHT,
  SCENE_FRAMES,
  VOICE_WINDOW,
  WIDTH,
} from '../src/data/timing';
import { FINAL_NAME, SILENT_NAME } from '../src/data/output';

const execFileAsync = promisify(execFile);
const FFPROBE: string = (await import('ffprobe-static')).default.path;
const ROOT = process.cwd();

interface Check {
  label: string;
  ok: boolean;
  detail: string;
}

const checks: Check[] = [];
const record = (label: string, ok: boolean, detail: string) =>
  checks.push({ label, ok, detail });

// ---------------------------------------------------------------------------
//  1. Geometria
// ---------------------------------------------------------------------------
const validateGeometry = (): void => {
  const geo = JSON.parse(
    readFileSync(resolve(ROOT, 'src/data/geo/strait.geo.json'), 'utf8')
  ) as { layers: Record<string, number[][][][]> };

  const mp = (polys: unknown) =>
    ({ type: 'MultiPolygon', coordinates: polys }) as never;

  const cases: Array<[string, string, [number, number], boolean]> = [
    ['taiwanMain', 'centro de Taiwán', [120.9, 23.7], true],
    ['taiwanMain', 'Pacífico al este', [122.8, 22.0], false],
    ['taiwanMain', 'centro del Estrecho', [119.6, 24.2], false],
    ['chinaWide', 'interior de Fujian', [117.2, 26.0], true],
    ['chinaWide', 'centro del Estrecho', [119.6, 24.2], false],
    ['chinaDetail', 'isla de Xiamen', [118.1, 24.47], true],
    ['chinaDetail', 'mar entre Xiamen y Kinmen', [118.22, 24.35], false],
    ['kinmen', 'sobre Kinmen', [118.35, 24.44], true],
    ['kinmen', 'mar al sur de Kinmen', [118.35, 24.2], false],
  ];

  const failures = cases.filter(
    ([layer, , point, expected]) =>
      geoContains(mp(geo.layers[layer]), point) !== expected
  );

  record(
    'Orientación de la geometría (mar/tierra)',
    failures.length === 0,
    failures.length === 0
      ? `${cases.length} sondeos correctos`
      : `${failures.length} capas invertidas: ${failures.map((f) => f[0]).join(', ')}`
  );
};

// ---------------------------------------------------------------------------
//  2. Escenas
// ---------------------------------------------------------------------------
const validateScenes = (): void => {
  const total = SCENE_FRAMES.reduce((a, s) => a + s.durationInFrames, 0);
  record(
    'Las escenas suman 1800 frames',
    total === DURATION_FRAMES,
    `${total} frames`
  );
};

// ---------------------------------------------------------------------------
//  3. Subtitulos
// ---------------------------------------------------------------------------
const validateCaptions = (): void => {
  const data = JSON.parse(
    readFileSync(resolve(ROOT, 'src/data/captions.json'), 'utf8')
  ) as {
    source: string;
    blocks: Array<{ start: number; end: number; lines: Array<Array<{ t: string }>> }>;
  };

  const counts = data.blocks.map((b) =>
    b.lines.reduce((a, l) => a + l.length, 0)
  );
  const badWords = counts.filter((n) => n < 4 || n > 7).length;
  const badLines = data.blocks.filter((b) => b.lines.length > 2).length;

  let overlaps = 0;
  for (let i = 1; i < data.blocks.length; i++) {
    if (data.blocks[i].start < data.blocks[i - 1].end - 1e-6) overlaps++;
  }
  const last = data.blocks[data.blocks.length - 1];

  record(
    'Subtítulos: 4-7 palabras por bloque',
    badWords === 0,
    `${data.blocks.length} bloques, ${badWords} fuera de rango`
  );
  record('Subtítulos: máximo 2 líneas', badLines === 0, `${badLines} con más de 2`);
  record('Subtítulos sin solapes', overlaps === 0, `${overlaps} solapes`);
  record(
    'Subtítulos dentro de los 60 s',
    last.end <= 60,
    `terminan en ${last.end.toFixed(2)}s (fuente: ${data.source})`
  );
};

// ---------------------------------------------------------------------------
//  4. Voz
// ---------------------------------------------------------------------------
const validateVoice = (): void => {
  const timeline = JSON.parse(
    readFileSync(resolve(ROOT, 'src/data/voiceTimeline.json'), 'utf8')
  ) as { source: string; speechEnd: number };

  const withinWindow =
    timeline.speechEnd >= VOICE_WINDOW.minEnd &&
    timeline.speechEnd <= VOICE_WINDOW.maxEnd;

  record(
    `Voz dentro de ${VOICE_WINDOW.minEnd}-${VOICE_WINDOW.maxEnd}s`,
    withinWindow,
    `termina en ${timeline.speechEnd.toFixed(2)}s (${
      timeline.source === 'measured' ? 'medida' : 'estimada'
    })`
  );
};

// ---------------------------------------------------------------------------
//  5. MP4
// ---------------------------------------------------------------------------
const validateVideo = async (file: string): Promise<void> => {
  const { stdout } = await execFileAsync(FFPROBE, [
    '-v', 'error',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    file,
  ]);
  const probe = JSON.parse(stdout) as {
    format: { duration: string; size: string };
    streams: Array<Record<string, any>>;
  };

  const video = probe.streams.find((s) => s.codec_type === 'video');
  const audio = probe.streams.find((s) => s.codec_type === 'audio');
  const duration = Number(probe.format.duration);

  record(
    'Duración entre 59.8 y 60.2 s',
    duration >= 59.8 && duration <= 60.2,
    `${duration.toFixed(3)}s`
  );
  record(
    'Resolución 1080x1920',
    video?.width === WIDTH && video?.height === HEIGHT,
    `${video?.width}x${video?.height}`
  );

  const [num, den] = String(video?.r_frame_rate ?? '0/1').split('/').map(Number);
  const fps = den ? num / den : 0;
  record('30 fps', Math.abs(fps - FPS) < 0.01, `${fps.toFixed(3)} fps`);

  record('Vídeo H.264', video?.codec_name === 'h264', String(video?.codec_name));
  record(
    'Audio AAC',
    audio?.codec_name === 'aac',
    audio ? String(audio.codec_name) : 'sin pista de audio'
  );
  record(
    'Píxel yuv420p (compatibilidad)',
    video?.pix_fmt === 'yuv420p',
    String(video?.pix_fmt)
  );

  const mb = Number(probe.format.size) / 1e6;
  record('Tamaño razonable para TikTok (<80 MB)', mb < 80, `${mb.toFixed(1)} MB`);
};

// ---------------------------------------------------------------------------
const main = async (): Promise<void> => {
  validateGeometry();
  validateScenes();
  validateCaptions();
  validateVoice();

  const explicit = process.argv[2];
  const candidates = [
    explicit,
    resolve(ROOT, 'output', FINAL_NAME),
    resolve(ROOT, 'output', SILENT_NAME),
  ].filter((c): c is string => Boolean(c));
  const file = candidates.find((c) => existsSync(c));

  if (file) {
    console.log(`archivo: ${file.replace(`${ROOT}/`, '')}\n`);
    await validateVideo(file);
  } else {
    console.log('(todavía no hay MP4 que comprobar)\n');
  }

  console.log('CONTROL TÉCNICO');
  console.log('─'.repeat(70));
  for (const c of checks) {
    console.log(`${c.ok ? '  OK   ' : ' FALLO '} ${c.label.padEnd(42)} ${c.detail}`);
  }
  console.log('─'.repeat(70));

  const failed = checks.filter((c) => !c.ok);
  if (failed.length) {
    console.log(`${failed.length} comprobación(es) fallida(s).`);
    process.exit(1);
  }
  console.log(`${checks.length} comprobaciones superadas.`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

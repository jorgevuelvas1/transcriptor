/**
 * ============================================================================
 *  RENDER
 * ============================================================================
 *  Empaqueta la composicion y produce el MP4 vertical para TikTok.
 *
 *    npm run render              -> salida final (requiere voz)
 *    npm run render -- --silent  -> render visual sin narracion
 *
 *  Se usa la API programatica de Remotion (no la CLI) y un Chrome ya presente
 *  en el sistema, de modo que el render no dependa de descargas externas.
 * ============================================================================
 */
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { DURATION_FRAMES, FPS, HEIGHT, WIDTH } from '../src/data/timing';
import { VIDEO_ID } from '../src/Video';
import { SOURCES } from '../src/data/sources';
import { FINAL_NAME, SILENT_NAME } from '../src/data/output';

const ROOT = process.cwd();
const OUTPUT_DIR = resolve(ROOT, 'output');

/** Chrome disponible en el sistema; evita descargas en tiempo de render. */
const findBrowser = (): string | null => {
  const candidates = [
    process.env.REMOTION_BROWSER_EXECUTABLE,
    '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
  ].filter(Boolean) as string[];
  return candidates.find((c) => existsSync(c)) ?? null;
};

const main = async (): Promise<void> => {
  const silent = process.argv.includes('--silent');
  const outName = silent ? SILENT_NAME : FINAL_NAME;
  const outPath = resolve(OUTPUT_DIR, outName);

  mkdirSync(OUTPUT_DIR, { recursive: true });

  const browserExecutable = findBrowser();
  console.log(`navegador: ${browserExecutable ?? '(descarga automática)'}`);

  console.log('empaquetando composición...');
  const serveUrl = await bundle({
    entryPoint: resolve(ROOT, 'src/index.ts'),
    onProgress: (p) => {
      if (p % 25 === 0) process.stdout.write(`  bundle ${p}%\n`);
    },
  });

  const composition = await selectComposition({
    serveUrl,
    id: VIDEO_ID,
    browserExecutable: browserExecutable ?? undefined,
  });

  if (
    composition.width !== WIDTH ||
    composition.height !== HEIGHT ||
    composition.fps !== FPS ||
    composition.durationInFrames !== DURATION_FRAMES
  ) {
    throw new Error(
      `Composición inesperada: ${composition.width}x${composition.height} @${composition.fps} ` +
        `${composition.durationInFrames}f (se esperaba ${WIDTH}x${HEIGHT} @${FPS} ${DURATION_FRAMES}f)`
    );
  }

  console.log(
    `renderizando ${composition.width}x${composition.height} @${composition.fps}fps · ` +
      `${composition.durationInFrames} frames -> output/${outName}`
  );

  let lastPct = -1;
  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    audioCodec: 'aac',
    audioBitrate: '192k',
    // CRF 20: buena calidad manteniendo un archivo comodo para TikTok.
    crf: 20,
    x264Preset: 'slow',
    pixelFormat: 'yuv420p',
    colorSpace: 'bt709',
    enforceAudioTrack: true,
    browserExecutable: browserExecutable ?? undefined,
    concurrency: 4,
    outputLocation: outPath,
    metadata: {
      title: 'Taiwán · la primera batalla por la disuasión',
      comment: SOURCES.map((s) => `${s.publisher} (${s.date}): ${s.title}`).join(' | '),
      language: 'spa',
    },
    onProgress: ({ progress }) => {
      const pct = Math.floor(progress * 100);
      if (pct !== lastPct && pct % 5 === 0) {
        lastPct = pct;
        process.stdout.write(`  render ${pct}%\n`);
      }
    },
  });

  console.log(`\nlisto: ${outPath}`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

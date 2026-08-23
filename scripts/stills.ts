/**
 * Renderiza fotogramas sueltos para revisar composicion y legibilidad.
 *
 *   npx tsx scripts/stills.ts 60 300 900 1790
 *
 * Sin argumentos usa un frame representativo de cada escena.
 */
import { mkdirSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import { SCENES, sec } from '../src/data/timing';
import { VIDEO_ID } from '../src/Video';

const OUT = resolve(process.cwd(), 'output/stills');

const findBrowser = (): string | undefined =>
  [
    process.env.REMOTION_BROWSER_EXECUTABLE,
    '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  ].filter((c): c is string => Boolean(c && existsSync(c)))[0];

const main = async (): Promise<void> => {
  const args = process.argv.slice(2).map(Number).filter((n) => !Number.isNaN(n));
  // Por defecto, un frame ya avanzado dentro de cada escena.
  const frames =
    args.length > 0
      ? args
      : SCENES.map((s) => sec(s.start) + Math.floor(sec(s.duration) * 0.72));

  mkdirSync(OUT, { recursive: true });
  const browserExecutable = findBrowser();

  console.log('empaquetando...');
  const serveUrl = await bundle({ entryPoint: resolve(process.cwd(), 'src/index.ts') });
  const composition = await selectComposition({ serveUrl, id: VIDEO_ID, browserExecutable });

  for (const frame of frames) {
    const output = resolve(OUT, `frame_${String(frame).padStart(4, '0')}.png`);
    await renderStill({
      composition,
      serveUrl,
      output,
      frame,
      imageFormat: 'png',
      browserExecutable,
      overwrite: true,
    });
    const scene = [...SCENES].reverse().find((s) => frame >= sec(s.start));
    console.log(`  frame ${frame}  (${(frame / 30).toFixed(2)}s · ${scene?.title})`);
  }
  console.log(`\nstills en ${OUT}`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

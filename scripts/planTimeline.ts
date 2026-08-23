/**
 * Calcula la linea de tiempo PLANIFICADA (estimacion silabica) y la escribe en
 * `src/data/voiceTimeline.json`.
 *
 * `scripts/generateVoice.ts` sobreescribe ese archivo con duraciones MEDIDAS
 * en cuanto existe una credencial de TTS.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NARRATION, ttsTextOf } from '../src/data/story';
import {
  estimateDuration,
  fitTimeline,
  planEstimatedTimeline,
  VOICE_WINDOW,
  countSyllables,
} from '../src/data/timing';

const result = planEstimatedTimeline();

const totalSyllables = NARRATION.reduce(
  (a, s) => a + countSyllables(ttsTextOf(s)),
  0
);
const totalWords = NARRATION.reduce(
  (a, s) => a + s.text.split(/\s+/).filter(Boolean).length,
  0
);

console.log('--- LINEA DE TIEMPO PLANIFICADA (estimacion) ---');
for (const s of result.segments) {
  const seg = NARRATION.find((n) => n.id === s.id)!;
  console.log(
    `${s.id}  esc${String(seg.scene).padStart(2)}  ${s.start
      .toFixed(2)
      .padStart(6)} -> ${s.end.toFixed(2).padStart(6)}  (${s.duration
      .toFixed(2)
      .padStart(5)}s)  ${s.text.slice(0, 52)}`
  );
}
console.log('');
console.log(`palabras: ${totalWords}   silabas: ${totalSyllables}`);
console.log(
  `voz termina en ${result.speechEnd.toFixed(2)}s  (ventana ${VOICE_WINDOW.minEnd}-${VOICE_WINDOW.maxEnd}s)  cabe=${result.fits}`
);
console.log(
  `ritmo medio: ${(totalWords / result.speechEnd).toFixed(2)} palabras/s  =  ${(
    (totalWords / result.speechEnd) *
    60
  ).toFixed(0)} ppm`
);

if (!result.fits) {
  console.error('\n[AVISO] La narracion no cabe en la ventana de voz.');
}

const out = {
  source: 'planned' as const,
  generatedAt: new Date().toISOString(),
  note: 'Duraciones ESTIMADAS por conteo silabico. `npm run voice` las reemplaza por medidas reales.',
  speechEnd: result.speechEnd,
  fits: result.fits,
  segments: result.segments,
};

const target = resolve(process.cwd(), 'src/data/voiceTimeline.json');
writeFileSync(target, JSON.stringify(out, null, 2) + '\n');
console.log(`\nescrito: ${target}`);

/**
 * ============================================================================
 *  GENERACION DE VOZ (TTS)
 * ============================================================================
 *  Sintetiza la narracion SEGMENTO A SEGMENTO, mide la duracion real de cada
 *  uno con ffprobe, los coloca en la linea de tiempo y monta una pista de
 *  exactamente 60 s normalizada a -14 LUFS.
 *
 *  Prioridad de proveedor:
 *     1) OPENAI_API_KEY  -> OpenAI Audio Speech API
 *     2) GEMINI_API_KEY  -> Google Gemini API (TTS)
 *
 *  EL MODELO NO ESTA FIJADO EN EL CODIGO. El script consulta el endpoint de
 *  modelos del proveedor en tiempo de ejecucion y elige el mejor modelo de
 *  voz disponible segun una lista de preferencia, de modo que no dependa de
 *  un identificador que pueda quedar obsoleto.
 *
 *  Las claves no se imprimen nunca.
 *
 *    npm run voice
 * ============================================================================
 */
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import 'dotenv/config';

import { NARRATION, PACE_DIRECTION, VOICE_DIRECTION, ttsTextOf } from '../src/data/story';
import { DURATION_SECONDS, VOICE_WINDOW, fitTimeline, round3 } from '../src/data/timing';

const execFileAsync = promisify(execFile);

const ROOT = process.cwd();
const SEGMENT_DIR = resolve(ROOT, 'assets/audio/segments');
const AUDIO_DIR = resolve(ROOT, 'assets/audio');
const PUBLIC_AUDIO = resolve(ROOT, 'public/audio');

const FFMPEG: string = (await import('ffmpeg-static')).default as unknown as string;
const FFPROBE: string = (await import('ffprobe-static')).default.path;

// ============================================================================
//  Seleccion de proveedor
// ============================================================================
type Provider = 'openai' | 'gemini';

const pickProvider = (): { provider: Provider; key: string } | null => {
  const forced = process.env.TTS_PROVIDER?.toLowerCase();
  const openai = process.env.OPENAI_API_KEY?.trim();
  const gemini = process.env.GEMINI_API_KEY?.trim();

  if (forced === 'openai' && openai) return { provider: 'openai', key: openai };
  if (forced === 'gemini' && gemini) return { provider: 'gemini', key: gemini };
  if (openai) return { provider: 'openai', key: openai };
  if (gemini) return { provider: 'gemini', key: gemini };
  return null;
};

// ============================================================================
//  Descubrimiento del modelo de voz (sin identificadores fijos)
// ============================================================================

/**
 * Preferencia por familias, de mas a menos deseable. Se comparan contra los
 * modelos que el proveedor declara realmente disponibles.
 */
const OPENAI_PREFERENCE = [/gpt-[0-9.]+[a-z-]*-mini-tts/, /gpt-[a-z0-9.]+-tts/, /-tts\b/, /^tts-/];
const GEMINI_PREFERENCE = [/pro-tts/, /flash-tts/, /-tts/];

const chooseByPreference = (ids: string[], preference: RegExp[]): string | null => {
  for (const rule of preference) {
    // Dentro de una misma familia, el identificador mas alto suele ser el mas reciente.
    const matches = ids.filter((id) => rule.test(id)).sort().reverse();
    if (matches.length) return matches[0];
  }
  return null;
};

const discoverOpenAiModel = async (key: string): Promise<string> => {
  const res = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) {
    throw new Error(`No se pudo listar modelos de OpenAI (HTTP ${res.status}).`);
  }
  const body = (await res.json()) as { data?: Array<{ id: string }> };
  const ids = (body.data ?? []).map((m) => m.id);
  const chosen = chooseByPreference(ids, OPENAI_PREFERENCE);
  if (!chosen) {
    throw new Error(
      'La cuenta no expone ningun modelo de texto a voz. Revisa el acceso a la Audio Speech API.'
    );
  }
  return chosen;
};

const discoverGeminiModel = async (key: string): Promise<string> => {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`
  );
  if (!res.ok) {
    throw new Error(`No se pudo listar modelos de Gemini (HTTP ${res.status}).`);
  }
  const body = (await res.json()) as {
    models?: Array<{ name: string; supportedGenerationMethods?: string[] }>;
  };
  const ids = (body.models ?? [])
    .filter((m) => (m.supportedGenerationMethods ?? []).includes('generateContent'))
    .map((m) => m.name.replace(/^models\//, ''));
  const chosen = chooseByPreference(ids, GEMINI_PREFERENCE);
  if (!chosen) {
    throw new Error('La cuenta no expone ningun modelo TTS de Gemini.');
  }
  return chosen;
};

// ============================================================================
//  Sintesis por segmento
// ============================================================================

const instructionsFor = (pace: keyof typeof PACE_DIRECTION): string =>
  `${VOICE_DIRECTION} ${PACE_DIRECTION[pace]}`;

const synthesizeOpenAi = async (
  key: string,
  model: string,
  text: string,
  pace: keyof typeof PACE_DIRECTION,
  speed: number
): Promise<Buffer> => {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      voice: process.env.TTS_VOICE?.trim() || 'onyx',
      input: text,
      instructions: instructionsFor(pace),
      response_format: 'wav',
      speed,
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`OpenAI TTS HTTP ${res.status}: ${detail.slice(0, 400)}`);
  }
  return Buffer.from(await res.arrayBuffer());
};

/** Gemini devuelve PCM crudo; hay que envolverlo en una cabecera WAV. */
const pcmToWav = (pcm: Buffer, sampleRate: number, channels = 1, bits = 16): Buffer => {
  const header = Buffer.alloc(44);
  const byteRate = (sampleRate * channels * bits) / 8;
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE((channels * bits) / 8, 32);
  header.writeUInt16LE(bits, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
};

const synthesizeGemini = async (
  key: string,
  model: string,
  text: string,
  pace: keyof typeof PACE_DIRECTION
): Promise<Buffer> => {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${instructionsFor(pace)}\n\n${text}` }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: process.env.TTS_VOICE?.trim() || 'Charon',
              },
            },
          },
        },
      }),
    }
  );
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Gemini TTS HTTP ${res.status}: ${detail.slice(0, 400)}`);
  }
  const body = (await res.json()) as any;
  const part = body?.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
  if (!part) throw new Error('Gemini no devolvio audio.');
  const mime: string = part.inlineData.mimeType ?? 'audio/L16;rate=24000';
  const rate = Number(/rate=(\d+)/.exec(mime)?.[1] ?? 24000);
  return pcmToWav(Buffer.from(part.inlineData.data, 'base64'), rate);
};

// ============================================================================
//  Medida y montaje
// ============================================================================

const probeDuration = async (file: string): Promise<number> => {
  const { stdout } = await execFileAsync(FFPROBE, [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    file,
  ]);
  return Number(stdout.trim());
};

/** Recorta silencio inicial y final para que la colocacion sea exacta. */
const trimSilence = async (input: string, output: string): Promise<void> => {
  await execFileAsync(FFMPEG, [
    '-y', '-i', input,
    '-af',
    'silenceremove=start_periods=1:start_silence=0.02:start_threshold=-45dB:' +
      'detection=peak,areverse,' +
      'silenceremove=start_periods=1:start_silence=0.02:start_threshold=-45dB:' +
      'detection=peak,areverse',
    '-ar', '48000', '-ac', '1',
    output,
  ]);
};

/** Analisis de sonoridad en dos pasadas: -14 LUFS exacto y sin recorte. */
const measureLoudness = async (file: string) => {
  const { stderr } = await execFileAsync(FFMPEG, [
    '-i', file,
    '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json',
    '-f', 'null', '-',
  ]);
  const json = stderr.slice(stderr.lastIndexOf('{'), stderr.lastIndexOf('}') + 1);
  return JSON.parse(json) as Record<string, string>;
};

const main = async (): Promise<void> => {
  const selected = pickProvider();
  if (!selected) {
    console.error(
      [
        '',
        'No hay credenciales de voz disponibles.',
        '',
        'Copia `.env.example` a `.env` y rellena UNA de estas variables:',
        '',
        '   OPENAI_API_KEY=...     (primera opcion)',
        '   GEMINI_API_KEY=...     (alternativa)',
        '',
        'Despues vuelve a ejecutar:  npm run voice && npm run captions && npm run render',
        '',
        'El resto del proyecto ya esta construido: `npm run render -- --silent`',
        'produce el video completo sin narracion.',
        '',
      ].join('\n')
    );
    process.exit(2);
  }

  const { provider, key } = selected;
  mkdirSync(SEGMENT_DIR, { recursive: true });
  mkdirSync(PUBLIC_AUDIO, { recursive: true });

  console.log(`proveedor: ${provider}`);
  const model =
    provider === 'openai' ? await discoverOpenAiModel(key) : await discoverGeminiModel(key);
  console.log(`modelo de voz seleccionado en tiempo de ejecucion: ${model}`);

  // --- Sintesis, con un unico reintento acelerando levemente si no cabe -----
  let speed = 1.0;
  let placed: ReturnType<typeof fitTimeline> | null = null;
  let durations: number[] = [];

  for (let attempt = 0; attempt < 3; attempt++) {
    durations = [];
    for (const [i, segment] of NARRATION.entries()) {
      const raw = resolve(SEGMENT_DIR, `${segment.id}.raw.wav`);
      const clean = resolve(SEGMENT_DIR, `${segment.id}.wav`);
      const audio =
        provider === 'openai'
          ? await synthesizeOpenAi(key, model, ttsTextOf(segment), segment.pace, speed)
          : await synthesizeGemini(key, model, ttsTextOf(segment), segment.pace);
      writeFileSync(raw, audio);
      await trimSilence(raw, clean);
      const duration = await probeDuration(clean);
      durations.push(duration);
      process.stdout.write(
        `  ${segment.id} ${duration.toFixed(2)}s  ${segment.text.slice(0, 46)}\n`
      );
      void i;
    }

    placed = fitTimeline(durations);
    if (placed.fits) break;

    // No se acelera de forma artificial: solo un ajuste minimo y acotado.
    const needed = placed.speechEnd / VOICE_WINDOW.maxEnd;
    speed = Math.min(1.08, Math.round(speed * needed * 100) / 100);
    console.log(
      `  la voz ocupa ${placed.speechEnd.toFixed(2)}s; reintentando con speed=${speed}`
    );
    if (provider === 'gemini') {
      console.log('  (Gemini no admite `speed`; se ajustan solo las pausas)');
      break;
    }
  }

  if (!placed) throw new Error('No se pudo ajustar la linea de tiempo.');
  if (!placed.fits) {
    console.warn(
      `AVISO: la voz termina en ${placed.speechEnd.toFixed(2)}s, fuera de la ventana ` +
        `${VOICE_WINDOW.minEnd}-${VOICE_WINDOW.maxEnd}s.`
    );
  }

  // --- Montaje sobre una base de 60 s exactos ------------------------------
  const inputs: string[] = [];
  const filters: string[] = [];
  placed.segments.forEach((segment, i) => {
    inputs.push('-i', resolve(SEGMENT_DIR, `${segment.id}.wav`));
    const delayMs = Math.round(segment.start * 1000);
    filters.push(`[${i}:a]aresample=48000,adelay=${delayMs}|${delayMs}[s${i}]`);
  });
  const mixInputs = placed.segments.map((_, i) => `[s${i}]`).join('');
  filters.push(
    `${mixInputs}amix=inputs=${placed.segments.length}:normalize=0:dropout_transition=0[mix]`,
    `[mix]apad,atrim=0:${DURATION_SECONDS},asetpts=N/SR/TB[out]`
  );

  const mixed = resolve(AUDIO_DIR, 'narration.mix.wav');
  await execFileAsync(FFMPEG, [
    '-y', ...inputs,
    '-filter_complex', filters.join(';'),
    '-map', '[out]',
    '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s16le',
    mixed,
  ]);

  // --- Normalizacion a -14 LUFS (dos pasadas) ------------------------------
  console.log('  normalizando a -14 LUFS...');
  const m = await measureLoudness(mixed);
  const final = resolve(AUDIO_DIR, 'narration.wav');
  await execFileAsync(FFMPEG, [
    '-y', '-i', mixed,
    '-af',
    `loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:` +
      `measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:` +
      `offset=${m.target_offset}:linear=true:print_format=summary,` +
      `apad,atrim=0:${DURATION_SECONDS}`,
    '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s16le',
    final,
  ]);

  copyFileSync(final, resolve(PUBLIC_AUDIO, 'narration.wav'));

  const totalDuration = await probeDuration(final);
  console.log(`  pista final: ${totalDuration.toFixed(3)}s`);

  // --- Estado para el render y los subtitulos ------------------------------
  writeFileSync(
    resolve(ROOT, 'src/data/voiceTimeline.json'),
    JSON.stringify(
      {
        source: 'measured',
        generatedAt: new Date().toISOString(),
        provider,
        model,
        speed,
        speechEnd: round3(placed.speechEnd),
        fits: placed.fits,
        segments: placed.segments,
      },
      null,
      2
    ) + '\n'
  );

  writeFileSync(
    resolve(ROOT, 'src/data/audioState.json'),
    JSON.stringify(
      { hasNarration: true, file: 'audio/narration.wav', generatedAt: new Date().toISOString() },
      null,
      2
    ) + '\n'
  );

  console.log(
    `\nvoz lista. La narracion termina en ${placed.speechEnd.toFixed(2)}s ` +
      `(ventana ${VOICE_WINDOW.minEnd}-${VOICE_WINDOW.maxEnd}s).`
  );
  console.log('Siguiente paso:  npm run captions && npm run render');
};

main().catch((err) => {
  // Nunca se vuelca el entorno ni las cabeceras: solo el mensaje.
  console.error(`\nError generando la voz: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});

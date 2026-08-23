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
 *     3) local           -> voz neuronal piper/VITS via sherpa-onnx
 *
 *  El proveedor local es un RESPALDO: se usa cuando no hay credencial, o
 *  cuando el entorno no tiene salida hacia esas APIs. Da una voz masculina
 *  en espanol de Mexico, pero sin control de entonacion por instrucciones.
 *  En cuanto exista credencial, `npm run voice` vuelve a la nube.
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
import { basename, resolve } from 'node:path';
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
type Provider = 'openai' | 'gemini' | 'local';

/**
 * Voz local. Kokoro v1.0 multilingue, locutor `em_alex` (sid 29): masculina,
 * espanol, F0 ~135 Hz. Se eligio sobre las voces piper por ser bastante mas
 * natural y por necesitar mucho menos ajuste de velocidad para caber en la
 * ventana, que es lo que hacia sonar artificial a la version anterior.
 */
const LOCAL_VOICE_DIR = resolve(ROOT, 'assets/tts/kokoro-multi-lang-v1_0');
const LOCAL_VOICE_SID = Number(process.env.TTS_SID ?? 29);

const pickProvider = (): { provider: Provider; key: string } | null => {
  const forced = process.env.TTS_PROVIDER?.toLowerCase();
  const openai = process.env.OPENAI_API_KEY?.trim();
  const gemini = process.env.GEMINI_API_KEY?.trim();
  const hasLocal = existsSync(LOCAL_VOICE_DIR);

  if (forced === 'openai' && openai) return { provider: 'openai', key: openai };
  if (forced === 'gemini' && gemini) return { provider: 'gemini', key: gemini };
  if (forced === 'local' && hasLocal) return { provider: 'local', key: '' };
  if (openai) return { provider: 'openai', key: openai };
  if (gemini) return { provider: 'gemini', key: gemini };
  if (hasLocal) return { provider: 'local', key: '' };
  return null;
};

/**
 * Ritmo relativo por segmento para la voz local, que no admite instrucciones
 * de entonacion. Traduce la direccion de voz a velocidad: el giro y las tres
 * frases finales van algo mas lentos.
 */
const PACE_SPEED: Record<string, number> = {
  base: 1.0,
  shift: 0.94,
  slow: 0.93,
};

/** Sintesis local por lotes: el modelo se carga una sola vez. */
const synthesizeLocalBatch = async (
  globalSpeed: number
): Promise<Map<string, string>> => {
  const jobs = NARRATION.map((segment) => ({
    id: segment.id,
    text: ttsTextOf(segment),
    out: resolve(SEGMENT_DIR, `${segment.id}.raw.wav`),
    speed: PACE_SPEED[segment.pace] ?? 1,
  }));

  const jobFile = resolve(SEGMENT_DIR, '_job.json');
  mkdirSync(SEGMENT_DIR, { recursive: true });
  writeFileSync(
    jobFile,
    JSON.stringify({
      voiceDir: LOCAL_VOICE_DIR,
      sid: LOCAL_VOICE_SID,
      speed: globalSpeed,
      jobs,
    })
  );

  const { stdout } = await execFileAsync(
    'python3',
    [resolve(ROOT, 'scripts/localTts.py'), jobFile],
    { maxBuffer: 64 * 1024 * 1024 }
  );
  const parsed = JSON.parse(stdout) as {
    results: Array<{ id: string; duration: number }>;
  };
  return new Map(parsed.results.map((r) => [r.id, String(r.duration)]));
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
    // Umbral suave y 60 ms de margen: recorta el silencio sobrante sin
    // cortar el ataque de la primera palabra ni la caida de la ultima.
    'silenceremove=start_periods=1:start_silence=0.06:start_threshold=-50dB:' +
      'detection=peak,areverse,' +
      'silenceremove=start_periods=1:start_silence=0.06:start_threshold=-50dB:' +
      'detection=peak,areverse',
    '-ar', '48000', '-ac', '1',
    output,
  ]);
};

/**
 * Nivel medio del segmento, en dBFS.
 *
 * Cada enunciado se sintetiza por separado y sale con un nivel algo distinto.
 * Al encadenarlos, esos saltos de volumen suenan a montaje. Se miden aqui para
 * igualarlos en la mezcla.
 */
const measureMeanVolume = async (file: string): Promise<number> => {
  const { stderr } = await execFileAsync(FFMPEG, [
    '-i', file,
    '-af', 'volumedetect',
    '-f', 'null', '-',
  ]);
  const match = /mean_volume:\s*(-?[\d.]+) dB/.exec(stderr);
  return match ? Number(match[1]) : -20;
};

/** Sonoridad integrada (LUFS) medida con ebur128. */
const measureIntegrated = async (file: string): Promise<number> => {
  const { stderr } = await execFileAsync(FFMPEG, [
    '-i', file,
    '-af', 'ebur128=framelog=quiet',
    '-f', 'null', '-',
  ]);
  const match = /I:\s*(-?[\d.]+) LUFS/.exec(stderr);
  return match ? Number(match[1]) : -23;
};

const main = async (): Promise<void> => {
  const selected = pickProvider();
  if (!selected) {
    console.error(
      [
        '',
        'No hay ni credenciales de voz ni modelo local disponible.',
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
    provider === 'openai'
      ? await discoverOpenAiModel(key)
      : provider === 'gemini'
        ? await discoverGeminiModel(key)
        : basename(LOCAL_VOICE_DIR);

  console.log(
    provider === 'local'
      ? `voz local: ${model} (sid ${LOCAL_VOICE_SID})`
      : `modelo de voz seleccionado en tiempo de ejecucion: ${model}`
  );

  // Presupuesto de habla: lo que queda tras el silencio inicial y las pausas
  // editoriales. Es el objetivo que debe alcanzar la suma de los segmentos.
  const pauseTotal = NARRATION.reduce(
    (acc, segment, i) =>
      i === NARRATION.length - 1
        ? acc
        : acc + Math.max(VOICE_WINDOW.minGap, segment.pauseAfter),
    0
  );
  const speechBudget = VOICE_WINDOW.targetEnd - VOICE_WINDOW.leadIn - pauseTotal;

  /** Sintetiza todos los segmentos y devuelve sus duraciones ya recortadas. */
  const synthesizeAll = async (globalSpeed: number): Promise<number[]> => {
    if (provider === 'local') await synthesizeLocalBatch(globalSpeed);

    const out: number[] = [];
    for (const segment of NARRATION) {
      const raw = resolve(SEGMENT_DIR, `${segment.id}.raw.wav`);
      const clean = resolve(SEGMENT_DIR, `${segment.id}.wav`);

      if (provider !== 'local') {
        const audio =
          provider === 'openai'
            ? await synthesizeOpenAi(
                key,
                model,
                ttsTextOf(segment),
                segment.pace,
                globalSpeed
              )
            : await synthesizeGemini(key, model, ttsTextOf(segment), segment.pace);
        writeFileSync(raw, audio);
      }

      await trimSilence(raw, clean);
      out.push(await probeDuration(clean));
    }
    return out;
  };

  /**
   * Calibracion del ritmo.
   *
   * La voz local arranca de un ritmo mas lento que el registro pedido, asi que
   * se mide una pasada y se deduce la velocidad que da el ritmo objetivo. Para
   * la nube el margen es minimo (1.08) para no acelerar de forma artificial.
   */
  const maxSpeed = provider === 'local' ? 1.5 : 1.08;

  // Se apunta un poco por debajo del presupuesto: la sintesis tiene algo de
  // variabilidad y conviene caer dentro de la ventana con margen.
  const aim = speechBudget * 0.985;

  interface Attempt {
    speed: number;
    durations: number[];
    placed: ReturnType<typeof fitTimeline>;
  }

  /**
   * La sintesis no es determinista entre pasadas, asi que no se puede
   * reproducir un intento anterior volviendo a generarlo: se guarda copia de
   * los WAV del mejor intento y se restauran al final.
   */
  const snapshotBest = (): void => {
    for (const segment of NARRATION) {
      copyFileSync(
        resolve(SEGMENT_DIR, `${segment.id}.wav`),
        resolve(SEGMENT_DIR, `${segment.id}.best.wav`)
      );
    }
  };

  const restoreBest = (): void => {
    for (const segment of NARRATION) {
      copyFileSync(
        resolve(SEGMENT_DIR, `${segment.id}.best.wav`),
        resolve(SEGMENT_DIR, `${segment.id}.wav`)
      );
    }
  };

  const evaluate = async (candidate: number): Promise<Attempt> => {
    const measured = await synthesizeAll(candidate);
    return {
      speed: candidate,
      durations: measured,
      placed: fitTimeline(measured),
    };
  };

  let speed = 1.0;
  let attempt = await evaluate(speed);
  let spoken = attempt.durations.reduce((a, d) => a + d, 0);
  console.log(
    `  pasada 1: ${spoken.toFixed(2)}s de habla (objetivo ${aim.toFixed(2)}s)`
  );

  // De todos los intentos nos quedamos con el que ENCAJA usando la velocidad
  // MAS BAJA: cuanto menos se comprime la locucion, mas natural suena.
  let best: Attempt | null = null;
  if (attempt.placed.fits) {
    best = attempt;
    snapshotBest();
  }

  for (let i = 0; i < 5; i++) {
    const ratio = spoken / aim;
    if (best && ratio <= 1.0) break;

    const next = Math.min(
      maxSpeed,
      Math.max(0.8, Math.round(speed * ratio * 1000) / 1000)
    );
    if (Math.abs(next - speed) < 0.004) break;

    speed = next;
    console.log(`  recalibrando a speed=${speed}`);
    attempt = await evaluate(speed);
    spoken = attempt.durations.reduce((a, d) => a + d, 0);
    console.log(
      `  -> ${spoken.toFixed(2)}s de habla, la voz termina en ${attempt.placed.speechEnd.toFixed(2)}s`
    );

    if (attempt.placed.fits && (!best || speed < best.speed)) {
      best = attempt;
      snapshotBest();
    }
  }

  // Si ningun intento encajo, se usa el ultimo disponible.
  const chosen = best ?? attempt;
  speed = chosen.speed;

  if (!best) {
    console.warn('  ningun intento entro en la ventana; se usa el mas corto.');
  } else {
    console.log(`  elegido speed=${speed} (la menor compresion que encaja)`);
  }

  // Se restauran los WAV del intento elegido, de modo que audio, duraciones y
  // linea de tiempo procedan exactamente de la misma pasada.
  if (best && attempt.speed !== chosen.speed) restoreBest();
  const durations = chosen.durations;
  const placedFit = chosen.placed;

  const placed = placedFit;
  if (!placed.fits) {
    console.warn(
      `AVISO: la voz termina en ${placed.speechEnd.toFixed(2)}s, fuera de la ventana ` +
        `${VOICE_WINDOW.minEnd}-${VOICE_WINDOW.maxEnd}s.`
    );
  }

  // --- Montaje sobre una base de 60 s exactos ------------------------------
  // Igualacion de nivel: todos los segmentos al mismo volumen medio, para que
  // el encadenado no suene a trozos pegados.
  const levels = await Promise.all(
    placed.segments.map((segment) =>
      measureMeanVolume(resolve(SEGMENT_DIR, `${segment.id}.wav`))
    )
  );
  const sorted = [...levels].sort((a, b) => a - b);
  const targetLevel = sorted[Math.floor(sorted.length / 2)];
  const spread = Math.max(...levels) - Math.min(...levels);
  console.log(
    `  nivel entre segmentos: ${spread.toFixed(1)} dB de diferencia -> igualado a ${targetLevel.toFixed(1)} dB`
  );

  const inputs: string[] = [];
  const filters: string[] = [];
  placed.segments.forEach((segment, i) => {
    inputs.push('-i', resolve(SEGMENT_DIR, `${segment.id}.wav`));
    const delayMs = Math.round(segment.start * 1000);
    // Correccion acotada: no se fuerza mas de 6 dB sobre ningun segmento.
    const gain = Math.max(-6, Math.min(6, targetLevel - levels[i]));
    filters.push(
      `[${i}:a]volume=${gain.toFixed(2)}dB,aresample=48000,adelay=${delayMs}|${delayMs}[s${i}]`
    );
  });
  const mixInputs = placed.segments.map((_, i) => `[s${i}]`).join('');
  filters.push(
    `${mixInputs}amix=inputs=${placed.segments.length}:normalize=0:dropout_transition=0[mix]`,
    // Compresion suave de locucion. La voz sintetizada tiene un factor de
    // cresta alto: sin esto no se puede llegar a -14 LUFS sin superar el pico
    // real de -1.5 dBTP. Ademas asienta la voz en el altavoz de un movil.
    `[mix]acompressor=threshold=-20dB:ratio=2.5:attack=10:release=200:makeup=3[cmp]`,
    `[cmp]apad,atrim=0:${DURATION_SECONDS},asetpts=N/SR/TB[out]`
  );

  const mixed = resolve(AUDIO_DIR, 'narration.mix.wav');
  await execFileAsync(FFMPEG, [
    '-y', ...inputs,
    '-filter_complex', filters.join(';'),
    '-map', '[out]',
    '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s16le',
    mixed,
  ]);

  // --- Normalizacion a -14 LUFS -------------------------------------------
  //
  // Se mide la sonoridad, se aplica una ganancia estatica y se remata con un
  // limitador a -1.5 dBTP. `loudnorm` en modo lineal se quedaba 1.6 dB corto
  // porque recortaba la ganancia para respetar el techo de pico; medir y
  // corregir es exacto y comprobable.
  const TARGET_LUFS = -14;
  const final = resolve(AUDIO_DIR, 'narration.wav');

  // ffmpeg no puede leer y escribir el mismo archivo, asi que las pasadas
  // alternan entre dos destinos temporales.
  const scratch = [
    resolve(AUDIO_DIR, 'narration.n0.wav'),
    resolve(AUDIO_DIR, 'narration.n1.wav'),
  ];

  let source = mixed;
  let achieved = await measureIntegrated(mixed);
  console.log(`  mezcla: ${achieved.toFixed(1)} LUFS`);

  for (let pass = 0; pass < 3; pass++) {
    const gain = TARGET_LUFS - achieved;
    if (Math.abs(gain) < 0.25) break;

    const target = scratch[pass % 2];
    await execFileAsync(FFMPEG, [
      '-y', '-i', source,
      '-af',
      `volume=${gain.toFixed(2)}dB,` +
        // Limitador de pico: evita recorte tras la ganancia.
        `alimiter=limit=0.79:attack=5:release=60:level=0,` +
        `apad,atrim=0:${DURATION_SECONDS}`,
      '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s16le',
      target,
    ]);

    achieved = await measureIntegrated(target);
    console.log(`  pasada ${pass + 1}: ${achieved.toFixed(1)} LUFS`);
    source = target;
  }

  copyFileSync(source, final);
  console.log(`  sonoridad final: ${achieved.toFixed(1)} LUFS`);

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

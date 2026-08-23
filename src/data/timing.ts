/**
 * ============================================================================
 *  TIEMPO, RITMO Y SINCRONIA
 * ============================================================================
 *  El video dura exactamente 60.000 s = 1800 frames a 30 fps.
 *
 *  La voz se sintetiza POR SEGMENTOS. Cada segmento se mide con ffprobe y se
 *  coloca en la linea de tiempo con `fitTimeline`, de modo que los subtitulos
 *  y las escenas queden sincronizados con el audio real y no con estimaciones.
 *
 *  Mientras no exista credencial de TTS, se usa una linea de tiempo PLANIFICADA
 *  (estimacion silabica) para poder construir y renderizar todo lo visual.
 * ============================================================================
 */

import { NARRATION, type NarrationSegment, type Pace } from './story';

// --- Formato de salida ------------------------------------------------------
export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const DURATION_SECONDS = 60;
export const DURATION_FRAMES = DURATION_SECONDS * FPS; // 1800

export const sec = (s: number): number => Math.round(s * FPS);

export const round3 = (n: number): number => Math.round(n * 1000) / 1000;

// --- Presupuesto de voz -----------------------------------------------------
/** La voz debe terminar dentro de esta ventana (requisito editorial). */
export const VOICE_WINDOW = {
  minEnd: 58.0,
  maxEnd: 59.3,
  /** Objetivo: deja ~1.4 s de respiracion visual y frame final. */
  targetEnd: 58.6,
  /** Silencio inicial antes de la primera palabra. */
  leadIn: 0.3,
  /** Separacion minima entre segmentos consecutivos. */
  minGap: 0.1,
} as const;

// --- Safe area TikTok -------------------------------------------------------
/**
 * La interfaz de TikTok ocupa el borde superior, el inferior y la columna
 * derecha. La informacion critica vive dentro de estos margenes.
 */
export const SAFE = {
  topPct: 0.1,
  bottomPct: 0.18,
  rightPct: 0.16,
  sidePct: 0.07,
} as const;

export const SAFE_PX = {
  top: Math.round(HEIGHT * SAFE.topPct), // 192
  bottom: Math.round(HEIGHT * SAFE.bottomPct), // 346
  right: Math.round(WIDTH * SAFE.rightPct), // 173
  side: Math.round(WIDTH * SAFE.sidePct), // 76
} as const;

/** Banda vertical util para titulares y datos (evita la UI de TikTok). */
export const CONTENT_BOX = {
  top: SAFE_PX.top,
  bottom: HEIGHT - SAFE_PX.bottom,
  left: SAFE_PX.side,
  right: WIDTH - SAFE_PX.side,
  get height() {
    return this.bottom - this.top;
  },
  get width() {
    return this.right - this.left;
  },
} as const;

/** Zona de subtitulos: inferior-media, por encima de la UI de TikTok. */
export const CAPTION_BASELINE_Y = Math.round(HEIGHT * 0.735);

// ============================================================================
//  ESCENAS
// ============================================================================
/**
 * Los limites de escena estan alineados con el lugar REAL en que cae cada
 * segmento de narracion (ver `npm run plan`), no con una reparticion teorica.
 * La secuencia y el contenido siguen el storyboard; solo se ajustan los
 * limites para que ninguna frase quede partida entre dos escenas.
 */
export interface SceneDef {
  index: number;
  id: string;
  title: string;
  /** Inicio en segundos. */
  start: number;
  /** Duracion en segundos. */
  duration: number;
}

const SCENE_SPEC: Array<[number, string, string, number]> = [
  [1, 'Scene01', 'Pregunta · Kinmen a <2 km', 7.2],
  [2, 'Scene02', 'Escala · Kinmen, Taiwán, China', 2.6],
  [3, 'Scene03', '1958 · Bombardeo de Kinmen', 6.0],
  [4, 'Scene04', '1958 · EE.UU. y la paradoja', 8.1],
  [5, 'Scene05', '2026 · Lai vuelve a Kinmen', 3.3],
  [6, 'Scene06', 'Presupuesto de defensa 2027', 5.6],
  [7, 'Scene07', 'El giro · ¿solo para Beijing?', 3.4],
  [8, 'Scene08', 'Parlamento · flujo presupuestario', 5.4],
  [9, 'Scene09', 'Estrecho vs Parlamento', 10.0],
  [10, 'Scene10', 'Conclusión · la primera batalla', 8.4],
];

export const SCENES: SceneDef[] = (() => {
  let cursor = 0;
  return SCENE_SPEC.map(([index, id, title, duration]) => {
    const scene: SceneDef = { index, id, title, start: round3(cursor), duration };
    cursor += duration;
    return scene;
  });
})();

/** Duraciones en frames, exactas y sumando 1800. */
export const SCENE_FRAMES: Array<{ from: number; durationInFrames: number }> =
  SCENES.map((s) => ({
    from: sec(s.start),
    durationInFrames: sec(s.duration),
  }));

/** Comprobacion en tiempo de import: el total debe ser exactamente 1800. */
{
  const total = SCENE_FRAMES.reduce((a, s) => a + s.durationInFrames, 0);
  if (total !== DURATION_FRAMES) {
    throw new Error(
      `Las escenas suman ${total} frames; se esperaban ${DURATION_FRAMES}.`
    );
  }
}

export const sceneById = (id: string): SceneDef => {
  const found = SCENES.find((s) => s.id === id);
  if (!found) throw new Error(`Escena desconocida: ${id}`);
  return found;
};

// ============================================================================
//  ESTIMACION DE DURACION (espanol)
// ============================================================================

/**
 * Cuenta silabas aproximadas en espanol agrupando vocales contiguas.
 * Suficientemente preciso para planificar ritmo (error tipico < 5%).
 */
export const countSyllables = (text: string): number => {
  const clean = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita tildes, conserva vocales
    .replace(/[^a-z ]/g, ' ');

  let total = 0;
  for (const word of clean.split(/\s+/).filter(Boolean)) {
    const groups = word.match(/[aeiouy]+/g);
    total += groups ? groups.length : 1;
  }
  return total;
};

/**
 * Silabas por segundo segun el registro pedido en la direccion de voz.
 *
 * Calibrado para que las 332 silabas del guion caigan dentro de la ventana
 * 58.0-59.3 s SIN acelerar artificialmente: ~158 palabras/minuto, ritmo
 * normal-dinamico de explicador analitico en espanol.
 */
export const SYLLABLE_RATE: Record<Pace, number> = {
  base: 6.25,
  shift: 5.6,
  slow: 5.58,
};

export const estimateDuration = (text: string, pace: Pace): number =>
  countSyllables(text) / SYLLABLE_RATE[pace];

// ============================================================================
//  AJUSTE DE LA LINEA DE TIEMPO
// ============================================================================

export interface PlacedSegment {
  id: string;
  scene: number;
  text: string;
  start: number;
  end: number;
  duration: number;
}

export interface FitResult {
  fits: boolean;
  /** Instante en que termina la ultima palabra. */
  speechEnd: number;
  /** Segundos que sobran (>0) o que faltan (<0) respecto a `maxEnd`. */
  slack: number;
  segments: PlacedSegment[];
}

export interface FitOptions {
  maxEnd?: number;
  targetEnd?: number;
  leadIn?: number;
  minGap?: number;
}

/**
 * Coloca los segmentos en la linea de tiempo.
 *
 * 1. Empaqueta los segmentos respetando `minGap` y la `pauseAfter` editorial.
 * 2. Si sobra tiempo, desplaza cada segmento hacia su `anchor` (preferencia
 *    de sincronia con la escena) sin solaparlos nunca ni exceder `maxEnd`.
 *
 * Nunca acelera la voz: si no cabe, devuelve `fits: false` para que quien
 * llame decida (p. ej. re-sintetizar con `speed` ligeramente mayor).
 */
export const fitTimeline = (
  durations: number[],
  segments: NarrationSegment[] = NARRATION,
  options: FitOptions = {}
): FitResult => {
  const maxEnd = options.maxEnd ?? VOICE_WINDOW.maxEnd;
  const targetEnd = options.targetEnd ?? VOICE_WINDOW.targetEnd;
  const leadIn = options.leadIn ?? VOICE_WINDOW.leadIn;
  const minGap = options.minGap ?? VOICE_WINDOW.minGap;

  if (durations.length !== segments.length) {
    throw new Error(
      `fitTimeline: ${durations.length} duraciones para ${segments.length} segmentos`
    );
  }

  // --- 1. Empaquetado minimo ------------------------------------------------
  const starts: number[] = [];
  let cursor = leadIn;
  segments.forEach((seg, i) => {
    starts.push(cursor);
    cursor += durations[i] + Math.max(minGap, seg.pauseAfter);
  });
  const packedEnd = starts[starts.length - 1] + durations[durations.length - 1];

  if (packedEnd > maxEnd) {
    return {
      fits: false,
      speechEnd: packedEnd,
      slack: maxEnd - packedEnd,
      segments: buildPlaced(segments, starts, durations),
    };
  }

  // --- 2. Reparto del margen hacia los anchors ------------------------------
  let remaining = Math.min(targetEnd, maxEnd) - packedEnd;
  for (let i = 0; i < segments.length && remaining > 0; i++) {
    const wanted = segments[i].anchor - starts[i];
    if (wanted <= 0) continue;
    const shift = Math.min(wanted, remaining);
    for (let j = i; j < starts.length; j++) starts[j] += shift;
    remaining -= shift;
  }

  const speechEnd = starts[starts.length - 1] + durations[durations.length - 1];
  return {
    fits: true,
    speechEnd,
    slack: maxEnd - speechEnd,
    segments: buildPlaced(segments, starts, durations),
  };
};

const buildPlaced = (
  segments: NarrationSegment[],
  starts: number[],
  durations: number[]
): PlacedSegment[] =>
  segments.map((seg, i) => ({
    id: seg.id,
    scene: seg.scene,
    text: seg.text,
    start: round3(starts[i]),
    end: round3(starts[i] + durations[i]),
    duration: round3(durations[i]),
  }));

/** Linea de tiempo estimada (sin audio real). */
export const planEstimatedTimeline = (): FitResult =>
  fitTimeline(
    NARRATION.map((s) => estimateDuration(s.ttsText ?? s.text, s.pace)),
    NARRATION
  );

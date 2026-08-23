/**
 * ============================================================================
 *  MOVIMIENTO
 * ============================================================================
 *  El movimiento debe aportar informacion: zoom geografico, construccion de
 *  una cifra, transformacion de un mapa en un hemiciclo. Nada decorativo.
 * ============================================================================
 */
import { interpolate, type EasingFunction } from 'remotion';

/** Salida rapida y frenado largo: transiciones cartograficas. */
export const easeOutExpo: EasingFunction = (t) =>
  t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);

export const easeOutCubic: EasingFunction = (t) => 1 - Math.pow(1 - t, 3);

export const easeInOutCubic: EasingFunction = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/** Arranque y frenado muy suaves: movimientos de camara largos. */
export const easeInOutQuint: EasingFunction = (t) =>
  t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;

export const easeOutQuart: EasingFunction = (t) => 1 - Math.pow(1 - t, 4);

/**
 * Interpola entre dos valores dentro de una ventana de frames, recortando
 * siempre en los extremos.
 */
export const at = (
  frame: number,
  [startFrame, endFrame]: [number, number],
  [from, to]: [number, number],
  easing: EasingFunction = easeOutCubic
): number =>
  interpolate(frame, [startFrame, endFrame], [from, to], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing,
  });

/** Progreso normalizado 0..1 dentro de una ventana de frames. */
export const progress = (
  frame: number,
  startFrame: number,
  endFrame: number,
  easing: EasingFunction = easeOutCubic
): number => at(frame, [startFrame, endFrame], [0, 1], easing);

/** Entrada y salida: sube a 1 y vuelve a 0. */
export const inOut = (
  frame: number,
  start: number,
  fadeIn: number,
  hold: number,
  fadeOut: number
): number => {
  const a = at(frame, [start, start + fadeIn], [0, 1], easeOutCubic);
  const b = at(
    frame,
    [start + fadeIn + hold, start + fadeIn + hold + fadeOut],
    [0, 1],
    easeOutCubic
  );
  return a * (1 - b);
};

/** Desfase por indice, para revelados escalonados. */
export const stagger = (index: number, step: number): number => index * step;

/** Dibujo progresivo de un trazo SVG. */
export const drawStroke = (
  length: number,
  p: number
): { strokeDasharray: string; strokeDashoffset: number } => ({
  strokeDasharray: `${length} ${length}`,
  strokeDashoffset: length * (1 - Math.max(0, Math.min(1, p))),
});

/** Ruido determinista 0..1, para pulsos y texturas sin aleatoriedad real. */
export const hashNoise = (seed: number): number => {
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return x - Math.floor(x);
};

/** Latido sutil (elementos vivos: marcador, foco de tension). */
export const pulse = (frame: number, period: number, amount = 1): number =>
  (Math.sin((frame / period) * Math.PI * 2) * 0.5 + 0.5) * amount;

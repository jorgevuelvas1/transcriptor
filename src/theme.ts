/**
 * ============================================================================
 *  SISTEMA VISUAL
 * ============================================================================
 *  Referencia estetica: Reuters Graphics / Financial Times / The Economist.
 *  Editorial, no militar. Sin neon, sin degradados futuristas, sin radar.
 * ============================================================================
 */

export const COLOR = {
  // --- Fondos -------------------------------------------------------------
  bg: '#07090C',
  bgLift: '#0B0F14',
  panel: '#10161C',

  // --- Grises / carbon ----------------------------------------------------
  carbon: '#161D25',
  carbonLine: '#222C37',
  grid: '#1A222B',

  // --- Texto --------------------------------------------------------------
  white: '#F1F4F7',
  text: '#DCE3EA',
  muted: '#8A97A5',
  faint: '#5A6674',

  // --- Azul grisaceo (color rector de los mapas) --------------------------
  blueGray: '#7C96AF',
  blueGrayBright: '#A9C3D9',
  blueGrayDim: '#46586B',

  // --- Cartografia --------------------------------------------------------
  sea: '#060A0E',
  seaLine: '#141F29',
  landPrc: '#1F2A34',
  landPrcEdge: '#46596B',
  landTw: '#31465A',
  landTwEdge: '#9DBFD9',

  // --- Rojo oscuro: reservado a tension / alerta --------------------------
  alert: '#8E3138',
  alertBright: '#BE4C55',
  alertDim: '#4A2126',

  // --- Tono calido discreto: seccion historica ----------------------------
  warm: '#C2A268',
  warmBright: '#DCC08A',
  warmDim: '#6E5C39',
  paper: '#100E0B',

  // --- Verde azulado sobrio: elementos institucionales/parlamento ---------
  civic: '#6E9E93',
  civicBright: '#96C4B8',
  civicDim: '#39544E',
} as const;

export const FONT = {
  sans: "'Inter', 'Helvetica Neue', Arial, sans-serif",
  mono: "'IBM Plex Mono', 'SF Mono', monospace",
  serif: "'IBM Plex Serif', Georgia, serif",
} as const;

/**
 * Escala tipografica para 1080x1920. Los tamanos estan pensados para lectura
 * en movil: nada por debajo de 26 px en texto informativo.
 */
export const TYPE = {
  hero: 108,
  display: 82,
  title: 62,
  headline: 48,
  body: 38,
  label: 30,
  micro: 25,
  tiny: 21,
} as const;

export const TRACKING = {
  tight: '-0.02em',
  normal: '0em',
  wide: '0.08em',
  wider: '0.16em',
  widest: '0.24em',
} as const;

/** Grosores de linea cartografica. */
export const STROKE = {
  hairline: 1,
  thin: 1.6,
  regular: 2.4,
  bold: 3.6,
  heavy: 5,
} as const;

/** CSS de fuentes locales (sin red en tiempo de render). */
export const fontFaceCss = (url: (f: string) => string): string => {
  const face = (
    family: string,
    file: string,
    weight: number,
    style = 'normal'
  ) =>
    `@font-face{font-family:'${family}';src:url('${url(file)}') format('woff2');font-weight:${weight};font-style:${style};font-display:block;}`;

  return [
    face('Inter', 'fonts/Inter-400.woff2', 400),
    face('Inter', 'fonts/Inter-500.woff2', 500),
    face('Inter', 'fonts/Inter-600.woff2', 600),
    face('Inter', 'fonts/Inter-700.woff2', 700),
    face('Inter', 'fonts/Inter-800.woff2', 800),
    face('IBM Plex Mono', 'fonts/PlexMono-400.woff2', 400),
    face('IBM Plex Mono', 'fonts/PlexMono-500.woff2', 500),
    face('IBM Plex Mono', 'fonts/PlexMono-600.woff2', 600),
    face('IBM Plex Serif', 'fonts/PlexSerif-400.woff2', 400),
    face('IBM Plex Serif', 'fonts/PlexSerif-600.woff2', 600),
  ].join('');
};

/** Familias que deben estar cargadas antes de capturar el primer frame. */
export const FONTS_TO_PRELOAD = [
  '400 40px Inter',
  '600 40px Inter',
  '700 40px Inter',
  '800 40px Inter',
  '400 40px "IBM Plex Mono"',
  '500 40px "IBM Plex Mono"',
  '600 40px "IBM Plex Mono"',
  '400 40px "IBM Plex Serif"',
  '600 40px "IBM Plex Serif"',
];
